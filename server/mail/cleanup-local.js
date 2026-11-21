import {readdir,lstat,readFile,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {localMailDirectory} from './local-mail.js';
export async function removeLocalAccountMail(email) {
 const directory=localMailDirectory();let files;
 try{const info=await lstat(directory);if(info.isSymbolicLink()||!info.isDirectory())return false;files=await readdir(directory);}catch(error){return error.code==='ENOENT';}
 let complete=true;
 for(const name of files){
  if(!/^[0-9TZ-]+-[0-9a-f-]+\.json$/.test(name))continue;
  const file=join(directory,name);
  try{const info=await lstat(file);if(info.isSymbolicLink()||!info.isFile()||info.size>8192){complete=false;continue;}const message=JSON.parse(await readFile(file,'utf8'));if(typeof message.to==='string'&&message.to.trim().toLowerCase()===email)await unlink(file);}
  catch(error){if(error.code!=='ENOENT')complete=false;}
 }
 return complete;
}
