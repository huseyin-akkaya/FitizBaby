import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {access} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {writePrivateSettings} from '../security/private-settings.js';
async function setup(){
 if(!process.stdin.isTTY)throw new Error('INTERACTIVE_REQUIRED');
 try{await access('.env.mail');throw new Error('SETTINGS_EXIST');}catch(error){if(error.code!=='ENOENT')throw error;}
 console.info('Resend Free: ücretli plan seçme. Sending access yetkili API anahtarı oluştur. Alan adı olmadan yalnızca Resend hesabının kendi e-posta adresine test yapılabilir. Bu kurulum e-posta göndermez.');
 const prompt=createInterface({input:process.stdin,output:process.stdout});let recipient;
 try{recipient=(await prompt.question('Resend hesabını açtığın e-posta adresi: ')).trim().toLowerCase();}finally{prompt.close();}
 if(!z.email().max(254).safeParse(recipient).success)throw new Error('INVALID_EMAIL');
 const sink=new Writable({write(_chunk,_encoding,done){done();}});const hidden=createInterface({input:process.stdin,output:sink,terminal:true});process.stdout.write('Resend gönderim anahtarın (ekranda görünmez): ');let key;
 try{key=(await hidden.question('')).trim();}finally{hidden.close();process.stdout.write('\n');}
 if(!/^re_[A-Za-z0-9_-]{8,200}$/.test(key))throw new Error('INVALID_KEY');
 const values={MAIL_MODE:'resend',RESEND_API_KEY:key,RESEND_TEST_RECIPIENT:recipient,MAIL_OUTBOX_KEY:randomBytes(32).toString('base64'),MAIL_DAILY_LIMIT:50,MAIL_MONTHLY_LIMIT:1000};
 await writePrivateSettings('.env.mail',Object.entries(values).map(([name,value])=>name+'='+JSON.stringify(String(value))).join('\n')+'\n');
 console.info('Özel e-posta ayarları kaydedildi. Henüz e-posta gönderilmedi. npm run db:migrate çalıştır; backend’i yeniden başlat. npm run mail:check ile gizli değerleri göstermeden kontrol et. Sonra kendi hesabından doğrulama e-postası iste.');
}
try{await setup();}catch(error){const message={INTERACTIVE_REQUIRED:'Bu komutu kendi proje terminalinde çalıştır.',SETTINGS_EXIST:'Özel e-posta dosyası zaten var; üzerine yazılmadı.',INVALID_EMAIL:'Geçerli bir e-posta adresi gir.',INVALID_KEY:'Anahtar biçimi geçersiz. Anahtarı paylaşmadan panelden tekrar kopyala.'}[error.message];console.error(message||'E-posta kurulumu tamamlanamadı. Dosya izinlerini kontrol et; anahtarı paylaşma.');process.exitCode=1;}
