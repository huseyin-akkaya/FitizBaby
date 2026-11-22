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
- Site verilerinin temizlenmesi yerel kayıtları silebilir. Kaydedilmiş hesap verileri sunucuda kalır; diğer yerel kayıtlar için otomatik yedekleme yoktur. PostgreSQL için şifreli, elle başlatılan ve ayrı geçici veritabanında geri yüklenerek doğrulanan yedekleme aracı vardır; [yedekleme kılavuzuna](BACKUPS.md) bakın.

## Geliştirme Aşamasındaki Bölümler

- **Yapay zekâ asistanı:** Kısmen çalışan bir prototiptir. Mevcut kod, mesajdaki anahtar kelimeleri ve katalog eşleşmelerini kullanarak hazır yanıtlar üretir; harici bir yapay zekâ modeli veya API bağlantısı bulunmaz. Geliştirmesi tamamlanmamıştır.
- **Beslenme planı:** Kalori ve makro hesaplama, hedefleri özelleştirme, üç/dört/beş öğün seçimi ve örnek tarif alternatifleri vardır. Bölümün geliştirmesi tamamlanmamıştır. Hesaplanan ihtiyaçlar ve tarif değerleri yaklaşık tahminlerdir.
- **Kullanıcı girişi ve kayıt:** Express/PostgreSQL tabanlı yerel hesap ve oturum akışı eklendi. Veritabanı kurulumu sonrasında kayıt, giriş, hesap ekranı ve çıkış kullanılabilir. E-posta doğrulama ve parola sıfırlama yerel deneme olarak çalışır. Resend Free tek alıcılı test entegrasyonu vardır; gerçek gönderim için kullanıcının özel anahtar kurulumu gerekir. Alan adı doğrulaması ve üretime açılma hazırlıkları tamamlanmadı.
- **Katalog yönetimi:** Kendi hesap ürününü ekleme/düzenleme/silme ve tarayıcıdan aktarım çalışır. Herkese açık ortak katalog için moderasyon henüz yoktur.
- **Sunucu ve yayımlama:** Hesap ve oturum sunucusu yerel geliştirme için hazırlandı. Şifreli yerel veritabanı yedekleme ve geçici hedefte geri yükleme doğrulaması eklendi. Genel kullanıma açık e-posta gönderimi, üretimde doğrulama zorunluluğu, zamanlanmış/uzak yedekleme, gerçek kurtarma geçişi ve sitenin yayımlanması sonraki aşamalardır.

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

Her hesap için en fazla 3660 günlük kayıt, gün başına 100 öğün ürünü sınırı vardır. Misafir kaydı yeni biçimde ilk kez değiştirilirken önceki ham veri `fitizbaby.backup.before-nutrition-v2.` önekiyle aynı tarayıcıda saklanır. Bu yerel koruma, sunucu yedeği değildir ve site verileriyle birlikte silinebilir. Hesap verileri aşağıdaki dışa aktarma akışıyla indirilebilir. Otomatik bulut yedeği, dosyadan geri yükleme ve üretim gizlilik süreçleri henüz tamamlanmadı.

## Hesap verilerini indirme ve hesap silme

Hesabım → **Verilerim ve hesabım** bölümünde güncel parolayla indirme hazırlanır. İki dakika geçerli, tek kullanımlık bağlantı; profil, özel ürün ve görseller, favoriler, plan ve günlük kayıtları `.json.gz` biçiminde indirir. Parola özetleri, oturumlar, güvenlik bağlantıları ve gizli anahtarlar dışa aktarılmaz. Dosya sıkıştırılmıştır, **şifrelenmiş değildir**; kişisel beslenme bilgilerini içerir ve güvenli saklanmalıdır. Dosyayı uygulamaya otomatik geri yükleme henüz yoktur.

Hesap silmek için güncel parola ve `HESABIMI SIL` onayı gerekir. Hesap ve bağlı veriler etkin veritabanından kaldırılır; açık oturumlar ve bekleyen güvenlik bağlantıları geçersiz olur. Bu işlem geri alınamaz. Aynı adrese ait yerel deneme iletileri de temizlenmeye çalışılır; başarısız temizlik ayrıca bildirilir. Diğer hesaplar ve tarayıcıdaki misafir kayıtları korunur.

Önceden indirilen dosyalar, varsa ayrı veritabanı yedekleri, ortak uygulama ayarları ve e-posta sağlayıcısının kayıtları bu işlemle silinmez. Başlamış bir e-posta geri çağrılamayabilir; bağlantısı silme sonrasında çalışmaz. Bu işlev tek başına tamamlanmış bir üretim veri saklama veya mevzuat uyumu süreci değildir.

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

