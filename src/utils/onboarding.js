export function shouldOfferOnboarding(state){
 const onboarding=state.docs.onboarding?.data;if(onboarding?.status==='completed'||onboarding?.status==='skipped')return false;
 if(onboarding?.status==='in-progress')return true;
 return !state.days.length&&!['targets','plan','profile'].some(key=>state.docs[key]?.data!=null);
}
export function validateInitialTargets(values){const keys=['calories','protein','carbs','fat'];if(!keys.some(key=>values[key]!==''&&values[key]!=null))return 'En az bir hedef gir veya bu adımı atla.';if(keys.some(key=>values[key]!==''&&values[key]!=null&&(!Number.isFinite(Number(values[key]))||Number(values[key])<0||Number(values[key])>(key==='calories'?10000:1000))))return 'Kalori için 0–10000, makrolar için 0–1000 arasında geçerli sayılar gir.';return '';}
export function validateInitialProfile(profile){if(!['male','female'].includes(profile.sex)||!['lose','maintain','gain'].includes(profile.goal)||!['inactive','low','active','veryActive'].includes(profile.activity)||[['age',19,100],['height',120,230],['weight',35,300]].some(([key,min,max])=>profile[key]===''||!Number.isFinite(Number(profile[key]))||Number(profile[key])<min||Number(profile[key])>max))return '19–100 yaş, 120–230 cm boy ve 35–300 kg kilo aralığında geçerli değerler gir.';return '';}
