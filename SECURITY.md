# Güvenlik: mevcut sınırlar ve geliştirme kuralları

Bu sürüm yerel geliştirme içindir. Güvenlik önlemleri ve testler bulunması sıfır risk veya üretime hazır olma garantisi değildir.

## Uygulanan önlemler

- API varsayılan olarak yalnızca 127.0.0.1'de dinler. Vite 8080, API 3001 portunu kullanır; dışarıya açılmaz.
- Parolalar 15–128 karakter; Argon2id (64 MiB, 3 geçiş, 1 paralellik). Parola/token localStorage'a, yanıta veya uygulama loguna yazılmaz.
- 32 bayt rastgele oturum belirteci HttpOnly/SameSite=Lax çerezde; PostgreSQL'de SHA-256 özeti tutulur. Üretimde Secure, __Host- ve HTTPS zorunludur. Girişte yeni oturum üretilir; çıkışta sunucu kaydı iptal edilir.
- 30 dakika hareketsizlik, 7 gün mutlak ömür, kişi başına en fazla 5 oturum. Hesap ekranı sunucunun doğruladığı oturuma bağlıdır.
- Değişiklik isteklerinde açık Origin listesi, cross-site istek reddi ve JSON zorunluluğu uygulanır. Genel API sınırı 15 dakikada 300, hesap denemesi sınırı 15 dakikada 10/IP; aynı anda en fazla 4 parola hash/doğrulama işlemi çalışır.
- Hesap/favori gövdeleri 16 KB ile sınırlı; ürün yüklemeleri oturum denetiminden sonra en fazla 900 KB, beslenme kayıtları 256 KB kabul eder; Zod sunucu doğrulaması bilinmeyen alanları reddeder. Role=admin gibi istemci alanları kabul edilmez. SQL değerleri parametrelidir.
- API rolünde yönetim/şema oluşturma yetkisi yoktur. Kullanıcı rolünü veya oturum bitişini değiştirme izinleri de verilmez. Şema değişiklikleri ayrı sahibin bağlantısıyla yapılır.
- Helmet başlıkları, no-store hesap yanıtları ve ayrıntı/bağlantı bilgisi sızdırmayan hata yanıtları bulunur. Loglar hata gövdesi/parola yerine istek kimliği içerir.

## Favorilerin yetkilendirilmesi

Favori sorguları her zaman doğrulanmış oturumun user_id değeriyle sınırlandırılır. İstemci gövdesindeki userId/başka alanlar reddedilir. X-FitizBaby-Account başlığı yalnızca hesap değişikliğini tespit eder; yetki sağlamaz. Kaydetme/aktarım işlemi kullanıcı satırı kilidiyle tek transaction içinde tamamlanır, tekrar aktarım kopya oluşturmaz. API rolü favori sahibini UPDATE edemez. Bu sürümde veritabanı satır güvenliği (RLS) yoktur; yalıtım sunucu sorguları ve iki hesaplı testlerle sağlanır.

Misafir favorileri tarayıcıdadır. Hesaba aktarım kendiliğinden yapılmaz, kaynak silinmez. Favori aktarımı yalnızca kimlik taşır; özel ürün içeriği ayrı ürün aktarımıyla hesaba bağlanır. Hesap bilgisi değiştiğinde arayüz eski hesaba ait favorileri gizler ve bekleyen istemci isteklerini iptal eder. Sunucuya ulaşmış işlem iptalden önce tamamlanmış olabilir; sunucu oturumu ve hesap eşleşmesi yine kontrol edilir.

## Ürünler ve görseller

Ürün işlemlerinde sahiplik oturumdan alınır; tüm sorgular user_id ile sınırlandırılır. Gövdeye userId eklenemez, API rolü ürün id/user_id alanlarını değiştiremez. Düzenleme ve silmede revision eşleşmesi zorunludur. Silme içerik/görseli temizler; tekrar aktarımı önlemek için ürün kimliği, hesap ilişkisi ve zaman kaydı tutulur. Başka hesaba ait görsel URL'si aynı tarayıcıda yeni oturumla kullanılırsa account tutarlılık kontrolü reddeder. Görseller HttpOnly oturum denetimi ve no-store/nosniff başlıklarıyla sunulur; genel dosya dizinine yazılmaz.

