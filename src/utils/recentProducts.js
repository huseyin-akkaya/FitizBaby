// Rows arrive ordered by saved day, meal order and entry position; never by browsing activity.
export function collectRecentProducts(rows,catalog,limit=6){
 const available=new Map(catalog.map(product=>[String(product.id),product])),seen=new Set(),items=[];
 for(const row of rows){
  const id=String(row.productId),product=available.get(id),amount=row.mode==='package'?Number(row.packageSize)*Number(row.packageCount):Number(row.amount);
  if(!product||seen.has(id)||!Number.isFinite(amount)||amount<=0)continue;
  seen.add(id);items.push({productId:product.id,day:row.day,meal:row.meal,amount:amount<=100000?amount:null,serving:['100 g','100 ml'].includes(row.serving)?row.serving:null});
  if(items.length>=limit)break;
 }
 return items;
}
export function recentPortion(item,product){
 if(!item||!product||!['100 g','100 ml'].includes(item.serving)||item.serving!==product.serving||!Number.isFinite(item.amount)||item.amount<0.1||item.amount>100000)return null;
 return item.amount;
}
