import {mkdtemp,lstat,mkdir,open,link,unlink,rmdir,chmod} from 'node:fs/promises';
import {dirname,join,resolve,relative,sep} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
export async function protectPath(path,directory) {
 const info=await lstat(path);if(info.isSymbolicLink()||directory&&!info.isDirectory()||!directory&&!info.isFile())throw new Error('UNSAFE_SETTINGS_PATH');
 if(process.platform!=='win32'){await chmod(path,directory?0o700:0o600);return;}
 const system=join(process.env.SystemRoot||'C:\\Windows','System32');
 const {stdout}=await execute(join(system,'whoami.exe'),['/user','/fo','csv','/nh'],{windowsHide:true});const sid=stdout.match(/S-1-[0-9-]+/)?.[0];if(!sid)throw new Error('PERMISSIONS_FAILED');
 const type=directory?'Directory':'File',inheritance=directory?'ContainerInherit,ObjectInherit':'None';
 const script="$ErrorActionPreference='Stop'; $acl=[System.Security.AccessControl."+type+"Security]::new(); $acl.SetAccessRuleProtection($true,$false); foreach($value in @('"+sid+"','S-1-5-18','S-1-5-32-544')){$identity=[System.Security.Principal.SecurityIdentifier]::new($value);$rule=[System.Security.AccessControl.FileSystemAccessRule]::new($identity,[System.Security.AccessControl.FileSystemRights]::FullControl,[System.Security.AccessControl.InheritanceFlags]'"+inheritance+"',[System.Security.AccessControl.PropagationFlags]::None,[System.Security.AccessControl.AccessControlType]::Allow);$acl.AddAccessRule($rule);};$target=[System.IO."+type+"Info]::new('"+path.replaceAll("'","''")+"');$target.SetAccessControl($acl)";
 await execute(join(system,'WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true});
}
export async function writePrivateSettings(destination,text) {
 const target=resolve(destination),parent=dirname(target);await mkdir(parent,{recursive:true});
 const scratch=await mkdtemp(join(parent,'.private-mail-setup-'));const file=join(scratch,'settings');
 const rel=relative(parent,scratch);if(!rel.startsWith('.private-mail-setup-')||rel.includes(sep))throw new Error('UNSAFE_SETTINGS_PATH');
 try{
  await protectPath(scratch,true);
  const handle=await open(file,'wx',0o600);
  try{await protectPath(file,false);await handle.writeFile(text);}finally{await handle.close();}
  // Hard-link publication is atomic and refuses to overwrite an existing file.
  await link(file,target);
 }finally{await unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});await rmdir(scratch);}
}
