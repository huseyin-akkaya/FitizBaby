import {collectRecentProducts,recentPortion} from '../../src/utils/recentProducts.js';
import {buildWeeklyRhythm,rhythmWeekStart,shiftRhythmDay} from '../../src/utils/weeklyRhythm.js';
import {getSchema} from '../nutrition/schema.js';
import {waterTotal,waterProgress,crossedWaterMilestone,waterHistory,newWaterOverflow} from '../../src/utils/water.js';
import {mealPreview,appendSavedMeal} from '../../src/utils/savedMeals.js';
import {shouldOfferOnboarding,validateInitialTargets,validateInitialProfile} from '../../src/utils/onboarding.js';
import {buildHistory,historyDates} from '../../src/utils/historySummary.js';
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

test('History separates no record, cleared days, missing nutrition and actual zero; averages exclude partial days',()=>{
 const documents=[{key:'day:2026-11-20',data:{...empty(),breakfast:[entry(2,snapshot(),100)]}},{key:'day:2026-11-21',data:{...empty(),breakfast:[entry(2,{...snapshot(),protein:null},100)]}},{key:'day:2026-11-22',data:empty()}];
 const history=buildHistory(documents,'2026-11-22',7);
 assert.equal(history.loggedDays,2);assert.equal(history.averages.calories.value,360);assert.equal(history.averages.calories.days,2);assert.equal(history.averages.protein.days,1);assert.equal(history.averages.protein.value,14);assert.equal(history.averages.protein.partialDays,1);
 assert.equal(history.days[0].saved,false);assert.equal(history.days.at(-1).saved,true);assert.equal(history.days.at(-1).entryCount,0);assert.equal(history.frequent[0].entries,2);assert.equal(history.frequent[0].days,2);
 const zero=buildHistory([{key:'day:2026-11-22',data:{...empty(),breakfast:[entry(2,{...snapshot(),protein:0})]}}],'2026-11-22',7);assert.equal(zero.averages.protein.value,0);assert.equal(zero.averages.protein.days,1);
 assert.deepEqual(historyDates('2024-03-01',3),['2024-02-28','2024-02-29','2024-03-01']);
});
test('Real PostgreSQL: history is owner-only, bounded, strict and uses saved historical nutrition',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),b=await register();await seed(a,'day:2026-11-20',{...empty(),breakfast:[entry(2,snapshot(),100)]});await seed(a,'day:2026-11-21',{...empty(),breakfast:[entry(2,{...snapshot(),protein:null},100)]});await seed(a,'day:2026-11-22',empty());await seed(a,'day:2026-10-01',{...empty(),breakfast:[entry(2)]});await seed(b,'day:2026-11-20',{...empty(),breakfast:[entry(7,snapshot(7,'Private other owner'),100)]});
 const path='nutrition/history?end=2026-11-22&days=7';assert.equal((await request(path)).status,401);assert.equal((await request(path,{...a,account:b.account})).status,409);
 const response=await request(path,a);assert.equal(response.status,200);const result=await response.json();assert.equal(result.userId,a.account);assert.equal(result.history.days.length,7);assert.equal(result.history.loggedDays,2);assert.equal(result.history.averages.calories.value,360);assert.equal(result.history.averages.protein.days,1);assert.equal(result.history.frequent[0].name,'Historical oats');assert.ok(!JSON.stringify(result).includes('Private other owner'));
 for(const query of ['end=2026-02-30&days=7','end=2026-11-22&days=3650','end=2026-11-22&days=7&userId='+b.account,'end=1900-01-01&days=30'])assert.equal((await request('nutrition/history?'+query,a)).status,400);
 assert.equal((await (await request('nutrition/history?end=2026-11-22&days=30',a)).json()).history.days.length,30);
}));

