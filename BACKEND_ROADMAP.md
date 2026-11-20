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

Kayıt başına revision, sunucuda sıkı doğrulama ve kullanıcı satırı kilidi vardır. Gün başına en fazla 100 satır, hesap başına 3660 gün; yalnızca oturum doğrulandıktan sonra 256 KB beslenme JSON sınırı uygulanır. Veri dışa aktarma, hesap silme/veri saklama politikası ve otomatik yedekleme henüz yoktur.

## Sonraki aşama

E-posta sahipliği doğrulama ve güvenli parola sıfırlama. Ardından hesap/veri dışa aktarma ve silme, veritabanı yedekleme/geri yükleme, ortak katalog moderasyonu ve üretim hazırlıkları ele alınmalı. Gerçek AI sağlayıcısı hâlâ bağlı değildir.

## Yayımlamadan önce

E-posta sahipliği doğrulama ve parola kurtarma; hesap varlığı sızıntısını azaltan kayıt akışı; dağıtık istek sınırlama/izleme; HTTPS ters vekil ayarları; üretim sır yönetimi; yedekleme/geri yükleme; bağımlılık takibi ve gizlilik gereksinimleri tamamlanmalı. Gerçek AI sağlayıcısı ve anahtar yönetimi yalnızca sunucu tarafında ele alınacak.

GitHub'a gönderim yalnızca kullanıcının açık “gitle” talimatıyla yapılır.
