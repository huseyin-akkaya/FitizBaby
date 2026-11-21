import { readdir,readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../config.js';
import { localMailDirectory } from './local-mail.js';
if(env.NODE_ENV==='production'||env.MAIL_MODE!=='local'){console.error('Yerel deneme kutusu bu ortamda kapalı.');process.exitCode=1;}
else {
 console.info('YALNIZCA YEREL DENEME — gerçek e-posta gönderilmedi. Bağlantıları paylaşma.');
 try {
  const directory=localMailDirectory();const files=(await readdir(directory)).filter(file=>/^[0-9TZ-]+-[0-9a-f-]+\.json$/.test(file)).sort().slice(-10);
  if(!files.length)console.info('Henüz deneme iletisi yok.');
  for(const file of files){const message=JSON.parse(await readFile(join(directory,file),'utf8'));console.info('\nAlıcı: '+message.to+'\nKonu: '+message.subject+'\n'+message.text+'\nSon kullanım: '+message.expiresAt);}
 }catch(error){console.error(error.code==='ENOENT'?'Henüz deneme iletisi yok.':'Yerel kutu okunamadı.');}
}
