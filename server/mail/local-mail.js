import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir,lstat,chmod,open } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { env } from '../config.js';
const execute=promisify(execFile);
const windowsSystem=join(process.env.SystemRoot||'C:\\Windows','System32');
export const localMailDirectory=()=>resolve(env.LOCAL_MAIL_DIR||'.local-mail');
export async function writeLocalMail(message) {
 if(env.MAIL_MODE!=='local'||env.NODE_ENV==='production')throw new Error('LOCAL_MAIL_DISABLED');
 const directory=localMailDirectory();
 await mkdir(directory,{recursive:true,mode:0o700});
 const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink())throw new Error('UNSAFE_MAIL_DIRECTORY');
 if(process.platform==='win32'){
  const {stdout}=await execute(join(windowsSystem,'whoami.exe'),['/user','/fo','csv','/nh'],{windowsHide:true});const sid=stdout.match(/S-1-[0-9-]+/)?.[0];if(!sid)throw new Error('FILE_PERMISSIONS_FAILED');
  // Apply a new protected DACL in one operation. Never temporarily reset an
  // existing secret directory to the parent's wider inherited permissions.
  const script = "$ErrorActionPreference='Stop'; $acl=[System.Security.AccessControl.DirectorySecurity]::new(); $acl.SetAccessRuleProtection($true,$false); foreach($value in @('"+sid+"','S-1-5-18','S-1-5-32-544')) { $identity=[System.Security.Principal.SecurityIdentifier]::new($value); $rule=[System.Security.AccessControl.FileSystemAccessRule]::new($identity,[System.Security.AccessControl.FileSystemRights]::FullControl,[System.Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit',[System.Security.AccessControl.PropagationFlags]::None,[System.Security.AccessControl.AccessControlType]::Allow); $acl.AddAccessRule($rule); }; $directory=[System.IO.DirectoryInfo]::new('"+directory.replaceAll("'","''")+"'); $directory.SetAccessControl($acl)";
  await execute(join(windowsSystem,'WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true});
 }else await chmod(directory,0o700);
 const file=join(directory,new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()+'.json');
 const handle=await open(file,'wx',0o600);
 try{await handle.writeFile(JSON.stringify({...message,createdAt:new Date().toISOString()},null,2));}finally{await handle.close();}
}
