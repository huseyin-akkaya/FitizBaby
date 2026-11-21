import {pool} from '../db/pool.js';
try{if(!pool)throw new Error();const result=await pool.query('SELECT state,COUNT(*)::int AS count FROM mail_outbox GROUP BY state ORDER BY state');console.info(JSON.stringify({queue:result.rows}));}
catch{console.error('Kuyruk durumu okunamadı. Veritabanını ve şema güncellemesini kontrol et.');process.exitCode=1;}finally{await pool?.end();}