## Şifreli veritabanı yedeği

`npm run db:backup -- --pg-bin "D:\postgare\bin"` komutu ayrı yedek parolasını gizli ister. Kayıtlar şifrelenir; yedek ayrı geçici PostgreSQL sunucusunda geri yüklenip içerik özetleri karşılaştırılmadan tamamlanmış sayılmaz. Oturumlar ve bekleyen güvenlik bağlantıları dışlanır. Arşivler proje/Git dışında tutulur. Mevcut veritabanının üzerine yazılmaz. Kurulum, tekrar doğrulama, saklama ve kurtarma sınırları için [BACKUPS.md](BACKUPS.md) dosyasını okuyun.

## Parola değişikliği ve açık oturumlar

Hesabım → **Parola ve oturum güvenliği** bölümünden güncel parola doğrulanarak yeni parola belirlenebilir. Yeni parola 15–128 karakter, en fazla 512 UTF-8 bayt olmalı ve mevcut paroladan farklı olmalıdır. Argon2id ile saklanır. Değişiklik bu hesabın tüm oturumlarını kapatır; yeniden giriş gerekir. Bekleyen doğrulama/parola sıfırlama bağlantıları, indirme izinleri ve bekleyen e-posta kuyrukları geçersiz olur. Doğrulama durumu kendiliğinden yükseltilmez. Kaydedilmiş ürünler, favoriler ve beslenme kayıtları korunur.

Açık oturum listesi yalnızca bu hesaba ait, süresi dolmamış ve son 30 dakikada etkin oturumları gösterir. Bu oturum işaretlenir; açılış, son etkinlik ve en geç sona erme tarihleri tarayıcının saat dilimindedir. Cihaz/IP bilgisi tutulmadığından bunlar gösterilmez. Liste kendiliğinden sürekli yenilenmez; yenile düğmesi kullanılabilir. Güncel parolayla seçilen başka oturum veya diğer tüm oturumlar kapatılabilir; mevcut oturum açık kalır. Mevcut oturum için menüdeki çıkış düğmesi kullanılır.

Kapatılan oturum sunucuda hemen geçersiz olur; başka cihazın açık ekranı bir sonraki istek/oturum yenilemesinde güncellenir. Aynı tarayıcıdaki sekmelere oturum durumu bildirimi yapılır. Başlamış bir e-posta geri çağrılamayabilir, ancak iptal edilen bağlantısı çalışmaz. Güvenlik işlemleri için otomatik bildirim e-postası ve MFA henüz eklenmedi.

## Ziyaretçi ve üye ana sayfası

Oturum açılmadan önce `/` adresinde FitizBaby'yi tanıtan, kaydırılabilir bir sayfa ve sade ziyaretçi menüsü gösterilir. Hareketli SVG yiyecek karakterleri, fareye tepki veren tabak görseli, kurgusal X/Y ürünleri ve açıkça temsili olarak belirtilen değerlerle protein/şeker/kalori karşılaştırma demosu, hesap faydaları ve açılır sorular vardır. Animasyonlar durdurulabilir; sistemin azaltılmış hareket tercihi uygulanır. Görseller ve yazı tipleri için harici bir hizmet kullanılmaz. Tanıtım etkileşimleri kişisel veri toplamaz veya misafir kayıtlarını değiştirmez.

Kayıt veya giriş sonrası ana sayfada üyeye özel karşılama, ürün arama, kategori kısa yolları ve araç kartları gösterilir; tam uygulama menüsü korunur. Çıkış sonrası tanıtım görünümü geri gelir. Bu ayrım ana sayfa ve menü sunumuyla ilgilidir; mevcut misafir araçlarının adreslerine yeni bir erişim yasağı eklenmedi. Hesap kayıtlarının sunucu yetkilendirmesi aynı şekilde sürer. Tanıtım karşılaştırması gerçek ürün/marka içermez; X/Y ambalajları ve sayısal değerler yalnızca işleyişi göstermek içindir. Gerçek katalog ve üye karşılaştırma araçları korunur.

## Ortak arayüz tasarımı

Ziyaretçi sayfasındaki krem, koyu yeşil ve pastel renkler; Arial/Georgia başlık düzeni, yuvarlatılmış kartlar ve ortak form/buton stilleri site geneline uygulanır. Tema `src/styles/theme.css` dosyasında merkezi olarak tanımlıdır. Giriş/kayıt, ürünler ve detayları, kategoriler, karşılaştırma, beslenme planı, günlük takip, asistan, hesap ve güvenlik sayfaları aynı tasarım dilini kullanır. Hata ve silme uyarılarının ayrı renk anlamları korunur.

