const path = require('node:path');
require('../../AuthService/node_modules/dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
const request = require('supertest');
const mysql = require('mysql2/promise');
const { randomUUID } = require('node:crypto');
const bases = { auth: process.env.TEST_AUTH_URL || 'http://127.0.0.1:3000', hotel: process.env.TEST_HOTEL_URL || 'http://127.0.0.1:3001', booking: process.env.TEST_BOOKING_URL || 'http://127.0.0.1:3002', notification: process.env.TEST_NOTIFICATION_URL || 'http://127.0.0.1:3003' };
const api = Object.fromEntries(Object.entries(bases).map(([key, value]) => [key, request(value)]));
const internal = { 'X-Internal-Service-Key': process.env.INTERNAL_SERVICE_KEY };
function db(service) {
  return mysql.createPool({ host: process.env.TEST_DB_HOST || '127.0.0.1', port: Number(process.env.TEST_DB_PORT) || 3307,
    user: 'restivio_' + service, password: process.env.DB_PASSWORD, database: 'restivio_' + service, connectionLimit: 4 });
}
async function login(email, password = 'RestivioDemo123!') {
  const result = await api.auth.post('/api/v1/auth/login').send({ email, password });
  if (result.status !== 200) throw new Error('Login failed: ' + JSON.stringify(result.body));
  return result.body.data.accessToken;
}
const bearer = token => ({ Authorization: 'Bearer ' + token });
async function waitFor(fn, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { const result = await fn(); if (result) return result; } catch (error) { last = error; }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw last || new Error('Timed out waiting for expected state');
}
function stay() {
  const base = new Date(); base.setUTCDate(base.getUTCDate() + 7);
  const end = new Date(base); end.setUTCDate(end.getUTCDate() + 2);
  return { checkIn: base.toISOString().slice(0, 10), checkOut: end.toISOString().slice(0, 10) };
}
async function fixture(manager, roomCount = 2) {
  const hotel = await api.hotel.post('/api/v1/hotels').set(bearer(manager)).send({ name: 'Integration ' + randomUUID(), address: 'Test Road', location: 'Goa' }).expect(201);
  const hotelId = hotel.body.data.id;
  const category = await api.hotel.post('/api/v1/hotels/' + hotelId + '/room-categories').set(bearer(manager)).send({ roomType: 'DOUBLE', price: 2500, roomCount }).expect(201);
  const roomCategoryId = category.body.data.id;
  const dates = stay();
  await api.hotel.post('/api/v1/hotels/' + hotelId + '/room-categories/' + roomCategoryId + '/inventory/generate')
    .set(bearer(manager)).send({ startDate: dates.checkIn, endDate: dates.checkOut }).expect(201);
  return { hotelId, roomCategoryId, ...dates, numberOfRooms: 1, totalGuests: 2 };
}
module.exports = { api, bases, db, login, bearer, waitFor, stay, fixture, internal, randomUUID };
