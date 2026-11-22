import {products} from '../../src/data/products.js';
import {captureNutrition} from '../../src/utils/mealSnapshots.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import {createApp} from '../app.js';
import {createPool,pool} from '../db/pool.js';
import {summarizeDay,savedTargets,previousDay,validDay} from '../../src/utils/todaySummary.js';
const enabled=Boolean(process.env.FITIZBABY_TEST_DATABASE_URL),db=enabled?createPool(process.env.FITIZBABY_TEST_DATABASE_URL):null,owner=enabled?createPool(process.env.FITIZBABY_TEST_OWNER_URL):null;
const empty=()=>({breakfast:[],lunch:[],dinner:[],snacks:[]});
const snapshot=(id=2,name='Historical oats')=>({id,name,brand:'Fixture',serving:'100 g',calories:360,protein:14,carbs:53,fat:7.5,capturedAt:'2026-01-01T12:00:00.000Z',source:'catalog-at-entry'});
const entry=(productId=2,saved=snapshot(productId),amount=100)=>({id:randomUUID(),productId,mode:'custom',amount,packageSize:'',packageCount:1,snapshot:saved});
async function api(action,target=db){const server=createApp(target).listen(0,'127.0.0.1');await once(server,'listening');const ids=[];
 const request=(path,{method='GET',data,cookie,account,headers={}}={})=>fetch('http://127.0.0.1:'+server.address().port+'/api/v1/'+path,{method,headers:{...(method!=='GET'?{Origin:'http://localhost:8080','Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(account?{'X-FitizBaby-Account':account}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
 const register=async()=>{const response=await request('auth/register',{method:'POST',data:{name:'Today Test',email:randomUUID()+'@example.test',password:'Synthetic-today-test-password!'}});assert.equal(response.status,201);const id=(await response.json()).user.id;ids.push(id);return{account:id,cookie:response.headers.get('set-cookie').split(';')[0]};};
 try{await action(request,register);}finally{await new Promise(resolve=>server.close(resolve));for(const id of ids)await owner.query('DELETE FROM users WHERE id=$1',[id]);}
}
async function seed(user,key,data){return(await owner.query('INSERT INTO user_nutrition(user_id,key,data) VALUES($1,$2,$3) RETURNING revision',[user.account,key,JSON.stringify(data)])).rows[0].revision;}
const copy=(request,user,data,extra={})=>request('nutrition/copy-day',{...user,method:'POST',data,...extra});
test('Today summary preserves historical nutrition, signals unknown values, and handles packages and zero targets',()=>{
 const day=empty();day.breakfast=[entry(2,snapshot(2),50),entry(999,null,100)];day.lunch=[{...entry(3,{...snapshot(3),calories:100,protein:null}),mode:'package',packageSize:200,packageCount:.5}];
 const result=summarizeDay(day,[{id:2,serving:'100 g',calories:999,protein:99}]);assert.equal(result.entryCount,3);assert.equal(result.totals.calories.value,280);assert.equal(result.totals.calories.missing,1);assert.equal(result.totals.protein.value,7);assert.equal(result.totals.protein.missing,2);
 assert.equal(savedTargets(null).calories,null);assert.equal(savedTargets({calories:'',protein:'0',fat:-1}).calories,null);assert.equal(savedTargets({protein:'0'}).protein,0);assert.equal(savedTargets({fat:-1}).fat,null);
});
test('Today summary never substitutes the current catalog for missing saved nutrition',()=>{
 const day=empty();day.breakfast=[{productId:2,mode:'custom',amount:100}];const result=summarizeDay(day,[{id:2,name:'Changed product',serving:'100 g',calories:999,protein:99,carbs:0,fat:0}]);assert.equal(result.totals.calories.value,0);assert.equal(result.totals.calories.missing,1);
});
test('Today dates handle leap days and reject malformed tracker dates',()=>{assert.equal(previousDay('2024-03-01'),'2024-02-29');assert.equal(previousDay('2025-01-01'),'2024-12-31');assert.equal(validDay('2025-02-29'),false);assert.equal(validDay('2024-02-29'),true);assert.equal(validDay('2026-11-22<script>'),false);});
test('Real PostgreSQL: copying preserves source snapshots, deleted products, unknown nutrition and existing target entries; repeat copying is safe',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),b=await register(),source=empty(),target=empty();const deleted='custom-'+randomUUID();
 source.breakfast=[entry(2),entry(4,snapshot(4,'Old yogurt'))];source.lunch=[entry(deleted,snapshot(deleted,'Deleted private product')),entry(999,null)];target.breakfast=[entry(2,snapshot(2),25)];
 const before=structuredClone(source),oldTarget=structuredClone(target),sr=await seed(a,'day:2026-11-21',source),tr=await seed(a,'day:2026-11-22',target);await seed(b,'day:2026-11-22',{...empty(),dinner:[entry(7)]});
 const options={sourceDay:'2026-11-21',targetDay:'2026-11-22',sourceRevision:sr,revision:tr,meals:['breakfast','lunch']};
 const response=await copy(request,a,options);assert.equal(response.status,200);const result=await response.json();assert.equal(result.copied,3);assert.equal(result.skipped,1);assert.equal(result.document.data.breakfast[0].amount,25);assert.equal(result.document.data.breakfast[0].id,oldTarget.breakfast[0].id);
 assert.deepEqual(result.document.data.breakfast[1].snapshot,source.breakfast[1].snapshot);assert.notEqual(result.document.data.breakfast[1].id,source.breakfast[1].id);assert.equal(result.document.data.lunch[1].snapshot,null);assert.equal(result.document.data.lunch[0].snapshot.name,'Deleted private product');
 assert.deepEqual((await owner.query('SELECT data FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,'day:2026-11-21'])).rows[0].data,before);
 const again=await copy(request,a,{...options,revision:result.document.revision});assert.equal(again.status,200);const second=await again.json();assert.equal(second.copied,0);assert.equal(second.skipped,4);assert.equal(second.document.revision,result.document.revision);
 assert.equal((await owner.query('SELECT data FROM user_nutrition WHERE user_id=$1 AND key=$2',[b.account,'day:2026-11-22'])).rows[0].data.dinner.length,1);
}));
test('Real PostgreSQL: copy rejects foreign ownership, injected fields, stale revisions and untrusted Origins',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),b=await register(),data={...empty(),breakfast:[entry()]},sr=await seed(a,'day:2026-11-21',data);
 const input={sourceDay:'2026-11-21',targetDay:'2026-11-22',sourceRevision:sr,revision:null,meals:['breakfast']};
 assert.equal((await copy(request,{},input)).status,401);assert.equal((await copy(request,b,input)).status,404);assert.equal((await copy(request,{...a,account:b.account},input)).status,409);
 for(const extra of [{userId:b.account},{snapshot:snapshot()},{targetDay:'2026-11-23'},{meals:['breakfast','breakfast']}])assert.equal((await copy(request,a,{...input,...extra})).status,400);
 assert.equal((await copy(request,a,input,{headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await copy(request,a,{...input,sourceRevision:randomUUID()})).status,409);
 const tr=await seed(a,'day:2026-11-22',empty());assert.equal((await copy(request,a,input)).status,409);
 await owner.query('UPDATE user_nutrition SET revision=$3 WHERE user_id=$1 AND key=$2',[a.account,'day:2026-11-21',randomUUID()]);assert.equal((await copy(request,a,{...input,revision:tr})).status,409);
 assert.deepEqual((await owner.query('SELECT data FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,'day:2026-11-22'])).rows[0].data,empty());
}));
test('Real PostgreSQL: copy validates the combined day size and daily record quota without partial writes',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),source={...empty(),breakfast:[entry(200,null)]},target={...empty(),breakfast:Array.from({length:100},(_,index)=>entry(index+1,null))};
 const sr=await seed(a,'day:2026-11-21',source),tr=await seed(a,'day:2026-11-22',target);const input={sourceDay:'2026-11-21',targetDay:'2026-11-22',sourceRevision:sr,revision:tr,meals:['breakfast']};
 assert.equal((await copy(request,a,input)).status,400);assert.equal((await owner.query('SELECT data FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,'day:2026-11-22'])).rows[0].data.breakfast.length,100);
 const b=await register(),bsr=await seed(b,'day:2026-11-21',source);await owner.query("INSERT INTO user_nutrition(user_id,key,data) SELECT $1,'day:'||to_char(DATE '2000-01-01'+n,'YYYY-MM-DD'),$2::jsonb FROM generate_series(0,3658)n",[b.account,JSON.stringify(empty())]);
 assert.equal((await copy(request,b,{...input,sourceRevision:bsr,revision:null})).status,409);assert.equal((await owner.query('SELECT COUNT(*)::int AS n FROM user_nutrition WHERE user_id=$1 AND key=$2',[b.account,'day:2026-11-22'])).rows[0].n,0);
}));
test('Real PostgreSQL: a revoked session cannot complete a copy after waiting for the user lock',{skip:!enabled},async()=>{
 let reached,resume,held=false;const paused=new Promise(resolve=>{reached=resolve;}),continued=new Promise(resolve=>{resume=resolve;});
 const proxy={query:(...args)=>db.query(...args),connect:async()=>{const client=await db.connect();return{release:()=>client.release(),query:async(sql,params)=>{const result=await client.query(sql,params);if(!held&&sql==='SELECT id FROM users WHERE id=$1 FOR UPDATE'){held=true;reached();await continued;}return result;}};}};
 await api(async(request,register)=>{const a=await register(),sr=await seed(a,'day:2026-11-21',{...empty(),breakfast:[entry()]});const pending=copy(request,a,{sourceDay:'2026-11-21',targetDay:'2026-11-22',sourceRevision:sr,revision:null,meals:['breakfast']});await paused;try{await owner.query('DELETE FROM user_sessions WHERE user_id=$1',[a.account]);}finally{resume();}assert.equal((await pending).status,401);assert.equal((await owner.query('SELECT COUNT(*)::int AS n FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,'day:2026-11-22'])).rows[0].n,0);},proxy);
});
test('Real PostgreSQL: copy database failure rolls back and never exposes private diagnostics',{skip:!enabled},async()=>{
 const proxy={query:(...args)=>db.query(...args),connect:async()=>{const client=await db.connect();return{release:()=>client.release(),query:(sql,params)=>{if(sql.startsWith('INSERT INTO user_nutrition(user_id,key,data)'))throw new Error('PRIVATE_COPY_DIAGNOSTIC');return client.query(sql,params);}};}};
 await api(async(request,register)=>{const a=await register(),source={...empty(),breakfast:[entry()]},sr=await seed(a,'day:2026-11-21',source);const response=await copy(request,a,{sourceDay:'2026-11-21',targetDay:'2026-11-22',sourceRevision:sr,revision:null,meals:['breakfast']});assert.equal(response.status,500);assert.ok(!(await response.text()).includes('PRIVATE_COPY_DIAGNOSTIC'));assert.equal((await owner.query('SELECT COUNT(*)::int AS n FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,'day:2026-11-22'])).rows[0].n,0);assert.deepEqual((await owner.query('SELECT data FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,'day:2026-11-21'])).rows[0].data,source);},proxy);
});
test.after(async()=>{await db?.end();await owner?.end();await pool?.end();});

test('Real PostgreSQL: quantity and deletion preserve snapshots; explicit refresh verifies the preview and changes only one saved entry',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),b=await register(),key='day:2026-11-22',data={...empty(),breakfast:[entry(6,{...snapshot(6,'Old peanut butter'),protein:null}),entry(2)]};
 let revision=await seed(a,key,data);const put=(body,user=a)=>request('nutrition/'+encodeURIComponent(key),{...user,method:'PUT',data:body});
 data.breakfast[0].amount=50;let response=await put({revision,data});assert.equal(response.status,200);let doc=(await response.json()).document;assert.equal(doc.data.breakfast[0].amount,50);assert.deepEqual(doc.data.breakfast[0].snapshot,data.breakfast[0].snapshot);
 const refresh={entryId:data.breakfast[0].id,preview:captureNutrition(products.find(item=>item.id===6))};
 assert.equal((await put({revision:doc.revision,data,refresh:{...refresh,preview:{...refresh.preview,protein:99}}})).status,409);
 assert.equal((await put({revision:doc.revision,data,refresh:{...refresh,entryId:randomUUID()}})).status,400);
 assert.equal((await put({revision:doc.revision,data,refresh},b)).status,409);
 response=await put({revision:doc.revision,data,refresh});assert.equal(response.status,200);doc=(await response.json()).document;assert.equal(doc.data.breakfast[0].snapshot.protein,25.5);assert.equal(doc.data.breakfast[0].amount,50);assert.deepEqual(doc.data.breakfast[1].snapshot,data.breakfast[1].snapshot);
 assert.equal((await put({revision,data:doc.data})).status,409);
 data.breakfast=doc.data.breakfast.slice(1);response=await put({revision:doc.revision,data});assert.equal(response.status,200);doc=(await response.json()).document;assert.equal(doc.data.breakfast.length,1);assert.equal(doc.data.breakfast[0].productId,2);
}));
