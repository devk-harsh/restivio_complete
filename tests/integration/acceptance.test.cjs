const request = require('supertest');
const { Queue } = require('bullmq');
const { api, bases, db, login, bearer, waitFor, fixture, internal, randomUUID } = require('./helpers.cjs');
const authDb = db('auth'), hotelDb = db('hotel'), bookingDb = db('booking');
let manager, admin, user, other, userId;
const email = 'acceptance-' + randomUUID() + '@example.com';
const queue = new Queue('mailer-queue', { connection: { host: '127.0.0.1', port: Number(process.env.TEST_REDIS_PORT) || 6380 } });
beforeAll(async () => {
  manager = await login('manager@restivio.local');
  admin = await login('admin@restivio.local');
  const registered = await api.auth.post('/api/v1/auth/register').send({ name: 'Acceptance User', email, password: 'AcceptancePass123!' }).expect(201);
  userId = registered.body.data.id;
  user = await login(email, 'AcceptancePass123!');
  other = await login('user@restivio.local');
});
afterAll(async () => { await Promise.all([authDb.end(), hotelDb.end(), bookingDb.end(), queue.close()]); });

test('A: registration, login, JWT, refresh rotation, logout, invalid token', async () => {
  await api.auth.post('/api/v1/auth/register').send({ name: 'Escalation', email: 'forbidden-' + randomUUID() + '@example.com', password: 'AcceptancePass123!', role: 'ADMIN' }).expect(400);
  await api.auth.post('/api/v1/auth/register').send({ name: 'Duplicate', email, password: 'AcceptancePass123!' }).expect(409);
  await api.auth.post('/api/v1/auth/login').send({ email, password: 'IncorrectPassword!' }).expect(401);
  const me = await api.auth.get('/api/v1/auth/me').set(bearer(user)).expect(200);
  expect(me.body.data).toMatchObject({ email, role: 'USER' });
  expect(me.body.data.passwordHash).toBeUndefined();
  await api.booking.get('/api/v1/bookings').set(bearer(user)).expect(200);
  await api.booking.get('/api/v1/bookings').set(bearer('invalid')).expect(401);
  await api.booking.get('/api/v1/bookings').expect(401);
  const agent = request.agent(bases.auth);
  const loggedIn = await agent.post('/api/v1/auth/login').send({ email, password: 'AcceptancePass123!' }).expect(200);
  const oldCookie = loggedIn.headers['set-cookie'][0].split(';')[0];
  expect(loggedIn.headers['set-cookie'][0]).toMatch(/HttpOnly/);
  expect(loggedIn.headers['set-cookie'][0]).toMatch(/SameSite=Strict/);
  const refreshed = await agent.post('/api/v1/auth/refresh').expect(200);
  expect(refreshed.body.data.accessToken).toBeTruthy();
  await api.auth.post('/api/v1/auth/refresh').set('Cookie', oldCookie).expect(401);
  await agent.post('/api/v1/auth/logout').expect(204);
  await agent.post('/api/v1/auth/refresh').expect(401);
  const rotationLogin = await api.auth.post('/api/v1/auth/login').send({ email, password: 'AcceptancePass123!' }).expect(200);
  const rotationCookie = rotationLogin.headers['set-cookie'][0].split(';')[0];
  const rotations = await Promise.all([1, 2].map(() => api.auth.post('/api/v1/auth/refresh').set('Cookie', rotationCookie)));
  expect(rotations.map(result => result.status).sort()).toEqual([200, 401]);
  const [tokens] = await authDb.query('SELECT tokenHash, revokedAt FROM refresh_tokens WHERE userId=?', [userId]);
  expect(tokens.length).toBeGreaterThan(0);
  expect(tokens.every(token => /^[a-f0-9]{64}$/.test(token.tokenHash))).toBe(true);
});

