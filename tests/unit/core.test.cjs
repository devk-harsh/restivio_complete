const request = require('supertest');
const jwt = require('jsonwebtoken');
const express = require('../../AuthService/node_modules/express');
process.env.JWT_SECRET = 'unit-test-only-secret-at-least-32-characters';
process.env.INTERNAL_SERVICE_KEY = 'unit-internal-key';
const auth = require('../../AuthService/dist/middlewares/auth.middleware');
const { requestFingerprint, scopedIdempotencyKey } = require('../../BookingService/dist/utils/helpers/idempotency.helper');
const { createBookingSchema } = require('../../BookingService/dist/validators/booking.validator');
const { getStayDates, getInclusiveDateRange } = require('../../HotelService/dist/utils/date.utils');
const { eventToEmail } = require('../../NotificationService/dist/services/event.service');
const { bookingEventSchema } = require('../../NotificationService/dist/validators/event.validator');
const { authorizeBooking, cancellationAction } = require('../../BookingService/dist/utils/helpers/booking.helper');

const principal = { userId: 7, email: 'unit@example.com', role: 'USER' };
function sign(claims = principal, options = {}) {
  return jwt.sign(claims, process.env.JWT_SECRET, { algorithm: 'HS256', issuer: 'restivio-auth', audience: 'restivio', expiresIn: '15m', ...options });
}
const app = express();
app.get('/protected', auth.authenticate, (_req, res) => res.json(res.locals.user));
app.post('/manager', auth.authenticate, auth.requireRole('HOTEL_MANAGER', 'ADMIN'), (_req, res) => res.sendStatus(204));
app.post('/internal', auth.requireInternalKey, (_req, res) => res.sendStatus(204));

describe('JWT and authorization', () => {
  test('valid JWT returns only authorization claims', async () => {
    expect(auth.verifyAccessToken(sign())).toEqual(principal);
    expect((await request(app).get('/protected').set('Authorization', 'Bearer ' + sign())).body).toEqual(principal);
  });
  test.each([
    ['missing', null],
    ['bad signature', jwt.sign(principal, 'wrong')],
    ['expired', sign(principal, { expiresIn: -1 })],
    ['wrong audience', sign(principal, { audience: 'other' })],
    ['wrong role', sign({ ...principal, role: 'SUPERUSER' })],
    ['invalid identity', sign({ ...principal, userId: '7' })],
    ['wrong algorithm', sign(principal, { algorithm: 'HS384' })],
  ])('rejects %s token', async (_label, token) => {
    const req = request(app).get('/protected');
    if (token) req.set('Authorization', 'Bearer ' + token);
    expect((await req).status).toBe(401);
  });
  test('USER denied and manager/admin permitted', async () => {
    expect((await request(app).post('/manager').set('Authorization', 'Bearer ' + sign())).status).toBe(403);
    for (const role of ['HOTEL_MANAGER', 'ADMIN']) {
      expect((await request(app).post('/manager').set('Authorization', 'Bearer ' + sign({ ...principal, role }))).status).toBe(204);
    }
  });
  test('internal credential is required', async () => {
    expect((await request(app).post('/internal')).status).toBe(401);
    expect((await request(app).post('/internal').set('X-Internal-Service-Key', 'wrong')).status).toBe(401);
    expect((await request(app).post('/internal').set('X-Internal-Service-Key', process.env.INTERNAL_SERVICE_KEY)).status).toBe(204);
  });
});
describe('Booking intent and idempotency', () => {
  test('booking ownership applies to managers too; ADMIN can inspect any booking', () => {
    expect(() => authorizeBooking({ userId: 7 }, principal)).not.toThrow();
    expect(() => authorizeBooking({ userId: 8 }, principal)).toThrow();
    expect(() => authorizeBooking({ userId: 8 }, { ...principal, role: 'HOTEL_MANAGER' })).toThrow();
    expect(() => authorizeBooking({ userId: 8 }, { ...principal, role: 'ADMIN' })).not.toThrow();
  });
  test('cancellation requires confirmed state and cancelled is an idempotent no-op', () => {
    expect(cancellationAction('CONFIRMED')).toBe('release');
    expect(cancellationAction('CANCELLED')).toBe('noop');
    expect(() => cancellationAction('PENDING')).toThrow('Only confirmed');
  });
  const intent = { hotelId: 1, roomCategoryId: 2, checkIn: '2027-01-01', checkOut: '2027-01-03', numberOfRooms: 1, totalGuests: 2 };
  test('fingerprints canonical fields independently of object order', () => {
    const reordered = Object.fromEntries(Object.entries(intent).reverse());
    expect(requestFingerprint(intent)).toBe(requestFingerprint(reordered));
    expect(requestFingerprint(intent)).not.toBe(requestFingerprint({ ...intent, totalGuests: 3 }));
    expect(scopedIdempotencyKey(1, 'abc')).not.toBe(scopedIdempotencyKey(2, 'abc'));
    expect(scopedIdempotencyKey(1, 'abc')).not.toBe(scopedIdempotencyKey(1, 'ABC'));
  });
  test.each([
    { userId: 999 }, { userEmail: 'other@example.com' }, { bookingAmount: 1 }, { allocatedRoomNos: [1] },
    { checkIn: '2027-02-30' }, { checkOut: '2026-12-31' }, { checkOut: '2027-03-01' }, { numberOfRooms: 0 },
  ])('rejects untrusted or invalid intent %j', change => expect(createBookingSchema.safeParse({ ...intent, ...change }).success).toBe(false));
  test('valid intent succeeds', () => expect(createBookingSchema.parse(intent)).toEqual(intent));
  test('checkout is exclusive and leap dates work', () => {
    expect(getStayDates('2028-02-28', '2028-03-01')).toEqual(['2028-02-28', '2028-02-29']);
    expect(getInclusiveDateRange('2028-02-28', '2028-03-01')).toHaveLength(3);
  });
});
describe('Notification event mapping', () => {
  const payload = { bookingId: 3, hotelId: 2, userId: 1, userEmail: 'user@example.com', bookingAmount: '5000.00', totalGuests: 2, checkIn: '2027-01-01', checkOut: '2027-01-03', numberOfRooms: 1 };
  for (const [type, templateId] of [['BOOKING_CONFIRMED', 'booking-confirmed'], ['BOOKING_CANCELLED', 'booking-cancelled']]) {
    test(type, () => {
      const event = bookingEventSchema.parse({ eventId: '13ddcb3f-d207-4418-b561-dab28b9b7db1', type, payload, correlationId: 'unit-test' });
      expect(eventToEmail(event)).toMatchObject({ eventId: event.eventId, templateId, to: payload.userEmail, bookingId: 3, correlationId: 'unit-test' });
    });
  }
  test('unknown event types rejected', () => {
    expect(bookingEventSchema.safeParse({ type: 'SEND_ANY_EMAIL' }).success).toBe(false);
  });
});
