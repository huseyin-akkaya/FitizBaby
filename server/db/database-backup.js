import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,lstat,realpath,link,unlink,rm,copyFile,readdir} from 'node:fs/promises';
import {join,resolve,relative,sep,dirname} from 'node:path';
import {tmpdir,homedir} from 'node:os';
import {createHash,randomBytes} from 'node:crypto';
import net from 'node:net';
import pg from 'pg';
import {protectPath,writePrivateSettings} from '../security/private-settings.js';
import {encryptArchive,authenticateArchive,restoreStream} from './backup-archive.js';
const persistent={users:'id',user_products:'user_id,id',user_favorites:'user_id,product_id',user_nutrition:'user_id,key',schema_migrations:'name',mail_usage:'window_key'};
const excluded=['user_sessions','account_actions','mail_outbox','account_export_grants'];
const expected=[...Object.keys(persistent),...excluded].sort();
export const defaultBackupDirectory=()=>join(homedir(),'.fitizbaby-backups');
const executable=(bin,name)=>join(resolve(bin),name+(process.platform==='win32'?'.exe':''));
function pgEnvironment(url){
 const value=new URL(url);if(!['postgres:','postgresql:'].includes(value.protocol)||!['127.0.0.1','localhost','[::1]'].includes(value.hostname)||value.search)throw new Error('LOCAL_DATABASE_REQUIRED');
 // Never put credentials in process arguments or inherit provider credentials.
 const env={};for(const key of ['SystemRoot','WINDIR','PATH','TEMP','TMP','HOME','USERPROFILE','LANG','LC_ALL'])if(process.env[key])env[key]=process.env[key];
 return{...env,PGHOST:value.hostname.replaceAll('[','').replaceAll(']',''),PGPORT:value.port||'5432',PGUSER:decodeURIComponent(value.username),PGPASSWORD:decodeURIComponent(value.password),PGDATABASE:decodeURIComponent(value.pathname.slice(1)),PGCONNECT_TIMEOUT:'10',PGAPPNAME:'fitizbaby-backup',PGCLIENTENCODING:'UTF8',PGOPTIONS:'-c statement_timeout=120000'};
}
async function privateDirectory(path){
 await mkdir(path,{recursive:true,mode:0o700});
 // Reject symlink/junction parents too: do not publish into a redirected location.
 let current=resolve(path);while(true){const info=await lstat(current);if(info.isSymbolicLink()||!info.isDirectory())throw new Error('UNSAFE_BACKUP_PATH');const parent=dirname(current);if(parent===current)break;current=parent;}
 return realpath(path);
}
async function outsideProject(path){
 const project=await realpath(process.cwd());
 const within=value=>{const rel=relative(project,value);return !rel||!rel.startsWith('..'+sep)&&rel!=='..'&&!rel.includes(':');};
 if(within(resolve(path)))throw new Error('BACKUP_INSIDE_PROJECT');
 const destination=await privateDirectory(path);if(within(destination))throw new Error('BACKUP_INSIDE_PROJECT');
 await protectPath(destination,true);return destination;
}
async function checkedSchema(client){
 const rows=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
 if(JSON.stringify(rows.map(row=>row.tablename))!==JSON.stringify(expected))throw new Error('UNEXPECTED_SCHEMA');
}
async function fingerprints(client){
 await checkedSchema(client);await client.query("SET LOCAL timezone='UTC'");const result={};
 for(const [table,order]of Object.entries(persistent)){
  const digest=createHash('sha256');let count=0;
  await client.query(`DECLARE backup_rows NO SCROLL CURSOR FOR SELECT row_to_json(t)::text AS value FROM (SELECT * FROM public.${table} ORDER BY ${order}) t`);
  while(true){const {rows}=await client.query('FETCH FORWARD 100 FROM backup_rows');if(!rows.length)break;for(const row of rows){digest.update(row.value+'\n');count++;}}
  await client.query('CLOSE backup_rows');result[table]={count,sha256:digest.digest('hex')};
 }return result;
}
function childCommand(bin,name,args,env){
 const child=spawn(executable(bin,name),args,{env,stdio:['pipe','pipe','pipe'],windowsHide:true});
 child.stderr.resume();
 const done=new Promise((resolveChild,reject)=>{child.once('error',()=>reject(new Error('PG_TOOL_FAILED')));child.once('close',code=>code===0?resolveChild():reject(new Error('PG_TOOL_FAILED')));});done.catch(()=>{});
 return{child,done};
}
async function command(bin,name,args,env){
 // PostgreSQL starts long-lived children. Ignore inherited output handles instead
 // of waiting on execFile pipes which can remain open after pg_ctl exits on Windows.
 await new Promise((resolveChild,reject)=>{
  const child=spawn(executable(bin,name),args,{env,windowsHide:true,stdio:'ignore'});
  const timer=setTimeout(()=>{child.kill();reject(new Error('PG_TOOL_FAILED'));},120000);
  child.once('error',()=>{clearTimeout(timer);reject(new Error('PG_TOOL_FAILED'));});
  child.once('exit',code=>{clearTimeout(timer);code===0?resolveChild():reject(new Error('PG_TOOL_FAILED'));});
 });
}
async function scratch(){const path=await mkdtemp(join(tmpdir(),'fitizbaby-restore-'));await protectPath(path,true);return path;}
async function removeScratch(path){
 const actual=await realpath(path),parent=await realpath(tmpdir()),rel=relative(parent,actual);
 if(!/^fitizbaby-restore-[A-Za-z0-9]+$/.test(rel)||rel.includes(sep))throw new Error('UNSAFE_CLEANUP');
 await rm(actual,{recursive:true,force:false});
}
const freePort=()=>new Promise((resolvePort,reject)=>{const server=net.createServer();server.once('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolvePort(port));});});
async function cleanupRestore(work,started,bin){
 if(started){try{await command(bin,'pg_ctl',['-D',join(work,'data'),'-w','-m','fast','stop'],pgEnvironment('postgresql://restore_admin@127.0.0.1/postgres'));}catch{throw new Error('RESTORE_CLEANUP_REQUIRED');}}
 await removeScratch(work);
}
export async function verifyBackup({file,password,bin}){
 const source=resolve(file),info=await lstat(source);if(info.isSymbolicLink()||!info.isFile())throw new Error('UNSAFE_BACKUP_PATH');
 const work=await scratch(),archive=join(work,'archive.fitbak');let started=false;
 try{
  await copyFile(source,archive);await protectPath(archive,false);
  const manifest=await authenticateArchive(archive,password);
  if(JSON.stringify(Object.keys(manifest.tables||{}).sort())!==JSON.stringify(Object.keys(persistent).sort()))throw new Error('INVALID_BACKUP');
  const port=await freePort(),secret=randomBytes(32).toString('hex');
  const url=`postgresql://restore_admin:${secret}@127.0.0.1:${port}/postgres`,env=pgEnvironment(url);
  const data=join(work,'data'),pwfile=join(work,'password');await writePrivateSettings(pwfile,secret+'\n');
  await command(bin,'initdb',['-D',data,'-U','restore_admin','--pwfile',pwfile,'--auth-host=scram-sha-256','--auth-local=scram-sha-256','--encoding=UTF8','--no-locale'],env);
  // Loopback only, empty Unix socket directory; never connects to the live server.
  started=true;await command(bin,'pg_ctl',['-D',data,'-w','-l',join(work,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -k ""`,'start'],env);
  const admin=new pg.Client({connectionString:url,connectionTimeoutMillis:10000});await admin.connect();
  try{
   await admin.query('CREATE ROLE restore_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION');
   // Restricted role performs the restore. Generated secret only, never user SQL.
   await admin.query("ALTER ROLE restore_owner PASSWORD '"+secret+"'");
   await admin.query('CREATE DATABASE fitizbaby_restore OWNER restore_owner');
  }finally{await admin.end();}
  const target=`postgresql://restore_owner:${secret}@127.0.0.1:${port}/fitizbaby_restore`;
  // Only this newly created isolated database is prepared for the archive schema.
  const preparation=new pg.Client({connectionString:target});await preparation.connect();
  try{await preparation.query('DROP SCHEMA public');}finally{await preparation.end();}
  const {child,done}=childCommand(bin,'pg_restore',['--no-owner','--no-acl','--exit-on-error','--single-transaction','--dbname','fitizbaby_restore'],pgEnvironment(target));child.stdout.resume();
  try{await Promise.all([restoreStream(archive,password,child.stdin),done]);}catch{child.kill();await done.catch(()=>{});throw new Error('RESTORE_FAILED');}
  const client=new pg.Client({connectionString:target,connectionTimeoutMillis:10000});await client.connect();
  try{
   await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
   if(JSON.stringify(await fingerprints(client))!==JSON.stringify(manifest.tables))throw new Error('RESTORE_MISMATCH');
   for(const table of excluded){const result=await client.query(`SELECT COUNT(*)::int AS n FROM public.${table}`);if(result.rows[0].n!==0)throw new Error('SECURITY_DATA_RESTORED');}
   await client.query('ROLLBACK');
  }finally{await client.end();}
  return{verified:true,createdAt:manifest.createdAt};
 }finally{await cleanupRestore(work,started,bin);}
}
export async function createBackup({connectionString,password,bin,directory=defaultBackupDirectory()}){
 const output=await outsideProject(directory),name='fitizbaby-'+new Date().toISOString().replaceAll(/[:.]/g,'-')+'-'+randomBytes(6).toString('hex')+'.fitbak';
 const final=join(output,name),work=await mkdtemp(join(output,'.backup-writing-'));await protectPath(work,true);const partial=join(work,'archive.fitbak');
 const client=new pg.Client({connectionString,connectionTimeoutMillis:10000});let connected=false;
 try{
  const env=pgEnvironment(connectionString);await client.connect();connected=true;
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const snapshot=(await client.query('SELECT pg_export_snapshot() AS id')).rows[0].id;
  const manifest={format:'fitizbaby.database-backup',version:1,createdAt:new Date().toISOString(),tables:await fingerprints(client)};
  const args=['--format=custom','--no-owner','--no-acl','--no-password','--schema=public','--snapshot='+snapshot,...excluded.map(table=>'--exclude-table-data=public.'+table)];
  const {child,done}=childCommand(bin,'pg_dump',args,env);child.stdin.end();
  try{await Promise.all([encryptArchive(child.stdout,partial,password,manifest),done]);}catch{child.kill();await done.catch(()=>{});throw new Error('BACKUP_FAILED');}
  await client.query('COMMIT');await client.end();connected=false;
  await protectPath(partial,false);
  await verifyBackup({file:partial,password,bin});
  // Publish only a successfully restored backup; never overwrite an old backup.
  await link(partial,final);await unlink(partial);
  return{file:final,verified:true};
 }finally{
  if(connected){await client.query('ROLLBACK').catch(()=>{});await client.end();}
  await unlink(partial).catch(error=>{if(error.code!=='ENOENT')throw error;});
  // This directory contains only our exact partial filename; no recursive deletion.
  const {rmdir}=await import('node:fs/promises');await rmdir(work);
 }
}
export async function listBackups(directory=defaultBackupDirectory()){
 const path=await outsideProject(directory),files=[];
 for(const name of await readdir(path)){if(!/^fitizbaby-[0-9TZ-]+-[a-f0-9]{12}\.fitbak$/.test(name))continue;const info=await lstat(join(path,name));if(!info.isFile()||info.isSymbolicLink())continue;files.push({name,bytes:info.size,olderThan30Days:Date.now()-info.mtimeMs>30*86400000});}
 return files.sort((a,b)=>a.name.localeCompare(b.name));
}