Sharp gerçek çözümleme yapar, PNG/JPEG/WebP biçimini doğrular, ek görsel bilgilerini temizleyip WebP üretir. SVG, bozuk/uyumsuz biçim, 600 KB veya 16 milyon piksel üzeri giriş reddedilir. Dış URL'den görsel indirilmez (sunucudan dış isteğe neden olmaz). Çözümleme eşzamanlılığı iki; ürün sayısı hesap başına 100 etkin/500 toplam kimliktir. Yerel prototipte görseller bytea tutulur. Üretimde toplam hesap/depolama kotası, antivirüs gereksinimleri, izleme ve özel nesne depolaması ayrıca değerlendirilmelidir.

Hesap geçişinde ön yüz önceki hesabın katalog verilerini/formlarını/asistan mesajlarını temizler. Tarayıcıdan aktarım açık düğmeyle başlar; kaynak veriyi silmez. Kısmi aktarım geri alınmaz, tekrar güvenlidir. Aktarılmamış misafir profil/plan/günlük kayıtları paylaşılan cihazda özel sayılmaz. Hesap kayıtları ayrı alandan okunur.

## Beslenme verilerinin yetkilendirilmesi

Profil/plan/hedef/günlük kayıt sorgularının tamamı oturumun user_id değeriyle sınırlıdır. Anahtar/tarih ve iç içe alanlar Zod ile doğrulanır; userId gibi ek alanlar kabul edilmez. API rolü kayıt sahibini/anahtarını değiştiremez veya tablo satırını fiziksel olarak silemez. Günlük güncelleme revision ve kullanıcı satırı kilidiyle yapılır. Başka sekme güncellediyse eski taslak 409 ile reddedilir. İçe alım kaynakları silmez ve var olan hesap kaydını ezmez. Paylaşılan cihazda otomatik aktarım yapılmaz.

Yeni öğünde besin kaydı sunucunun ortak kataloğu veya aynı kullanıcının özel ürünü üzerinden oluşturulur. Özel ürün okunurken satır kilidi alınır. Var olan satırın besin değerleri istemci tarafından değiştirilmez; sadece miktarı değişebilir. Eski tarayıcı kaydının değerleri doğrulanmış tarihsel etiket sayılmaz, kaynak türü işaretlenir. Eksik ürün değerleri uydurulmaz. Kişisel kayıt yanıtlarında no-store vardır; hesap verileri localStorage'a yazılmaz. Kaydedilmemiş taslaklar açık sekmenin belleğinde tutulur ve kapanışta kaybolabilir.

Hesap değiştiğinde önbellek temizlenir; devam eden çok kayıtlı işlemler hesap/sürüm kontrolüyle durur. Sunucuya ulaşmış bir işlem iptalden önce eski hesapta tamamlanmış olabilir. Gün başına 100 öğün satırı, hesap başına 3660 gün ve oturum sonrası 256 KB gövde sınırı vardır. Hesap dışa aktarma ve silme aşağıda açıklanmıştır. Bu sağlıkla ilişkili veriler için üretimde gizlilik, veri saklama politikası, veritabanı yedeği ve şifreleme gereksinimleri ayrıca tamamlanmalıdır. Bu sürümde uygulama düzeyinde veri şifreleme veya RLS yoktur; yalıtım sunucu yetkilendirmesine dayanır.

## Yerel doğrulama ve hesap kurtarma

Doğrulama 24 saat, sıfırlama 30 dakika; her belirteç 32 rastgele bayttır ve veritabanında yalnızca SHA-256 özeti bulunur. Amaç, süre ve kullanım kontrol edilir; tek transaction içindeki ikinci kontrol eşzamanlı tekrar kullanımı engeller. Hesap başına aynı amaçtaki eski belirteçler yeni istekle iptal edilir; 60 saniye ara ve saatte 5 sınırı vardır. IP başına bağlantı isteği 15 dakikada 10, tüketme denemesi 30 ile sınırlıdır. Parola sıfırlama bütün kullanıcı oturumlarını ve bekleyen belirteçleri iptal eder. Girişte parola özeti kullanıcı satırı kilidi altında tekrar karşılaştırılır; sıfırlamadan önce eski parolayı doğrulayan bekleyen istek sonradan oturum açamaz.