test('Onboarding offers only a fresh or unfinished account and validates optional targets and profiles',()=>{
 const state={days:[],docs:{onboarding:{data:null},targets:{data:null},plan:{data:null},profile:{data:null}}};
 assert.equal(shouldOfferOnboarding(state),true);assert.equal(shouldOfferOnboarding({...state,days:['2026-11-25']}),false);assert.equal(shouldOfferOnboarding({...state,docs:{...state.docs,targets:{data:{calories:2200}}}}),false);
 for(const status of ['completed','skipped'])assert.equal(shouldOfferOnboarding({...state,docs:{...state.docs,onboarding:{data:{status}}}}),false);
 assert.equal(shouldOfferOnboarding({...state,days:['2026-11-25'],docs:{...state.docs,onboarding:{data:{status:'in-progress'}}}}),true);
 assert.ok(validateInitialTargets({calories:'',protein:'',carbs:'',fat:''}));assert.ok(validateInitialTargets({calories:Infinity}));assert.equal(validateInitialTargets({calories:2200,protein:'',carbs:0,fat:''}),'');
 assert.ok(validateInitialProfile({age:15,height:180,weight:80,sex:'male',activity:'active',goal:'maintain'}));
});
test('Real PostgreSQL: onboarding is private, revision protected, schema strict, and completion survives a new session',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),b=await register(),path='nutrition/onboarding';const put=(user,data,revision=null)=>request(path,{...user,method:'PUT',data:{data,revision}});
 assert.equal((await request(path)).status,401);const initial={version:1,status:'in-progress',step:1};let response=await put(a,initial);assert.equal(response.status,200);const first=(await response.json()).document;
 assert.equal((await request(path,{...a,account:b.account})).status,409);assert.equal((await (await request(path,b)).json()).document.data,null);assert.equal((await put(a,{...initial,step:2})).status,409);
 for(const extra of [{step:4},{step:-1},{version:2},{status:'other'},{status:'completed',step:1},{userId:b.account}])assert.equal((await put(a,{...initial,...extra},first.revision)).status,400);
 response=await put(a,{version:1,status:'completed',step:3},first.revision);assert.equal(response.status,200);
 const bootstrap=await(await request('nutrition?day=2026-11-25',a)).json();assert.equal(bootstrap.documents.find(doc=>doc.key==='onboarding').data.status,'completed');assert.equal(bootstrap.documents.find(doc=>doc.key==='targets').data,null);
 assert.equal((await request('nutrition/import/onboarding',{...a,method:'POST',data:{data:initial}})).status,400);
}));

test('Saved meals preview unknowns and prevent duplicate or over-limit additions without changing originals',()=>{
 const entries=[entry(2)],day={...empty(),breakfast:[entry(2)]},original=structuredClone(day);
 assert.throws(()=>appendSavedMeal(day,'breakfast',entries));assert.deepEqual(day,original);
 assert.throws(()=>appendSavedMeal({...empty(),breakfast:Array.from({length:100},(_,i)=>entry(i+1))},'lunch',[entry(101)]));
 const next=appendSavedMeal(day,'lunch',entries);assert.equal(next.lunch.length,1);assert.notEqual(next.lunch[0].id,entries[0].id);assert.equal(next.lunch[0].snapshot,undefined);assert.deepEqual(day,original);
 assert.equal(mealPreview(entries,[]).unavailable.length,1);assert.equal(mealPreview(entries,[]).totals.protein.missing,1);
});
test('Real PostgreSQL: meal templates are private, bounded, revision-safe and snapshots cannot be forged',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),b=await register(),meal={id:randomUUID(),name:'My breakfast',entries:[entry(2)]};
 const put=(data,revision=null,user=a)=>request('nutrition/meals',{...user,method:'PUT',data:{data,revision}});
 let response=await put({items:[meal]});assert.equal(response.status,200);let doc=(await response.json()).document;assert.equal(doc.data.items[0].entries[0].snapshot.name,products.find(item=>item.id===2).name);
 assert.equal((await(await request('nutrition/meals',b)).json()).document.data,null);assert.equal((await request('nutrition/meals',{...a,account:b.account})).status,409);
 assert.equal((await put({items:[]})).status,409);assert.equal((await put({items:[{...meal,entries:[meal.entries[0],{...entry(2),id:randomUUID()}]}]},doc.revision)).status,400);
 assert.equal((await put({items:[{...meal,entries:[{...entry(2),amount:0}]}]},doc.revision)).status,400);
 response=await put({items:[{...doc.data.items[0],name:'Updated',entries:doc.data.items[0].entries.map(item=>({...item,amount:50,snapshot:{...item.snapshot,protein:99}}))}]},doc.revision);assert.equal(response.status,200);doc=(await response.json()).document;assert.notEqual(doc.data.items[0].entries[0].snapshot.protein,99);assert.equal(doc.data.items[0].entries[0].amount,50);
 const unknown='custom-'+randomUUID();assert.equal((await put({items:[{...meal,entries:[entry(unknown)]}]},doc.revision)).status,400);
 assert.equal((await request('nutrition/import/meals',{...a,method:'POST',data:{data:{items:[]}}})).status,400);
 assert.equal((await put({items:[]},doc.revision)).status,200);
}));

