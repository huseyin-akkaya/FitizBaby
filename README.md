# FitizBaby

FitizBaby, gıda ürünlerinin içeriklerini ve besin değerlerini incelemeyi, ürünleri karşılaştırmayı ve günlük beslenmeyi takip etmeyi kolaylaştırmak amacıyla geliştirilen bir web uygulamasıdır. Aynı zamanda arayüz geliştirme, ürün tasarımı ve uygulama testlerini öğrenmek için yürüttüğüm kişisel bir projedir.

Proje geliştirme aşamasındadır. Kaynak kod [FitizBaby GitHub deposunda](https://github.com/huseyin-akkaya/FitizBaby) herkese açıktır; site henüz yayımlanmamıştır. Bu README, bu deponun mevcut kodlarını esas alır.

## Mevcut Özellikler

- Ürünleri listeleme, ürün adı ve marka üzerinden arama.
- Ayrı kategoriler sayfası ve kategoriye göre ürün filtreleme.
- Çoklu marka seçimi, marka arama, kalori ve protein aralığı filtreleri, filtreleri sıfırlama.
- Besin değerlerine ve ürün adına göre sıralama; kart ve yatay liste görünümü.
- Ürün adı, marka, kategori, besin değerleri, içerik, alerjen, kaynak bağlantısı ve isteğe bağlı görsel ile ürün ekleme. Bilinmeyen besin değerleri boş bırakılabilir; girilen değerlerde temel tutarlılık kontrolleri yapılır.
- Ürün detayları, favorilere ekleme ve favorileri görüntüleme.
- İki ila dört ürünü besin değerleri, içerik ve alerjen bilgileriyle karşılaştırma. Farklı kategori ve ölçü birimleri için uyarılar, açıklanabilir puanlama ve beraberlik desteği.
- Ürün etiketine göre oluşturulan, kaynak bağlantıları içeren genel fayda ve olası risk açıklamaları. Bu bilgiler kişisel tıbbi değerlendirme değildir; kullanıcı tarafından eklenen veriler bağımsız doğrulanmış sayılmaz.
- Günlük makro takip ekranında ürünleri öğünlere ekleme, miktarlarını değiştirme, öğün kayıtlarından çıkarma ve toplamları izleme.
- Küçük ekranlara uyarlanan sayfa düzenleri ve mobil menü.

**Ürün düzenleme ve silme hakkında:** Bu depodaki mevcut katalog arayüzünde ürün ekleme doğrulanmıştır; katalog ürünlerini düzenleme ve silme akışları henüz bulunmamaktadır. Ürünü karşılaştırmadan veya günlük öğün kaydından çıkarmak, katalogdan silmekle aynı işlem değildir.

## Veriler Nasıl Saklanıyor?

Hazır ürün kataloğu proje dosyalarında bulunur. Kullanıcının eklediği ürünler, favoriler, karşılaştırma seçimi, beslenme planı ve günlük takip kayıtları ise kullanılan tarayıcının `localStorage` alanında saklanır.

- Site veya tarayıcı kapatılıp açıldığında kayıtlar normal koşullarda korunur.
- Farklı tarayıcılar, profiller veya cihazlar arasında senkronizasyon yoktur.
- Kayıt alanı site adresine bağlıdır; alan adı, protokol veya port değişirse farklı bir kayıt alanı kullanılır.
- Site verilerinin temizlenmesi yerel kayıtları silebilir. Bu yapı sunucu tabanlı bir veritabanı veya yedekleme hizmeti değildir.

## Geliştirme Aşamasındaki Bölümler

- **Yapay zekâ asistanı:** Kısmen çalışan bir prototiptir. Mevcut kod, mesajdaki anahtar kelimeleri ve katalog eşleşmelerini kullanarak hazır yanıtlar üretir; harici bir yapay zekâ modeli veya API bağlantısı bulunmaz. Geliştirmesi tamamlanmamıştır.
- **Beslenme planı:** Kalori ve makro hesaplama, hedefleri özelleştirme, üç/dört/beş öğün seçimi ve örnek tarif alternatifleri vardır. Bölümün geliştirmesi tamamlanmamıştır. Hesaplanan ihtiyaçlar ve tarif değerleri yaklaşık tahminlerdir.
- **Kullanıcı girişi ve kayıt:** Menüde giriş ve kayıt düğmeleri vardır; çalışan bir hesap oluşturma veya oturum açma akışı henüz bulunmaz.
- **Katalog yönetimi:** Ürün düzenleme ve katalogdan silme işlemleri tamamlanacak işler arasındadır.
- **Sunucu ve yayımlama:** Hesap tabanlı veri saklama, cihazlar arası senkronizasyon ve sitenin yayımlanması henüz tamamlanmamıştır.

## Kullanılan Teknolojiler

- **JavaScript ve JSX:** Uygulama kodları.
- **React 19 ve React DOM:** Bileşenler ve arayüz durumu.
- **Vite 8:** Yerel geliştirme ve üretim derlemesi.
- **Tailwind CSS 4:** Stil ve farklı ekran boyutlarına uyum.
- **React Router DOM 7:** Sayfalar arası yönlendirme.
- **Web Storage API (`localStorage`):** Tarayıcıda yerel veri saklama.
- **ESLint:** Kod denetimi.
- **Git ve GitHub:** Sürüm takibi ve kaynak kod paylaşımı.

Mevcut uygulama bir ön yüz projesidir; çalışan bir sunucu/veritabanı bağlantısı içermez.

## Kurulum ve Çalıştırma

Node.js 22.12 veya üzeri, npm ve Git kurulu olmalıdır.

```bash
git clone https://github.com/huseyin-akkaya/FitizBaby.git
cd FitizBaby
npm install
npm run dev
```

Vite'ın terminalde gösterdiği yerel adresi tarayıcıda açın. Mevcut proje klasörünüz varsa klonlama adımını atlayıp komutları o klasörde çalıştırabilirsiniz.

Üretim dosyalarını oluşturmak için:

```bash
npm run build
```

Oluşturulan sürümü yerel olarak önizlemek için:

```bash
npm run preview
```

Kod denetimi için:

```bash
npm run lint
```

Derleme veya yerel önizleme, sitenin internette yayımlandığı anlamına gelmez.

## Geliştirme Süreci ve Yapay Zekâ Desteği

Bu projeyi başka bir kişiyle birlikte çalışmadan, yapay zekâ desteğiyle geliştirdim. Kodlamanın büyük kısmını yapay zekâ gerçekleştirdi. Benim katkım; projenin fikrini, kapsamını ve özelliklerini belirlemek, tasarımı yönlendirmek, uygulamayı deneyerek sorunları tespit etmek ve düzeltmeleri kontrol etmek oldu.

Tasarımı sözlü olarak tarif ederek yapay zekâdan bir görsel oluşturmasını istedim. Beğendiğim görseli arayüz için referans aldık; renk seçimlerini de ben yaptım.

Geliştirme boyunca üretilen kodları inceleyip anlamaya çalıştım. Siteyi yerel ortamda çalıştırarak sayfaları ve işlevleri test ettim. Karşılaştığım sorunları yapay zekâya tarif ederek düzelttirdim ve sonuçları yeniden kontrol ettim. Örneğin kategorilerin yanlış ayrılması, sayfanın ortalanmaması ve küçük ekranlarda banner'ın kayması gibi sorunları tespit ettim. Kategorilerin nasıl düzenlenmesi gerektiğini belirledim ve yapılan düzeltmeleri kontrol ettim.

Bu nedenle projeyi, tüm kodlarını kendi başıma yazdığım bir çalışma olarak sunmuyorum. Proje; benim ürün ve tasarım kararlarım, testlerim ve geri bildirimlerim ile yapay zekânın sağladığı kodlama desteği sonucunda gelişmektedir.
