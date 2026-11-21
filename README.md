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

**Ürün düzenleme ve silme:** Giriş yapan kullanıcı kendi ürünlerini ürün detayından düzenleyip onaylayarak silebilir. Hazır katalogdaki ürünler değiştirilemez. Misafir ürünlerini düzenlemek için önce Hesabım ekranından aktarmak gerekir. Silinen ürün tekrar aktarımda geri gelmez; tarayıcıdaki kaynak kopya korunur. Yeni öğünlerde besin değerleri kaydedilir; ürün sonradan değişse veya silinse bile bu değerler korunur. Eski kayıtlarda ilk günün etiket değerleri bilinmiyorsa aktarım anındaki değerler tahmini aktarım olarak işaretlenir; bulunamayan ürünlerin miktarları korunur ve toplamın eksik olduğu belirtilir.

## Veriler Nasıl Saklanıyor?

Hazır ürün kataloğu proje dosyalarında bulunur. Misafir ürünleri, favorileri, profil, beslenme planı ve günlük takip kayıtları tarayıcının `localStorage` alanında saklanır. Giriş yaparak kaydedilen veya açıkça aktarılan ürünler, favoriler, profil, plan ve günlük kayıtlar PostgreSQL veritabanındadır. Hesapta beslenme değişiklikleri taslak olarak tutulur; ilgili sayfadaki kaydet düğmesiyle sunucuya gönderilir. Hesaptaki ürünler başka kullanıcılara açık değildir; ortak katalogdan ayrı tutulur.

- Site veya tarayıcı kapatılıp açıldığında kayıtlar normal koşullarda korunur.
- Yerel kayıtlar farklı tarayıcılar arasında senkronize edilmez. Kaydedilmiş hesap verilerine aynı hesapla başka tarayıcıdan erişilebilir. Açık sayfadaki veriyi güncellemek için yenileme gerekir; beslenme taslakları onay alınmadan sunucu verisiyle değiştirilmez.
- Kayıt alanı site adresine bağlıdır; alan adı, protokol veya port değişirse farklı bir kayıt alanı kullanılır.
- Site verilerinin temizlenmesi yerel kayıtları silebilir. Kaydedilmiş hesap verileri sunucuda kalır; diğer yerel kayıtlar için otomatik yedekleme yoktur.

## Geliştirme Aşamasındaki Bölümler

- **Yapay zekâ asistanı:** Kısmen çalışan bir prototiptir. Mevcut kod, mesajdaki anahtar kelimeleri ve katalog eşleşmelerini kullanarak hazır yanıtlar üretir; harici bir yapay zekâ modeli veya API bağlantısı bulunmaz. Geliştirmesi tamamlanmamıştır.
- **Beslenme planı:** Kalori ve makro hesaplama, hedefleri özelleştirme, üç/dört/beş öğün seçimi ve örnek tarif alternatifleri vardır. Bölümün geliştirmesi tamamlanmamıştır. Hesaplanan ihtiyaçlar ve tarif değerleri yaklaşık tahminlerdir.
- **Kullanıcı girişi ve kayıt:** Express/PostgreSQL tabanlı yerel hesap ve oturum akışı eklendi. Veritabanı kurulumu sonrasında kayıt, giriş, hesap ekranı ve çıkış kullanılabilir. E-posta doğrulama ve parola sıfırlama yerel deneme olarak çalışır. Resend Free tek alıcılı test entegrasyonu vardır; gerçek gönderim için kullanıcının özel anahtar kurulumu gerekir. Alan adı doğrulaması ve üretime açılma hazırlıkları tamamlanmadı.
- **Katalog yönetimi:** Kendi hesap ürününü ekleme/düzenleme/silme ve tarayıcıdan aktarım çalışır. Herkese açık ortak katalog için moderasyon henüz yoktur.
- **Sunucu ve yayımlama:** Hesap ve oturum sunucusu yerel geliştirme için hazırlandı. Genel kullanıma açık e-posta gönderimi, üretimde doğrulama zorunluluğu, yedekleme/geri yükleme ve sitenin yayımlanması sonraki aşamalardır.

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

