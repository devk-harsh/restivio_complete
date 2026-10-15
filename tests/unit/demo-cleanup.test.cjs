const {isKnownFixture}=require('../../scripts/prepare-demo.cjs');
const uuid='2a4a8ed1-c8cd-4bd4-8302-4e21635565dd';
test('only exact legacy test signatures are selected for demo cleanup',()=>{
 expect(isKnownFixture({name:'Admin '+uuid,address:'a',location:'b'})).toBe(true);
 expect(isKnownFixture({name:'Integration '+uuid,address:'Test Road',location:'Goa'})).toBe(true);
 expect(isKnownFixture({name:'Owned hotel updated',address:'Test Road',location:'Admin updated'})).toBe(true);
});
test('ordinary hotels and similarly named user properties are retained',()=>{
 for(const hotel of [
  {name:'Integration Suites',address:'Test Road',location:'Goa'},
  {name:'Admin '+uuid,address:'Real address',location:'Goa'},
  {name:'Restivio Demo Hotel',address:'12 Demo Beach Road',location:'Goa'},
  {name:'Owned hotel updated',address:'User address',location:'Admin updated'},
  {name:'Frontend Verification Hotel',address:'Different address',location:'Goa'},
 ]) expect(isKnownFixture(hotel)).toBe(false);
});
