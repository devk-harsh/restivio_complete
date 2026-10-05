import { randomUUID } from 'crypto';
import { Op, Transaction } from 'sequelize';
import Booking from '../db/models/booking';
import OutboxEvent, { EventType } from '../db/models/outboxEvent';
import sequelize from '../db/models/sequelize';
import { getCorrelationId, requestContext } from '../utils/context/request.context';
import { deliverBookingEvent } from './notification.service';
import logger from '../config/logger.config';
import { outboxDeliveries, outboxState } from '../config/metrics';
export function createBookingEvent(booking: Booking, eventType: EventType, transaction: Transaction) {
  return OutboxEvent.create({ id: randomUUID(), eventType, aggregateId: booking.id,
    correlationId: getCorrelationId(), nextAttemptAt: new Date(),
    payload: { bookingId: booking.id, hotelId: booking.hotelId, userId: booking.userId,
      userEmail: booking.userEmail, totalGuests: booking.totalGuests, bookingAmount: String(booking.bookingAmount),
      checkIn: booking.checkIn, checkOut: booking.checkOut, numberOfRooms: booking.numberOfRooms },
  }, { transaction });
}
export async function dispatchOutboxBatch() {
  for (let count = 0; count < 20; count++) {
    const found = await sequelize.transaction(async transaction => {
      // A bounded HTTP call holds one row lock. Concurrent dispatchers skip it.
      // A crash leaves PENDING; eventId deduplicates the next delivery.
      const event = await OutboxEvent.findOne({ where: { status: 'PENDING', nextAttemptAt: { [Op.lte]: new Date() } },
        order: [['createdAt', 'ASC']], transaction, lock: transaction.LOCK.UPDATE, skipLocked: true });
      if (!event) return false;
      await requestContext.run({ correlationId: event.correlationId }, async () => {
        try {
          await deliverBookingEvent(event);
          await event.update({ status: 'PUBLISHED', publishedAt: new Date(), attempts: event.attempts + 1, lastError: null }, { transaction });
          outboxDeliveries.inc({ outcome: 'published' });
          logger.info('Outbox event accepted', { eventId: event.id, bookingId: event.aggregateId });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Delivery failed';
          await event.update({ attempts: event.attempts + 1, lastError: message,
            nextAttemptAt: new Date(Date.now() + Math.min(60000, 1000 * 2 ** Math.min(event.attempts, 6))) }, { transaction });
          outboxDeliveries.inc({ outcome: 'failed' });
          logger.warn('Outbox delivery will retry', { eventId: event.id, bookingId: event.aggregateId, error: message });
        }
      });
      return true;
    });
    if (!found) break;
  }
  for (const status of ['PENDING', 'PUBLISHED']) outboxState.set({ status: status.toLowerCase() }, await OutboxEvent.count({ where: { status } }));
}