test('Water progress caps at the chosen target, never invents a goal, and keeps missing history separate from zero',()=>{
 assert.equal(waterProgress(500,null),null);assert.equal(waterProgress(500,0),null);assert.equal(waterProgress(1250,1000),100);
 const seen=new Set();assert.equal(crossedWaterMilestone(0,250,1000,seen),25);seen.add(25);assert.equal(crossedWaterMilestone(0,250,1000,seen),null);assert.equal(crossedWaterMilestone(500,250,1000,seen),null);assert.equal(crossedWaterMilestone(1000,1500,1000,seen),null);
 const history=waterHistory([{key:'water:2026-11-25',data:{entries:[{ml:250}]}},{key:'water:2026-11-24',data:{entries:[]}}],['2026-11-23','2026-11-24','2026-11-25']);assert.equal(history.days[0].ml,null);assert.equal(history.days[1].ml,0);assert.equal(history.average,250);assert.equal(history.loggedDays,1);assert.equal(waterTotal(null),0);
});
test('Real PostgreSQL: water entries and settings are account-private, revision-safe, bounded and timestamped by the server',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),b=await register(),key='water:2026-11-25',item={id:randomUUID(),ml:250,at:'2000-01-01T00:00:00.000Z'};
 const put=(key,data,revision=null,user=a)=>request('nutrition/'+key,{...user,method:'PUT',data:{data,revision}});
 assert.equal((await request('nutrition/'+key)).status,401);let response=await put(key,{entries:[item]});assert.equal(response.status,200);let doc=(await response.json()).document;assert.notEqual(doc.data.entries[0].at,item.at);const originalAt=doc.data.entries[0].at;
 assert.equal((await(await request('nutrition/'+key,b)).json()).document.data,null);assert.equal((await request('nutrition/'+key,{...a,account:b.account})).status,409);assert.equal((await put(key,{entries:[]})).status,409);
 for(const entries of [[{...item,ml:-1}],[{...item,ml:0}],[{...item,ml:2001}],[{...item,ml:1.5}],[item,item],Array.from({length:11},()=>({...item,id:randomUUID(),ml:2000}))])assert.equal((await put(key,{entries},doc.revision)).status,400);
 response=await put(key,{entries:[{...item,ml:500}]},doc.revision);assert.equal(response.status,200);doc=(await response.json()).document;assert.equal(doc.data.entries[0].at,originalAt);
 const settings={targetMl:1000,color:'sky',reminders:false,interval:60};assert.equal((await put('water-settings',settings)).status,200);assert.equal((await put('water-settings',{...settings,targetMl:10001})).status,400);
 const history=(await(await request('nutrition/history?end=2026-11-25&days=7',a)).json()).history;assert.equal(history.water.loggedDays,1);assert.equal(history.water.average,500);assert.equal(history.loggedDays,0);
 assert.equal((await request('nutrition/import/'+key,{...a,method:'POST',data:{data:{entries:[item]}}})).status,400);
 assert.equal((await put(key,{entries:[]},doc.revision)).status,200);assert.equal((await request('nutrition/water:2026-02-30',a)).status,400);
}));

