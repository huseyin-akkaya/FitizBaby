const sources = {
  diet: { label: 'WHO · Sağlıklı beslenme', url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet' },
  protein: { label: 'EFSA · Protein ve kas kütlesi', url: 'https://www.efsa.europa.eu/en/efsajournal/pub/1811' },
  labels: { label: 'NHS · Besin etiketlerini okuma', url: 'https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/how-to-read-food-labels/' },
  allergy: { label: 'NHS · Gıda alerjisi', url: 'https://www.nhs.uk/conditions/food-allergy/' },
  polyols: { label: 'NHS · Tatlandırıcılar', url: 'https://www.nhs.uk/live-well/eat-well/food-types/are-sweeteners-safe/' },
  additives: { label: 'EFSA · Gıda katkıları', url: 'https://www.efsa.europa.eu/en/topics/topic/food-additives' },
  meat: { label: 'WHO / IARC · Kırmızı ve işlenmiş et', url: 'https://www.who.int/news-room/questions-and-answers/item/cancer-carcinogenicity-of-the-consumption-of-red-meat-and-processed-meat' },
};

export function getProductHealth(product) {
  const benefits = [], cautions = [], context = [];
  const ingredients = (product.ingredients || []).join(' ').toLocaleLowerCase('tr');
  const evidence = product.userProvided ? 'Girdiğin etikete göre' : 'Katalogdaki etiket verisine göre';
  const add = (list, title, text, source) => list.push({ title, text, source: sources[source] });
  if (product.protein > 0) add(benefits, 'Protein alımına katkı', evidence + ' ' + product.serving + ' içinde ' + product.protein + ' g protein bulunuyor. Protein kas kütlesinin korunmasına katkıda bulunur; bu ürünün tek başına kas geliştireceği anlamına gelmez.', 'protein');
  if (product.fiber > 0 || /yulaf|tam buğday|nohut|mercimek/.test(ingredients)) add(benefits, 'Lifli besin çeşitliliği', product.fiber > 0 ? evidence + ' ' + product.serving + ' içinde ' + product.fiber + ' g lif var. Lif içeren tahıl ve baklagiller dengeli beslenmeye katkı sağlar.' : 'İçerik listesinde tahıl veya baklagil bulunuyor. Bunlar besin çeşitliliğine katkı sağlayabilir; bu ürünün lif miktarı doğrulanmadı.', 'diet');
  if (/badem|fındık|yer fıstığı|ceviz/.test(ingredients)) add(benefits, 'Bitkisel kaynak içeriyor', 'Kuruyemiş bileşenleri, çeşitli bitkisel besinlere yer verilen bir beslenme düzeninde kullanılabilir. Fayda porsiyona ve ürünün toplam bileşimine bağlıdır.', 'diet');
  if (product.salt > 0) add(cautions, 'Tuz ve tansiyon', evidence + ' tuz miktarı ' + product.salt + ' g / ' + product.serving + '. Fazla tuz tüketimi kan basıncını artırabilir; toplam günlük alımı ve porsiyonu dikkate al.', 'diet');
  if (product.saturatedFat > 0) add(cautions, 'Doymuş yağ alımı', evidence + ' doymuş yağ ' + product.saturatedFat + ' g / ' + product.serving + '. Doymuş yağın yerine doymamış yağları tercih etmek kalp ve damar sağlığı açısından önemlidir.', 'diet');
  if (product.sugar > 0) add(context, 'Toplam şeker ile ilave şeker farklıdır', 'Etiketteki ' + product.sugar + ' g / ' + product.serving + ' toplam şekerdir; tamamı ilave veya serbest şeker olarak kabul edilemez. Şeker, bal, şurup ve meyve suyu bileşenleri varsa porsiyon ve tüketim sıklığını ayrıca değerlendir.', 'labels');
  if (/şeker|şurup|bal\b|pekmez|meyve suyu|hurma özü/.test(ingredients)) add(cautions, 'Serbest şeker kaynakları', 'İçerikte şeker, şurup veya meyve suyu / özüne işaret eden bileşenler var. Serbest şekerin sık ve fazla tüketimi diş çürüğü ve gereksiz enerji alımını artırabilir; miktarı yalnızca içerik sırasından hesaplanamaz.', 'diet');
  const allergens = product.allergenInfo?.contains || [];
  const traces = product.allergenInfo?.mayContain || [];
  if (allergens.length || traces.length) add(cautions, 'Alerjisi olanlar için risk', 'Bildirilen alerjenler: ' + (allergens.join(', ') || 'belirtilmemiş') + '. Olası eser miktar: ' + (traces.join(', ') || 'kaynakta belirtilmemiş') + '. İlgili alerjisi olanlarda reaksiyon ciddi olabilir; tüketim kararını ambalaj ve kişisel alerji bilgisiyle ver.', 'allergy');
  if (/maltitol|sorbitol|eritritol|ksilitol|mannitol|laktitol|izomalt/.test(ingredients)) add(cautions, 'Polioller ve sindirim', 'İçerikte poliol türü tatlandırıcı bulunuyor. Fazla tüketim bazı kişilerde gaz, şişkinlik veya müshil etkisine yol açabilir; miktar ve kişisel tolerans önemlidir.', 'polyols');
  if (/koruyucu|stabilizör|emülgatör|renklendirici|aroma verici|tatlandırıcı|e\s?\d{3}/.test(ingredients)) add(context, 'Katkı maddesi nasıl değerlendirildi?', 'İçerikte katkı maddesine işaret eden terimler var. Yalnızca adı veya E kodu bir maddenin zararlı olduğunu göstermez; değerlendirme maddeye, doza ve kullanım koşuluna bağlıdır. Bu araç katkı dozunu bilmiyor.', 'additives');
  if (/dana eti|sığır eti|dana kavurma/.test(ingredients + ' ' + product.name.toLocaleLowerCase('tr'))) add(cautions, 'Kırmızı et ve tüketim sıklığı', 'WHO / IARC, kırmızı ve işlenmiş et tüketimini uzun vadeli kanser riski açısından değerlendirir. Bu genel kanıt, bu ürünün tek porsiyonunun kanser yapacağı veya kişisel riskinin hesaplandığı anlamına gelmez; düzenli tüketim miktarı önemlidir.', 'meat');
  if (product.serving === '100 g') {
    const high = [[product.sugar, 22.5, 'şeker'], [product.salt, 1.5, 'tuz'], [product.saturatedFat, 5, 'doymuş yağ']].filter(([value, threshold]) => typeof value === 'number' && value > threshold).map(([, , label]) => label);
    if (high.length) add(cautions, '100 g etiketinde yüksek görünenler', 'NHS etiket rehberindeki katı gıda eşiklerine göre: ' + high.join(', ') + '. Bu sınıflama günlük porsiyonun yerine geçmez ve tek başına genel sağlık hükmü değildir.', 'labels');
  }
  return { benefits, cautions, context };
}
