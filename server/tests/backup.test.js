import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable,Writable} from 'node:stream';
import pg from 'pg';
import {encryptArchive,authenticateArchive,restoreStream} from '../db/backup-archive.js';
import {createBackup,verifyBackup,listBackups} from '../db/database-backup.js';
const password='synthetic backup passphrase only for automated tests';
test('Backup encryption authenticates all bytes, rejects wrong passwords and corruption, never overwrites',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'fitizbaby-backup-unit-')),file=join(directory,'sample.fitbak');
 try{
  const manifest={format:'fitizbaby.database-backup',version:1,tables:{}};
  await encryptArchive(Readable.from(['sensitive-personal-record']),file,password,manifest);
  const bytes=await readFile(file);assert.equal(bytes.includes(Buffer.from('sensitive-personal-record')),false);
  assert.deepEqual(await authenticateArchive(file,password),manifest);
  let restored='';await restoreStream(file,password,new Writable({write(chunk,_encoding,done){restored+=chunk.toString();done();}}));assert.equal(restored,'sensitive-personal-record');
  await assert.rejects(authenticateArchive(file,'this is a different long test password'));
  await assert.rejects(encryptArchive(Readable.from(['overwrite']),file,password,manifest));
  bytes[40]^=1;await writeFile(file,bytes);await assert.rejects(authenticateArchive(file,password));
  await assert.rejects(encryptArchive(Readable.from(['a']),join(directory,'short'), 'short',manifest));
 }finally{await rm(directory,{recursive:true});}
});
test('Real PostgreSQL: encrypted backup restores identical private records in an isolated cluster and excludes security state',{skip:!process.env.FITIZBABY_TEST_OWNER_URL},async()=>{
 const source=process.env.FITIZBABY_TEST_OWNER_URL,bin=process.env.FITIZBABY_TEST_PG_BIN;
 assert.ok(bin,'Test harness must provide PostgreSQL tools');
 const client=new pg.Client({connectionString:source});await client.connect();
 const directory=await mkdtemp(join(tmpdir(),'fitizbaby-backup-integration-'));let id;
 try{
  id=(await client.query("INSERT INTO users(display_name,email,password_hash) VALUES ('Backup fixture','backup-fixture@example.test','fixture-hash-not-a-real-password') RETURNING id")).rows[0].id;
  await client.query("INSERT INTO user_favorites(user_id,product_id) VALUES($1,'1')",[id]);
  await client.query("INSERT INTO user_products(user_id,id,data,image) VALUES($1,'custom-12345678-1234-1234-1234-123456789012',$2,$3)",[id,JSON.stringify({name:'Backup image fixture'}),Buffer.from('synthetic-image-bytes')]);
  await client.query("INSERT INTO user_nutrition(user_id,key,data) VALUES($1,'targets',$2)",[id,JSON.stringify({calories:2000})]);
  await client.query("INSERT INTO user_nutrition(user_id,key,data) VALUES($1,'rhythm',$2)",[id,JSON.stringify({version:1,unlocked:[{id:'first-meal',earnedAt:'2026-11-25T12:00:00Z',achievedOn:'2026-11-25'}]})]);
  await client.query("INSERT INTO user_sessions(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL '1 hour')",[id,'b'.repeat(64)]);
  const session=(await client.query('SELECT id FROM user_sessions WHERE user_id=$1',[id])).rows[0].id;
  await client.query("INSERT INTO account_export_grants(session_id,user_id,capability_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '2 minutes')",[session,id,'d'.repeat(64)]);
  const action=(await client.query("INSERT INTO account_actions(user_id,purpose,token_hash,expires_at) VALUES($1,'verify',$2,NOW()+INTERVAL '1 hour') RETURNING id",[id,'c'.repeat(64)])).rows[0].id;
  await client.query("INSERT INTO mail_outbox(id,user_id,action_id,ciphertext,expires_at) VALUES(gen_random_uuid(),$1,$2,$3,NOW()+INTERVAL '1 hour')",[id,action,Buffer.from('test-ciphertext')]);
  const before=(await client.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n;
  const result=await createBackup({connectionString:source,password,bin,directory});assert.equal(result.verified,true);await access(result.file);
  const bytes=await readFile(result.file);assert.equal(bytes.includes(Buffer.from('backup-fixture@example.test')),false);
  assert.equal((await client.query('SELECT COUNT(*)::int AS n FROM users')).rows[0].n,before);
  const corrupt=join(directory,'damaged.fitbak');bytes[bytes.length-1]^=1;await writeFile(corrupt,bytes);
  await assert.rejects(verifyBackup({file:corrupt,password,bin}));
  await assert.rejects(verifyBackup({file:result.file,password:'wrong but long enough test password',bin}));
  assert.equal((await listBackups(directory)).length,1);
  // Revalidate independently to prove that a saved file remains usable.
  assert.equal((await verifyBackup({file:result.file,password,bin})).verified,true);
  await assert.rejects(createBackup({connectionString:source,password,bin,directory:process.cwd()}));
 }finally{if(id)await client.query('DELETE FROM users WHERE id=$1',[id]);await client.end();await rm(directory,{recursive:true});}
});
