import { Op, Transaction, UniqueConstraintError } from 'sequelize';
import Redlock from 'redlock';
import logger from '../config/logger.config';
import { CreateBookingDTO } from '../dtos/booking.dto';
import Booking from '../db/models/booking';
import IdempotencyKey from '../db/models/idempotencyKey';
import sequelize from '../db/models/sequelize';
import { createBooking, getBookingById } from '../repositories/booking.repository';
import { createIdempotencyKey, getIdempotencyKeyWithLock } from '../repositories/idempotency.repository';
import { requestFingerprint, scopedIdempotencyKey } from '../utils/helpers/idempotency.helper';
import { AppError, NotFoundError } from '../utils/errors/app.error';
import { authorizeBooking, cancellationAction } from '../utils/helpers/booking.helper';
import { Principal } from '../middlewares/auth.middleware';
import { redlock } from '../config/redis.config';
import { reserveBookingRooms, releaseBookingRooms } from './hotel.service';
import { createBookingEvent } from './outbox.service';
import { bookings, idempotencyReplays } from '../config/metrics';

type Result = { status: number; body: Record<string, unknown>; replayed?: boolean };
const success = (booking: Booking) => ({ success: true, data: booking.toJSON() });
function replay(key: IdempotencyKey): Result {
  idempotencyReplays.inc();
  return { status: key.responseStatus!, body: key.response!, replayed: true };
}
async function initializeRequest(data: CreateBookingDTO, user: Principal, idemKey: string, requestHash: string) {
  let key = await IdempotencyKey.findOne({ where: { idemKey } });
  if (!key) {
    try {
      key = await sequelize.transaction(async transaction => {
        const booking = await createBooking({ ...data, userId: user.userId, userEmail: user.email,
          bookingAmount: 0, status: 'PENDING' }, transaction);
        return createIdempotencyKey({ idemKey, userId: user.userId, requestHash, bookingId: booking.id }, transaction);
      });
    } catch (error) {
      // A database unique constraint, rather than Redis, elects the original request.
      if (!(error instanceof UniqueConstraintError)) throw error;
      key = await IdempotencyKey.findOne({ where: { idemKey } });
      if (!key) throw error;
    }
  }
  if (key.requestHash !== requestHash) throw new AppError('Idempotency-Key was used with a different request', 409);
  return key;
}

// Durable COMPENSATING prevents retries confirming a booking during release.
// Committed PENDING records let recovery find requests interrupted by a crash.
export async function compensateRequest(idemKey: string, failure: AppError): Promise<Result> {
  const prior = await sequelize.transaction(async transaction => {
    const key = (await getIdempotencyKeyWithLock(idemKey, transaction))!;
    if (key.status === 'COMPLETED') return replay(key);
    await key.update({ status: 'COMPENSATING', responseStatus: failure.statusCode,
      response: { success: false, message: failure.message } }, { transaction });
    return null;
  });
  if (prior) return prior;
  return sequelize.transaction(async transaction => {
    const key = (await getIdempotencyKeyWithLock(idemKey, transaction))!;
    if (key.status === 'COMPLETED') return replay(key);
    const booking = (await Booking.findByPk(key.bookingId, { transaction, lock: transaction.LOCK.UPDATE }))!;
    await releaseBookingRooms(booking);
    await booking.update({ status: 'CANCELLED' }, { transaction });
    await key.update({ status: 'COMPLETED', finalized: true }, { transaction });
    logger.warn('Pending booking compensated', { bookingId: booking.id, userId: booking.userId, hotelId: booking.hotelId });
    return { status: key.responseStatus!, body: key.response! };
  });
}

