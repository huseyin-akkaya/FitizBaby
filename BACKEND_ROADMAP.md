# Backend ilerleme planı

## Aşama 1: Yerel hesap ve oturum temeli

Eski Express/PostgreSQL taslağı güncel ön yüze seçilerek aktarıldı ve güvenlik sınırları güçlendirildi. Eski projenin tamamı güncel dosyaların üzerine kopyalanmadı.

- Kayıt, giriş, oturum sorgulama, korunan hesap ekranı ve sunucuda oturum iptali.
- Kullanıcı ve oturum tabloları; checksum ve kilit kullanan, tekrar uygulanabilir şema güncelleme aracı.
- Argon2id parola hash'i; veritabanında yalnızca hash'i tutulan rastgele oturum belirteci.
- HttpOnly/SameSite çerez; üretim ayarlarında Secure ve __Host- öneki, HTTPS kontrolü.
- Mutlak 7 gün ve hareketsizlik 30 dakika; kullanıcı başına en çok 5 oturum.
- İzin verilen Origin, JSON zorunluluğu, 16 KB gövde sınırı, istek/giriş sınırlama ve eşzamanlı hash işlem sınırı.
- Şema sahibinden ayrı, yalnızca gereken tablo/sütun izinlerine sahip API hesabı. API şema değiştirebilen hesapla başlatılmaz.
- Gizli ayarları Git'e almayan, yönetici parolasını gizli isteyen yerel kurulum.
- Geçici gerçek PostgreSQL ve yalıtılmış tarayıcı oturumuyla testler.

Kullanıcının kendi PostgreSQL kurulumunun tamamlanması için kendi terminalinde npm run setup:db çalıştırması gerekir. Testler geçici veritabanında yapılır; test başarısı kişisel kurulumun tamamlandığı anlamına gelmez.

## Aşama 2a: Hesaba bağlı favoriler

Şema checksum denetimi Git/Windows LF–CRLF satır sonu farkını kabul eder; SQL içerik değişikliğini reddeder ve eski checksum kayıtlarını değiştirmez.

Favoriler oturumdaki kullanıcıya göre PostgreSQL'de saklanır. Başka hesapların kayıtları listelenemez veya değiştirilemez. Hesap değişmişse eski sekmenin yazma isteği reddedilir. Tarayıcı favorileri yalnızca Hesabım ekranındaki açık aktarım düğmesiyle birleştirilir; tekrar aktarım kopya oluşturmaz, yerel kayıt silinmez. Sunucu yanıtı alınmadan başarılı kayıt gösterilmez. Sekmeler arası değişiklik bildirimi ve pencereye dönüşte yenileme vardır; farklı cihazlar için sayfa yenileme gerekir.

Favori aktarımı yalnızca ürün kimliğini taşır; özel ürünün içeriği 2b aşamasındaki ayrı aktarım düğmesiyle taşınır. Favori başına yalnızca ürün kimliği saklanır; en fazla 1000 favori kabul edilir ve istek gövdesinin 16 KB sınırı sürer. Büyük aktarım bu sınırı aşarsa hiçbir kayıt değiştirilmeden reddedilir.

## Aşama 2b: Hesaba bağlı ürünler

Özel ürünler ve doğrulanıp yeniden kodlanan görseller PostgreSQL'de oturum sahibine göre saklanır. Başka kullanıcı ürününü listeleme, detay/görsel açma, düzenleme ve silme reddedilir. Düzenleme ve silme revision ile kontrol edilir; eski sekme yeni veriyi ezemez. Silme kullanıcıdan onay ister, içerik ve görseli kaldırır, yalnızca tekrar aktarımı engelleyen kimlik/zaman kaydı kalır. Yalnızca ilgili hesabın favorisi temizlenir. Hazır katalog değişmez.

Misafir ürünleri korunur ve kendiliğinden hesaba alınmaz. Açık aktarım tek tek ve tekrar güvenli ilerler; kısmi hatada başarılı kayıtlar kalır, kalanlar yeniden denenebilir. Aktarım var olan ürünleri ezmez ve silinmişleri diriltmez. Hesap geçişinde canlı katalog, formlar, karşılaştırma seçimi ve asistan mesajları önceki hesaptan temizlenir. Misafir karşılaştırma seçimi ayrı korunur. Günlük kayıttaki bulunamayan ürünler silinmez; 2c aşamasında tarihsel besin kaydı desteği eklendi.

Hesap başına 100 etkin/500 geçmiş kimlik; görsel girişinde 600 KB/16 milyon piksel, sunucuda en fazla iki eşzamanlı çözümleme ve 800×800 WebP çıktı sınırı vardır. Ürün JSON'u yalnızca oturum doğrulandıktan sonra 900 KB sınırıyla ayrıştırılır; diğer API gövdeleri 16 KB kalır. Veritabanında görsel saklama yerel prototip içindir; üretim depolama/izleme gereksinimleri ayrıca ele alınmalı.

