export function captureNutrition(product,source='catalog-at-entry') {
  if(!product)return null;
  return {id:product.id,name:product.name,brand:product.brand,serving:product.serving,calories:product.calories??null,protein:product.protein??null,carbs:product.carbs??null,fat:product.fat??null,capturedAt:new Date().toISOString(),source};
}
export function entryProduct(entry,catalog) {
  if(entry.snapshot) return {...entry.snapshot,image:'/images/products/product-placeholder.svg'};
  if(entry.snapshot===null)return null;
  return catalog.find(product=>String(product.id)===String(entry.productId))||null;
}
