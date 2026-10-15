const request=require('supertest');
const {api,bases}=require('./helpers.cjs');
const origin='http://localhost:5173';
test('frontend-origin cookie session rotates and logs out through real AuthService',async()=>{
 const agent=request.agent(bases.auth);
 const login=await agent.post('/api/v1/auth/login').set('Origin',origin).send({email:'user@restivio.local',password:'RestivioDemo123!'}).expect(200);
 expect(login.headers['access-control-allow-origin']).toBe(origin);
 expect(login.headers['access-control-allow-credentials']).toBe('true');
 expect(login.headers['set-cookie'][0]).toMatch(/HttpOnly/);
 const refresh=await agent.post('/api/v1/auth/refresh').set('Origin',origin).expect(200);
 await agent.get('/api/v1/auth/me').set('Origin',origin).set('Authorization','Bearer '+refresh.body.data.accessToken).expect(200);
 await agent.post('/api/v1/auth/logout').set('Origin',origin).expect(204);
 await agent.post('/api/v1/auth/refresh').set('Origin',origin).expect(401);
 await api.auth.post('/api/v1/auth/login').set('Origin','https://untrusted.example').send({email:'user@restivio.local',password:'RestivioDemo123!'}).expect(403);
});
test('real services answer browser preflight for bearer and idempotency headers',async()=>{
 for(const [name,path] of [['auth','/api/v1/auth/login'],['hotel','/api/v1/hotels'],['booking','/api/v1/bookings']]){
  const response=await api[name].options(path).set('Origin',origin).set('Access-Control-Request-Method','POST').set('Access-Control-Request-Headers','authorization,content-type,idempotency-key,x-correlation-id').expect(204);
  expect(response.headers['access-control-allow-origin']).toBe(origin);
  expect(response.headers['access-control-allow-headers']).toContain('Idempotency-Key');
 }
});
