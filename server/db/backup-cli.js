import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import dotenv from 'dotenv';
import {createBackup,verifyBackup,listBackups,defaultBackupDirectory} from './database-backup.js';
const args=process.argv.slice(2),mode=args.shift();
async function secret(label){
 const sink=new Writable({write(_chunk,_encoding,done){done();}}),prompt=createInterface({input:process.stdin,output:sink,terminal:true});process.stdout.write(label);
 try{return await prompt.question('');}finally{prompt.close();process.stdout.write('\n');}
}
async function main(){
 const allowed=mode==='verify'?['--file','--pg-bin']:mode==='create'?['--pg-bin']:[];
 if(!['create','verify','list'].includes(mode)||args.length%2||args.some((value,index)=>index%2===0&&!allowed.includes(value)))throw new Error('USAGE');
 const option=name=>{const index=args.indexOf(name);return index<0?undefined:args[index+1];};
 if(mode==='list'){console.info('Yedek klasörü: '+defaultBackupDirectory());for(const row of await listBackups())console.info(row.name+' | '+row.bytes+' bayt'+(row.olderThan30Days?' | 30 günden eski; saklama politikasını kontrol et':''));return;}
 const bin=option('--pg-bin')||process.env.PG_BIN;if(!bin)throw new Error('PG_BIN_REQUIRED');
 if(!process.stdin.isTTY)throw new Error('INTERACTIVE_REQUIRED');
 console.info('Yalnızca kendi oluşturduğun güvenilir yedekleri kullan. Parolanı sohbet veya komut argümanı olarak paylaşma.');
 const password=await secret('Yedek parolası (en az 20 karakter; ekranda görünmez): ');
 if(mode==='create'){
  if(password!==await secret('Yedek parolasını tekrar gir: '))throw new Error('PASSWORD_MISMATCH');
  // Parse privately instead of loading provider/API credentials into subprocesses.
  const settings=dotenv.parse(await readFile(resolve('.env.migration'),'utf8'));
  console.info('Şifreli yedek hazırlanıyor ve ayrı geçici veritabanında geri yüklenerek doğrulanıyor…');
  const result=await createBackup({connectionString:settings.MIGRATION_DATABASE_URL,password,bin});
  console.info('Yedek oluşturuldu ve geri yükleme doğrulandı: '+result.file);
  console.info('Parolayı ayrı bir parola yöneticisinde sakla. Kaybolursa yedek açılamaz. GitHub yedeklerin bulunduğu yer değildir.');
 }else{
  if(!option('--file'))throw new Error('USAGE');
  await verifyBackup({file:option('--file'),password,bin});console.info('Yedek doğrulandı; ayrı geçici veritabanına geri yüklenen içerik eşleşiyor. Mevcut veritabanı değiştirilmedi.');
 }
}
main().catch(error=>{
 const messages={USAGE:'Kullanım: npm run db:backup -- --pg-bin "POSTGRESQL_BIN" veya npm run db:backup:verify -- --pg-bin "POSTGRESQL_BIN" --file "YEDEK_DOSYASI".',PG_BIN_REQUIRED:'PostgreSQL bin klasörünü --pg-bin ile belirt.',INTERACTIVE_REQUIRED:'Komutu kendi etkileşimli terminalinde çalıştır; parola dosyaya/argümana yazılmamalı.',PASSPHRASE_REQUIRED:'Yedek parolası en az 20 karakter, en fazla 1024 UTF-8 bayt olmalı.',PASSWORD_MISMATCH:'Parolalar eşleşmedi; yedek oluşturulmadı.',BACKUP_INSIDE_PROJECT:'Yedek klasörü proje dışında olmalı.',LOCAL_DATABASE_REQUIRED:'Bu araç yalnızca yerel PostgreSQL bağlantısını destekliyor.',UNEXPECTED_SCHEMA:'Veritabanı şeması beklenen tablolarla eşleşmiyor; araç güncellenmeli.',RESTORE_CLEANUP_REQUIRED:'Geçici doğrulama sunucusu durdurulamadı. fitizbaby-restore- önekli geçici klasörü koru; sunucu durdurulmadan silme.'};
 console.error(messages[error.message]||'İşlem tamamlanamadı. Yedek parolasını, dosyanın sağlamlığını, PostgreSQL araç sürümünü ve izinleri kontrol et. Ayrıntılar güvenlik için gösterilmedi; mevcut veritabanı değiştirilmedi.');process.exitCode=1;
});
