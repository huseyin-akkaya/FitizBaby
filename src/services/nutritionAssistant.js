import { products } from "../data/catalogStore";

// Keep the UI independent from the provider; replace this function with an API call later.
export async function getNutritionAssistantReply(message, context) {
  const query = message.trim().toLocaleLowerCase("tr-TR");
  const productMatches = products.filter((product) =>
    `${product.name} ${product.category} ${product.brand}`
      .toLocaleLowerCase("tr-TR")
      .split(/\s+/)
      .some((word) => word.length > 2 && query.includes(word)),
  );
  const isRecipe = /tarif|yemek|öğün|kahvaltı|öğle|akşam|atıştır/i.test(query);
  const isProtein = /protein|kas/i.test(query);
  const isCalorie = /kalori|kcal|enerji/i.test(query);
  const productText = productMatches.length
    ? `Kataloğundaki eşleşmeler: ${productMatches
        .map((product) => `${product.name} (${product.calories ?? "bilgi yok"} kcal, ${product.protein ?? "bilgi yok"} g protein / ${product.serving})`)
        .join(", ")}. Referans ölçüsü ürüne göre 100 g veya 100 ml olarak belirtilir.`
    : "Ürün kataloğunda doğrudan bir eşleşme bulamadım; aşağıdaki öneri genel bir fikir olarak düşünülmeli.";

  let advice;
  if (isRecipe) {
    advice = `Pratik bir fikir: yulafı proteinli sütle karıştırıp üzerine meyve ekleyerek dengeli bir öğün hazırlayabilirsin. Porsiyonu günlük hedefinde kalan enerjiye göre ayarla.`;
  } else if (isProtein) {
    advice = `Protein hedefin ${context.protein} g. Gün içinde protein kaynaklarını öğünlere yayabilir, porsiyonları hedefinde kalan miktara göre seçebilirsin.`;
  } else if (isCalorie) {
    advice = `Günlük enerji hedefin ${context.calories} kcal. Hedefin ${context.goal} olduğundan, sürdürülebilir porsiyonlar ve dengeli öğünler üzerine odaklan.`;
  } else {
    advice = `Hedefin ${context.goal}; günlük hedeflerin ${context.calories} kcal, ${context.protein} g protein, ${context.carbs} g karbonhidrat ve ${context.fat} g yağ. İsteğini öğün, tarif veya ürün önerisi olarak biraz açarsan daha nokta atışı yardımcı olabilirim.`;
  }

  return `${advice}\n\n${productText}\n\nBu öneriler genel bilgilendirme amaçlıdır; tıbbi beslenme tavsiyesi yerine geçmez.`;
}