Üye ana sayfası eski geniş banner yerine kişisel karşılama, yiyecek çizimleri, ürün arama, kategori kısayolları ve pastel araç kartları içerir. Hızlı karşılaştırma ve hedefe göre ürün bulma pencereleri çalışmaya devam eder. Ortak alt bilgi ve küçük ekran menüsü vardır; sistemin azaltılmış hareket tercihi uygulanır. Tema değişikliği veri saklama veya hesap yetkilendirme kurallarını değiştirmez.

## Bugünüm: günlük kullanım ekranı

Giriş ve kayıt sonrası `/today` açılır. Menüde **Bugünüm** bağlantısı bulunur; `/` adresindeki üye ana sayfası ve araçları korunur. Bugünüm, kullanıcının yerel takvim günündeki **hesabına kaydedilmiş** öğünleri, kalori ve makro toplamlarını gösterir. Kaydedilmemiş günlük takip taslakları ilerleme sayılmaz. Hedef belirlenmediyse hedef varsayılmaz; sıfır hedef için yüzde hesaplanmaz. Eksik geçmiş etiket güncel katalogdan tamamlanmaz; küçük bir notla belirtilir. Kalori çemberi ve yeşil makro çubukları bilinen alınan miktara göre orantılı dolar, hedefte %100 olur ve aşımda %100’de kalır. Alınan, kalan (en az sıfır) ve varsa hedef üzerindeki miktar sayıyla gösterilir. Eksik veri varsa kalan miktarın da bilinen kayıtlara göre olduğu belirtilir.

Yeni kullanıcı için günlük hedefini belirle → ürün seç → hesabına kaydet yönlendirmesi vardır. Günlük takip hedefleri bu ekrandan kaydedilebilir; plan/asistan hedeflerinden ayrıdır. Kullanıcı isterse kaydedilmiş planın makrolarını açık düğmeyle günlük hedef olarak kullanır. Favoriler, hesaba ait özel ürünler veya katalogdan seçilen ürün; öğün ve g/ml miktarı onaylandıktan sonra kaydedilir. Yanıt gelmeden ilerleme artırılmaz. Aynı öğündeki mevcut ürün ikinci kez eklenmez; miktar düzenlemesi günlük takipte yapılır.

Önceki takvim gününün kaydedilmiş bir öğünü veya tüm öğünleri, açık onayla bugüne kopyalanabilir. Bugünkü kayıtlar ve miktarları korunur; aynı öğündeki aynı ürün atlanır. Besin değerleri ve miktarlar kaynak kayıttan alınır; silinmiş ürünlerin mevcut tarihsel besin kayıtları korunur. Tekrar kopyalama çoğaltmaz. Kaynak veya hedef başka sekmede değişmişse işlem reddedilir ve yenileme istenir. Günlük 100 ürün ve hesap başına 3660 gün sınırı sürer. Bu özellik için yeni veritabanı migration'ı gerekmez.

Mevcut taslaklar kaydetme/kopyalama/yenileme ile ezilmez; önce günlük takip ekranında kontrol edilir. Ağ hatasında işlem sonucu varsayılmaz ve form değerleri korunur. Özet başka cihazlarda kendiliğinden anlık senkronize olmaz; **Kayıtları yenile** düğmesi vardır. Gece yarısında ve pencereye dönüşte yerel tarih kontrol edilir. Günlük takip `?day=YYYY-MM-DD&meal=breakfast` gibi tarihli bağlantıları destekler; geçersiz tarihte yerel güne dönülür. Misafir tarayıcı kayıtları otomatik olarak hesaba alınmaz.

Bugünüm öğün kartlarında tüm kayıtlar ve miktarları listelenir. **Düzenle** miktarı değiştirir; paketli kayıt düzenlendiğinde toplam g/ml miktarı üzerinden kaydedilir. **Sil** onay ister ve yalnızca seçilen öğün kaydını kaldırır. **Besin bilgilerini yenile** eski ve güncel 100 g/ml değerlerini karşılaştırır; kullanıcı onayından sonra yalnızca seçilen kaydın besin bilgileri güncellenir. Miktar ve diğer kayıtlar korunur. Ürün artık katalogda yoksa yenileme yapılmaz. Güncel kaynakta hâlâ eksik değer varsa bilinmiyor olarak kalır.

Bu işlemler kaydedilmemiş taslakları ezmez. Sunucu hesap sahipliğini, etkin oturumu ve kayıt sürümünü kontrol eder; etiket önizlemesi güncel ürünle eşleşmiyorsa yenileme reddedilir. Günlük toplamlar yalnızca başarılı kayıt yanıtından sonra değişir. Eksik besin uyarıları ilgili ürün adlarını ve öğünleri gösterir.