test('B/C: RBAC, ownership, categories, generation, public availability, correlation', async () => {
  await api.hotel.post('/api/v1/hotels').set(bearer(user)).send({ name: 'Forbidden', address: 'a', location: 'b' }).expect(403);
  const intent = await fixture(manager);
  const [hotels] = await hotelDb.query('SELECT manager_user_id FROM hotels WHERE id=?', [intent.hotelId]);
  expect(hotels[0].manager_user_id).toBe(2);
  const foreign = await api.hotel.post('/api/v1/hotels').set(bearer(admin)).send({ name: 'Admin ' + randomUUID(), address: 'a', location: 'b' }).expect(201);
  const managerEmail = 'other-manager-' + randomUUID() + '@example.com';
  const registeredManager = await api.auth.post('/api/v1/auth/register').send({ name: 'Other manager', email: managerEmail, password: 'AcceptancePass123!' }).expect(201);
  // Test fixture promotion represents the seed/admin provision process, not a public API.
  await authDb.query("UPDATE users SET role='HOTEL_MANAGER' WHERE id=?", [registeredManager.body.data.id]);
  const otherManager = await login(managerEmail, 'AcceptancePass123!');
  await api.hotel.put('/api/v1/hotels/' + intent.hotelId).set(bearer(otherManager)).send({ name: 'Forbidden' }).expect(403);
  await api.hotel.post('/api/v1/hotels/' + intent.hotelId + '/room-categories').set(bearer(otherManager)).send({ roomType: 'SUITE', price: 100, roomCount: 1 }).expect(403);
  await api.hotel.post('/api/v1/hotels/' + intent.hotelId + '/room-categories/' + intent.roomCategoryId + '/inventory/generate').set(bearer(otherManager)).send({ startDate: intent.checkIn, endDate: intent.checkOut }).expect(403);
  await api.hotel.put('/api/v1/hotels/' + foreign.body.data.id).set(bearer(manager)).send({ name: 'Forbidden change' }).expect(403);
  await api.hotel.put('/api/v1/hotels/' + intent.hotelId).set(bearer(manager)).send({ name: 'Owned hotel updated' }).expect(200);
  await api.hotel.put('/api/v1/hotels/' + intent.hotelId).set(bearer(admin)).send({ location: 'Admin updated' }).expect(200);
  await api.hotel.patch('/api/v1/hotels/' + intent.hotelId + '/room-categories/' + intent.roomCategoryId).set(bearer(user)).send({ price: 1 }).expect(403);
  await api.hotel.patch('/api/v1/hotels/' + intent.hotelId + '/room-categories/' + intent.roomCategoryId).set(bearer(manager)).send({ roomCount: 10 }).expect(409);
  await api.hotel.delete('/api/v1/hotels/' + intent.hotelId + '/room-categories/' + intent.roomCategoryId).set(bearer(manager)).expect(409);
  const read = await api.hotel.get('/api/v1/hotels/' + intent.hotelId).set('X-Correlation-ID', 'acceptance-correlation').expect(200);
  expect(read.headers['x-correlation-id']).toBe('acceptance-correlation');
  const available = await api.hotel.get('/api/v1/hotels/' + intent.hotelId + '/availability').query({ checkIn: intent.checkIn, checkOut: intent.checkOut }).expect(200);
  expect(available.body.data.categories[0]).toMatchObject({ availableRoomCount: 2, estimatedTotalAmount: 5000, isAvailable: true });
  await api.hotel.post('/api/v1/internal/rooms/reserve').send({}).expect(401);
  await api.notification.post('/api/v1/internal/events').send({}).expect(401);
  await api.notification.post('/api/v1/notification/email').send({}).expect(401);
});

