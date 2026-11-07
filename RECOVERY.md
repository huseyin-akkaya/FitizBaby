# Kurtarma ve özellik denetimi — 7 Kasım 2026

## Koruma ve kurtarma
- İşlem öncesi kaynaklar ve .git dizini ayrı snapshot olarak korundu (node_modules, dist ve .vs önbellekleri hariç).
- main ve origin/main başlangıçta 4704bdc commit'indeydi. Uzak HEAD de salt okunur ls-remote ile aynı doğrulandı.
- Stash ve ek yerel branch yoktu. Reflog daha yeni çalışma içermiyordu. fsck yalnızca eski başlangıç ağacı ve boş ağaç buldu.
- D:/Macro/FitizBaby ve FitizBaby.zip incelendi; daha eski sürümlerdi.
- VS Code yerel geçmişindeki son App ve ProductDetail kayıtları daha eksikti.
- Asıl kurtarma kaynağı: C:/Users/38hus/Documents/Codex/2026-08-23/referenced-chatgpt-conversation-this-is-an/work/FitizBaby-web. Bu klasörden gerekli arayüzler ve yerel görseller seçilerek aktarıldı. Güncel asistan ve bağımlılıklar korundu; eski sunucu kodu bu kapsamda taşınmadı.

## Son durum
- Ana sayfa araması ve kategori bağlantıları çalışır.
- Merkezi katalog: 23 gerçek ürün; 6 kategorinin her birinde en az 3 ürün.
- Ürün arama, kategori, çoklu marka, marka arama / daha fazla, kalori ve protein aralıkları, sıfırlama, sıralama, gerçek yatay liste / grid, favoriler ve detaylar.
- Karşılaştırma: 2–4 ürün; kategori uyarısı; besin / içerik / alerjen / katkı tabloları; protein yüksek, şeker / kalori / yağ düşük eşit ağırlıklı puanlama. Karbonhidrat nötr. Beraberlik ve eksik veri desteklenir; farklı 100 g / 100 ml referansları puanlanmaz.
- /nutrition-plan ve masaüstü / mobil menü bağlantıları. Mifflin–St Jeor BMR, TDEE katsayıları 1.2 / 1.375 / 1.55 / 1.725, hedefe göre −300 / 0 / +200 kcal. Düzenlenebilir kcal / makro hedefleri; tutarsızlık uyarısı ve oransal dengeleme.
- 3 / 4 / 5 öğün, malzemeli demo tarifler, alternatifler, porsiyon değiştirme, günlük toplamlar, localStorage kalıcılığı.
- Kurtarılan günlük makro takip ekranı /macro-tracker üzerinden erişilebilir.

## Veri sınırları
- Ürün verileri otomatik güncellenmez. Besin ve içerik kaynakları her üründe ayrı belirtilir.
- Pınar, Lifalif yulaf, Züber kakaolu bar, İçim yoğurt, Alpro, Teksüt lor, Dardanel, Bigjoy bisküvi, Altınkılıç kefir ve Noutos değerleri bu çalışmada kaynaklardan düzeltildi.
- Fellas %100 fıstık ezmesinin doğrulanamayan besin değerleri boş bırakıldı.
- Lifalif 4 tahıllı granola kaynağında kJ/kcal başlıkları çeliştiği için kalori boş bırakıldı; diğer yayımlanmış makrolar korundu.
- Bazı kaynaklar şekeri / karbonhidratı yayımlamıyor; bunlar sıfır sayılmaz. Eski katalogdan kaynaklı diğer kayıtların tarihleri korunmuştur; hepsi yeniden laboratuvar doğrulamasından geçirilmiş değildir.
- Tarifler demo / yaklaşık tahmindir; kesin veya doğrulanmış tarif analizi olarak sunulmaz.
- Mifflin–St Jeor: https://pubmed.ncbi.nlm.nih.gov/2305711/

## Yeniden kaybetmemek için
Her çalışma sonunda git status, ardından ilgili dosyalar için git add ve git commit kullan. Uzak yedek için branch'i kontrol ederek git push -u origin HEAD çalıştır. Bu işlemde push yapılmadı.

## Doğrulama
- npm run build ve npm run lint başarılı.
- Gerçek Chromium tarayıcısında 23 ürün ve tüm katalog görselleri; arama, marka / protein filtresi, filtre sıfırlama, liste görünümü, favori kalıcılığı, detay / bulunamadı, 3 / 4 ürün karşılaştırma, farklı birim uyarısı, beraberlik ve eksik veri sınandı.
- BMR örneği (erkek, 30 yaş, 180 cm, 80 kg) 1780 kcal olarak doğrulandı. 3 / 4 / 5 öğün, alternatif tarif, manuel hedef / dengeleme, yeniden yüklemede kalıcılık ve bozuk kayıt kurtarma başarılı.
- 390 px mobil genişlikte ana sayfa, katalog, karşılaştırma ve beslenme planı; yatay liste ve mobil plan bağlantısı sınandı. Çalışma zamanı hatası yok.
- İlk yerel commit: 4427234. Uzak sunucuya push yapılmadı.

