import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomBytes,randomUUID} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import argon2 from 'argon2';
import sharp from 'sharp';
import {createApp} from '../app.js';
import {createPool,pool} from '../db/pool.js';
import {hashOptions} from '../auth/password-policy.js';
import {writeLocalMail,localMailDirectory} from '../mail/local-mail.js';
import {removeLocalAccountMail} from '../mail/cleanup-local.js';
const integration=Boolean(process.env.FITIZBABY_TEST_DATABASE_URL);
const database=integration?createPool(process.env.FITIZBABY_TEST_DATABASE_URL):null;
const owner=integration?createPool(process.env.FITIZBABY_TEST_OWNER_URL):null;
const password='Account-data-test-original-password!';
async function api(action,target=database){
 const server=createApp(target).listen(0,'127.0.0.1');await once(server,'listening');
 const request=(path,{method='GET',data,cookie,account,headers={}}={})=>fetch('http://127.0.0.1:'+server.address().port+'/api/v1/'+path,{method,headers:{...(!['GET','HEAD'].includes(method)?{Origin:'http://localhost:8080','Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(account?{'X-FitizBaby-Account':account}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
 const register=async()=>{const email=randomUUID()+'@example.test';const result=await request('auth/register',{method:'POST',data:{name:'Account Data Test',email,password}});assert.equal(result.status,201);const user=(await result.json()).user;return{cookie:result.headers.get('set-cookie').split(';')[0],account:user.id,email};};
 try{await action(request,register);}finally{await new Promise(resolve=>server.close(resolve));}
}
const prepare=async(request,user,pass=password)=>{const result=await request('account/export',{...user,method:'POST',data:{password:pass}});if(result.ok){user.exportCookie=result.headers.get('set-cookie')?.split(';')[0];assert.match(result.headers.get('set-cookie'),/HttpOnly/);assert.match(result.headers.get('set-cookie'),/SameSite=Strict/);}return result;};
const withExport=user=>({...user,cookie:user.cookie+'; '+user.exportCookie});
const remove=(request,user,pass=password,confirmation='HESABIMI SIL')=>request('account',{...user,method:'DELETE',data:{password:pass,confirmation}});
async function seed(user,label){
 const id='custom-'+randomUUID(),image=await sharp({create:{width:2,height:2,channels:3,background:'#33aa66'}}).webp().toBuffer();
 await owner.query('INSERT INTO user_products(user_id,id,data,image) VALUES ($1,$2,$3,$4)',[user.account,id,JSON.stringify({name:label,brand:'Test',category:'Kahvaltılık',serving:'100 g',calories:100,protein:10,carbs:10,fat:2,ingredientsText:'Yulaf'}),image]);
 await owner.query('INSERT INTO user_favorites(user_id,product_id) VALUES ($1,$2)',[user.account,id]);
 await owner.query('INSERT INTO user_nutrition(user_id,key,data) VALUES ($1,$2,$3)',[user.account,'profile',JSON.stringify({goal:label,calories:2100,protein:100,carbs:240,fat:60})]);
 await owner.query("INSERT INTO user_nutrition(user_id,key,data) VALUES ($1,'rhythm',$2)",[user.account,JSON.stringify({version:1,unlocked:[{id:'first-meal',earnedAt:'2026-11-25T12:00:00Z',achievedOn:'2026-11-25'}]})]);
 const action=(await owner.query("INSERT INTO account_actions(user_id,purpose,token_hash,expires_at) VALUES ($1,'verify',$2,NOW()+INTERVAL '1 day') RETURNING id",[user.account,randomBytes(32).toString('hex')])).rows[0];
 await owner.query("INSERT INTO mail_outbox(id,user_id,action_id,ciphertext,expires_at) VALUES ($1,$2,$3,$4,NOW()+INTERVAL '30 minutes')",[randomUUID(),user.account,action.id,Buffer.from('NEVER_EXPORT_QUEUE_SECRET')]);
 return {id,image,actionId:action.id};
}
test('Export connection failures release the concurrency slot and never expose errors',async()=>{
 const account=randomUUID(),fake={query:async()=>({rows:[{id:account,display_name:'Test',email:'test@example.test',role:'member'}]}),connect:async()=>{throw new Error('SECRET_CONNECTION_DETAIL');}};
 await api(async request=>{for(let i=0;i<3;i+=1){const response=await request('account/export?account='+account,{cookie:'fitizbaby_session='+'A'.repeat(43)+'; fitizbaby_export='+'B'.repeat(43)});assert.equal(response.status,500);assert.ok(!(await response.text()).includes('SECRET_CONNECTION_DETAIL'));}},fake);
});
test('Real PostgreSQL: export is password-protected, owner-only, compressed, consistent and excludes secrets',{skip:!integration},async()=>api(async(request,register)=>{
 const a=await register(),b=await register();const own=await seed(a,'ONLY_ACCOUNT_A'),other=await seed(b,'ONLY_ACCOUNT_B');
 try{
  assert.equal((await request('account/export',{method:'POST',data:{password}})).status,401);
  assert.equal((await request('account/export?account='+a.account,a)).status,403);
  assert.equal((await prepare(request,a,'wrong-password')).status,403);
  assert.equal((await request('account/export',{...a,method:'POST',data:{password,userId:b.account}})).status,400);
  assert.equal((await request('account/export',{...a,account:b.account,method:'POST',data:{password}})).status,409);
  const prepared=await prepare(request,a);assert.equal(prepared.status,200);const url=(await prepared.json()).downloadUrl;
  assert.equal((await request(url.replace('/api/v1/',''),b)).status,409);
  assert.equal((await request('account/export?account='+b.account,b)).status,403);
  assert.equal((await request(url.replace('/api/v1/',''),a)).status,403);
  assert.equal((await request(url.replace('/api/v1/',''),{...withExport(a),method:'HEAD'})).status,405);
  const exported=await request(url.replace('/api/v1/',''),withExport(a));assert.equal(exported.status,200);assert.equal(exported.headers.get('cache-control'),'no-store');assert.match(exported.headers.get('content-disposition'),/^attachment; filename="fitizbaby-account-[0-9-]+\.json\.gz"/);assert.match(exported.headers.get('content-type'),/^application\/gzip/);
  const text=gunzipSync(Buffer.from(await exported.arrayBuffer())).toString('utf8'),data=JSON.parse(text);assert.equal(data.format,'fitizbaby.account-export');assert.equal(data.account.id,a.account);assert.equal(data.account.email,a.email);assert.equal(data.products.length,1);assert.equal(data.products[0].id,own.id);assert.deepEqual(Buffer.from(data.products[0].image.split(',')[1],'base64'),own.image);assert.deepEqual(data.favorites,[own.id]);assert.equal(data.nutrition[0].data.goal,'ONLY_ACCOUNT_A');assert.equal(data.nutrition.find(item=>item.key==='rhythm').data.unlocked[0].id,'first-meal');
  for(const secret of ['ONLY_ACCOUNT_B',other.id,b.email,'password_hash','token_hash','NEVER_EXPORT_QUEUE_SECRET','RESEND_API_KEY','MAIL_OUTBOX_KEY'])assert.ok(!text.includes(secret),secret+' leaked');
  assert.equal((await request(url.replace('/api/v1/',''),withExport(a))).status,403);
 }finally{await owner.query('UPDATE account_actions SET used_at=NOW() WHERE id=ANY($1::uuid[])',[[own.actionId,other.actionId]]);}
}));
test('Real PostgreSQL: download grants are session-bound, expire, and reject cross-site requests',{skip:!integration},async()=>api(async(request,register)=>{
 const a=await register();const login=await request('auth/login',{method:'POST',data:{email:a.email,password}}),second={...a,cookie:login.headers.get('set-cookie').split(';')[0]};
 await prepare(request,a);
 assert.equal((await request('account/export?account='+a.account,{...second,cookie:second.cookie+'; '+a.exportCookie})).status,403);
 assert.equal((await request('account/export?account='+a.account,{...withExport(a),headers:{'Sec-Fetch-Site':'cross-site'}})).status,403);
 await owner.query("UPDATE account_export_grants SET expires_at=NOW()-INTERVAL '1 second' WHERE user_id=$1",[a.account]);
 assert.equal((await request('account/export?account='+a.account,withExport(a))).status,403);
}));
test('Real PostgreSQL: deletion requires confirmation and password, cascades only its owner and cleans local demo mail',{skip:!integration},async()=>api(async(request,register)=>{
 const a=await register(),b=await register(),own=await seed(a,'DELETE_ACCOUNT_A'),other=await seed(b,'KEEP_ACCOUNT_B');
 const budget='test:'+randomUUID().slice(0,12);await owner.query('INSERT INTO mail_usage(window_key,reserved) VALUES ($1,5)',[budget]);
 await writeLocalMail({to:a.email,subject:'Account A',text:'A_PRIVATE_LOCAL_LINK'});await writeLocalMail({to:b.email,subject:'Account B',text:'B_PRIVATE_LOCAL_LINK'});
 try{
  assert.equal((await remove(request,a,password,'DELETE')).status,400);assert.equal((await remove(request,a,'wrong-password')).status,403);
  assert.equal((await request('account',{...a,method:'DELETE',data:{password,confirmation:'HESABIMI SIL',userId:b.account}})).status,400);
  await prepare(request,a);
  const deleted=await remove(request,a);assert.equal(deleted.status,200);assert.deepEqual(await deleted.json(),{deleted:true,warnings:[]});assert.equal(deleted.headers.get('set-cookie'),null);
  for(const table of ['users','user_sessions','user_products','user_favorites','user_nutrition','account_actions','mail_outbox','account_export_grants']){const key=table==='users'?'id':'user_id';const result=await owner.query('SELECT COUNT(*)::int AS count FROM '+table+' WHERE '+key+'=$1',[a.account]);assert.equal(result.rows[0].count,0,table+' did not cascade');}
  assert.equal((await request('auth/account',a)).status,401);assert.equal((await request('auth/account',b)).status,200);assert.equal((await owner.query('SELECT COUNT(*)::int AS count FROM user_products WHERE user_id=$1',[b.account])).rows[0].count,1);
  assert.equal((await owner.query('SELECT reserved FROM mail_usage WHERE window_key=$1',[budget])).rows[0].reserved,5);
  const contents=await Promise.all((await readdir(localMailDirectory())).filter(file=>file.endsWith('.json')).map(file=>readFile(join(localMailDirectory(),file),'utf8')));assert.ok(contents.every(text=>!text.includes(a.email)));assert.ok(contents.some(text=>text.includes(b.email)));
  assert.equal((await request('auth/login',{method:'POST',data:{email:a.email,password}})).status,401);
 }finally{await removeLocalAccountMail(a.email);await removeLocalAccountMail(b.email);await owner.query('UPDATE account_actions SET used_at=NOW() WHERE id=$1',[other.actionId]);void own;}
}));
test('Real PostgreSQL: a revoked session or changed password cannot complete a pending deletion',{skip:!integration},async()=>{
 let pause,proceed;const reached=new Promise(resolve=>{pause=resolve;}),resume=new Promise(resolve=>{proceed=resolve;});let held=false;
 const proxy={connect:()=>database.connect(),query:async(sql,params)=>{const result=await database.query(sql,params);if(!held&&sql==='SELECT password_hash FROM users WHERE id=$1'){held=true;pause();await resume;}return result;}};
 await api(async(request,register)=>{const a=await register();const pending=remove(request,a);await reached;try{const hash=await argon2.hash('Replacement-account-test-password!',hashOptions);await owner.query('UPDATE users SET password_hash=$2 WHERE id=$1',[a.account,hash]);await owner.query('DELETE FROM user_sessions WHERE user_id=$1',[a.account]);}finally{proceed();}assert.equal((await pending).status,403);assert.equal((await owner.query('SELECT COUNT(*)::int AS count FROM users WHERE id=$1',[a.account])).rows[0].count,1);},proxy);
});
test.after(async()=>{await database?.end();await owner?.end();await pool?.end();});