Sıfırlama isteği bilinen/bilinmeyen, bekleme sınırındaki veya yerel teslimi başarısız hesaplar için aynı 202/gövdeyi döndürür. En az 400 ms yanıt süresi hedeflenir; bu, her koşulda zamanlama farkı yoktur garantisi değildir. Doğrulama istemek oturum ve etkin hesap başlığı ister. Doğrulama/sıfırlama tüketimi belirtece bağlıdır ve otomatik oturum açmaz. Ham belirteç API yanıtına/loga/localStorage'a yazılmaz; URL fragment'ı HTTP isteği/referrer'a gönderilmez ve sayfa açılınca temizlenir. Onay düğmesi olmadan GET bağlantıyı tüketmez.

Yerel modda gerçek e-posta gönderilmez. Yerel kutu yalnızca loopback geliştirme/test ortamında kullanılabilir; üretimde açılması reddedilir. Proje içindeki kutu yalnızca `.local-mail/` olabilir, Git/Vite dışında tutulur. Windows DACL'i tek işlemle mevcut kullanıcı/SYSTEM/yöneticilere verilir; eski dizin geçici olarak geniş üst klasör izinlerine döndürülmez. Unix'te klasör 0700, dosya 0600 kullanılır. Dosyalar ham bağlantı içerir; paylaşılmamalıdır. Son 10 iletiyi gösteren CLI yalnızca yerel modda çalışır. Eski dosyalar otomatik temizlenmez; süre dolsa bile gizli kabul edilmelidir. Dosya yazımı başarısızsa belirteç değiştirme transaction'ı geri alınır; nadir commit hatasında kullanılamaz bir yerel ileti kalabilir.

Yerel onay gerçek e-posta sahipliğini kanıtlamaz ve hesap erişimini henüz kısıtlamaz. Yerel veritabanı gerçek üretim doğrulaması olarak taşınmamalıdır. Üretim için gerçek gönderim sağlayıcısı, güvenli kuyruk/teslim izleme, doğrulama zorunluluğu, bildirimler ve hesap varlığı sızıntısını azaltan kayıt akışı tamamlanmalıdır. `MAIL_MODE=disabled` gönderim/kurtarma isteğini hazır değil yanıtıyla kapatır. `APP_PUBLIC_URL` sabit izin listesinden alınır; Host başlığı bağlantıya dönüştürülmez.

## Resend Free test taşıyıcısı ve şifreli kuyruk

Resend modu yalnızca loopback geliştirme/test ortamında, tek tanımlı alıcıyla açılır; üretimde reddedilir. Alıcı kontrolü hem sıraya alma hem gönderim katmanındadır. API anahtarı yalnızca backend özel dosyası/ortamındadır; Sending access yetkisi yeterlidir. HTTPS hedefi sabittir, yönlendirmeler izlenmez, TLS denetimi kapatılmaz. Sağlayıcının ham hata gövdesi, anahtar veya bağlantı loglanmaz. E-posta dışına beslenme/ürün verisi taşınmaz.

Belirteç ve kuyruk kaydı aynı transaction içinde yazılır; dış ağ çağrısı transaction dışında yapılır. Kuyruk AES-256-GCM ile şifrelenir, kayıt/belirteç kimliği ek doğrulama verisine bağlanır. Anahtar ayrı `.env.mail` dosyasındadır. Her mesaj için 30 dakikalık gönderim penceresi, 5 deneme ve 30 saniyelik kiralama vardır. Yeniden denemede sabit Idempotency-Key kullanılır; sağlayıcının 24 saatlik penceresi aşılmaz. Aynı canlı kiralama iki işçiye verilmez. Token iptal/süre sonu kontrol edilir; gönderim başlamışsa sonradan iptal edilen bağlantının e-postası ulaşabilir ama bağlantı sunucuda geçersiz kalır. Ağ kesilmesinde kesin teslim durumu bilinmeyebilir.

