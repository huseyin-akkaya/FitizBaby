import {dailyNutrients,summarizeDay,mealSlots} from './todaySummary.js';
export function historyDates(end,count){const date=new Date(end+'T12:00:00Z');return Array.from({length:count},(_,index)=>{const item=new Date(date);item.setUTCDate(item.getUTCDate()-count+1+index);return item.toISOString().slice(0,10);});}
export function buildHistory(documents,end,count){
 const dates=historyDates(end,count),byDay=new Map(documents.map(doc=>[doc.key.slice(4),doc])),frequent=new Map();
 const days=dates.map(day=>{const document=byDay.get(day),data=document?.data,active=Object.fromEntries(mealSlots.map(({key})=>[key,(data?.[key]||[]).filter(entry=>{const amount=entry.mode==='package'?Number(entry.packageSize)*Number(entry.packageCount):Number(entry.amount);return Number.isFinite(amount)&&amount>0;})]));
  const summary=summarizeDay(active,[]),entryCount=Object.values(active).flat().length;
  for(const entry of Object.values(active).flat()){const key=String(entry.productId),old=frequent.get(key)||{id:key,name:entry.snapshot?.name||'Adı bilinmeyen ürün',brand:entry.snapshot?.brand||'',entries:0,days:new Set()};old.entries++;old.days.add(day);frequent.set(key,old);}
  return {day,saved:Boolean(document),entryCount,totals:Object.fromEntries(dailyNutrients.map(({key})=>[key,{value:summary.totals[key].value,missing:summary.totals[key].missing}]))};
 });
 const loggedDays=days.filter(day=>day.entryCount>0).length;
 const averages=Object.fromEntries(dailyNutrients.map(({key})=>{const complete=days.filter(day=>day.entryCount>0&&day.totals[key].missing===0);return[key,{value:complete.length?complete.reduce((sum,day)=>sum+day.totals[key].value,0)/complete.length:null,days:complete.length,partialDays:days.filter(day=>day.entryCount>0&&day.totals[key].missing>0).length}];}));
 return{start:dates[0],end,count,days,loggedDays,averages,frequent:[...frequent.values()].map(item=>({...item,days:item.days.size})).sort((a,b)=>b.entries-a.entries||a.id.localeCompare(b.id)).slice(0,5)};
}
