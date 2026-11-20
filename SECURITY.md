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

Hesap değiştiğinde önbellek temizlenir; devam eden çok kayıtlı işlemler hesap/sürüm kontrolüyle durur. Sunucuya ulaşmış bir işlem iptalden önce eski hesapta tamamlanmış olabilir. Gün başına 100 öğün satırı, hesap başına 3660 gün ve oturum sonrası 256 KB gövde sınırı vardır. Bu sağlıkla ilişkili veriler için üretimde gizlilik, veri saklama/silme, dışa aktarma, veritabanı yedeği ve şifreleme gereksinimleri ayrıca tamamlanmalıdır. Bu sürümde uygulama düzeyinde veri şifreleme veya RLS yoktur; yalıtım sunucu yetkilendirmesine dayanır.

## Gizli dosyalar

.env yalnızca sınırlı API bağlantısı, .env.migration yalnızca şema sahibi bağlantısı içindir. Yönetici parolası yerel kurulumda bellekte kullanılır ve kaydedilmez. Gerçek dosyalar Git tarafından dışlanır; yalnızca örnekler paylaşılır. Windows'ta kurulum, sırları yazmadan önce dosya erişim mirasını kaldırır ve mevcut kullanıcı/SYSTEM/yöneticilere izin verir.

Şema sahibi dosyasını üretim sunucusuna veya istemci derlemesine taşımayın. Gerçek parolaları sohbete, komut satırı argümanına, ekran görüntüsüne veya hata raporuna yapıştırmayın. Sızan sırları silmek tek başına yeterli değildir; ilgili parolalar değiştirilmelidir.

## Henüz tamamlanmayanlar

- E-posta doğrulama, parola sıfırlama, MFA ve hesap kurtarma yok. Kayıtta yinelenen e-posta 409 yanıtı döner; e-posta sahipliği henüz doğrulanmaz. Bu sebeple halka açık kayıt için tamamlanmış akış sayılmaz.
- İstek sınırları tek süreç belleğindedir; üretimde birden fazla sunucuya uygun ortak sınırlama ve kalıcı izleme gerekir.
- Aktarılmamış misafir kayıtları aynı tarayıcıyı kullanan kişilerce görülebilir. Bu kayıtlar yerel geliştirme verisidir; çok kullanıcılı gizli veri depolaması olarak değerlendirilmemelidir.
- Gerçek AI, e-posta sağlayıcısı, bulut dağıtımı ve üretim yedeklemesi bu aşamada kurulmadı.

## Üretim öncesi

HTTPS ve güvenilir ters vekil topolojisi doğrulanmalı. TRUST_PROXY yalnızca API'ye doğrudan erişilemeyen, bilinen vekil arkasında açılmalı. Veritabanı bağlantısında sertifika doğrulaması kapatılmamalı. Sırlar ortam/sır yönetiminden alınmalı. Hesap sahipliği, veri yetkilendirmesi, yedekleme/geri yükleme, hata izleme ve gizlilik gereksinimleri ayrıca test edilmeli.

Kaynaklar: [OWASP parola saklama](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), [OWASP oturum yönetimi](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [Express güvenlik önerileri](https://expressjs.com/en/advanced/best-practice-security/).
