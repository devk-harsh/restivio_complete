// Local demo maintenance only. Uses existing public APIs; never resets databases.
const fs = require('node:fs');
const path = require('node:path');
const auth = 'http://localhost:3000/api/v1/auth';
const hotels = 'http://localhost:3001/api/v1/hotels';
const samples = [
 { name:'The Courtyard Jaipur', address:'8 Demo Garden Lane', location:'Jaipur', rooms:[{roomType:'DOUBLE',price:2800,roomCount:4},{roomType:'SUITE',price:5200,roomCount:2}] },
 { name:'Cedar House Manali', address:'16 Demo Hill Road', location:'Manali', rooms:[{roomType:'DELUXE',price:3200,roomCount:4},{roomType:'FAMILY',price:4600,roomCount:2}] },
];
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
function isKnownFixture(h) {
 return (h.address==='Test Road' && ((h.location==='Goa' && new RegExp('^Integration '+uuid+'$').test(h.name)) || (h.location==='Admin updated' && h.name==='Owned hotel updated'))) ||
 (h.address==='a' && h.location==='b' && new RegExp('^Admin '+uuid+'$').test(h.name)) ||
 (h.name==='Frontend Verification Hotel' && h.address==='25 Local Demo Lane' && h.location==='Goa');
}
async function api(url,method='GET',body,token) {
 const res=await fetch(url,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await res.json();if(!res.ok)throw new Error(method+' '+url+': '+(data.message||res.status));return data.data;
}
async function main(){
 const existing=await api(hotels);const fixtures=existing.filter(isKnownFixture);
 console.log(JSON.stringify({archive:fixtures.map(h=>({id:h.id,name:h.name})),ensureDemoHotels:samples.map(h=>h.name)},null,2));
 if(!process.argv.includes('--apply')) {console.log('Preview only. Add --apply to soft-delete these fixtures and prepare real demo inventory.');return;}
 const manager=await api(auth+'/login','POST',{email:process.env.DEMO_MANAGER_EMAIL||'manager@restivio.local',password:process.env.DEMO_PASSWORD||'RestivioDemo123!'});
 const admin=await api(auth+'/login','POST',{email:process.env.DEMO_ADMIN_EMAIL||'admin@restivio.local',password:process.env.DEMO_PASSWORD||'RestivioDemo123!'});
 // Save the exact pre-change records locally. Soft deletion preserves all rows/history.
 const backupDir=path.resolve(__dirname,'../artifacts/demo');fs.mkdirSync(backupDir,{recursive:true});
 fs.writeFileSync(path.join(backupDir,'archived-hotels-'+Date.now()+'.json'),JSON.stringify(fixtures,null,2));
 for(const fixture of fixtures)await api(hotels+'/'+fixture.id,'DELETE',undefined,admin.accessToken);
 const startDate=new Date().toISOString().slice(0,10);
 const endDate=new Date(Date.now()+90*86400000).toISOString().slice(0,10);
 for(const sample of samples){
  let hotel=existing.find(h=>h.name===sample.name&&h.address===sample.address&&h.managerUserId===manager.user.id);
  if(!hotel)hotel=await api(hotels,'POST',{name:sample.name,address:sample.address,location:sample.location},manager.accessToken);
  const categories=await api(hotels+'/'+hotel.id+'/room-categories');
  for(const room of sample.rooms){
   let category=categories.find(c=>c.roomType===room.roomType);
   if(!category)category=await api(hotels+'/'+hotel.id+'/room-categories','POST',room,manager.accessToken);
   await api(hotels+'/'+hotel.id+'/room-categories/'+category.id+'/inventory/generate','POST',{startDate,endDate},manager.accessToken);
  }
 }
 console.log('Demo ready. Archived '+fixtures.length+' known test hotels; unrelated hotels and all booking history retained.');
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={isKnownFixture};