Kabul, kalıcı hata veya süre sonunda şifreli içerik temizlenir; yalnızca durum/deneme/sağlayıcı kimliği gibi sınırlı metadata kalır. Kotası dolan yeni istek transaction'ı geri alınır; önceki geçerli token bozulmaz. Kalıcı günlük/aylık rezervasyon sayacı ve transaction kilidi, eşzamanlı isteklerde de en fazla 50/gün ve 1000/ay sınırı uygular. Başarısız/iptal işlerin kotası geri verilmez; bu muhafazakâr bir korumadır. Başka uygulamaların sağlayıcı hesabındaki kullanımı ayrıca kota tüketebilir. Kod ücretli plana yükseltme yapmaz.

Gerçek sağlayıcı onayı `email_verification_source=resend` ile ayrılır. Önceki yerel onaylar Resend modunda veya üretimde güvenilir sayılmaz; yerel belirteçler bu modlarda tüketilemez. Yerel modda alınmış onay gerçek onayın yerini tutmaz. Alan adı olmadan yalnızca Resend hesabının kendi adresine test gönderilebilir. Bu, genel kullanıma veya üretime hazır e-posta akışı değildir.

Özel ayar dosyası önce korumalı geçici dizinde hazırlanır; korumalı DACL uygulanmadan secret yazılmaz. Dosya mevcut hedefi ezmeyen hard-link ile atomik yayımlanır. Geçici dizin de Git/Vite dışında tutulur. Gerçek işletim sistemi ortamı dosya ayarlarından üstündür; testler özel dosyayı okumaz. Anahtar kurulumu dış ağa bağlanmaz/e-posta göndermez; gerçek teslim kullanıcı tarafından kendi kutusunda ayrıca doğrulanmalıdır.

## Gizli dosyalar

.env yalnızca sınırlı API bağlantısı, .env.migration yalnızca şema sahibi bağlantısı içindir. Yönetici parolası yerel kurulumda bellekte kullanılır ve kaydedilmez. Gerçek dosyalar Git tarafından dışlanır; yalnızca örnekler paylaşılır. Windows'ta kurulum, sırları yazmadan önce dosya erişim mirasını kaldırır ve mevcut kullanıcı/SYSTEM/yöneticilere izin verir.

Şema sahibi dosyasını üretim sunucusuna veya istemci derlemesine taşımayın. Gerçek parolaları sohbete, komut satırı argümanına, ekran görüntüsüne veya hata raporuna yapıştırmayın. Sızan sırları silmek tek başına yeterli değildir; ilgili parolalar değiştirilmelidir.

## Hesap dışa aktarma ve silme

Sahiplik oturumdan alınır; istemci kullanıcı kimliği yetki sağlamaz. Güncel parola Argon2 ile doğrulanır, ardından kullanıcı satırı kilitlenerek parola özetinin değişmediği ve mevcut oturumun hâlâ geçerli olduğu tekrar kontrol edilir. Parola sıfırlama veya oturum iptaliyle yarışan eski yetkiyle silme reddedilir. İstekler boyut, Origin ve işlem sıklığı denetimlerinden geçer.

İndirme izni mevcut oturuma bağlıdır, iki dakika geçerlidir ve tek kullanımlıktır. Ek 256 bit rastgele izin HttpOnly, SameSite=Strict, yalnızca indirme yoluna ait çerezde; üretimde Secure olarak tutulur. Veritabanında yalnızca SHA-256 özeti bulunur. Ham izin URL veya JSON yanıtına yazılmaz; eski oturum çerezi tek başına hazırlanmış indirmeyi açamaz. HEAD isteği izni tüketmez, cross-site indirme reddedilir. Süreç başına en fazla iki eşzamanlı dışa aktarma vardır.

Dışa aktarma REPEATABLE READ salt okunur görünümden sayfalı sorgularla akış halinde gzip olarak verilir; sunucuya arşiv dosyası yazılmaz. Yalnızca hesap alanları, ürün/görsel, silinmiş ürün kimlikleri, favori ve beslenme kayıtları seçilir. Parola özetleri, oturumlar, tokenlar ve e-posta kuyruğu dışa aktarılmaz. Arşiv şifrelenmez; indiren kişinin güvenli saklaması gerekir. Otomatik içe aktarma yoktur.

