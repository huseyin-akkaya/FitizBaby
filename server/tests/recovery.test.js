import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createHash,randomUUID } from 'node:crypto';
import argon2 from 'argon2';
import { createApp } from '../app.js';
import { createPool,pool } from '../db/pool.js';
const integration=Boolean(process.env.FITIZBABY_TEST_DATABASE_URL);
const database=integration?createPool(process.env.FITIZBABY_TEST_DATABASE_URL):null;
const owner=integration?createPool(process.env.FITIZBABY_TEST_OWNER_URL):null;
const password='Recovery-test-original-passphrase!';
const nextPassword='Recovery-test-new-secret-passphrase!';
const tokenOf=mail=>new URL(mail.text.match(/https?:\/\/\S+/)[0]).hash.slice(7);
async function api(action,target=database,delivery) {
 const mails=[];const server=createApp(target,{deliverLocalMail:delivery|| (async message=>{mails.push(message);})}).listen(0,'127.0.0.1');await once(server,'listening');
 const request=(path,{data,cookie,account,method=data===undefined?'GET':'POST',headers={}}={})=>fetch('http://127.0.0.1:'+server.address().port+'/api/v1/auth/'+path,{method,headers:{...(method!=='GET'?{Origin:'http://localhost:8080','Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(account?{'X-FitizBaby-Account':account}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
 const register=async()=>{const email=randomUUID()+'@example.test';const response=await request('register',{data:{name:'Kurtarma Testi',email,password}});assert.equal(response.status,201);return{email,cookie:response.headers.get('set-cookie').split(';')[0],...(await response.json()).user};};
 try{await action(request,register,mails);}finally{await new Promise(resolve=>server.close(resolve));}
}
test('Recovery configuration refuses production local mail, remote links and public-directory mail storage',()=>{
 const cases=[
  {NODE_ENV:'production',MAIL_MODE:'local',APP_PUBLIC_URL:'https://localhost',FRONTEND_ORIGINS:'https://localhost'},
  {NODE_ENV:'test',MAIL_MODE:'local',API_HOST:'127.0.0.1',APP_PUBLIC_URL:'https://external.example',FRONTEND_ORIGINS:'https://external.example'},
  {NODE_ENV:'test',MAIL_MODE:'local',API_HOST:'127.0.0.1',APP_PUBLIC_URL:'http://localhost:8080',FRONTEND_ORIGINS:'http://localhost:8080',LOCAL_MAIL_DIR:resolve('public/local-messages')},
  {NODE_ENV:'test',MAIL_MODE:'local',API_HOST:'127.0.0.1',APP_PUBLIC_URL:'http://localhost:8080',FRONTEND_ORIGINS:'http://localhost:8080',LOCAL_MAIL_DIR:resolve('..local-messages')},
 ];
 for(const config of cases){const result=spawnSync(process.execPath,['--input-type=module','-e',"import('./server/config.js').then(()=>process.exit(0)).catch(()=>process.exit(12))"],{env:{...process.env,...config},stdio:'ignore',windowsHide:true});assert.equal(result.status,12);}
});
test('Recovery rejects unexpected fields, foreign Origin and excessive guesses',async()=>api(async request=>{
 assert.equal((await request('forgot-password',{data:{email:'a@example.test',userId:randomUUID()}})).status,400);
 assert.equal((await request('forgot-password',{data:{email:'a@example.test'},headers:{Origin:'https://evil.example'}})).status,403);
 for(let i=0;i<30;i+=1)assert.equal((await request('verify-email',{data:{token:'bad'}})).status,400);
 assert.equal((await request('verify-email',{data:{token:'bad'}})).status,429);
},null));
test('Real PostgreSQL: verification is purpose-bound, hashed, single-use and does not log a user in',{skip:!integration},async()=>api(async(request,register,mails)=>{
 const a=await register();assert.equal(a.emailVerified,false);
 assert.equal((await request('request-verification',{data:{}})).status,401);
 assert.equal((await request('request-verification',{data:{},cookie:a.cookie,account:randomUUID()})).status,409);
 const response=await request('request-verification',{data:{},cookie:a.cookie,account:a.id});assert.equal(response.status,202);
 assert.equal(mails.length,1);const token=tokenOf(mails[0]);assert.match(token,/^[A-Za-z0-9_-]{43}$/);
 assert.ok(!JSON.stringify(await response.json()).includes(token));
 const stored=(await owner.query('SELECT token_hash,expires_at FROM account_actions WHERE user_id=$1',[a.id])).rows[0];assert.equal(stored.token_hash,createHash('sha256').update(token).digest('hex'));assert.notEqual(stored.token_hash,token);assert.ok(stored.expires_at>Date.now());
 assert.equal((await request('verify-email',{method:'GET'})).status,404);
 assert.equal((await request('reset-password',{data:{token,password:nextPassword}})).status,400);
 const done=await request('verify-email',{data:{token}});assert.equal(done.status,200);assert.equal(done.headers.get('set-cookie'),null);
 assert.equal((await request('verify-email',{data:{token}})).status,400);
 assert.equal((await(await request('me',{cookie:a.cookie})).json()).user.emailVerified,true);
 assert.equal((await(await request('me')).json()).user,null);
}));
test('Real PostgreSQL: expired links, resend cooldown and generic unknown-email responses',{skip:!integration},async()=>api(async(request,register,mails)=>{
 const a=await register();const known=await request('forgot-password',{data:{email:a.email}}),unknown=await request('forgot-password',{data:{email:'absent-'+randomUUID()+'@example.test'}});
 assert.equal(known.status,202);assert.equal(unknown.status,202);assert.deepEqual(await known.json(),await unknown.json());assert.equal(mails.length,1);
 const token=tokenOf(mails[0]);
 assert.equal((await request('forgot-password',{data:{email:a.email}})).status,202);assert.equal(mails.length,1);
 await owner.query("UPDATE account_actions SET expires_at=NOW()-INTERVAL '1 second',created_at=NOW()-INTERVAL '61 seconds' WHERE user_id=$1",[a.id]);
 assert.equal((await request('reset-password',{data:{token,password:nextPassword}})).status,400);
 await request('forgot-password',{data:{email:a.email}});assert.equal(mails.length,2);
 assert.equal((await request('reset-password',{data:{token:tokenOf(mails[1]),password:'short'}})).status,400);
 assert.equal((await request('reset-password',{data:{token:tokenOf(mails[1]),password:nextPassword}})).status,200);
}));
test('Real PostgreSQL: password reset revokes all owner sessions and tokens but preserves other users and data',{skip:!integration},async()=>api(async(request,register,mails)=>{
 const a=await register(),b=await register();
 const login=await request('login',{data:{email:a.email,password}});const secondCookie=login.headers.get('set-cookie').split(';')[0];
 await owner.query('INSERT INTO user_favorites (user_id,product_id) VALUES ($1,$2)',[a.id,'1']);
 await request('request-verification',{data:{},cookie:a.cookie,account:a.id});const verifyToken=tokenOf(mails[0]);
 await request('forgot-password',{data:{email:a.email}});const token=tokenOf(mails[1]);
 const concurrent=await Promise.all([1,2].map(()=>request('reset-password',{data:{token,password:nextPassword}})));assert.deepEqual(concurrent.map(response=>response.status).sort(),[200,400]);
 assert.equal((await request('account',{cookie:a.cookie})).status,401);assert.equal((await request('account',{cookie:secondCookie})).status,401);assert.equal((await request('account',{cookie:b.cookie})).status,200);
 assert.equal((await request('verify-email',{data:{token:verifyToken}})).status,400);
 assert.equal((await request('login',{data:{email:a.email,password}})).status,401);
 const fresh=await request('login',{data:{email:a.email,password:nextPassword}});assert.equal(fresh.status,200);assert.equal((await fresh.json()).user.emailVerified,true);
 const stored=(await owner.query('SELECT password_hash,role FROM users WHERE id=$1',[a.id])).rows[0];assert.ok(await argon2.verify(stored.password_hash,nextPassword));assert.equal(stored.role,'member');
 assert.equal((await owner.query('SELECT COUNT(*)::int AS count FROM user_favorites WHERE user_id=$1',[a.id])).rows[0].count,1);
 const permissions=(await database.query("SELECT has_column_privilege(current_user,'account_actions','expires_at','UPDATE') AS extend,has_column_privilege(current_user,'account_actions','user_id','UPDATE') AS move,has_column_privilege(current_user,'users','role','UPDATE') AS promote")).rows[0];assert.deepEqual(permissions,{extend:false,move:false,promote:false});
}));
test('Real PostgreSQL: a stale old-password login cannot create a session after a reset',{skip:!integration},async()=>{
 let paused=false,releaseLookup,continueLogin;
 const lookupReached=new Promise(resolve=>{releaseLookup=resolve;});const proceed=new Promise(resolve=>{continueLogin=resolve;});
 const proxy={connect:()=>database.connect(),query:async(sql,params)=>{const result=await database.query(sql,params);if(!paused&&sql.startsWith('SELECT id, display_name, email, password_hash')){paused=true;releaseLookup();await proceed;}return result;}};
 await api(async(request,register,mails)=>{
  const a=await register();await request('forgot-password',{data:{email:a.email}});const token=tokenOf(mails[0]);
  const stale=request('login',{data:{email:a.email,password}});await lookupReached;
  try{assert.equal((await request('reset-password',{data:{token,password:nextPassword}})).status,200);}finally{continueLogin();}
  assert.equal((await stale).status,401);assert.equal((await owner.query('SELECT COUNT(*)::int AS count FROM user_sessions WHERE user_id=$1',[a.id])).rows[0].count,0);
 },proxy);
});
test('Real PostgreSQL: failed local delivery rolls back token replacement without exposing the failure',{skip:!integration},async()=>{
 const delivered=[];let broken=false;
 await api(async(request,register)=>{
  const a=await register();await request('forgot-password',{data:{email:a.email}});const original=tokenOf(delivered[0]);
  await owner.query("UPDATE account_actions SET created_at=NOW()-INTERVAL '61 seconds' WHERE user_id=$1",[a.id]);
  broken=true;const failed=await request('forgot-password',{data:{email:a.email}});assert.equal(failed.status,202);assert.ok(!(await failed.text()).includes('TEST_DELIVERY_FAILURE'));
  assert.equal((await request('reset-password',{data:{token:original,password:nextPassword}})).status,200);
 },database,async message=>{if(broken)throw new Error('TEST_DELIVERY_FAILURE');delivered.push(message);});
});
test.after(async()=>{await database?.end();await owner?.end();await pool?.end();});
