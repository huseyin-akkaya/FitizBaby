export const defaultWaterSettings={targetMl:null,color:'mint',reminders:false,interval:60,playful:true,overflow:true};
export const waterTotal=data=>(data?.entries??[]).reduce((sum,item)=>sum+item.ml,0);
export function waterProgress(total,target){return target>0?Math.max(0,Math.min(100,total/target*100)):null;}
export function crossedWaterMilestone(before,after,target,seen){if(!(target>0)||after<=before)return null;return [100,50,25].find(level=>before/target*100<level&&after/target*100>=level&&!seen.has(level))??null;}
export function waterHistory(documents,dates){const map=new Map(documents.map(doc=>[doc.key.slice(6),doc.data]));const days=dates.map(day=>({day,saved:map.has(day),ml:map.has(day)?waterTotal(map.get(day)):null,entries:map.get(day)?.entries?.length??0}));const recorded=days.filter(day=>day.entries>0);return{days,loggedDays:recorded.length,average:recorded.length?recorded.reduce((sum,day)=>sum+day.ml,0)/recorded.length:null};}

export function newWaterOverflow(before,after,target){return target>0?Math.max(0,Math.max(0,after-target)-Math.max(0,before-target)):0;}
