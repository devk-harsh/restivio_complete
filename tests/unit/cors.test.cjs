const request = require('supertest');
const express = require('../../AuthService/node_modules/express');
describe.each(['AuthService', 'HotelService', 'BookingService'])('%s browser CORS', service => {
 const { browserCors } = require('../../' + service + '/dist/middlewares/cors.middleware');
 const app = express(); app.use(browserCors); app.get('/test', (_req,res)=>res.json({ok:true}));
 test('permits the exact frontend origin, credentials, and booking headers', async()=>{
  const res=await request(app).options('/test').set('Origin','http://localhost:5173').set('Access-Control-Request-Headers','authorization,idempotency-key').expect(204);
  expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  expect(res.headers['access-control-allow-credentials']).toBe('true');
  expect(res.headers['access-control-allow-headers']).toContain('Idempotency-Key');
  expect(res.headers.vary).toContain('Origin');
 });
 test('does not grant browser access to an unrelated origin',async()=>{
  const res=await request(app).get('/test').set('Origin','https://untrusted.example').expect(200);
  expect(res.headers['access-control-allow-origin']).toBeUndefined();
  expect(res.headers['access-control-allow-credentials']).toBeUndefined();
 });
 test('reads an explicitly configured frontend origin without wildcard matching',async()=>{
  const before=process.env.FRONTEND_ORIGIN;process.env.FRONTEND_ORIGIN='http://localhost:5180';
  try {
   expect((await request(app).get('/test').set('Origin','http://localhost:5180')).headers['access-control-allow-origin']).toBe('http://localhost:5180');
   expect((await request(app).get('/test').set('Origin','http://localhost:5173')).headers['access-control-allow-origin']).toBeUndefined();
  } finally { if(before===undefined)delete process.env.FRONTEND_ORIGIN;else process.env.FRONTEND_ORIGIN=before; }
 });
});