test('D/F/G/H: booking, trusted amount, concurrent idempotency, ownership, cancellation, outbox and email', async () => {
  const intent = await fixture(manager);
  const key = randomUUID(), correlationId = 'booking-' + randomUUID();
  await api.booking.post('/api/v1/bookings').set(bearer(user)).send(intent).expect(400);
  await api.booking.post('/api/v1/bookings').set(bearer(user)).set('Idempotency-Key', randomUUID()).send({ ...intent, bookingAmount: 1 }).expect(400);
  const results = await Promise.all(Array.from({ length: 6 }, () => api.booking.post('/api/v1/bookings').set(bearer(user))
    .set('Idempotency-Key', key).set('X-Correlation-ID', correlationId).send(intent)));
  expect(results.map(r => r.status)).toEqual(Array(6).fill(201));
  results.forEach(result => expect(result.body).toEqual(results[0].body));
  const booking = results[0].body.data;
  expect(booking).toMatchObject({ userId, userEmail: email, status: 'CONFIRMED', bookingAmount: 5000 });
  expect(booking.allocatedRoomNos).toHaveLength(1);
  const [rows] = await bookingDb.query('SELECT id FROM bookings WHERE userId=? AND hotelId=?', [userId, intent.hotelId]);
  expect(rows).toHaveLength(1);
  const [inventory] = await hotelDb.query('SELECT * FROM rooms WHERE booking_id=?', [booking.id]);
  expect(inventory).toHaveLength(2);
  await api.booking.post('/api/v1/bookings').set(bearer(user)).set('Idempotency-Key', key).send({ ...intent, totalGuests: 3 }).expect(409);
  await api.booking.get('/api/v1/bookings/' + booking.id).set(bearer(user)).expect(200);
  await api.booking.get('/api/v1/bookings/' + booking.id).set(bearer(other)).expect(403);
  await api.booking.post('/api/v1/bookings/' + booking.id + '/cancel').set(bearer(other)).expect(403);
  await api.booking.get('/api/v1/bookings/' + booking.id).set(bearer(admin)).expect(200);
  const listed = await api.booking.get('/api/v1/bookings').set(bearer(other)).expect(200);
  expect(listed.body.data.some(row => row.id === booking.id)).toBe(false);
  const event = await waitFor(async () => {
    const [events] = await bookingDb.query("SELECT * FROM outbox_events WHERE aggregateId=? AND eventType='BOOKING_CONFIRMED'", [booking.id]);
    return events[0]?.status === 'PUBLISHED' && events[0];
  });
  expect(event.correlationId).toBe(correlationId);
  const job = await waitFor(async () => {
    const current = await queue.getJob(event.id);
    return current && await current.getState() === 'completed' && current;
  });
  expect(job.data.correlationId).toBe(correlationId);
  const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
  const eventBody = { eventId: event.id, type: event.eventType, payload, correlationId };
  for (let i = 0; i < 3; i++) await api.notification.post('/api/v1/internal/events').set(internal).send(eventBody).expect(202);
  expect((await queue.getJob(event.id)).id).toBe(job.id);
  expect((await queue.getJob(event.id)).attemptsMade).toBe(1);
  const cancelled = await api.booking.post('/api/v1/bookings/' + booking.id + '/cancel').set(bearer(user)).expect(200);
  expect(cancelled.body.data.status).toBe('CANCELLED');
  await api.booking.post('/api/v1/bookings/' + booking.id + '/cancel').set(bearer(user)).expect(200);
  const [released] = await hotelDb.query('SELECT id FROM rooms WHERE booking_id=?', [booking.id]);
  expect(released).toHaveLength(0);
  const [cancelEvents] = await bookingDb.query("SELECT * FROM outbox_events WHERE aggregateId=? AND eventType='BOOKING_CANCELLED'", [booking.id]);
  expect(cancelEvents).toHaveLength(1);
  await waitFor(async () => {
    const response = await fetch('http://127.0.0.1:8025/api/v2/messages?limit=200');
    const messages = (await response.json()).items.filter(message => message.Content.Headers.To?.some(to => to.includes(email)));
    const relevant = messages.filter(message => message.Content.Body.includes('Booking ID:</strong> ' + booking.id));
    return relevant.some(message => message.Content.Headers.Subject.includes('Booking Confirmed')) &&
      relevant.some(message => message.Content.Headers.Subject.includes('Booking Cancelled')) && relevant;
  });
  // Replaying creation after cancellation returns the stored original result.
  const replay = await api.booking.post('/api/v1/bookings').set(bearer(user)).set('Idempotency-Key', key).send(intent).expect(201);
  expect(replay.body).toEqual(results[0].body);
  const available = await api.hotel.get('/api/v1/hotels/' + intent.hotelId + '/availability').query({ checkIn: intent.checkIn, checkOut: intent.checkOut }).expect(200);
  expect(available.body.data.categories[0].availableRoomCount).toBe(2);
});