Ön yüze Express API ve PostgreSQL hesap/oturum altyapısı eklendi. Kurulum adımları aşağıdadır. Kaydedilmiş hesap verileri PostgreSQL veritabanındadır; misafir kayıtları localStorage kullanır. Kaydedilmemiş hesap taslakları yalnızca açık sekmenin belleğindedir; sayfa kapanırsa kaybolabilir. Tarayıcı, taslak varken sayfadan ayrılmadan önce uyarı gösterebilir.

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

Profil, beslenme planı ve günlük kayıtlar ayrı hesap kayıtlarıdır; misafir verileri seçilerek ayrıca aktarılır. Özel ürünün favorisiyle birlikte içeriğini de Hesabım ekranından aktarmak gerekir; yalnızca favori kimliğini aktarmak ürün içeriğini taşımaz. Mevcut kurulumu güncellemek için `npm run db:migrate` çalıştırın; kurulum komutunu tekrar çalıştırmayın.

## Hesaba Bağlı Ürünler

Hesabım ekranında “Tarayıcı ürünlerini hesabıma aktar” seçeneği vardır. Aktarım tek tek ilerler; kısmen tamamlanırsa başarılı kayıtlar kalır ve hata gösterilir. Yeniden aktarım kopya oluşturmaz, hesapta düzenlenen ürünü ezmez ve silinen ürünü geri getirmez. Kaynak tarayıcı kayıtları silinmez. Aynı hesabın sekmeleri arasında değişiklik bildirimi ve pencereye dönüşte yenileme vardır; başka cihazda güncel liste için sayfayı yenileyin.

Hesap başına 100 etkin ürün ve silinen kimliklerle birlikte 500 ürün sınırı vardır. Görseller PNG/JPEG/WebP, en fazla 600 KB ve 16 milyon piksel olabilir. Sunucu görseli gerçekten açıp en fazla 800×800 WebP olarak yeniden oluşturur; ek görsel bilgilerini temizler. Yerel geliştirmede görseller veritabanında, hesap denetimli adresten sunulur. Harici görsel URL'leri hesaba aktarılmaz; eski kayıtta böyle bir URL varsa aktarım hata gösterir ve kaynağı korur. Ortak kataloğa yayın ve bulut görsel depolaması henüz yoktur.

## Hesaba Bağlı Beslenme Kayıtları

Hesabım ekranında aktarılacak asistan hedef profili, vücut bilgileri/plan, günlük hedefler ve tarihli öğünler tek tek seçilir. Aktarım kaynak kayıtları silmez, mevcut hesap kayıtlarını ezmez ve tekrarlandığında çoğaltmaz. Kısmi hata durumunda başarılı aktarımlar kalır; kalan kayıtlar yeniden denenebilir. Özel ürünler önce ürün aktarımıyla taşınmalıdır.

Plan ve günlük takip sayfalarındaki “Hesabıma kaydet” düğmesi değişiklikleri gönderir. Asistanın “Hedeflerimi kaydet” düğmesi de sunucu onayını bekler. Diğer sekmede daha yeni kayıt varsa eski taslak reddedilir ve korunur; sunucudaki sürüme dönmek için taslağı bırakma onayı istenir. Asistan hedefleri, plan hedefleri ve günlük takip hedefleri birbirinden ayrıdır; otomatik olarak birbirlerinin üzerine yazılmaz.

Günlük takipte tarih seçilebilir. Yeni öğünlerin etiket adı, referans ölçüsü ve kalori/protein/karbonhidrat/yağ değerleri kayıt sırasında tutulur. Ürün düzenleme veya silme geçmiş öğün değerlerini değiştirmez. Eski tarayıcı aktarımında kesin geçmiş etiket bulunamazsa güncel değerler veya kullanıcı beyanı açıkça işaretlenir; değer bulunamazsa uydurulmaz ve toplam eksik gösterilir. Sıfırlanmış hesap planı veya boşaltılmış gün tekrar aktarımda geri gelmez.

