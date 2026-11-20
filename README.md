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

**Ürün düzenleme ve silme:** Giriş yapan kullanıcı kendi ürünlerini ürün detayından düzenleyip onaylayarak silebilir. Hazır katalogdaki ürünler değiştirilemez. Misafir ürünlerini düzenlemek için önce Hesabım ekranından aktarmak gerekir. Silinen ürün tekrar aktarımda geri gelmez; tarayıcıdaki kaynak kopya korunur. Günlük takip henüz güncel katalog değerlerini kullandığı için ürün düzenlemeleri eski öğün toplamlarına yansıyabilir; silinen/bulunamayan ürünlerin öğün kayıtları korunur, değerleri toplama katılmaz.

## Veriler Nasıl Saklanıyor?

Hazır ürün kataloğu proje dosyalarında bulunur. Misafir olarak eklenen ürünler ve favoriler, karşılaştırma seçimi, beslenme planı ve günlük takip kayıtları tarayıcının `localStorage` alanında saklanır. Giriş yaparak eklenen veya açıkça aktarılan ürünler ve hesap favorileri PostgreSQL veritabanındadır. Hesaptaki ürünler başka kullanıcılara açık değildir; ortak katalogdan ayrı tutulur.

- Site veya tarayıcı kapatılıp açıldığında kayıtlar normal koşullarda korunur.
- Yerel kayıtlar farklı tarayıcılar arasında senkronize edilmez. Hesap ürünlerine ve favorilerine aynı hesapla başka tarayıcıdan erişilebilir.
- Kayıt alanı site adresine bağlıdır; alan adı, protokol veya port değişirse farklı bir kayıt alanı kullanılır.
- Site verilerinin temizlenmesi yerel kayıtları silebilir. Hesap ürünleri ve favorileri sunucuda kalır; diğer yerel kayıtlar için otomatik yedekleme yoktur.

## Geliştirme Aşamasındaki Bölümler

- **Yapay zekâ asistanı:** Kısmen çalışan bir prototiptir. Mevcut kod, mesajdaki anahtar kelimeleri ve katalog eşleşmelerini kullanarak hazır yanıtlar üretir; harici bir yapay zekâ modeli veya API bağlantısı bulunmaz. Geliştirmesi tamamlanmamıştır.
- **Beslenme planı:** Kalori ve makro hesaplama, hedefleri özelleştirme, üç/dört/beş öğün seçimi ve örnek tarif alternatifleri vardır. Bölümün geliştirmesi tamamlanmamıştır. Hesaplanan ihtiyaçlar ve tarif değerleri yaklaşık tahminlerdir.
- **Kullanıcı girişi ve kayıt:** Express/PostgreSQL tabanlı yerel hesap ve oturum akışı eklendi. Veritabanı kurulumu sonrasında kayıt, giriş, hesap ekranı ve çıkış kullanılabilir. E-posta doğrulama, parola sıfırlama ve üretime açılma hazırlıkları henüz tamamlanmadı.
- **Katalog yönetimi:** Kendi hesap ürününü ekleme/düzenleme/silme ve tarayıcıdan aktarım çalışır. Herkese açık ortak katalog için moderasyon henüz yoktur.
- **Sunucu ve yayımlama:** Hesap ve oturum sunucusu yerel geliştirme için hazırlandı. Profil, beslenme planı ve günlük kayıtların hesaba bağlanması, e-posta doğrulama, parola kurtarma ve sitenin yayımlanması sonraki aşamalardır.

## Kullanılan Teknolojiler

- **JavaScript ve JSX:** Uygulama kodları.
- **React 19 ve React DOM:** Bileşenler ve arayüz durumu.
- **Express 5, PostgreSQL ve pg:** API, hesap ve oturum kayıtları.
- **Sharp:** Ürün görsellerini sunucuda doğrulama, küçültme ve yeniden kodlama.
- **Argon2id:** Parola hash işlemi.
- **Helmet, express-rate-limit ve Zod:** HTTP başlıkları, istek sınırlama ve sunucu doğrulaması.
- **Vite 8:** Yerel geliştirme ve üretim derlemesi.
- **Tailwind CSS 4:** Stil ve farklı ekran boyutlarına uyum.
- **React Router DOM 7:** Sayfalar arası yönlendirme.
- **Web Storage API (`localStorage`):** Tarayıcıda yerel veri saklama.
- **ESLint:** Kod denetimi.
- **Git ve GitHub:** Sürüm takibi ve kaynak kod paylaşımı.

Ön yüze Express API ve PostgreSQL hesap/oturum altyapısı eklendi. Kurulum adımları aşağıdadır. Hesap ürünleri ve favoriler veritabanındadır. Misafir ürünleri, profil, planlar ve günlük kayıtlar localStorage kullanmaya devam eder.

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

## Hesaba Bağlı Favoriler

Giriş yapan kullanıcının favorileri PostgreSQL'de kendi hesabına kaydedilir. Misafir favorileri tarayıcıda kalır. Hesabım ekranındaki aktarım düğmesi bu kayıtları hesap favorileriyle birleştirir; yerel kayıtları silmez ve tekrar aktarım kopya oluşturmaz. Diğer cihazda güncel liste için sayfayı yenileyin.

Profil, beslenme planı ve günlük kayıtlar henüz hesaba bağlı değildir. Özel ürünün favorisiyle birlikte içeriğini de Hesabım ekranından aktarmak gerekir; yalnızca favori kimliğini aktarmak ürün içeriğini taşımaz. Mevcut kurulumu güncellemek için `npm run db:migrate` çalıştırın; kurulum komutunu tekrar çalıştırmayın.

