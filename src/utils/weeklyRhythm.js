import {mealSlots,validDay} from './todaySummary.js';
export const rhythmBadges=[
 {id:'first-meal',title:'İlk filiz',rule:'En az bir güne pozitif miktarlı bir öğün ürünü kaydet.',mark:'1',tone:'mint'},
 {id:'week-three',title:'Ritmin oluşuyor',rule:'Aynı pazartesi–pazar haftasında 3 ayrı güne öğün kaydet.',mark:'3',tone:'sky'},
 {id:'week-five',title:'Kök saldın',rule:'Aynı pazartesi–pazar haftasında 5 ayrı güne öğün kaydet.',mark:'5',tone:'violet'},
 {id:'welcome-back',title:'Yeniden bir adım',rule:'Arada en az iki kayıtsız gün varken yeniden bir güne öğün kaydet.',mark:'↗',tone:'peach'}
];
export function shiftRhythmDay(day,amount){const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+amount);return date.toISOString().slice(0,10);}
export function rhythmWeekStart(day){const weekday=new Date(day+'T12:00:00Z').getUTCDay();return shiftRhythmDay(day,-((weekday+6)%7));}
export function loggedMealDays(documents,today){
 return [...new Set(documents.filter(doc=>{
  const day=doc.key?.startsWith('day:')?doc.key.slice(4):'';
  return validDay(day)&&day<=today&&mealSlots.some(({key})=>(doc.data?.[key]||[]).some(entry=>{
   const amount=entry.mode==='package'?Number(entry.packageSize)*Number(entry.packageCount):Number(entry.amount);
   return Number.isFinite(amount)&&amount>0;
  }));
 }).map(doc=>doc.key.slice(4)))].sort();
}
export function buildWeeklyRhythm(documents,today){
 return buildRhythmFromDays(loggedMealDays(documents,today),today);
}
export function buildRhythmFromDays(dates,today){
 const logged=[...new Set(dates.filter(day=>validDay(day)&&day<=today))].sort(),recorded=new Set(logged),start=rhythmWeekStart(today),eligible={},weeks=new Map();
 if(logged.length)eligible['first-meal']=logged[0];
 for(let i=0;i<logged.length;i++){
  const day=logged[i],week=rhythmWeekStart(day),count=(weeks.get(week)||0)+1;weeks.set(week,count);
  if(count>=3&&!eligible['week-three'])eligible['week-three']=day;
  if(count>=5&&!eligible['week-five'])eligible['week-five']=day;
  if(i>0&&day>=shiftRhythmDay(logged[i-1],3)&&!eligible['welcome-back'])eligible['welcome-back']=day;
 }
 const days=Array.from({length:7},(_,i)=>{const day=shiftRhythmDay(start,i);return{day,logged:recorded.has(day),future:day>today,today:day===today};});
 return{today,start,end:shiftRhythmDay(start,6),days,loggedDays:days.filter(day=>day.logged).length,totalLoggedDays:logged.length,eligible};
}
