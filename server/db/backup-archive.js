import {randomBytes,scrypt,createCipheriv,createDecipheriv} from 'node:crypto';
import {promisify} from 'node:util';
import {open,stat} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {pipeline} from 'node:stream/promises';
import {Writable,Transform} from 'node:stream';
const derive=promisify(scrypt);
const magic=Buffer.from('FITBAK01');
const headerSize=36; // magic + 16-byte salt + 12-byte IV; authenticated as AAD.
export function validatePassphrase(value){if(typeof value!=='string'||value.length<20||Buffer.byteLength(value)>1024)throw new Error('PASSPHRASE_REQUIRED');}
async function keyFor(password,salt){validatePassphrase(password);return derive(password,salt,32,{N:65536,r:8,p:1,maxmem:96*1024*1024});}
export async function encryptArchive(source,path,password,manifest){
 const salt=randomBytes(16),iv=randomBytes(12),header=Buffer.concat([magic,salt,iv]);
 const key=await keyFor(password,salt),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(header);
 const file=await open(path,'wx',0o600);
 try{
  await file.writeFile(header);await file.close();
  const output=createWriteStream(path,{flags:'a',mode:0o600});
  const result=pipeline(cipher,output);
  // Attach the rejection immediately: a dump failure must never become unhandled.
  result.catch(()=>{});
  cipher.write(JSON.stringify(manifest)+'\n');
  try{await pipeline(source,cipher);await result;}catch(error){cipher.destroy();await result.catch(()=>{});throw error;}
  const tail=await open(path,'a');try{await tail.writeFile(cipher.getAuthTag());await tail.sync();}finally{await tail.close();}
 }finally{key.fill(0);await file.close().catch(()=>{});}
}
async function parts(path,password){
 const info=await stat(path);if(info.size<headerSize+17)throw new Error('INVALID_BACKUP');
 const file=await open(path,'r');const header=Buffer.alloc(headerSize),tag=Buffer.alloc(16);
 try{await file.read(header,0,headerSize,0);await file.read(tag,0,16,info.size-16);}finally{await file.close();}
 if(!header.subarray(0,8).equals(magic))throw new Error('INVALID_BACKUP');
 const key=await keyFor(password,header.subarray(8,24));
 const decipher=createDecipheriv('aes-256-gcm',key,header.subarray(24),{authTagLength:16});key.fill(0);decipher.setAAD(header);decipher.setAuthTag(tag);
 return{input:createReadStream(path,{start:headerSize,end:info.size-17}),decipher};
}
// Authenticate the entire file before any SQL is executed. Caller uses a private copy.
export async function authenticateArchive(path,password){
 const {input,decipher}=await parts(path,password);let prefix=Buffer.alloc(0),manifest;
 await pipeline(input,decipher,new Writable({write(chunk,_encoding,done){
  try{if(!manifest){prefix=Buffer.concat([prefix,chunk]);const end=prefix.indexOf(10);if(end>=0){if(end>65536)throw new Error('INVALID_BACKUP');manifest=JSON.parse(prefix.subarray(0,end).toString('utf8'));prefix=Buffer.alloc(0);}else if(prefix.length>65536)throw new Error('INVALID_BACKUP');}done();}catch(error){done(error);}
 }}));
 if(manifest?.format!=='fitizbaby.database-backup'||manifest.version!==1)throw new Error('INVALID_BACKUP');return manifest;
}
export async function restoreStream(path,password,destination){
 const {input,decipher}=await parts(path,password);let found=false,prefix=Buffer.alloc(0);
 const strip=new Transform({transform(chunk,_encoding,done){
  if(found)return done(null,chunk);prefix=Buffer.concat([prefix,chunk]);const end=prefix.indexOf(10);
  if(end<0){if(prefix.length>65536)return done(new Error('INVALID_BACKUP'));return done();}
  found=true;done(null,prefix.subarray(end+1));prefix=Buffer.alloc(0);
 }});
 await pipeline(input,decipher,strip,destination);
}
