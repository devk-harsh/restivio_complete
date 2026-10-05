const { execFileSync } = require('node:child_process');
const { Queue } = require('bullmq');
const mysql = require('mysql2/promise');
const { api, db, login, bearer, fixture, waitFor, internal, randomUUID } = require('./helpers.cjs');
const enabled = process.env.TEST_CHAOS === 'true';
const chaos = enabled ? test : test.skip;
let bookingDb, hotelDb, queue, dlq;
const connection = { host: '127.0.0.1', port: Number(process.env.TEST_REDIS_PORT) || 6380 };
beforeAll(() => {
  bookingDb = db('booking'); hotelDb = db('hotel');
  queue = new Queue('mailer-queue', { connection });
  dlq = new Queue('email-dlq', { connection });
});
const compose = (...args) => execFileSync('docker', ['compose', ...args], { cwd: require('node:path').resolve(__dirname, '../..'), stdio: 'pipe', timeout: 60000 });
afterAll(async () => { if (queue) await Promise.all([bookingDb.end(), hotelDb.end(), queue.close(), dlq.close()]); });

test('Recovery compensates a durable pending booking left after an interrupted request', async () => {
  const manager = await login('manager@restivio.local');
  const intent = await fixture(manager);
  const [insert] = await bookingDb.query("INSERT INTO bookings (userId,userEmail,hotelId,roomCategoryId,checkIn,checkOut,numberOfRooms,totalGuests,bookingAmount,status,createdAt,updatedAt) VALUES (3,'user@restivio.local',?,?,?,?,?,2,0,'PENDING',NOW(),NOW())",
    [intent.hotelId, intent.roomCategoryId, intent.checkIn, intent.checkOut, 1]);
  const bookingId = insert.insertId;
  const idemKey = require('node:crypto').createHash('sha256').update(randomUUID()).digest('hex');
  await bookingDb.query("INSERT INTO idempotency_keys (idemKey,bookingId,userId,requestHash,status,finalized,createdAt,updatedAt) VALUES (?,?,3,?,'PROCESSING',false,NOW(),NOW())", [idemKey, bookingId, 'a'.repeat(64)]);
  await api.hotel.post('/api/v1/internal/rooms/reserve').set(internal).send({ bookingId, hotelId: intent.hotelId,
    roomCategoryId: intent.roomCategoryId, checkIn: intent.checkIn, checkOut: intent.checkOut, numberOfRooms: 1 }).expect(200);
  await bookingDb.query('UPDATE bookings SET updatedAt=DATE_SUB(NOW(), INTERVAL 2 MINUTE) WHERE id=?', [bookingId]);
  await waitFor(async () => {
    const [rows] = await bookingDb.query('SELECT status FROM bookings WHERE id=?', [bookingId]);
    return rows[0].status === 'CANCELLED';
  });
  const [inventory] = await hotelDb.query('SELECT id FROM rooms WHERE booking_id=?', [bookingId]);
  expect(inventory).toHaveLength(0);
  const [keys] = await bookingDb.query('SELECT status,responseStatus FROM idempotency_keys WHERE idemKey=?', [idemKey]);
  expect(keys[0]).toEqual({ status: 'COMPLETED', responseStatus: 503 });
});