export async function createBookingService(data: CreateBookingDTO, user: Principal, clientKey: string): Promise<Result> {
  const idemKey = scopedIdempotencyKey(user.userId, clientKey);
  const key = await initializeRequest(data, user, idemKey, requestFingerprint(data));
  if (key.status === 'COMPLETED') return replay(key);
  let lock: Redlock.Lock | undefined;
  try {
    if (key.status === 'COMPENSATING') throw new AppError('Booking is awaiting inventory compensation', 503);
    const resource = ['lock:inventory', data.hotelId, data.roomCategoryId, data.checkIn, data.checkOut].join(':');
    try { lock = await redlock.lock(resource, 15000); }
    catch { throw new AppError('Inventory is busy; retry with the same Idempotency-Key', 409); }
    const result: Result = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async transaction => {
      const currentKey = (await getIdempotencyKeyWithLock(idemKey, transaction))!;
      if (currentKey.status === 'COMPLETED') return replay(currentKey);
      if (currentKey.status === 'COMPENSATING') throw new AppError('Booking is awaiting inventory compensation', 503);
      const booking = (await Booking.findByPk(currentKey.bookingId, { transaction, lock: transaction.LOCK.UPDATE }))!;
      const reservation = await reserveBookingRooms(booking);
      await booking.update({ status: 'CONFIRMED', allocatedRoomNos: reservation.roomNos,
        bookingAmount: reservation.totalAmount }, { transaction });
      await createBookingEvent(booking, 'BOOKING_CONFIRMED', transaction);
      const body = success(booking);
      await currentKey.update({ finalized: true, status: 'COMPLETED', responseStatus: 201, response: body }, { transaction });
      logger.info('Booking confirmed', { bookingId: booking.id, userId: user.userId, hotelId: booking.hotelId });
      return { status: 201, body };
    });
    if (!result.replayed) bookings.inc({ outcome: 'confirmed' });
    return result;
  } catch (error) {
    logger.warn('Booking attempt failed', { bookingId: key.bookingId, userId: user.userId,
      error: error instanceof Error ? error.message : 'Unknown error' });
    const failure = error instanceof AppError ? error : new AppError('Booking persistence failed; reservation is being compensated', 503);
    bookings.inc({ outcome: failure.statusCode === 409 ? 'conflict' : 'failed' });
    try { return await compensateRequest(idemKey, failure); }
    catch (compensationError) {
      logger.error('Compensation pending; recovery will retry', { bookingId: key.bookingId,
        error: compensationError instanceof Error ? compensationError.message : 'Compensation failed' });
      throw new AppError('Inventory compensation pending; retry this request later with the same key', 503);
    }
  } finally {
    if (lock) await lock.unlock().catch(() => logger.warn('Redis lock expired before release'));
  }
}
export async function getBookingByIdService(bookingId: number, user: Principal) {
  const booking = await getBookingById(bookingId);
  if (!booking) throw new NotFoundError('Booking not found');
  authorizeBooking(booking, user);
  return booking;
}
export function listBookingsService(user: Principal, offset: number) {
  return Booking.findAll({ where: user.role === 'ADMIN' ? {} : { userId: user.userId },
    order: [['id', 'DESC']], limit: 50, offset });
}
export async function cancelBookingService(bookingId: number, user: Principal) {
  return sequelize.transaction(async transaction => {
    const booking = await Booking.findByPk(bookingId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!booking) throw new NotFoundError('Booking not found');
    authorizeBooking(booking, user);
    if (cancellationAction(booking.status) === 'noop') return booking;
    // A retry safely finishes cancellation if persistence fails after release.
    await releaseBookingRooms(booking);
    await booking.update({ status: 'CANCELLED' }, { transaction });
    await createBookingEvent(booking, 'BOOKING_CANCELLED', transaction);
    bookings.inc({ outcome: 'cancelled' });
    return booking;
  });
}
export async function recoverPendingBookings() {
  const pending = await Booking.findAll({ where: { status: 'PENDING', updatedAt: { [Op.lt]: new Date(Date.now() - 60000) } }, limit: 20 });
  for (const booking of pending) {
    const key = await IdempotencyKey.findOne({ where: { bookingId: booking.id } });
    if (!key || !key.requestHash) continue; // Legacy requests require explicit administration.
    try { await compensateRequest(key.idemKey, new AppError('Interrupted booking was compensated; use a new key to book again', 503)); }
    catch { logger.warn('Pending booking recovery will retry', { bookingId: booking.id }); }
  }
}