Bugünüm öğün satırları sade ürün düğmeleriyle gösterilir: ürün adına tıklama veya sola kaydırma miktar düzenlemeyi açar; yanındaki çarpı veya sağa kaydırma silme onayını açar. Dikey sayfa kaydırma işlem başlatmaz. Ayrı etiket yenileme düğmesi gösterilmez.

Bugünüm ekranındaki başarılı ekleme, miktar düzenleme, silme ve dünden kopyalama işlemleri yerel bir karakter tepkisi gösterir. Ekleme ve silme farklı kısa Web Audio sesleri ve desteklenen cihazlarda farklı titreşim desenleri kullanır. Tam bilinen besin toplamı pozitif hedefi ilk kez geçtiğinde/hedefe ulaştığında tepki oluşur; hedefe ulaşmada baloncuklar, aşımda yargılamayan bir hatırlatma gösterilir. Sayfa açılışı, hedef değişikliği ve başarısız kayıt kutlama başlatmaz. Ses, titreşim ve hareket tercihleri bu tarayıcıda saklanır; azaltılmış hareket tercihi gözetilir. Ses ve titreşim cihaz/tarayıcı desteğine bağlıdır. Harici ses dosyası, kamera, mikrofon veya izleme servisi kullanılmaz.

## Filiz: site genelindeki yol arkadaşı

Filiz, tüm sayfalarda sağ alttaki karakter düğmesinden açılır. Ürünler, atıştırmalık kategorisi, detaylar, karşılaştırma, plan, günlük takip, asistan ve hesap için ayrı hazır mesajları vardır. Bugünüm ekranındaki başarılı kayıt ve hedef tepkileri aynı ortak karakter üzerinden gösterilir. Başarılı ürün oluşturma da bir mesaj üretir. Mesajlar aralıklıdır; aktif sekmede sayfada kalındığında bir mola mesajı gelebilir. Giriş/şifre/doğrulama sayfalarında otomatik mesaj gösterilmez.

Ayarlar: karakteri aç/kapat; eğlenceli, komik, ciddi ve absürt üslupları bağımsız seç; otomatik sayfa/mola mesajlarını aç/kapat; sakin/dengeli/canlı sıklık; adla hitap; ses, titreşim ve hareket. Tüm üsluplar kapalıysa mesaj üretilmez. Tercihler bu tarayıcıda hesap kimliğine göre ayrılır; tarayıcılar arasında eşitlenmez. Kullanıcı adı yalnızca etkin oturumdan alınır. Gezinme geçmişi veya sohbet metni kalıcı olarak saklanmaz.

Filiz ile küçük sohbet, hazır yerel kurallara dayanır; harici dil modeline bağlı değildir. Yanıt seçimi ayrı bir adaptördedir; gelecekte gerçek konuşma hizmeti bağlanabilir. Bu özellik tamamlanmış bir yapay zekâ sohbet sistemi olarak sunulmaz. Karakter gerçek bir canlı değildir; mesajları beslenme uzmanı görüşü yerine geçmez. Sesler cihazda üretilir, harici izleme/kamera/mikrofon bağlantısı kurulmaz.

### Filiz’in dolaşması ve hareketleri

Filiz ara sıra ekranda dolaşır; el sallama, çök kalk, ip atlama, barfiks, şınav, mekik ve komik düşüp kalkma gösterileri yapabilir. Karakter panelindeki Dolaşma ve gösteriler bölümünden dolaşma, fare yaklaşınca şeffaflaşma ve her hareket ayrı ayrı açılıp kapatılır. Hareketi dene seçeneği seçilen hareketin önizlemesini başlatır. Mesaj sıklığı dolaşma aralıklarını da etkiler.

Dolaşan katman her zaman tıklamaları geçirir; şeffaflaşma kapalı olsa bile arkasındaki içerik kullanılabilir. Şeffaflaşma için fare konumu yalnızca anlık olarak ekranda karşılaştırılır; kaydedilmez veya gönderilmez. Sabit Filiz düğmesi ayarlara erişmek için tıklanabilir kalır. Panel, mesaj veya hassas giriş/şifre ekranı açıkken dolaşma durur. Arka plan sekmesinde gösteri yapılmaz; azaltılmış hareket tercihinde dolaşma tamamen kapalıdır. Konumlar mevcut pencere boyutuna göre seçilir ve pencere değiştiğinde gösteri sıfırlanır.
