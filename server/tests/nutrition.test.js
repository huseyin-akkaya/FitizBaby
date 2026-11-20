import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createApp } from '../app.js';
import { createPool,pool } from '../db/pool.js';
import { mealRecipes } from '../../src/data/mealRecipes.js';
import { dateSchema,getSchema } from '../nutrition/schema.js';
const integration=Boolean(process.env.FITIZBABY_TEST_DATABASE_URL);
const database=integration?createPool(process.env.FITIZBABY_TEST_DATABASE_URL):null;
const owner=integration?createPool(process.env.FITIZBABY_TEST_OWNER_URL):null;
const day='day:2026-11-20';
const emptyDay=()=>({breakfast:[],lunch:[],dinner:[],snacks:[]});
const entry=productId=>({id:randomUUID(),productId,mode:'custom',amount:100,packageSize:'',packageCount:1});
const profile={goal:'Dengeli beslenme',calories:2100,protein:110,carbs:240,fat:65};
const product={name:'Tarihsel Ürün',brand:'Test',category:'Kahvaltılık',serving:'100 g',calories:100,protein:10,carbs:10,fat:2,ingredientsText:'Yulaf',image:''};
async function api(action){
 const server=createApp(database).listen(0,'127.0.0.1');await once(server,'listening');
 const request=(path,{method='GET',data,cookie,account,raw,headers={}}={})=>fetch('http://127.0.0.1:'+server.address().port+'/api/v1/'+path,{method,headers:{...(!['GET','HEAD'].includes(method)?{Origin:'http://localhost:8080','Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(account?{'X-FitizBaby-Account':account}:{}),...headers},body:raw??(data===undefined?undefined:JSON.stringify(data))});
 const user=async()=>{const result=await request('auth/register',{method:'POST',data:{name:'Beslenme Testi',email:randomUUID()+'@example.test',password:'Nutrition-generated-testing-passphrase!'}});assert.equal(result.status,201);return {cookie:result.headers.get('set-cookie').split(';')[0],account:(await result.json()).user.id};};
 try{await action(request,user);}finally{await new Promise(resolve=>server.close(resolve));}
}
test('Nutrition schema validates real dates, bounded profiles and duplicate meal products',()=>{
 assert.equal(dateSchema.safeParse('2026-02-30').success,false);assert.equal(dateSchema.safeParse('2028-02-29').success,true);
 assert.equal(getSchema('profile').safeParse({...profile,userId:randomUUID()}).success,false);
 assert.equal(getSchema('profile').safeParse({...profile,calories:Infinity}).success,false);
 assert.equal(getSchema(day).safeParse({...emptyDay(),breakfast:[entry(1),entry(1)]}).success,false);
});
test('Real PostgreSQL: nutrition ownership, validation, revision conflicts and repeat-safe imports', {skip:!integration},async()=>api(async(request,user)=>{
 assert.equal((await request('nutrition?day=2026-11-20')).status,401);
 assert.equal((await request('nutrition/profile',{method:'PUT',raw:'x'.repeat(300000)})).status,401);
 const a=await user(),b=await user();
 const read=async(account,key)=> (await (await request('nutrition/'+encodeURIComponent(key),account)).json()).document;
 const save=(account,key,data,revision=null)=>request('nutrition/'+encodeURIComponent(key),{...account,method:'PUT',data:{revision,data}});
 const result=await save(a,'profile',profile);assert.equal(result.status,200);const initial=(await result.json()).document;
 assert.equal((await read(b,'profile')).data,null);
 assert.equal((await request('nutrition/profile',{...b,account:a.account})).status,409);
 assert.equal((await save(a,'profile',{...profile,userId:b.account},initial.revision)).status,400);
 assert.equal((await save(a,'profile',{...profile,calories:2300})).status,409);
 assert.equal((await save(a,'profile',{...profile,calories:2300},initial.revision)).status,200);
 const imported=await request('nutrition/import/profile',{...a,method:'POST',data:{data:profile}});
 assert.equal((await imported.json()).imported,false);assert.equal((await read(a,'profile')).data.calories,2300);
 const plan={profile:{age:30,sex:'male',height:180,weight:80,activity:'active',goal:'maintain',bmi:''},macros:{calories:2300,protein:120,carbs:250,fat:70},mealCount:3,plan:[{slotId:'breakfast',label:'Kahvaltı',category:mealRecipes[0].category,recipeId:mealRecipes[0].id,portionScale:1}],calculationVersion:3};
 assert.equal((await save(a,'plan',plan)).status,200);
 assert.equal((await save(a,'plan',{...plan,profile:{...plan.profile,age:12}},(await read(a,'plan')).revision)).status,400);
 assert.equal((await save(a,'day:2026-02-30',emptyDay())).status,400);
 const tooMany={...emptyDay(),breakfast:Array.from({length:101},(_,index)=>entry(index+1))};
 assert.equal((await save(a,day,tooMany)).status,400);
 assert.equal((await request('nutrition/profile',{...a,method:'PUT',raw:JSON.stringify({data:'x'.repeat(270000)})})).status,413);
 const permissions=(await database.query("SELECT has_column_privilege(current_user,'user_nutrition','user_id','UPDATE') AS reassign,has_column_privilege(current_user,'user_nutrition','key','UPDATE') AS rename,has_table_privilege(current_user,'user_nutrition','DELETE') AS purge")).rows[0];assert.deepEqual(permissions,{reassign:false,rename:false,purge:false});
}));
test('Real PostgreSQL: historical snapshots survive catalog edits and deletion; forged snapshots cannot replace them',{skip:!integration},async()=>api(async(request,user)=>{
 const a=await user(),b=await user(),id='custom-'+randomUUID();
 const created=await request('products',{...a,method:'POST',data:{id,product}});assert.equal(created.status,201);let item=(await created.json()).product;
 const firstEntry=entry(id);
 const saved=await request('nutrition/'+encodeURIComponent(day),{...a,method:'PUT',data:{revision:null,data:{...emptyDay(),breakfast:[{...firstEntry,snapshot:null}]}}});
 assert.equal(saved.status,200);let document=(await saved.json()).document;
 assert.equal(document.data.breakfast[0].snapshot.calories,100);assert.equal(document.data.breakfast[0].snapshot.source,'catalog-at-entry');
 const edited=await request('products/'+id,{...a,method:'PUT',data:{revision:item.revision,product:{...product,calories:900,image:null}}});assert.equal(edited.status,200);item=(await edited.json()).product;
 const tampered={...document.data,breakfast:[{...document.data.breakfast[0],amount:200,snapshot:{...document.data.breakfast[0].snapshot,calories:900}}]};
 const update=await request('nutrition/'+encodeURIComponent(day),{...a,method:'PUT',data:{revision:document.revision,data:tampered}});assert.equal(update.status,200);document=(await update.json()).document;
 assert.equal(document.data.breakfast[0].snapshot.calories,100);assert.equal(document.data.breakfast[0].amount,200);
 assert.equal((await request('products/'+id,{...a,method:'DELETE',data:{revision:item.revision}})).status,200);
 const after=(await (await request('nutrition/'+encodeURIComponent(day),a)).json()).document;assert.equal(after.data.breakfast[0].snapshot.name,product.name);assert.equal(after.data.breakfast[0].snapshot.calories,100);
 const ownMissing=await request('nutrition/'+encodeURIComponent('day:2026-11-21'),{...a,method:'PUT',data:{revision:null,data:{...emptyDay(),breakfast:[entry(id)]}}});assert.equal(ownMissing.status,400);
 const foreign=await request('nutrition/'+encodeURIComponent(day),{...b,method:'PUT',data:{revision:null,data:{...emptyDay(),breakfast:[entry(id)]}}});assert.equal(foreign.status,400);
 assert.equal((await (await request('nutrition/'+encodeURIComponent(day),b)).json()).document.data,null);
}));
test('Real PostgreSQL: legacy imports mark approximations, preserve unresolved amounts and do not resurrect cleared days',{skip:!integration},async()=>api(async(request,user)=>{
 const a=await user();const missing='custom-'+randomUUID();const data={...emptyDay(),breakfast:[entry(1)],dinner:[entry(missing)]};
 const result=await request('nutrition/import/'+encodeURIComponent(day),{...a,method:'POST',data:{data}});assert.equal(result.status,200);let doc=(await result.json()).document;
 assert.equal(doc.data.breakfast[0].snapshot.source,'catalog-at-import');assert.equal(doc.data.dinner[0].snapshot,null);assert.equal(doc.data.dinner[0].amount,100);
 const reset=await request('nutrition/'+encodeURIComponent(day),{...a,method:'PUT',data:{revision:doc.revision,data:emptyDay()}});assert.equal(reset.status,200);
 const repeat=await request('nutrition/import/'+encodeURIComponent(day),{...a,method:'POST',data:{data}});assert.equal((await repeat.json()).imported,false);
 assert.deepEqual((await (await request('nutrition/'+encodeURIComponent(day),a)).json()).document.data,emptyDay());
 const count=(await owner.query('SELECT count(*)::int AS count FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,day])).rows[0].count;assert.equal(count,1);
}));
test.after(async()=>{await database?.end();await owner?.end();await pool?.end();});
