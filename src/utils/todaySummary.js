import {entryProduct} from './mealSnapshots.js';
export const mealSlots=[{key:'breakfast',label:'Sabah'},{key:'lunch',label:'Öğle'},{key:'dinner',label:'Akşam'},{key:'snacks',label:'Aperatif'}];
export const dailyNutrients=[{key:'calories',label:'Kalori',unit:'kcal',max:10000},{key:'protein',label:'Protein',unit:'g',max:1000},{key:'carbs',label:'Karbonhidrat',unit:'g',max:1000},{key:'fat',label:'Yağ',unit:'g',max:1000}];
export const emptyDay=()=>Object.fromEntries(mealSlots.map(({key})=>[key,[]]));
export function previousDay(day){const date=new Date(day+'T12:00:00');date.setDate(date.getDate()-1);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function servingUnit(product){return product?.serving==='100 ml'?'ml':'g';}
export function summarizeDay(data,catalog){
 const totals=Object.fromEntries(dailyNutrients.map(({key})=>[key,{value:0,missing:0,missingProducts:[]}]));
 const meals=mealSlots.map(slot=>({...slot,entries:Array.isArray(data?.[slot.key])?data[slot.key]:[]}));
 for(const meal of meals)for(const entry of meal.entries){
  const consumed=entry.mode==='package'?Number(entry.packageSize)*Number(entry.packageCount):Number(entry.amount);
  if(!Number.isFinite(consumed)||consumed<=0)continue;
  const product=entry.snapshot===undefined?null:entryProduct(entry,catalog),reference=/^(\d+(?:\.\d+)?)\s*(g|ml)$/.exec(product?.serving||''),amount=Number(reference?.[1]);
  for(const {key}of dailyNutrients){const value=product?.[key];if(!reference||!Number.isFinite(amount)||amount<=0||typeof value!=='number'||!Number.isFinite(value)){totals[key].missing++;const current=catalog.find(item=>String(item.id)===String(entry.productId));const name=[entry.snapshot?.brand??current?.brand,entry.snapshot?.name??current?.name].filter(Boolean).join(' ')||'Ürün bilgisi bulunamadı';totals[key].missingProducts.push(`${name} (${meal.label})`);}else totals[key].value+=consumed/amount*value;}
 }
 return{totals,meals,entryCount:meals.reduce((count,meal)=>count+meal.entries.length,0)};
}
export function savedTargets(data){return Object.fromEntries(dailyNutrients.map(({key,max})=>{const raw=data?.[key],number=Number(raw);return[key,raw!==''&&raw!=null&&Number.isFinite(number)&&number>=0&&number<=max?number:null];}));}

export function validDay(value){if(typeof value!=='string'||!/^(19|20|21)\d\d-\d\d-\d\d$/.test(value))return false;const date=new Date(value+'T12:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
