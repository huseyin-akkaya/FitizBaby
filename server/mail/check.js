import {env} from '../config.js';
console.info(JSON.stringify({delivery:env.MAIL_MODE,testOnly:true,keyConfigured:Boolean(env.RESEND_API_KEY),encryptedQueueKeyConfigured:Boolean(env.MAIL_OUTBOX_KEY),dailyLimit:env.MAIL_DAILY_LIMIT,monthlyLimit:env.MAIL_MONTHLY_LIMIT}));