## Aşama 2c: Profil, plan ve günlük kayıtlar

Asistan hedef profili, vücut bilgileri/beslenme planı, günlük hedefler ve tarihli öğün kayıtları oturum sahibine göre PostgreSQL'de saklanır. Tarayıcı kaynakları seçilerek aktarılır, silinmez; tekrar aktarım var olan hesap kaydını değiştirmez. Sıfırlanan plan/boşaltılan gün satırı korunur ve tekrar aktarım bu kaydı diriltmez. Hesap değişiminde kayıt önbelleği temizlenir ve bekleyen istekler iptal edilir.

Beslenme sayfalarında taslak + açık kaydetme vardır. Çakışmada taslak korunur; sunucudan yeniden yükleme taslağı bırakma onayı ister. Kaydedilmemiş taslaklar sekme belleğindedir; sayfa kapanırsa kaybolabilir, ayrılma uyarısı vardır. Asistan, hesaplayıcı ve günlük takip hedefleri ayrı kalır. Gün seçimi ve geçmiş kayıtları açma desteklenir. İçe alım tek tek ilerler; kısmi hata açıkça bildirilir.

Yeni günlük satırda sunucu kendi/ortak kataloğundan besin kaydını alır; istemcinin yeni satır için gönderdiği değerleri yetkili veri saymaz. Var olan satırın besin kaydı miktar değişince korunur. Ürün silme/düzenleme önceki öğünleri değiştirmez. Eski tarayıcı kaydı aktarılırken güncel katalog veya kullanıcı beyanı işaretlenir; bulunamayan değerler null kalır ve toplam eksik gösterilir. Misafirin ham kayıtları ilk yeni biçim yazımında aynı tarayıcıda ayrı anahtarla korunur.

Kayıt başına revision, sunucuda sıkı doğrulama ve kullanıcı satırı kilidi vardır. Gün başına en fazla 100 satır, hesap başına 3660 gün; yalnızca oturum doğrulandıktan sonra 256 KB beslenme JSON sınırı uygulanır. Veri dışa aktarma ve hesap silme 4. aşamada eklendi; üretim veri saklama politikası ve otomatik yedekleme henüz yoktur.

## Aşama 3a: Yerel doğrulama ve parola sıfırlama

Hesap doğrulama durumu, tek kullanımlık/süreli/özetli belirteçler, doğrulama isteme-onaylama ve parola sıfırlama ekranları eklendi. Parola sıfırlama bütün ilgili oturumları/bekleyen bağlantıları iptal eder. Sıfırlamayla yarışan eski parolalı giriş transaction içinde yeniden kontrol edilir. Bilinmeyen e-posta için farklı hesap varlığı yanıtı üretilmez. İstek, IP/alıcı bazında sınırlandırılır.

Gerçek gönderim yoktur. Deneme iletileri Windows erişimi sınırlı, Git ve Vite dışında `.local-mail/` dizinindedir. `npm run mail:local` son 10 iletiyi gösterir. Link URL fragment'ındadır, sayfada temizlenir; GET tüketmez, açık onay gerekir. Doğrulama 24 saat, sıfırlama 30 dakika; aynı amaçta 60 saniye ara/saatte 5 istek sınırı vardır. Yerel onay gerçek e-posta sahipliği kanıtı sayılmaz; erişim koşulu yapılmadı. Üretimde yerel mod açılmaz, gerçek gönderim bağlanana kadar gönderim/kurtarma isteği kapalıdır.

## Aşama 3b: Ücretsiz gerçek test gönderimi

Resend Free için tek alıcılı geliştirme taşıyıcısı ve güvenli yerel kurulum eklendi. Alan adı olmadan yalnızca hizmet hesabının kendi adresine test yapılabilir. `setup:mail` anahtarı gizli ister; özel dosyayı izinleri sınırlı ve mevcut ayarı ezmeden yazar. Anahtar kullanıcı tarafından girilmeden gerçek gönderim aktif olmaz. Tarayıcıda anahtar bulunmaz.

Token ve AES-256-GCM şifreli kuyruk aynı transaction'dadır. İşçi dış HTTP çağrısını transaction dışında yapar; idempotency, kiralama, süre sonu, tekrar deneme ve içerik temizliği vardır. Uygulama limiti 50/gün ve 1000/aydır; ücretsiz sağlayıcı planının altında tutulur. Yerel onay ile gerçek onay ayrıldı; Resend modunda yerel belirteç/onay kabul edilmez. Mevcut yerel deneme akışı korunur.

Sahte taşıyıcıyla testler gerçek gönderim başarısı sayılmaz; kullanıcının Resend Free hesabı, Sending access anahtarı ve kendi adresindeki denemesi gerekir. Ücretli plana otomatik geçiş yoktur; üretim modu halen kapalıdır.

