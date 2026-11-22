# Veritabanı yedekleme ve geri yükleme doğrulaması

Bu araç yerel FitizBaby PostgreSQL kurulumu içindir. Yedek hazırlarken kaynak veritabanında yalnızca okuma yapılır. Her yedek ayrı, geçici ve yalnızca loopback üzerinden erişilen PostgreSQL sunucusunda geri yüklenir; mevcut veritabanının üzerine yazılmaz. Uygulama veya e-posta işçisi bu geçici sunucuya bağlanmaz.

## Yedek oluşturma

Proje klasöründe kendi terminalinden çalıştır:

```powershell
cd D:\Macro\macrotracker
npm run db:backup -- --pg-bin "D:\postgare\bin"
```

Komut en az 20 karakterlik ayrı bir yedek parolasını iki kez, ekranda göstermeden ister. Uzun ve rastgele bir parola seçip parola yöneticisinde sakla. Parola dosyaya kaydedilmez; komut argümanına, sohbete veya GitHub'a yazılmamalıdır. Parola kaybolursa arşiv açılamaz. Veritabanı bağlantısı mevcut `.env.migration` dosyasından özel olarak okunur; bu ayar dosyası ve sağlayıcı anahtarları yedeğe girmez.

Yedekler kullanıcı ana klasöründeki `.fitizbaby-backups` dizinindedir (Windows'ta genellikle `C:\Users\38hus\.fitizbaby-backups`). Dosyalar `.fitbak` uzantılıdır. Dizin ve dosyalar mevcut kullanıcı, SYSTEM ve yerel yöneticilerle sınırlanır; Unix'te 0700/0600 izinleri kullanılır. Proje içindeki hedefler ve sembolik bağlantı/junction yönlendirmeleri reddedilir. Git ve Vite için ek dosya engelleri de vardır.

Veri, diske şifresiz dump yazılmadan AES-256-GCM ile şifrelenir. Her yedekte yeni salt ve IV kullanılır; 32 baytlık anahtar scrypt (N=65536, r=8, p=1) ile türetilir. Dosya başlığı da doğrulamaya bağlanır. Yanlış parola, kesilme veya içerik değişikliği doğrulamayı başarısız kılar. Bu sürüme ait dosya biçimi uygulamanın yedek aracıyla açılır; doğrudan `pg_restore` dosyası değildir.

## İçerik ve doğrulama

- Kullanıcı hesapları (parola hash'leri dahil), özel ürünler/görseller, favoriler, beslenme kayıtları, şema geçmişi ve anonim gönderim kota toplamları korunur. Bu nedenle arşiv kişisel ve hassas veri içerir.
- Oturumlar, doğrulama/parola sıfırlama işlemleri, e-posta kuyruğu ve indirme izinlerinin **verileri dışlanır**. Tabloların yapısı korunur. Bir geri yükleme eski oturum veya güvenlik bağlantılarını canlandırmaz, bekleyen e-postaları yeniden göndermez.
- PostgreSQL snapshot ile dump ve içerik özetleri aynı tutarlı görünümden alınır. Tablo başına kayıt sayısı ve sıralı tüm satırların SHA-256 özeti şifreli arşivde bulunur; geri yüklemeden sonra görseller dahil karşılaştırılır. Yeni/bilinmeyen bir tablo varsa araç sessizce atlamak yerine durur.
- Arşivin tamamının bütünlük doğrulaması herhangi bir SQL çalıştırılmadan önce yapılır. Geri yükleme kısıtlı bir rol altında, `--no-owner --no-acl --exit-on-error --single-transaction` ile yürütülür. Yalnızca kendi güvenilir yedeklerini kullan; PostgreSQL arşivleri SQL içerir.
- Başarıyla geri yüklenip karşılaştırılmadan nihai yedek dosyası yayımlanmaz. Önceki dosyanın üzerine yazılmaz. Geçici doğrulama sunucusu kapatılır ve yalnızca araca ait, yolu doğrulanan geçici klasör temizlenir. Durdurma başarısızsa klasör korunur ve uyarı verilir.

Mevcut bir yedeği tekrar doğrulamak için:

```powershell
npm run db:backup:verify -- --pg-bin "D:\postgare\bin" --file "C:\Users\38hus\.fitizbaby-backups\YEDEK_DOSYASI.fitbak"
npm run db:backup:list
```

Listeleme parola istemez; dosya adını/boyutunu ve 30 günden eski dosyaları gösterir. Bu liste, dosyanın o anda sağlam olduğunun kanıtı değildir; doğrulama komutu kullanılmalıdır. PostgreSQL araçlarının kaynak sunucuyla aynı ana sürümden olması önerilir. Kaynak sürümünden eski `pg_dump` kullanılmamalıdır.

## Saklama ve silinen hesaplar

Yerel geliştirme için önerilen başlangıç politikası: önemli değişikliklerden önce ve kullanım olan günün sonunda yedek al; son 30 günlük yedekleri sakla. En az bir yeni yedeği tekrar doğrulayıp farklı fiziksel diske şifreli kopyasını almadan eski yedekleri elle silme. Aynı bilgisayardaki tek kopya disk kaybına karşı yeterli değildir. Parolayı arşivle aynı yerde saklama.

Araç otomatik yedekleme veya silme görevi kurmaz; 30 günlük süreyi kendiliğinden uygulamaz. GitHub yalnızca kodu saklar. Tarayıcı misafir kayıtları, `.env` dosyaları, şifreleme parolası ve yerel deneme e-postaları bu veritabanı yedeğinde değildir.

Hesap silme mevcut veritabanından veriyi kaldırır; eski yedekleri değiştirmez. Eski bir yedek silinmiş hesapları içerebilir. Üretimde saklama takvimi, silme taleplerinin yedeklere uygulanması ve geri yüklemeden sonra bu hesapların yeniden açılmasının önlenmesi ayrıca tasarlanmalıdır.

## Gerçek kurtarma sınırı

Bu aşama yedek oluşturma ve **ayrı geçici veritabanında geri yükleme doğrulamasını** tamamlar. Mevcut veritabanının üzerine otomatik kurtarma komutu yoktur. Gerçek bir kayıpta önce mevcut dosyalar korunmalı, güvenilir yedek doğrulanmalı, ayrı kalıcı hedef/roller hazırlanmalı, uygulama izinleri migration aracıyla uygulanmalı ve kontrollerden sonra bağlantı değiştirilmelidir. Rol parolaları ve uygulama ayarları dump içinde değildir. E-posta anahtarları ayrı ve güvenli şekilde yeniden kurulmalıdır.

Mevcut geçici doğrulama aracı genel kullanıma açık bir üretim kurtarma planı, sürekli yedekleme veya zaman noktasına kurtarma (PITR) sağlamaz. Geçici dosyaların kaldırılması fiziksel disk üzerinde güvenli silme garantisi değildir; bilgisayarda disk şifrelemesi de kullanılmalıdır.