Silme ayrıca `HESABIMI SIL` ifadesini gerektirir. Etkin veritabanında kullanıcı silinir; foreign key cascade ile oturumlar, ürünler/görseller, favoriler, beslenme kayıtları, güvenlik işlemleri, e-posta kuyruğu ve indirme izinleri kaldırılır. API rolüne kullanıcı silme izni verilir; doğrudan beslenme tablosu DELETE izni verilmez. Yanıt oturum çerezini temizlemez: gecikmiş yanıtın yeni hesaba ait çerezi silmesi engellenir; arayüz oturum durumunu yeniden sorgular ve diğer sekmelere bildirir.

Yerel deneme kutusunda yalnızca üretilen dosya adları, normal dosyalar ve eşleşen alıcı temizlenir; sembolik bağlantı ve belirsiz dosyalar silinmez, eksik temizlik uyarılır. Ortak gönderim kotası kişisel veri içermez ve korunur. Başlamış dış gönderim geri çağrılamayabilir; silinen hesaba ait bağlantı geçersizdir. Misafir kayıtları, önceden indirilen arşivler, ayrı yedekler ve sağlayıcı kayıtları bu işlemle silinmez. Veritabanı silme güvenli fiziksel disk silme veya tek başına mevzuat uyumu iddiası değildir.

## Henüz tamamlanmayanlar

- Doğrulama ve parola sıfırlama yerel deneme olarak çalışır; genel alıcılı e-posta teslimi, üretimde zorunlu sahiplik doğrulama, MFA ve kurtarma bildirimleri yoktur. Kayıtta yinelenen e-posta hâlâ 409 döner. Halka açık kayıt/kurtarma için tamamlanmış üretim akışı sayılmaz.
- İstek sınırları tek süreç belleğindedir; üretimde birden fazla sunucuya uygun ortak sınırlama ve kalıcı izleme gerekir.
- Aktarılmamış misafir kayıtları aynı tarayıcıyı kullanan kişilerce görülebilir. Bu kayıtlar yerel geliştirme verisidir; çok kullanıcılı gizli veri depolaması olarak değerlendirilmemelidir.
- Gerçek AI, genel alıcılı/üretim e-posta akışı, bulut dağıtımı ve üretim yedeklemesi kurulmadı. Resend Free tek alıcılı test entegrasyonu kullanıcı anahtar kurulumu sonrası açılır.

## Üretim öncesi

HTTPS ve güvenilir ters vekil topolojisi doğrulanmalı. TRUST_PROXY yalnızca API'ye doğrudan erişilemeyen, bilinen vekil arkasında açılmalı. Veritabanı bağlantısında sertifika doğrulaması kapatılmamalı. Sırlar ortam/sır yönetiminden alınmalı. Hesap sahipliği, veri yetkilendirmesi, yedekleme/geri yükleme, hata izleme ve gizlilik gereksinimleri ayrıca test edilmeli.