chaos('Outbox survives NotificationService downtime and a retried delivery has one logical email job', async () => {
  const manager = await login('manager@restivio.local'), user = await login('user@restivio.local');
  const intent = await fixture(manager);
  let booking, event;
  compose('stop', 'notification');
  try {
    booking = (await api.booking.post('/api/v1/bookings').set(bearer(user)).set('Idempotency-Key', randomUUID()).send(intent).expect(201)).body.data;
    event = await waitFor(async () => {
      const [rows] = await bookingDb.query("SELECT * FROM outbox_events WHERE aggregateId=? AND eventType='BOOKING_CONFIRMED'", [booking.id]);
      return rows[0]?.attempts > 0 && rows[0];
    });
    expect(event.status).toBe('PENDING');
    expect(event.lastError).toBeTruthy();
    expect(await queue.getJob(event.id)).toBeUndefined();
  } finally { compose('start', 'notification'); }
  await waitFor(async () => {
    const job = await queue.getJob(event.id); return job && await job.getState() === 'completed';
  }, 45000);
  const [rows] = await bookingDb.query('SELECT * FROM outbox_events WHERE id=?', [event.id]);
  expect(rows[0].status).toBe('PUBLISHED');
  expect(rows[0].attempts).toBeGreaterThanOrEqual(2);
  // Simulate a crash after queue acceptance but before the outbox publish commit.
  await bookingDb.query("UPDATE outbox_events SET status='PENDING', nextAttemptAt=NOW() WHERE id=?", [event.id]);
  await waitFor(async () => {
    const [current] = await bookingDb.query('SELECT status FROM outbox_events WHERE id=?', [event.id]);
    return current[0].status === 'PUBLISHED';
  });
  expect((await queue.getJob(event.id)).attemptsMade).toBe(1);
  await api.booking.post('/api/v1/bookings/' + booking.id + '/cancel').set(bearer(user)).expect(200);
}, 120000);

chaos('SMTP outage exhausts retries, retains failed job and copies diagnostic metadata to DLQ', async () => {
  const eventId = randomUUID();
  const event = { eventId, type: 'BOOKING_CONFIRMED', correlationId: 'smtp-failure-' + randomUUID(),
    payload: { bookingId: 987654321, hotelId: 1, userId: 3, userEmail: 'dlq@example.com', totalGuests: 1,
      bookingAmount: '2500.00', checkIn: '2027-01-01', checkOut: '2027-01-02', numberOfRooms: 1 } };
  compose('stop', 'mailhog');
  try {
    await api.notification.post('/api/v1/internal/events').set(internal).send(event).expect(202);
    const failed = await waitFor(async () => {
      const job = await queue.getJob(eventId); return job && await job.getState() === 'failed' && job;
    }, 45000);
    expect(failed.attemptsMade).toBe(3);
    const dead = await waitFor(() => dlq.getJob(eventId));
    expect(dead.data).toMatchObject({ eventId, bookingId: 987654321, attempts: 3 });
    expect(dead.data.failureReason).toBeTruthy();
  } finally { compose('start', 'mailhog'); }
}, 120000);

chaos('Final booking write failure compensates a successful HotelService reservation', async () => {
  const manager = await login('manager@restivio.local'), user = await login('user@restivio.local');
  const intent = await fixture(manager);
  // Fixture-scoped database trigger: fail only the CONFIRMED update for this hotel.
  // No production fault-injection route is needed.
  const trigger = 'test_confirm_failure_' + intent.hotelId;
  // Only the test administrator creates triggers; application users never need SUPER.
  const faultDb = await mysql.createConnection({ host: '127.0.0.1', port: Number(process.env.TEST_DB_PORT) || 3307,
    user: 'root', password: process.env.MYSQL_ROOT_PASSWORD, database: 'restivio_booking' });
  try {
    await faultDb.query("CREATE TRIGGER " + trigger + " BEFORE UPDATE ON bookings FOR EACH ROW BEGIN IF NEW.hotelId = " +
      intent.hotelId + " AND NEW.status = 'CONFIRMED' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test persistence failure'; END IF; END");
    const key = randomUUID();
    await api.booking.post('/api/v1/bookings').set(bearer(user)).set('Idempotency-Key', key).send(intent).expect(503);
    const [rows] = await bookingDb.query('SELECT * FROM bookings WHERE hotelId=?', [intent.hotelId]);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('CANCELLED');
    const [inventory] = await hotelDb.query('SELECT * FROM rooms WHERE hotel_id=? AND booking_id IS NOT NULL', [intent.hotelId]);
    expect(inventory).toHaveLength(0);
    const [events] = await bookingDb.query('SELECT * FROM outbox_events WHERE aggregateId=?', [rows[0].id]);
    expect(events).toHaveLength(0);
    const replay = await api.booking.post('/api/v1/bookings').set(bearer(user)).set('Idempotency-Key', key).send(intent).expect(503);
    expect(replay.headers['idempotency-replayed']).toBe('true');
  } finally { await faultDb.query('DROP TRIGGER IF EXISTS ' + trigger); await faultDb.end(); }
});