Kullanıcı kendi adresinde gerçek doğrulama ve parola sıfırlama akışlarının çalıştığını doğruladı. Bu, genel alıcılı üretim gönderiminin hazır olduğu anlamına gelmez.

## Aşama 4: Hesap verilerini indirme ve silme

Güncel parola onayıyla, mevcut oturuma bağlı iki dakikalık tek kullanımlık indirme izni üretilir. Ayrı HttpOnly/SameSite=Strict çerezindeki rastgele izin yalnızca özet olarak veritabanında tutulur; URL ve JSON yanıtına girmez. Dışa aktarma tutarlı salt okunur veritabanı görünümünden akışla sıkıştırılır; sunucuda geçici arşiv dosyası oluşturulmaz. Arşiv yalnızca sahibinin profil, ürün/görsel, favori ve beslenme verilerini içerir; parola ve güvenlik sırlarını içermez. Sıkıştırma şifreleme değildir. Otomatik geri yükleme yoktur.

Hesap silme güncel parola ve açık yazılı onay gerektirir. Parola özeti ve oturum, kullanıcı satırı kilidi altında tekrar kontrol edilir; hesapla ilişkili kayıtlar tek işlemde kaldırılır. Yerel deneme iletileri alıcı eşleşmesiyle ayrıca temizlenir. Diğer hesaplar, misafir verileri, indirilmiş dosyalar, ortak ayarlar ve anonim gönderim kotası etkilenmez. Sağlayıcı kayıtları ve varsa ayrı yedekler için saklama/temizlik süreci ayrıca gerekir.

## Aşama 5: Şifreli yerel yedek ve geri yükleme doğrulaması

Ayrı parolayla AES-256-GCM şifreli pg_dump yedeği, snapshot altında içerik özetleri ve ayrı geçici sunucuda geri yükleme karşılaştırması eklendi. Oturumlar, güvenlik bağlantıları ve e-posta kuyruğu dışlanır. Nihai dosya yalnızca doğrulama sonrasında yayımlanır. Proje dışında özel izinlerle saklanır; eski yedekler otomatik silinmez. Zamanlanmış/uzak kopya ve mevcut veritabanına otomatik kurtarma geçişi henüz yoktur. Kullanım ve sınırlar BACKUPS.md dosyasındadır.

## Aşama 6: Parola değişikliği ve oturum yönetimi

Güncel parola onaylı parola değiştirme, aynı hesaba ait etkin oturum listesi, tek başka oturumu veya diğer tüm oturumları kapatma eklendi. Parola değişikliği tüm oturumları ve bekleyen güvenlik izinlerini iptal eder; kişisel kayıtları korur. Ortak yeniden doğrulama kontrolü işlem kilidi altında hash/oturum durumunu tekrar doğrular. Cihaz/IP kaydı ve güvenlik bildirim e-postası eklenmedi. Başka cihaz ekranı sonraki istekte, aynı tarayıcıdaki sekmeler bildirimle güncellenir.

## Aşama 7: Bugünüm ve günlük kullanım döngüsü

Giriş sonrası kişisel günlük özet, hedef belirleme, favori/özel ürün/katalogdan açık onaylı hızlı öğün kaydı ve önceki günden seçili öğün kopyalama eklendi. Kaydedilmiş veri ile taslak ayrı tutulur; hata ve revision çakışmasında yeni veri uydurulmaz veya eski kayıt ezilmez. Sunucu kopyalaması geçmiş besin değerlerini korur ve aynı ürünleri çoğaltmaz. Yerel gün değişimi, tarihle günlük takip bağlantısı ve hesap yalıtımı test edilir. Misafir verileri otomatik aktarılmaz. E-posta değişikliği kullanıcının tercihiyle ertelendi.

## Sonraki aşama

Bugünüm için kullanıcı geri bildirimlerini değerlendirme; ardından alan adı ve genel alıcılı gönderim, teslimat/bounce izleme, üretimde doğrulama zorunluluğu, hesap varlığı sızıntısını azaltan kayıt akışı, ortak katalog moderasyonu ve üretim hazırlıkları ele alınmalı. Gerçek AI sağlayıcısı hâlâ bağlı değildir.

## Yayımlamadan önce

E-posta sahipliği doğrulama ve parola kurtarma; hesap varlığı sızıntısını azaltan kayıt akışı; dağıtık istek sınırlama/izleme; HTTPS ters vekil ayarları; üretim sır yönetimi; yedekleme/geri yükleme; bağımlılık takibi ve gizlilik gereksinimleri tamamlanmalı. Gerçek AI sağlayıcısı ve anahtar yönetimi yalnızca sunucu tarafında ele alınacak.

GitHub'a gönderim yalnızca kullanıcının açık “gitle” talimatıyla yapılır.