test('Water overflow uses only newly saved excess, with backward-compatible strict settings',()=>{
 assert.equal(newWaterOverflow(900,1100,1000),100);
 assert.equal(newWaterOverflow(1100,1350,1000),250);
 assert.equal(newWaterOverflow(1100,900,1000),0);
 assert.equal(newWaterOverflow(0,500,null),0);
 assert.equal(newWaterOverflow(0,1000,1000),0);
 const schema=getSchema('water-settings'),old={targetMl:1000,color:'mint',reminders:false,interval:60};
 assert.deepEqual(schema.parse(old),{...old,playful:true,overflow:true});
 assert.equal(schema.parse({...old,playful:false,overflow:false}).playful,false);
 assert.equal(schema.safeParse({...old,playful:'true'}).success,false);
 assert.equal(schema.safeParse({...old,overflow:1}).success,false);
});


test('Weekly rhythm counts distinct saved meal days, calendar weeks and returns without nutrition or water targets',()=>{
 const doc=day=>({key:'day:'+day,data:{...empty(),breakfast:[entry()]}});
 const records=['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01'].map(doc);
 records.push(doc('2027-01-01'),doc('2027-01-10'),{key:'water:2027-01-02',data:{entries:[{ml:20000}]}},{key:'day:2027-01-02',data:{...empty(),breakfast:[entry(2,null,0)]}});
 const result=buildWeeklyRhythm(records,'2027-01-03');
 assert.equal(result.start,'2026-12-28');assert.equal(result.end,'2027-01-03');assert.equal(result.days.length,7);assert.equal(result.loggedDays,5);assert.equal(result.totalLoggedDays,5);
 assert.deepEqual(result.eligible,{'first-meal':'2026-12-28','week-three':'2026-12-30','week-five':'2027-01-01'});
 assert.equal(rhythmWeekStart('2024-02-29'),'2024-02-26');assert.equal(shiftRhythmDay('2024-02-28',1),'2024-02-29');
 const spread=buildWeeklyRhythm(['2026-12-27','2026-12-28','2027-01-03'].map(doc),'2027-01-03');assert.equal(spread.eligible['week-three'],undefined);assert.equal(spread.eligible['welcome-back'],'2027-01-03');
 const future=buildWeeklyRhythm([doc('2027-01-05')],'2027-01-04');assert.equal(future.totalLoggedDays,0);assert.equal(future.days.filter(d=>d.future).length,6);
 const packaged=doc('2027-01-01');packaged.data.breakfast=[{...entry(2,null),mode:'package',packageSize:200,packageCount:.5}];assert.equal(buildWeeklyRhythm([packaged],'2027-01-01').loggedDays,1);
});
test('Real PostgreSQL: rhythm is private, server-earned, repeat-safe under concurrency, retained after deletion and rejects forged journals',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),b=await register(),today=new Date().toISOString().slice(0,10),start=shiftRhythmDay(rhythmWeekStart(today),-7);
 const claim=(user=a,data={day:today},extra={})=>request('nutrition/rhythm',{...user,method:'POST',data,...extra});
 assert.equal((await request('nutrition/rhythm',{method:'POST',data:{day:today}})).status,401);
 let response=await claim();assert.equal(response.status,200);assert.equal((await response.json()).rhythm.unlocked.length,0);
 for(let i=0;i<5;i++)await seed(a,'day:'+shiftRhythmDay(start,i),{...empty(),breakfast:[entry(2,snapshot(2,'PRIVATE_RHYTHM_PRODUCT'),100)]});
 await seed(a,'day:'+today,{...empty(),lunch:[entry()]});await seed(b,'water:'+today,{entries:[{id:randomUUID(),ml:2000,at:new Date().toISOString()}]});
 const replies=await Promise.all(Array.from({length:4},()=>claim()));const results=await Promise.all(replies.map(r=>r.json()));assert.ok(replies.every(r=>r.status===200));assert.equal(results.reduce((n,r)=>n+r.rhythm.newlyUnlocked.length,0),4);assert.ok(results.every(r=>r.userId===a.account&&r.rhythm.unlocked.length===4));assert.ok(!JSON.stringify(results).includes('PRIVATE_RHYTHM_PRODUCT'));
 const before=(await owner.query("SELECT data,revision FROM user_nutrition WHERE user_id=$1 AND key='rhythm'",[a.account])).rows[0];assert.equal(new Set(before.data.unlocked.map(x=>x.id)).size,4);assert.ok(before.data.unlocked.every(x=>x.earnedAt&&x.achievedOn<=today));
 const other=(await(await claim(b)).json()).rhythm;assert.equal(other.unlocked.length,0);assert.equal(other.totalLoggedDays,0);
 assert.equal((await claim({...a,account:b.account})).status,409);assert.equal((await claim(a,{day:today},{headers:{Origin:'https://untrusted.example'}})).status,403);
 for(const data of [{day:'2026-02-30'},{day:shiftRhythmDay(today,3)},{day:today,userId:b.account},{day:today,unlocked:[{id:'week-five'}]}])assert.equal((await claim(a,data)).status,400);
 for(const [method,path,data] of [['PUT','nutrition/rhythm',{revision:null,data:{version:1,unlocked:[{id:'week-five'}]}}],['POST','nutrition/import/rhythm',{data:{unlocked:[]}}],['GET','nutrition/rhythm',undefined]])assert.equal((await request(path,{...a,method,data})).status,400);
 await owner.query("UPDATE user_nutrition SET data=$2 WHERE user_id=$1 AND key LIKE 'day:%'",[a.account,JSON.stringify(empty())]);
 const after=(await(await claim()).json()).rhythm;assert.equal(after.loggedDays,0);assert.equal(after.newlyUnlocked.length,0);assert.deepEqual(after.unlocked,before.data.unlocked);
 assert.equal((await owner.query("SELECT revision FROM user_nutrition WHERE user_id=$1 AND key='rhythm'",[a.account])).rows[0].revision,before.revision);
}));
test('Real PostgreSQL: a revoked session cannot earn rhythm badges after waiting for the user lock',{skip:!enabled},async()=>{
 let reached,resume,held=false;const paused=new Promise(resolve=>{reached=resolve;}),continued=new Promise(resolve=>{resume=resolve;});
 const proxy={query:(...args)=>db.query(...args),connect:async()=>{const client=await db.connect();return{release:()=>client.release(),query:async(sql,params)=>{const result=await client.query(sql,params);if(!held&&sql==='SELECT id FROM users WHERE id=$1 FOR UPDATE'){held=true;reached();await continued;}return result;}};}};
 await api(async(request,register)=>{const a=await register(),today=new Date().toISOString().slice(0,10);await seed(a,'day:'+today,{...empty(),breakfast:[entry()]});const pending=request('nutrition/rhythm',{...a,method:'POST',data:{day:today}});await paused;try{await owner.query('DELETE FROM user_sessions WHERE user_id=$1',[a.account]);}finally{resume();}assert.equal((await pending).status,401);assert.equal((await owner.query("SELECT COUNT(*)::int AS n FROM user_nutrition WHERE user_id=$1 AND key='rhythm'",[a.account])).rows[0].n,0);},proxy);
});
test('Real PostgreSQL: failed rhythm awards roll back and never expose database diagnostics',{skip:!enabled},async()=>{
 const proxy={query:(...args)=>db.query(...args),connect:async()=>{const client=await db.connect();return{release:()=>client.release(),query:(sql,params)=>{if(sql.startsWith("INSERT INTO user_nutrition (user_id,key,data) VALUES ($1,'rhythm'"))throw new Error('PRIVATE_RHYTHM_DIAGNOSTIC');return client.query(sql,params);}};}};
 await api(async(request,register)=>{const a=await register(),today=new Date().toISOString().slice(0,10);await seed(a,'day:'+today,{...empty(),breakfast:[entry()]});const response=await request('nutrition/rhythm',{...a,method:'POST',data:{day:today}});assert.equal(response.status,500);assert.ok(!(await response.text()).includes('PRIVATE_RHYTHM_DIAGNOSTIC'));assert.equal((await owner.query("SELECT COUNT(*)::int AS n FROM user_nutrition WHERE user_id=$1 AND key='rhythm'",[a.account])).rows[0].n,0);},proxy);
});


