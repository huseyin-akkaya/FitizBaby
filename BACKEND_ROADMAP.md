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

## Sonraki aşama: Hesaba bağlı veriler

Ürünler, favoriler, profil, beslenme planı ve günlük kayıtlar henüz hesaplara bağlanmadı. Mevcut localStorage kayıtları korunacak; açık kullanıcı seçimi ve tekrarlı içe alımda çoğaltmayı önleyen düzen kurulacak. Her işlemde sunucunun oturumdan aldığı kullanıcı kimliği esas alınacak; istemcinin gönderdiği userId yetki sayılmayacak.

Ardından kendi ürününü düzenleme/silme, ortak katalog için moderasyon ve uygun görsel depolama ele alınacak. Paylaşılan cihazda farklı hesapların birbirinin kayıtlarını görmemesi bu aşamanın kabul koşuludur.

## Yayımlamadan önce

E-posta sahipliği doğrulama ve parola kurtarma; hesap varlığı sızıntısını azaltan kayıt akışı; dağıtık istek sınırlama/izleme; HTTPS ters vekil ayarları; üretim sır yönetimi; yedekleme/geri yükleme; bağımlılık takibi ve gizlilik gereksinimleri tamamlanmalı. Gerçek AI sağlayıcısı ve anahtar yönetimi yalnızca sunucu tarafında ele alınacak.

GitHub'a gönderim yalnızca kullanıcının açık “gitle” talimatıyla yapılır.