Her hesap için en fazla 3660 günlük kayıt, gün başına 100 öğün ürünü sınırı vardır. Misafir kaydı yeni biçimde ilk kez değiştirilirken önceki ham veri `fitizbaby.backup.before-nutrition-v2.` önekiyle aynı tarayıcıda saklanır. Bu yerel koruma, sunucu yedeği değildir ve site verileriyle birlikte silinebilir. Otomatik bulut yedeği, hesap/veri dışa aktarma ve üretim gizlilik süreçleri henüz tamamlanmadı.

## Yerel E-posta Doğrulama ve Parola Sıfırlama

Varsayılan yerel mod dışarıya e-posta göndermez. İsteğe bağlı Resend Free test kurulumu aşağıdadır; özel anahtar kurulmadan bu mod etkinleşmez. Geliştirmede `MAIL_MODE=local` kullanılır; deneme bağlantıları proje içindeki korumalı `.local-mail/` klasörüne yazılır. Windows erişimi mevcut kullanıcı, SYSTEM ve yöneticilerle sınırlıdır. Klasör Git dışında tutulur ve Vite üzerinden sunulması engellenir.

1. Hesabım ekranında “Doğrulama bağlantısı hazırla” düğmesini kullanın. Parola sıfırlamak için giriş ekranındaki “Parolamı unuttum” bağlantısını açın.
2. Proje terminalinde `npm run mail:local` çalıştırın. Komut son 10 yerel deneme iletisini gösterir.
3. İlgili bağlantıyı kendi tarayıcınızda açın ve ekrandan onaylayın. Bağlantıları/deneme dosyalarını paylaşmayın.

Doğrulama bağlantısı 24 saat, sıfırlama bağlantısı 30 dakika geçerlidir; tek kullanımlıktır. Yeni bağlantı hazırlanırsa aynı amaçtaki önceki bağlantı iptal edilir. Alıcı başına en az 60 saniye ara ve amaç başına saatte 5 bağlantı sınırı vardır. Parola sıfırlama, hesabın tüm oturumlarını ve bekleyen bağlantılarını iptal eder; ürün/beslenme verilerini silmez. Yeni parola 15–128 karakter olmalıdır.

Bağlantının gizli kısmı URL fragment'ında taşınır, sayfa açılınca adres çubuğundan kaldırılır. Yalnızca açmak işlemi tamamlamaz; kullanıcı onayı gerekir. Veritabanında bağlantı belirtecinin yalnızca SHA-256 özeti saklanır. Yerel ileti dosyası bağlantıyı içerdiği için gizlidir. Ekran yenilenirse bağlantının yeniden açılması gerekebilir.

Deneme sonucu görünen doğrulama durumu gerçek e-posta sahipliğinin kanıtı değildir. Bu aşamada doğrulama hesap erişiminin ön koşulu değildir. Üretimde yerel kutu açılmaz; `MAIL_MODE=disabled` ile gönderim/kurtarma isteği kapalıdır. Resend tek alıcılı test modu da üretimde açılmaz; genel gönderim, alan adı doğrulaması ve üretim doğrulama zorunluluğu ayrıca tamamlanmalıdır. Yerel deneme veritabanını üretim kimlik doğrulaması olarak taşımayın. `APP_PUBLIC_URL` izin verilen kaynaklardan biri olmalı; yerel modda localhost/loopback olmalıdır. Host başlığından bağlantı üretilmez.

## Resend Free ile Gerçek Test E-postası

