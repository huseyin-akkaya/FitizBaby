import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {createApp} from '../app.js';
import {env} from '../config.js';
import {createPool,pool} from '../db/pool.js';
import {sendResend} from '../mail/resend.js';
import {encryptMail,decryptMail,enqueueMail,processOneMail} from '../mail/outbox.js';
import {writePrivateSettings} from '../security/private-settings.js';
const integration=Boolean(process.env.FITIZBABY_TEST_DATABASE_URL)&&env.MAIL_MODE==='resend';
const database=integration?createPool(process.env.FITIZBABY_TEST_DATABASE_URL):null;
const owner=integration?createPool(process.env.FITIZBABY_TEST_OWNER_URL):null;
const settings={...env,MAIL_MODE:'resend',RESEND_API_KEY:'re_unit_test_not_a_real_key',RESEND_TEST_RECIPIENT:'provider-owner@example.test',MAIL_OUTBOX_KEY:randomBytes(32).toString('base64'),MAIL_DAILY_LIMIT:50,MAIL_MONTHLY_LIMIT:1000};
const message={to:settings.RESEND_TEST_RECIPIENT,subject:'FitizBaby Test',text:'https://localhost/verify-email#token='+randomBytes(32).toString('base64url')};
test('Provider request is HTTPS, one-recipient, idempotent, and strips provider error details',async()=>{
 const jobId=randomUUID(),calls=[];const fetcher=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify({id:'test-message-id'}),{status:200});};
 assert.equal((await sendResend({...message,to:'blocked@example.test'},jobId,{settings,fetcher})).code,'RECIPIENT_BLOCKED');assert.equal(calls.length,0);
 for(let i=0;i<2;i+=1)assert.equal((await sendResend(message,jobId,{settings,fetcher})).ok,true);
 assert.equal(calls[0].url,'https://api.resend.com/emails');assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.headers.Authorization,'Bearer '+settings.RESEND_API_KEY);assert.equal(calls[0].options.headers['Idempotency-Key'],calls[1].options.headers['Idempotency-Key']);assert.deepEqual(JSON.parse(calls[0].options.body).to,[settings.RESEND_TEST_RECIPIENT]);
 for(const [status,retry] of [[403,false],[429,true],[500,true]]){const result=await sendResend(message,jobId,{settings,fetcher:async()=>new Response(JSON.stringify({message:'SECRET_PROVIDER_DETAIL'}),{status})});assert.equal(result.retry,retry);assert.ok(!JSON.stringify(result).includes('SECRET_PROVIDER_DETAIL'));}
 const network=await sendResend(message,jobId,{settings,fetcher:async()=>{throw new Error('SECRET_NETWORK_DETAIL');}});assert.equal(network.retry,true);assert.ok(!JSON.stringify(network).includes('SECRET_NETWORK_DETAIL'));
});
test('Encrypted outbox detects tampering, wrong keys and record swapping',()=>{
 const id=randomUUID(),action=randomUUID(),data=encryptMail(message,id,action,settings.MAIL_OUTBOX_KEY);
 assert.ok(!data.includes(Buffer.from(message.text)));assert.deepEqual(decryptMail(data,id,action,settings.MAIL_OUTBOX_KEY),message);
 assert.throws(()=>decryptMail(data,randomUUID(),action,settings.MAIL_OUTBOX_KEY));assert.throws(()=>decryptMail(data,id,action,randomBytes(32).toString('base64')));const bad=Buffer.from(data);bad[bad.length-1]^=1;assert.throws(()=>decryptMail(bad,id,action,settings.MAIL_OUTBOX_KEY));
});
test('Private settings are atomically created, never overwritten, and load without printing keys',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'fitizbaby-mail-config-'));const file=join(directory,'.env.mail');
 const text=Object.entries({MAIL_MODE:'resend',RESEND_API_KEY:settings.RESEND_API_KEY,RESEND_TEST_RECIPIENT:settings.RESEND_TEST_RECIPIENT,MAIL_OUTBOX_KEY:settings.MAIL_OUTBOX_KEY}).map(([key,value])=>key+'='+JSON.stringify(value)).join('\n')+'\n';
 await writePrivateSettings(file,text);assert.equal(await readFile(file,'utf8'),text);await assert.rejects(writePrivateSettings(file,'CHANGED'),{code:'EEXIST'});assert.equal(await readFile(file,'utf8'),text);
 const configEnv={...process.env,NODE_ENV:'development',API_HOST:'127.0.0.1',FRONTEND_ORIGINS:'http://localhost:8080',APP_PUBLIC_URL:'http://localhost:8080'};for(const key of ['MAIL_MODE','RESEND_API_KEY','RESEND_TEST_RECIPIENT','MAIL_OUTBOX_KEY'])delete configEnv[key];
 const script=`import {env} from ${JSON.stringify(pathToFileURL(resolve('server/config.js')).href)};console.log(JSON.stringify({mode:env.MAIL_MODE,keyConfigured:Boolean(env.RESEND_API_KEY)}))`;
 const result=spawnSync(process.execPath,['--input-type=module','-e',script],{cwd:directory,env:configEnv,encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(result.stdout).mode,'resend');assert.ok(!result.stdout.includes(settings.RESEND_API_KEY));
});
async function fixture(){const user=(await owner.query('INSERT INTO users(display_name,email,password_hash) VALUES ($1,$2,$3) RETURNING id',['Mail Test',randomUUID()+'@example.test','test-only-placeholder'])).rows[0];const action=(await owner.query("INSERT INTO account_actions(user_id,purpose,token_hash,expires_at,delivery) VALUES ($1,'verify',$2,NOW()+INTERVAL '24 hours','resend') RETURNING id,expires_at",[user.id,randomBytes(32).toString('hex')])).rows[0];return {userId:user.id,actionId:action.id,expiresAt:action.expires_at,settings};}
async function queue(item){const client=await database.connect();try{await client.query('BEGIN');const accepted=await enqueueMail(client,message,item);await client.query(accepted?'COMMIT':'ROLLBACK');return accepted;}catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}}
test('Real PostgreSQL: provider mode does not trust local verification; only the chosen recipient is queued',{skip:!integration},async()=>{
 const server=createApp(database).listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
 const request=(path,data,cookie,account)=>fetch(base+'/api/v1/auth/'+path,{method:data===undefined?'GET':'POST',headers:{...(data===undefined?{}:{Origin:'http://localhost:8080','Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{}),...(account?{'X-FitizBaby-Account':account}:{})},body:data===undefined?undefined:JSON.stringify(data)});
 try{
  const password='Provider-only-generated-password!';const register=await request('register',{name:'Provider Test',email:env.RESEND_TEST_RECIPIENT,password});assert.equal(register.status,201);const cookie=register.headers.get('set-cookie').split(';')[0],user=(await register.json()).user;
  await owner.query("UPDATE users SET email_verified_at=NOW(),email_verification_source='local' WHERE id=$1",[user.id]);assert.equal((await(await request('me',undefined,cookie)).json()).user.emailVerified,false);
  const raw=randomBytes(32).toString('base64url');await owner.query("INSERT INTO account_actions(user_id,purpose,token_hash,expires_at,delivery) VALUES ($1,'verify',$2,NOW()+INTERVAL '1 day','local')",[user.id,createHash('sha256').update(raw).digest('hex')]);assert.equal((await request('verify-email',{token:raw})).status,400);
  await owner.query("UPDATE account_actions SET created_at=NOW()-INTERVAL '61 seconds' WHERE user_id=$1",[user.id]);
  const response=await request('request-verification',{},cookie,user.id);assert.equal(response.status,202);assert.equal((await response.json()).delivery,'resend');
  const job=(await owner.query('SELECT * FROM mail_outbox WHERE user_id=$1',[user.id])).rows[0];assert.ok(job);assert.ok(!job.ciphertext.includes(Buffer.from('token=')));
  const plain=decryptMail(job.ciphertext,job.id,job.action_id,env.MAIL_OUTBOX_KEY),token=new URL(plain.text.match(/http[^ ]+/)[0]).hash.slice(7);
  assert.equal(await processOneMail(database,{send:async()=>({ok:true,id:'provider-test-receipt'})}),true);assert.equal((await request('verify-email',{token})).status,200);assert.equal((await(await request('me',undefined,cookie)).json()).user.emailVerified,true);
  const sent=(await owner.query('SELECT state,ciphertext FROM mail_outbox WHERE id=$1',[job.id])).rows[0];assert.equal(sent.state,'sent');assert.equal(sent.ciphertext,null);
  const permissions=(await database.query("SELECT has_column_privilege(current_user,'mail_outbox','user_id','UPDATE') AS move_job,has_column_privilege(current_user,'mail_outbox','action_id','UPDATE') AS move_token,has_column_privilege(current_user,'mail_outbox','created_at','INSERT') AS forge_date,has_column_privilege(current_user,'mail_usage','window_key','UPDATE') AS reset_window")).rows[0];assert.deepEqual(permissions,{move_job:false,move_token:false,forge_date:false,reset_window:false});
  const other=await request('register',{name:'Other User',email:randomUUID()+'@example.test',password});const otherCookie=other.headers.get('set-cookie').split(';')[0],otherUser=(await other.json()).user;await request('request-verification',{},otherCookie,otherUser.id);assert.equal((await owner.query('SELECT COUNT(*)::int AS count FROM mail_outbox WHERE user_id=$1',[otherUser.id])).rows[0].count,0);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('Real PostgreSQL: concurrent reservations stop at the persistent free budget',{skip:!integration},async()=>{
 const now=new Date();const count=(await owner.query('SELECT reserved FROM mail_usage WHERE window_key=$1',['day:'+now.toISOString().slice(0,10)])).rows[0]?.reserved||0;
 const first=await fixture(),second=await fixture();first.settings={...settings,MAIL_DAILY_LIMIT:count+1};second.settings=first.settings;
 const results=await Promise.all([queue(first),queue(second)]);assert.deepEqual(results.sort(),[false,true]);
 await owner.query('UPDATE account_actions SET used_at=NOW() WHERE id=ANY($1::uuid[])',[[first.actionId,second.actionId]]);
});
test('Real PostgreSQL: retries retain one idempotency key and clear payload after acceptance',{skip:!integration},async()=>{
 const item=await fixture();assert.equal(await queue(item),true);const keys=[];let calls=0;
 const send=async(_message,id)=>{keys.push(id);return ++calls===1?{ok:false,retry:true,code:'NETWORK_UNCERTAIN'}:{ok:true,id:'retry-receipt'};};
 await processOneMail(database,{settings,send});const job=(await owner.query('SELECT * FROM mail_outbox WHERE action_id=$1',[item.actionId])).rows[0];assert.equal(job.state,'pending');assert.equal(job.attempts,1);
 await owner.query('UPDATE mail_outbox SET available_at=NOW() WHERE id=$1',[job.id]);await processOneMail(database,{settings,send});assert.deepEqual(keys,[job.id,job.id]);
 const done=(await owner.query('SELECT state,ciphertext,attempts FROM mail_outbox WHERE id=$1',[job.id])).rows[0];assert.equal(done.state,'sent');assert.equal(done.ciphertext,null);assert.equal(done.attempts,2);
});
test('Real PostgreSQL: two workers cannot send the same live lease, and expired jobs never send',{skip:!integration},async()=>{
 const item=await fixture();await queue(item);let sent=0;const send=async()=>{sent+=1;await new Promise(resolve=>setTimeout(resolve,100));return {ok:true,id:'single-lease'};};
 const results=await Promise.all([processOneMail(database,{settings,send}),processOneMail(database,{settings,send})]);assert.equal(sent,1);assert.deepEqual(results.sort(),[false,true]);
 const expired=await fixture();await queue(expired);await owner.query("UPDATE mail_outbox SET expires_at=NOW()-INTERVAL '1 second' WHERE action_id=$1",[expired.actionId]);await processOneMail(database,{settings,send});assert.equal(sent,1);const row=(await owner.query('SELECT state,ciphertext FROM mail_outbox WHERE action_id=$1',[expired.actionId])).rows[0];assert.equal(row.state,'dead');assert.equal(row.ciphertext,null);
});
test.after(async()=>{await database?.end();await owner?.end();await pool?.end();});