test('E: ten concurrent booking requests compete for exactly two physical rooms', async () => {
  const intent = await fixture(manager, 2);
  const responses = await Promise.all(Array.from({ length: 10 }, () => api.booking.post('/api/v1/bookings')
    .set(bearer(user)).set('Idempotency-Key', randomUUID()).send(intent)));
  const success = responses.filter(r => r.status === 201);
  expect(success).toHaveLength(2);
  expect(responses.filter(r => r.status === 409)).toHaveLength(8);
  const numbers = success.flatMap(r => r.body.data.allocatedRoomNos);
  expect(new Set(numbers).size).toBe(2);
  const [rows] = await hotelDb.query('SELECT room_no, date_of_availability, booking_id FROM rooms WHERE hotel_id=? AND booking_id IS NOT NULL', [intent.hotelId]);
  expect(rows).toHaveLength(4);
  expect(new Set(rows.map(row => row.room_no + ':' + row.date_of_availability)).size).toBe(4);
  expect(new Set(rows.map(row => row.booking_id)).size).toBe(2);
  for (const response of success) await api.booking.post('/api/v1/bookings/' + response.body.data.id + '/cancel').set(bearer(user)).expect(200);
});

test('Database protection holds for competing stays that bypass Redis locks', async () => {
  const intent = await fixture(manager, 2);
  const baseId = 1000000000 + Math.floor(Math.random() * 100000000);
  const responses = await Promise.all(Array.from({ length: 8 }, (_, i) => api.hotel.post('/api/v1/internal/rooms/reserve').set(internal)
    .send({ bookingId: baseId + i, hotelId: intent.hotelId, roomCategoryId: intent.roomCategoryId,
      checkIn: intent.checkIn, checkOut: intent.checkOut, numberOfRooms: 1 })));
  expect(responses.filter(r => r.status === 200)).toHaveLength(2);
  expect(responses.filter(r => r.status === 409)).toHaveLength(6);
  const [rows] = await hotelDb.query('SELECT booking_id, room_no, date_of_availability FROM rooms WHERE hotel_id=? AND booking_id IS NOT NULL', [intent.hotelId]);
  expect(rows).toHaveLength(4);
  expect(new Set(rows.map(r => r.booking_id)).size).toBe(2);
  for (let i = 0; i < 8; i++) await api.hotel.post('/api/v1/internal/rooms/release').set(internal).send({ bookingId: baseId + i, hotelId: intent.hotelId }).expect(200);
  // A late retry cannot resurrect inventory after a release.
  await api.hotel.post('/api/v1/internal/rooms/reserve').set(internal).send({
    bookingId: baseId, hotelId: intent.hotelId, roomCategoryId: intent.roomCategoryId,
    checkIn: intent.checkIn, checkOut: intent.checkOut, numberOfRooms: 1,
  }).expect(409);
});

test('I: health, bounded metrics, Prometheus scrape and provisioned Grafana dashboard', async () => {
  for (const service of Object.values(api)) {
    await service.get('/health/live').expect(200);
    expect((await service.get('/health/ready').expect(200)).body.status).toBe('ready');
    const metrics = await service.get('/metrics').expect(200);
    expect(metrics.text).toContain('restivio_http_requests_total');
    expect(metrics.text).not.toMatch(/bookingId="/);
    await service.get('/docs/').expect(200);
    expect((await service.get('/openapi.json').expect(200)).body.openapi).toBe('3.0.3');
  }
  await waitFor(async () => {
    const data = await (await fetch('http://127.0.0.1:9090/api/v1/targets')).json();
    return data.data.activeTargets.length === 4 && data.data.activeTargets.every(target => target.health === 'up');
  });
  const auth = 'Basic ' + Buffer.from('admin:' + process.env.GRAFANA_ADMIN_PASSWORD).toString('base64');
  const dashboard = await (await fetch('http://127.0.0.1:3004/api/dashboards/uid/restivio-overview', { headers: { Authorization: auth } })).json();
  expect(dashboard.dashboard.panels.length).toBeGreaterThanOrEqual(8);
  const query = await (await fetch('http://127.0.0.1:9090/api/v1/query?query=' + encodeURIComponent('sum(restivio_http_requests_total)'))).json();
  expect(Number(query.data.result[0].value[1])).toBeGreaterThan(0);
});