Alan adı olmadan Resend yalnızca hizmette hesabı açtığınız e-posta adresine test gönderimine izin verir. Uygulama da alıcıyı bu tek adresle sınırlar. Resend'in Free planı ayda 3.000/günde 100 e-postadır; bu prototipte daha düşük **günde 50/ayda 1000 kuyruk kaydı** sınırı vardır. Kota dolunca yeni gönderim sıraya alınmaz. Uygulama ücretli plan veya faturalandırma API'si çağırmaz; sağlayıcı hesabında Free planını seçin.

1. [Resend](https://resend.com/signup) üzerinde kendi ücretsiz hesabınızı açın ve adresinizi doğrulayın. Ücretli plana geçmeyin.
2. API Keys bölümünde **Sending access** yetkili bir anahtar oluşturun. Full access gerekmez. Anahtarı sohbete veya GitHub'a koymayın.
3. Proje terminalinde `npm run setup:mail` çalıştırın. Resend hesabınızı açtığınız e-posta adresini ve gizli soruda API anahtarını girin. Anahtar ekranda gösterilmez.
4. `npm run db:migrate` çalıştırın, backend'i yeniden başlatın (`npm run dev:server`). `npm run mail:check` çıktısında `delivery: resend` olmalıdır; çıktı anahtarı/adresi göstermez. Gerçek işletim sistemi ortam değişkenleri özel dosyadan önceliklidir.
5. FitizBaby'de aynı e-posta adresine ait hesabınızla giriş yapın. Hesabım ekranından doğrulama e-postası isteyin. Sıfırlamayı aynı adreste deneyebilirsiniz. Kuyruk 5 saniyede bir işlenir; isteğin kabulü e-postanın kutuya teslim edildiğini garanti etmez. Spam klasörünü de kontrol edin.

`npm run mail:status` yalnızca güvenli kuyruk durum sayılarını gösterir. Kurulum komutu e-posta göndermez. Anahtar girilmeden veya gerçek deneme alınmadan gönderimin çalıştığı doğrulanmış sayılmaz. Testler gerçek sağlayıcı yerine sahte taşıyıcı kullanır.

Özel `.env.mail` dosyası mevcut kullanıcı/SYSTEM/yöneticilerle sınırlıdır, Git ve Vite dışında tutulur. Dosya önce korumalı geçici dizinde hazırlanır ve mevcut ayarın üzerine yazılmadan atomik yayımlanır. Kurulum dosyası zaten varsa üzerine yazmaz. `.env.mail.example` yalnızca örnektir. Kuyruk şifreleme anahtarını silip yeniden üretmek bekleyen iletileri okunamaz yapar; anahtar yenileme ayrı bakım işlemidir.

Gönderim HTTPS ile yalnızca `api.resend.com` üzerinden yapılır; tarayıcı anahtarı görmez. Kuyruk içeriği AES-256-GCM ile şifrelenir. Tekrar denemeler aynı gönderim kimliğiyle yapılır, kabul/süresi dolma/kalıcı hata sonrasında kuyruk içeriği temizlenir. Alıcı, konu ve güvenlik bağlantısı sağlayıcıya gider; beslenme, sağlık veya ürün verileri e-postaya eklenmez. Açılma/tıklama takibini kapalı tutun.

Yerel doğrulama gerçek doğrulama sayılmaz. Resend modu açılınca eski yerel onay güvenilir kabul edilmez ve yerel belirteçler tüketilemez. Gelen yeni bağlantı gerçek doğrulamayı işaretler. Bu entegrasyon **yalnızca tek alıcılı geliştirme testi** içindir; başka kullanıcılara gönderim, alan adı doğrulaması ve üretim erişim kuralları sonraki aşamadır.

Kaynaklar: [Free plan](https://resend.com/pricing), [test alıcısı kısıtı](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain), [gönderim anahtarı yetkisi](https://resend.com/changelog/new-api-key-permissions), [tekrar gönderim kimlikleri](https://resend.com/changelog/idempotency-keys).

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