Kaynaklar: [OWASP parola saklama](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP oturum yönetimi](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [Express güvenlik önerileri](https://expressjs.com/en/advanced/best-practice-security/).

## Şifreli yerel veritabanı yedekleri

Yedekler pg_dump custom biçiminden akışla AES-256-GCM ile şifrelenir; her dosyada rastgele 16 bayt salt ve 12 bayt IV, 16 bayt doğrulama etiketi kullanılır. Anahtar kullanıcı parolasından scrypt N=65536/r=8/p=1 ile türetilir. Parola komut argümanına, ayar dosyasına veya Git’e yazılmaz. Arşiv hesap parola hash’lerini ve kişisel kayıtları içerir; ayrı disk kopyası ve parola yöneticisi gerekir. Geçici plaintext dump yoktur; doğrulama sırasında kişisel veriler yalnızca erişimi kısıtlı geçici PostgreSQL veri dizininde bulunur.

Snapshot altında hesaplanan sıralı satır özetleri ve kayıt sayıları, izole hedefe geri yüklenen verilerle karşılaştırılır. Tüm GCM doğrulaması SQL’den önce tamamlanır. Yalnızca yerel kaynaklar desteklenir. Hedef sunucu yeni rastgele parola ve boş klasörle, loopback üzerinde kurulur; backend/e-posta işçisi başlatılmaz. Oturum, güvenlik işlemi, kuyruk ve indirme izinleri dışlanır; anonim kota toplamları korunur. Roller/ACL taşınmaz, kısıtlı hedef sahibi kullanılır.

Yedek dizini proje dışında, yönlendirme olmadan ve özel dosya izinleriyle oluşturulur. Araç otomatik yedek silmez veya zamanlayıcı kurmaz. Eski yedeklerde silinmiş hesaplar bulunabilir; üretim saklama/silme ve gerçek kurtarma geçişi ayrıca gerekir. Yalnızca güvenilir arşivler kullanılmalıdır; geri yüklenen SQL’e karşı bu süreç bir işletim sistemi güvenlik sınırı değildir. Ayrıntılar BACKUPS.md dosyasındadır.

## Hesaptan parola değişikliği ve oturum yönetimi

`/api/v1/account/security` uçları oturum sahibini sunucudan alır; hesap tutarlılık başlığı yetki kaynağı değildir. Oturum listesinde yalnızca etkin ve aynı kullanıcıya ait UUID/tarih/current alanları seçilir. Ham oturum belirteci ve hash'i dönmez. Liste sorgusu çağıran oturumun hâlâ etkin olduğunu da kontrol eder. Cihaz/IP kayıtları eklenmedi; bu alanlar uydurulmaz.

Parola değiştirme ve oturum kapatma güncel parolayı zorunlu kılar; sıkı gövde/UUID doğrulaması, Origin/JSON/16 KB sınırı ve IP başına ortak 5 işlem/15 dakika sınırı vardır. Liste okuma ayrıca 60 istek/15 dakika ile sınırlıdır. Yeni parola mevcut politikayla doğrulanır ve Argon2id hash'i oluşturulur. Paylaşılan yeniden doğrulama aracı, hash işlemlerini kilit dışında yapar; kullanıcı satırı kilidi altında parola özetini ve mevcut oturumun süre/etkinliğini tekrar kontrol eder. Eşzamanlı parola sıfırlama, giriş, oturum iptali ve hesap silme eski doğrulamayla işlem yapılmasına yol açmaz. Bu kontrol hesap dışa aktarma/silme için de kullanılır.

Parola değişikliği tek transaction'da kullanıcı hash'ini günceller, tüm kullanıcı oturumlarını kaldırır, bağlı indirme izinlerini cascade ile siler, kullanılmamış güvenlik işlemlerini kullanılmış işaretler ve pending/sending kuyruğunun içeriğini temizleyip dead yapar. Hata durumunda tümü geri alınır. E-posta doğrulama alanları ve kişisel kayıtlar değiştirilmez. Başlamış ağ gönderimi geri çağrılamayabilir; belirteç geçersizdir. Yanıta Set-Cookie eklenmez; gecikmiş parola değişikliği yanıtı yeni hesaba ait çerezi silemez. Arayüz sonucu ayrı onay sayfasında gösterir ve oturum durumunu yeniden sorgular.

Tek oturum kapatma sorgusu user_id ve id ile sınırlıdır; farklı hesaba ait veya eksik UUID aynı bulunamadı yanıtını alır. Mevcut oturum bu uçtan kapatılamaz. Diğerlerini kapatma kullanıcı satırı kilidi altında güncel oturumu korur. Oturum kapatma e-posta doğrulama bağlantılarını iptal etmez; parola değişikliği iptal eder. Ağ yanıtı alınamazsa arayüz kesin başarı/başarısızlık iddia etmez ve sonucu kontrol etmeyi ister. Parolalar localStorage'a yazılmaz; işlem sonrası form alanları temizlenir. Hesap değişiminde bileşen kaldırılır, eski yanıtlar yeni hesabın arayüzünü değiştirmez.

Güncel parola ile tekrar doğrulama tercihi [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) önerisiyle uyumludur. Bu sürüm dağıtık hız sınırlama, MFA, parola sızıntı listesi denetimi veya güvenlik bildirimi e-postası sağlamaz. Açık başka cihazların ekranlarına anlık push yapılmaz; sunucudaki iptal sonraki istekte uygulanır.
