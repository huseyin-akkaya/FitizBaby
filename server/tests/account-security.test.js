import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomUUID,randomBytes} from 'node:crypto';
import argon2 from 'argon2';
import {createApp} from '../app.js';
import {createPool,pool} from '../db/pool.js';
import {hashOptions} from '../auth/password-policy.js';
const enabled=Boolean(process.env.FITIZBABY_TEST_DATABASE_URL);
const db=enabled?createPool(process.env.FITIZBABY_TEST_DATABASE_URL):null,owner=enabled?createPool(process.env.FITIZBABY_TEST_OWNER_URL):null;
const password='Generated-security-test-original-password!',newPassword='Generated-security-test-replacement-password!';
const root='account/security';
async function api(action,target=db){
 const server=createApp(target).listen(0,'127.0.0.1');await once(server,'listening');
 const request=(path,{method='GET',data,cookie,account,headers={}}={})=>fetch('http://127.0.0.1:'+server.address().port+'/api/v1/'+path,{method,headers:{...(method!=='GET'?{Origin:'http://localhost:8080','Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...(account?{'X-FitizBaby-Account':account}:{}),...headers},body:data===undefined?undefined:JSON.stringify(data)});
 const register=async()=>{const email=randomUUID()+'@example.test';const response=await request('auth/register',{method:'POST',data:{name:'Security Test',email,password}});assert.equal(response.status,201);const user=(await response.json()).user;return{cookie:response.headers.get('set-cookie').split(';')[0],account:user.id,email};};
 const login=async(user,pass=password)=>{const response=await request('auth/login',{method:'POST',data:{email:user.email,password:pass}});assert.equal(response.status,200);return{...user,cookie:response.headers.get('set-cookie').split(';')[0]};};
 try{await action(request,register,login);}finally{await new Promise(resolve=>server.close(resolve));}
}
const list=async(request,user)=>{const response=await request(root+'/sessions',user);assert.equal(response.status,200);return(await response.json()).sessions;};
const post=(request,path,user,data)=>request(root+path,{...user,method:'POST',data});
test('Real PostgreSQL: session list is owner-only, active-only and contains no bearer tokens or hashes',{skip:!enabled},async()=>api(async(request,register,login)=>{
 const a=await register(),a2=await login(a),b=await register();
 await owner.query("INSERT INTO user_sessions(user_id,token_hash,expires_at,last_seen_at) VALUES ($1,$2,NOW()+INTERVAL '1 hour',NOW()-INTERVAL '31 minutes'),($1,$3,NOW()-INTERVAL '1 minute',NOW())",[a.account,randomBytes(32).toString('hex'),randomBytes(32).toString('hex')]);
 const sessions=await list(request,a);assert.equal(sessions.length,2);assert.equal(sessions.filter(item=>item.current).length,1);assert.equal(sessions[0].current,true);
 assert.deepEqual(Object.keys(sessions[0]).sort(),['createdAt','current','expiresAt','id','lastSeenAt']);
 const other=await list(request,b);assert.ok(sessions.every(item=>!other.some(row=>row.id===item.id)));
 assert.notEqual((await list(request,a2))[0].id,sessions[0].id);
 assert.equal((await request(root+'/sessions')).status,401);assert.equal((await request(root+'/sessions',{...a,account:b.account})).status,409);
 assert.ok(!JSON.stringify(sessions).includes(a.cookie.split('=')[1]));
}));
test('Real PostgreSQL: single-session revocation requires password, refuses current/foreign IDs and preserves other owners',{skip:!enabled},async()=>api(async(request,register,login)=>{
 const a=await register(),a2=await login(a),b=await register();const own=(await list(request,a))[0],other=(await list(request,a2))[0],foreign=(await list(request,b))[0];
 assert.equal((await post(request,'/sessions/'+other.id+'/revoke',a,{password:'wrong-password'})).status,403);
 assert.equal((await post(request,'/sessions/'+foreign.id+'/revoke',a,{password})).status,404);
 assert.equal((await post(request,'/sessions/'+own.id+'/revoke',a,{password})).status,409);
 const removed=await post(request,'/sessions/'+other.id+'/revoke',a,{password});assert.equal(removed.status,200);assert.equal(removed.headers.get('set-cookie'),null);
 assert.equal((await request('auth/account',a)).status,200);assert.equal((await request('auth/account',a2)).status,401);assert.equal((await request('auth/account',b)).status,200);
}));
test('Real PostgreSQL: revoke-others retains the current session, revokes bound export grants, and does not affect another account',{skip:!enabled},async()=>api(async(request,register,login)=>{
 const a=await register(),a2=await login(a),b=await register(),remote=(await list(request,a2))[0];
 await owner.query("INSERT INTO account_export_grants(session_id,user_id,capability_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '2 minutes')",[remote.id,a.account,randomBytes(32).toString('hex')]);
 const response=await post(request,'/sessions/revoke-others',a,{password});assert.equal(response.status,200);assert.equal(response.headers.get('set-cookie'),null);
 assert.equal((await list(request,a)).length,1);assert.equal((await request('auth/account',a2)).status,401);assert.equal((await request('auth/account',b)).status,200);
 assert.equal((await owner.query('SELECT COUNT(*)::int AS n FROM account_export_grants WHERE session_id=$1',[remote.id])).rows[0].n,0);
 assert.equal((await post(request,'/sessions/revoke-others',a,{password})).status,200);
}));
test('Real PostgreSQL: password change hashes the new password, revokes all security permissions, preserves data and other accounts',{skip:!enabled},async()=>api(async(request,register,login)=>{
 const a=await register(),a2=await login(a),b=await register(),current=(await list(request,a))[0];
 await owner.query("INSERT INTO user_favorites(user_id,product_id) VALUES ($1,'1')",[a.account]);
 await owner.query("INSERT INTO user_nutrition(user_id,key,data) VALUES ($1,'profile',$2)",[a.account,JSON.stringify({goal:'Keep this profile'})]);
 await owner.query("INSERT INTO user_products(user_id,id,data) VALUES ($1,$2,$3)",[a.account,'custom-'+randomUUID(),JSON.stringify({name:'Keep this product'})]);
 const action=(await owner.query("INSERT INTO account_actions(user_id,purpose,token_hash,expires_at) VALUES($1,'reset',$2,NOW()+INTERVAL '1 hour') RETURNING id",[a.account,randomBytes(32).toString('hex')])).rows[0];
 await owner.query("INSERT INTO mail_outbox(id,user_id,action_id,ciphertext,expires_at) VALUES($1,$2,$3,$4,NOW()+INTERVAL '1 hour')",[randomUUID(),a.account,action.id,Buffer.from('fake-encrypted-queue')]);
 await owner.query("INSERT INTO account_export_grants(session_id,user_id,capability_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '2 minutes')",[current.id,a.account,randomBytes(32).toString('hex')]);
 assert.equal((await post(request,'/password',a,{password:'wrong-password',newPassword})).status,403);
 const response=await post(request,'/password',a,{password,newPassword});assert.equal(response.status,200);assert.equal((await response.json()).changed,true);assert.equal(response.headers.get('set-cookie'),null);
 const stored=(await owner.query('SELECT password_hash,email_verified_at FROM users WHERE id=$1',[a.account])).rows[0];assert.match(stored.password_hash,/^\$argon2id\$/);assert.ok(await argon2.verify(stored.password_hash,newPassword));assert.ok(!await argon2.verify(stored.password_hash,password));assert.equal(stored.email_verified_at,null);
 for(const table of ['user_sessions','account_export_grants'])assert.equal((await owner.query('SELECT COUNT(*)::int AS n FROM '+table+' WHERE user_id=$1',[a.account])).rows[0].n,0);
 assert.equal((await owner.query('SELECT used_at FROM account_actions WHERE id=$1',[action.id])).rows[0].used_at instanceof Date,true);
 const queued=(await owner.query('SELECT state,ciphertext FROM mail_outbox WHERE user_id=$1',[a.account])).rows[0];assert.equal(queued.state,'dead');assert.equal(queued.ciphertext,null);
 for(const table of ['user_favorites','user_products','user_nutrition'])assert.equal((await owner.query('SELECT COUNT(*)::int AS n FROM '+table+' WHERE user_id=$1',[a.account])).rows[0].n,1);
 assert.equal((await request('auth/account',a)).status,401);assert.equal((await request('auth/account',a2)).status,401);assert.equal((await request('auth/account',b)).status,200);
 assert.equal((await request('auth/login',{method:'POST',data:{email:a.email,password}})).status,401);await login(a,newPassword);
}));
test('Real PostgreSQL: input, account guards, Origin and rate limits protect security mutations',{skip:!enabled},async()=>api(async(request,register)=>{
 const a=await register(),b=await register();
 assert.equal((await post(request,'/password',a,{password,newPassword:'short'})).status,400);
 assert.equal((await post(request,'/password',a,{password,newPassword:password})).status,400);
 assert.equal((await post(request,'/password',a,{password,newPassword,userId:b.account})).status,400);
 assert.equal((await post(request,'/sessions/bad-id/revoke',a,{password})).status,400);
 assert.equal((await request(root+'/password',{...a,method:'POST',data:{password,newPassword},headers:{Origin:'https://evil.example'}})).status,403);
 assert.equal((await post(request,'/password',{...a,account:b.account},{password,newPassword})).status,409);
 assert.equal((await post(request,'/sessions/revoke-others',a,{password:'wrong-password'})).status,403);
 assert.equal((await post(request,'/password',a,{password,newPassword})).status,429);
 assert.equal((await request('auth/account',a)).status,200);
}));
test('Real PostgreSQL: a changed password or revoked session cannot authorize a pending security mutation',{skip:!enabled},async()=>{
 for(const changeHash of [false,true]){
  let reached,resume,held=false;const paused=new Promise(resolve=>{reached=resolve;}),continued=new Promise(resolve=>{resume=resolve;});
  const proxy={connect:()=>db.connect(),query:async(sql,params)=>{const result=await db.query(sql,params);if(!held&&sql==='SELECT password_hash FROM users WHERE id=$1'){held=true;reached();await continued;}return result;}};
  await api(async(request,register)=>{const a=await register();const pending=post(request,'/password',a,{password,newPassword});await paused;
   try{if(changeHash)await owner.query('UPDATE users SET password_hash=$2 WHERE id=$1',[a.account,await argon2.hash('A different concurrent password change!',hashOptions)]);else await owner.query('DELETE FROM user_sessions WHERE user_id=$1',[a.account]);}finally{resume();}
   assert.equal((await pending).status,403);assert.ok(!await argon2.verify((await owner.query('SELECT password_hash FROM users WHERE id=$1',[a.account])).rows[0].password_hash,newPassword));
  },proxy);
 }
});
test('Real PostgreSQL: failed password transaction rolls back the password and session revocation',{skip:!enabled},async()=>{
 const proxy={query:(...args)=>db.query(...args),connect:async()=>{const client=await db.connect();return{release:()=>client.release(),query:(sql,params)=>{if(sql.startsWith('UPDATE account_actions SET'))throw new Error('SECRET_SECURITY_DATABASE_ERROR');return client.query(sql,params);}};}};
 await api(async(request,register)=>{const a=await register();const response=await post(request,'/password',a,{password,newPassword});assert.equal(response.status,500);assert.ok(!(await response.text()).includes('SECRET_SECURITY_DATABASE_ERROR'));assert.equal((await request('auth/account',a)).status,200);assert.ok(await argon2.verify((await owner.query('SELECT password_hash FROM users WHERE id=$1',[a.account])).rows[0].password_hash,password));},proxy);
});
test('Real PostgreSQL: stale old-password login cannot create a session after account password change',{skip:!enabled},async()=>{
 let pause,resume,held=false;const reached=new Promise(resolve=>{pause=resolve;}),continued=new Promise(resolve=>{resume=resolve;});
 const proxy={connect:()=>db.connect(),query:async(sql,params)=>{const result=await db.query(sql,params);if(!held&&sql.includes('FROM users WHERE email = $1')){held=true;pause();await continued;}return result;}};
 await api(async(request,register)=>{const a=await register();const pending=request('auth/login',{method:'POST',data:{email:a.email,password}});await reached;try{assert.equal((await post(request,'/password',a,{password,newPassword})).status,200);}finally{resume();}assert.equal((await pending).status,401);assert.equal((await owner.query('SELECT COUNT(*)::int AS n FROM user_sessions WHERE user_id=$1',[a.account])).rows[0].n,0);},proxy);
});
test.after(async()=>{await db?.end();await owner?.end();await pool?.end();});