test('Recent products deduplicate saved portions, convert packages and never assume an unknown or changed unit',()=>{
 const catalog=Array.from({length:9},(_,i)=>({id:i+1,serving:i===0?'100 ml':'100 g'}));
 const row=(id,amount,extra={})=>({productId:id,day:'2026-11-25',meal:'snacks',mode:'custom',amount,serving:'100 g',...extra});
 const items=collectRecentProducts([row(99,100),row(1,200,{serving:'100 ml'}),row(1,300,{serving:'100 ml'}),row(2,0,{mode:'package',packageSize:125.5,packageCount:2}),row(3,0),row(3,15),row(4,20,{serving:null}),row(5,1,{mode:'package',packageSize:100000,packageCount:100}),row(6,50),row(7,70)],catalog);
 assert.equal(items.length,6);assert.deepEqual(items.map(x=>x.productId),[1,2,3,4,5,6]);assert.equal(items[0].amount,200);assert.equal(items[1].amount,251);assert.equal(items[4].amount,null);
 assert.equal(recentPortion(items[0],catalog[0]),200);assert.equal(recentPortion(items[1],catalog[1]),251);assert.equal(recentPortion(items[3],catalog[3]),null);assert.equal(recentPortion(items[0],{...catalog[0],serving:'100 g'}),null);assert.equal(recentPortion({...items[0],amount:.01},catalog[0]),null);
});
test('Real PostgreSQL: recent products are owner-only, bounded, ordered, private and read-only',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),b=await register(),ownId='custom-'+randomUUID(),foreignId='custom-'+randomUUID(),deletedId='custom-'+randomUUID(),end='2026-11-25';
 for(const [user,id,deleted] of [[a,ownId,false],[b,foreignId,false],[a,deletedId,true]])await owner.query('INSERT INTO user_products(user_id,id,data,deleted_at) VALUES($1,$2,$3,$4)',[user.account,id,JSON.stringify({name:'PRIVATE_PRODUCT',serving:'100 ml'}),deleted?new Date():null]);
 const data={...empty(),breakfast:[entry(2,snapshot(2),80),entry(1,{...snapshot(1),serving:'100 ml'},200)],dinner:[entry(ownId,{...snapshot(ownId),serving:'100 g'},45),entry(foreignId,snapshot(foreignId),50),entry(deletedId,snapshot(deletedId),50)],snacks:[{...entry(2),mode:'package',packageSize:125.5,packageCount:2},entry(3,snapshot(3),10.1)]};
 await seed(a,'day:'+end,data);await seed(a,'day:2026-11-24',{...empty(),breakfast:[entry(2,snapshot(2),20),entry(6,null,25)]});await seed(a,'day:2026-10-26',{...empty(),breakfast:[entry(8,snapshot(8),10)]});await seed(a,'day:2026-11-26',{...empty(),breakfast:[entry(9,snapshot(9),10)]});await seed(b,'day:'+end,{...empty(),breakfast:[entry(8,snapshot(8,'OTHER_ACCOUNT_SECRET'),100)]});
 const before=(await owner.query('SELECT data,revision,updated_at FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,'day:'+end])).rows[0],path='nutrition/recent-products?end='+end;
 assert.equal((await request(path)).status,401);assert.equal((await request(path,{...a,account:b.account})).status,409);
 const response=await request(path,a);assert.equal(response.status,200);const result=await response.json();assert.equal(result.userId,a.account);assert.equal(result.recent.start,'2026-10-27');assert.deepEqual(result.recent.items.map(x=>x.productId),[3,2,ownId,1,6]);assert.equal(result.recent.items[1].amount,251);assert.equal(result.recent.items[2].serving,'100 g');assert.equal(result.recent.items[4].serving,null);assert.ok(!JSON.stringify(result).includes('snapshot'));assert.ok(!JSON.stringify(result).includes('PRIVATE_PRODUCT'));assert.ok(!JSON.stringify(result).includes('OTHER_ACCOUNT_SECRET'));
 assert.deepEqual((await owner.query('SELECT data,revision,updated_at FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,'day:'+end])).rows[0],before);
 assert.deepEqual((await(await request(path,b)).json()).recent.items.map(x=>x.productId),[8]);
 for(const query of ['','?end=2026-02-30','?end=1900-01-01','?end='+end+'&userId='+b.account,'?end='+end+'&limit=999','?end='+end+'&end='+end])assert.equal((await request('nutrition/recent-products'+query,a)).status,400);
 await owner.query('UPDATE user_nutrition SET data=$3 WHERE user_id=$1 AND key=$2',[a.account,'day:'+end,JSON.stringify({...empty(),breakfast:products.slice(0,10).map(p=>entry(p.id,{...snapshot(p.id),serving:p.serving},100))})]);
 assert.equal((await(await request(path,a)).json()).recent.items.length,6);
}));
test('Real PostgreSQL: quick additions reject changed reference units atomically and preserve historical snapshots',{skip:!enabled},()=>api(async(request,register)=>{
 const a=await register(),key='day:2026-11-25',id='custom-'+randomUUID(),oldSnapshot={...snapshot(id),serving:'100 g'};
 await owner.query('INSERT INTO user_products(user_id,id,data) VALUES($1,$2,$3)',[a.account,id,JSON.stringify({name:'Current product',brand:'Fixture',serving:'100 ml',calories:10,protein:1,carbs:1,fat:0})]);
 const previous={...empty(),breakfast:[entry(id,oldSnapshot,40)]};await seed(a,'day:2026-11-24',previous);const next={...empty(),breakfast:[entry(id,undefined,40)]},reference={entryId:next.breakfast[0].id,serving:'100 g'};
 const put=body=>request('nutrition/'+key,{...a,method:'PUT',data:body});
 let response=await put({revision:null,data:next,reference});assert.equal(response.status,409);assert.equal((await response.json()).error.code,'UNIT_CHANGED');assert.equal((await owner.query('SELECT COUNT(*)::int AS n FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,key])).rows[0].n,0);
 response=await put({revision:null,data:next,reference:{...reference,serving:'100 ml'}});assert.equal(response.status,200);const saved=(await response.json()).document;assert.equal(saved.data.breakfast[0].snapshot.serving,'100 ml');assert.equal(saved.data.breakfast[0].snapshot.calories,10);assert.equal(Object.hasOwn(saved.data,'reference'),false);
 assert.deepEqual((await owner.query('SELECT data FROM user_nutrition WHERE user_id=$1 AND key=$2',[a.account,'day:2026-11-24'])).rows[0].data,previous);
 for(const ref of [reference,{entryId:randomUUID(),serving:'100 ml'},{entryId:randomUUID(),serving:'kg'}])assert.equal((await put({revision:saved.revision,data:saved.data,reference:ref})).status,400);
 assert.equal((await request('nutrition/targets',{...a,method:'PUT',data:{revision:null,data:{calories:2000,protein:'',carbs:'',fat:''},reference}})).status,400);
}));
