# Ürün bilgileri ve kişisel katalog

## Ürün ekleme
Ürünler sayfasındaki “+ Ürün ekle” formu ad, marka, kategori, 100 g / 100 ml referansı, besin değerleri, içindekiler, alerjenler, kaynak bağlantısı ve isteğe bağlı yerel görsel alır. Bilinmeyen sayılar null saklanır. Şeker / karbonhidrat, doymuş / toplam yağ ve katı gıdada makro toplamı tutarlılıkları denetlenir.

Kişisel ürünler yalnızca bu tarayıcının localStorage alanına kaydedilir (fitizbaby-custom-products-v1). Sunucuya veya GitHub'a gönderilmez; başka cihazlarda otomatik görünmez. Kaynak URL'si, kullanıcı verisini üretici tarafından doğrulanmış hale getirmez. Bozuk mevcut kayıt üstüne yazılmaz; dolu / kapalı depolamada form açık kalır ve hata gösterilir.

Merkezi katalog aboneliği sayesinde yeni ürünler arama, marka / kategori filtreleri, ürün detayları, favoriler, karşılaştırma, kategori sayıları ve günlük makro takibinde kullanılabilir. Aynı tarayıcıdaki sekmeler storage olayıyla eşleşir. Görsel en fazla 600 KB PNG, JPEG veya WebP olabilir; eklenmezse yerel yer tutucu gösterilir.

## Sağlık bilgileri
Yorumlar içerik / etiket verilerinden kurallarla çıkarılan genel bilgilerdir; otomatik tıbbi tanı veya kişisel risk hesabı değildir. Protein, lifli besin çeşitliliği, tuz, doymuş yağ, toplam / serbest şeker ayrımı, alerjenler, polioller ve kırmızı etle ilgili uygun durumlar açıklanır. Katkı ismi veya E numarası tek başına zararlı etiketi üretmez. Eksik verilerden güvenli olduğu sonucu çıkarılmaz.

NHS yüksek şeker / tuz / doymuş yağ eşikleri yalnızca 100 g referanslı ürünlere uygulanır; 100 ml içeceklere katı gıda eşiği taşınmaz. Kullanıcının eklediği ürünlerde sağlık değerlendirmesi ve karşılaştırma kullanıcı beyanı olarak işaretlenir.

Kaynaklar (7 Kasım 2026 kontrolü):
- WHO sağlıklı beslenme: https://www.who.int/news-room/fact-sheets/detail/healthy-diet
- EFSA protein ve kas kütlesi: https://www.efsa.europa.eu/en/efsajournal/pub/1811
- NHS etiket okuma: https://www.nhs.uk/live-well/eat-well/food-guidelines-and-food-labels/how-to-read-food-labels/
- NHS gıda alerjisi: https://www.nhs.uk/conditions/food-allergy/
- NHS tatlandırıcılar: https://www.nhs.uk/live-well/eat-well/food-types/are-sweeteners-safe/
- EFSA katkılar: https://www.efsa.europa.eu/en/topics/topic/food-additives
- WHO / IARC et değerlendirmesi: https://www.who.int/news-room/questions-and-answers/item/cancer-carcinogenicity-of-the-consumption-of-red-meat-and-processed-meat

Doğrulama: build ve lint; Chromium'da etiket bazlı sağlık bölümü, kaynak bağlantıları, form zorunlu alanları, şeker tutarlılığı, kayıt / yeniden yükleme, özel ID ile detay, arama / karşılaştırma, sekmeler arası eşleşme, boş değerler, uygunsuz URL, bozuk kayıt koruması ve 390 px mobil görünüm kontrol edildi.