## Hesaba Bağlı Ürünler

Hesabım ekranında “Tarayıcı ürünlerini hesabıma aktar” seçeneği vardır. Aktarım tek tek ilerler; kısmen tamamlanırsa başarılı kayıtlar kalır ve hata gösterilir. Yeniden aktarım kopya oluşturmaz, hesapta düzenlenen ürünü ezmez ve silinen ürünü geri getirmez. Kaynak tarayıcı kayıtları silinmez. Aynı hesabın sekmeleri arasında değişiklik bildirimi ve pencereye dönüşte yenileme vardır; başka cihazda güncel liste için sayfayı yenileyin.

Hesap başına 100 etkin ürün ve silinen kimliklerle birlikte 500 ürün sınırı vardır. Görseller PNG/JPEG/WebP, en fazla 600 KB ve 16 milyon piksel olabilir. Sunucu görseli gerçekten açıp en fazla 800×800 WebP olarak yeniden oluşturur; ek görsel bilgilerini temizler. Yerel geliştirmede görseller veritabanında, hesap denetimli adresten sunulur. Harici görsel URL'leri hesaba aktarılmaz; eski kayıtta böyle bir URL varsa aktarım hata gösterir ve kaynağı korur. Ortak kataloğa yayın ve bulut görsel depolaması henüz yoktur.

## Yerel Backend Kurulumu

PostgreSQL kurulu ve çalışır durumda olmalıdır. Mevcut veritabanlarını değiştirmeden yalnızca FitizBaby için ayrı kurulum yapılır.

1. Proje klasöründe bağımlılıkları yükleyin: `npm ci --ignore-scripts`.
2. Kendi terminalinizde `npm run setup:db` çalıştırın. Yönetici adını girin (varsayılan `postgres`), ardından PostgreSQL parolanızı ekranda görünmeden yazın.
3. Komut, localhost:5432 üzerinde yeni `fitizbaby_dev` veritabanını, ayrı şema sahibi ve sınırlı API rollerini oluşturur. Hedefler veya ayar dosyaları zaten varsa üzerine yazmadan durur.
4. Bir terminalde `npm run dev:server`, diğerinde `npm run dev` çalıştırın. Uygulama `http://localhost:8080` adresindedir. Ön yüz `/api` isteklerini localhost:3001'e aktarır.

Yönetici parolası dosyaya kaydedilmez. Üretilen sınırlı bağlantı bilgileri `.env`, şema sahibi bilgileri `.env.migration` dosyasındadır. İkisi de Git dışında tutulur. Windows'ta bu dosyalar oluşturulurken erişimleri mevcut kullanıcı, SYSTEM ve yöneticilerle sınırlandırılır. Gerçek bağlantı bilgilerini paylaşmayın.

Sonraki şema güncellemeleri için `npm run db:migrate` kullanılır. Önceki şema dosyaları değiştirilmez; yeni sürüm dosyası eklenir. Kayıt/giriş için parola en az 15, en fazla 128 karakter olmalıdır. Oturum 30 dakika hareketsizlikte veya en fazla 7 gün sonunda kapanır.

API yalnızca yerel bilgisayarı dinler. Bu aşama yayımlanmış üretim sistemi değildir; [güvenlik sınırları](SECURITY.md) ve [backend ilerleme planı](BACKEND_ROADMAP.md) ayrıca açıklanmıştır.

Sunucu kontrolleri:

```bash
npm run test:server
```

Bu komutun veritabanı testleri, ayrı test bağlantısı olmadan atlanır. Tam PostgreSQL testi, kurulu PostgreSQL'in bin diziniyle çalıştırılır; mevcut hizmeti kullanmak yerine parolalı, yalnızca localhost'ta dinleyen geçici bir test örneği oluşturur:

```powershell
npm run test:integration -- --pg-bin "D:\postgare\bin"
```

PostgreSQL başka konumdaysa dizini değiştirin. Test örneği sonunda durdurulur; test dosyaları sistemin geçici klasöründe kalır. Kişisel kullanıcı veritabanına test kaydı eklenmez.

## Geliştirme Süreci ve Yapay Zekâ Desteği

Bu projeyi başka bir kişiyle birlikte çalışmadan, yapay zekâ desteğiyle geliştirdim. Kodlamanın büyük kısmını yapay zekâ gerçekleştirdi. Benim katkım; projenin fikrini, kapsamını ve özelliklerini belirlemek, tasarımı yönlendirmek, uygulamayı deneyerek sorunları tespit etmek ve düzeltmeleri kontrol etmek oldu.

Tasarımı sözlü olarak tarif ederek yapay zekâdan bir görsel oluşturmasını istedim. Beğendiğim görseli arayüz için referans aldık; renk seçimlerini de ben yaptım.

Geliştirme boyunca üretilen kodları inceleyip anlamaya çalıştım. Siteyi yerel ortamda çalıştırarak sayfaları ve işlevleri test ettim. Karşılaştığım sorunları yapay zekâya tarif ederek düzelttirdim ve sonuçları yeniden kontrol ettim. Örneğin kategorilerin yanlış ayrılması, sayfanın ortalanmaması ve küçük ekranlarda banner'ın kayması gibi sorunları tespit ettim. Kategorilerin nasıl düzenlenmesi gerektiğini belirledim ve yapılan düzeltmeleri kontrol ettim.

Bu nedenle projeyi, tüm kodlarını kendi başıma yazdığım bir çalışma olarak sunmuyorum. Proje; benim ürün ve tasarım kararlarım, testlerim ve geri bildirimlerim ile yapay zekânın sağladığı kodlama desteği sonucunda gelişmektedir.
