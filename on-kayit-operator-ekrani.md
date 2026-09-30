# Ön Kayıt Operatör Ekranı

Bu ekran Google Forms'tan gelen kayıt adaylarını kesin öğrenci kayıtlarından ayrı tutar. Operatörler kayıtları bulur, inceler, iletişim sürecini izler, onaylar ve tek kontrollü işlemle öğrenciye dönüştürür.

## Liste görünümü

Varsayılan sıralama en yeni başvuru önce olacak şekilde önerilir.

| Sütun | Amaç |
|---|---|
| Alınma zamanı | CRM'e geliş zamanı; kaynak zamanı geçersizse güvenilir sıralama alanı |
| Ders | Ön kaydın bağlı kaynağından otomatik belirlenen ders |
| Kaynak | Bağlı Sheet'in gösterim adı ve sağlık durumu |
| Ad soyad | Ön kayıttaki tek alanlı ad-soyad |
| Telefon | Aramada normalize edilmiş, ekranda kısmen maskelenmiş gösterim |
| İlçe | Operasyonel bölge filtresi |
| Durum | Yeni, inceleniyor, ulaşıldı, onaylandı, reddedildi veya kesin kayda dönüştü |
| Sorumlu | Atanmış operatör |
| Doğrulama | Eksik/geçersiz alan uyarılarının kısa göstergesi |
| Son işlem | En son durum/not/atama zamanı |

Liste sayfalı olmalı ve kişisel alanların toplu dışa aktarımını varsayılan bir işlem olarak sunmamalıdır.

## Arama ve filtreler

- Ad-soyad ve normalize edilmiş telefonla arama.
- Ders, harici kaynak, kaynak sağlık durumu, ön kayıt durumu, ilçe ve sorumlu operatör filtresi.
- Başvuru tarihi ve son işlem tarihi aralığı.
- Yalnız doğrulama sorunu bulunanlar, atanmamışlar veya olası tekrar kayıtlar.
- Hızlı görünümler: `Yeni`, `Bana atanan`, `Ulaşılacak`, `Onay bekleyen`, `Hatalı`, `Tamamlanan`.

Arama telefonun farklı yazım biçimlerini normalize ederek karşılaştırmalı; ham telefon değeri arama indeksinde kullanılmamalıdır.

## Satır işlemleri

Her satırdan şu işlemler açılabilir:

- Detayı görüntüle.
- Kendime ata veya yetkisi varsa başka operatöre ata.
- Durumu `IN_REVIEW`, `CONTACTED`, `APPROVED` veya `REJECTED` yap.
- Kısa not ekle.
- Onaylı kaydı kesin öğrenci kaydına dönüştür.

Toplu işlemler ilk sürümde atama ve durum değişikliğiyle sınırlandırılmalıdır. Toplu kesin kayda dönüşüm yapılmamalıdır.

## Detay paneli

Detay sayfası veya sağ panel dört bölümden oluşur:

1. **Başvuru bilgileri:** Otomatik bağlı ders, kaynak Sheet, gönderim/alınma zamanı ve form alanları. Operatör ders ilişkisini serbestçe değiştiremez.
2. **Doğrulama:** Eksik telefon, ayrıştırılamayan tarih, bilinmeyen ders etiketi ve benzeri alan bazlı uyarılar.
3. **Olası eşleşmeler:** Normalize telefon ve doğrulanmış ad üzerinden bulunan mevcut öğrenciler. Sistem otomatik birleştirme yapmaz.
4. **İşlem geçmişi:** Atama, durum değişikliği, not ve dönüşüm olayları; zaman ve işlemi yapan kullanıcıyla birlikte.

Telefon gibi kişisel bilgiler yalnız gerekli rolde tam gösterilmeli; liste ekranında maskeleme tercih edilmelidir.

## Onay akışı

1. Operatör kaydı açar; sistem kaydı `IN_REVIEW` yapar veya operatör bu durumu seçer.
2. Operatör ad-soyad, telefon, doğum tarihi, ilçe ve hedef dersi doğrular.
3. Görüşme yapıldıysa `CONTACTED` durumu ve sonuç notu eklenir.
4. Kayıt uygun bulunursa `APPROVED`; uygun değilse zorunlu kısa gerekçeyle `REJECTED` seçilir.
5. Her değişiklik `pre_registration_activity` satırı üretir.

## Kesin öğrenci kaydına dönüşüm

`APPROVED` durumundaki kayıtta “Kesin kayda dönüştür” işlemi açılır:

1. Ad ve soyad ayrı alanlarda operatöre doğrulatılır.
2. Sistem olası mevcut öğrencileri gösterir. Operatör mevcut öğrenciyle eşleştirir veya yeni öğrenci oluşturur.
3. Kaynağın bağlı dersi ve ücret/kayıt bilgileri gösterilir ve bir `enrollment` oluşturulur. Ders eşleşmesi kaynak yapılandırmasından gelir; farklı ders gerekiyorsa kayıt dönüştürülmeden önce yönetici incelemesine gönderilir.
4. Son onay ekranı oluşturulacak/eşleştirilecek öğrenci ile dersi özetler.
5. Tek veritabanı işlemi içinde `student`, gerekiyorsa `enrollment`, `pre_registration_conversion` ve audit satırı yazılır; ön kayıt `CONVERTED` olur.

`pre_registration_conversion.pre_registration_id` birincil anahtardır. Arayüz düğmeyi ilk tıklamadan sonra kilitlese de asıl güvence bu veritabanı kısıtı ve işlemsel yazımdır. İkinci istek mevcut dönüşüm sonucunu göstermeli, yeni öğrenci oluşturmamalıdır.

## Ekran durumları

- **Yükleniyor:** Satır düzenini koruyan iskelet görünüm; dönüşüm düğmeleri kapalı.
- **Boş:** Filtre yoksa “Henüz ön kayıt yok”; filtre varsa “Bu ölçütlerde kayıt bulunamadı” ve filtreleri temizleme işlemi.
- **Liste hatası:** Kişisel veri içermeyen hata mesajı, yeniden dene işlemi ve takip kodu.
- **Detay güncellendi:** Başka operatör kaydı değiştirdiyse eski veriyle işlem yapılmasını önleyen sürüm uyarısı ve yenileme.
- **Doğrulama uyarısı:** Kaydı görünür tutar; sorunlu alanı işaretler, sessiz veri kaybı yapmaz.
- **Dönüşüm hatası:** İşlem tamamen geri alınır; kısmi öğrenci/kayıt bırakılmaz ve güvenli yeniden deneme sunulur.
- **Başarılı dönüşüm:** Oluşan öğrenci ve ders kaydına bağlantı gösterilir; dönüşüm işlemi tekrar sunulmaz.

## Kaynak sağlığı ve ders yönetimi

Ders ayrıntısında yetkili kullanıcı Google Sheet bağlantısını ekleyebilir, doğrulayabilir, ilk senkronu başlatabilir, kaynağı duraklatabilir veya yeni linke geçebilir. Ekran şunları göstermelidir:

- Kaynak durumu: `ACTIVE`, `PAUSED`, `ERROR` veya `ARCHIVED`.
- Sheet/sekme adı, son başarılı senkron, son webhook, son reconciliation ve son işlenen imleç/satır.
- Bekleyen hata ve dead-letter sayısı ile kişisel veri içermeyen son hata kodu.
- “Bağlantıyı doğrula”, “Şimdi uzlaştır”, “Duraklat/Devam ettir” ve yöneticiye özel “Yeni bağlantıya geç” işlemleri.

Aynı Sheet sekmesi başka bir derse bağlıysa link kaydı engellenir ve bağlı ders belirtilir. Link değişiminde eski kaynak arşivlenir; geçmiş ön kayıtlar yeni kaynağa taşınmaz. `ERROR` kaynakta ön kayıt listesi erişilebilir kalır, yalnız yeni aktarım durur.

## Yetki ve denetim

| Rol | Yetki |
|---|---|
| `VIEWER` | Maskeli liste ve izin verilen detayları görüntüler; değişiklik yapamaz |
| `OPERATOR` | Kayıt atama, not, durum değişikliği, onay ve kesin kayda dönüşüm |
| `ADMIN` | Tüm operatör yetkileri; kaynak linki ekleme/değiştirme, ilk senkron, yeniden atama, kontrollü yeniden açma ve entegrasyon hata kuyruğu yönetimi |

- Durum, sorumlu, not ve dönüşüm değişiklikleri kullanıcı ve zaman bilgisiyle değiştirilemez geçmişe yazılmalıdır.
- Ret ve yeniden açma gerekçesi zorunlu olmalıdır.
- Yetki kontrolü yalnız arayüzde değil API katmanında uygulanmalıdır.
- Liste ve hata loglarında kişisel veri maskelenmeli; ham webhook gövdesi loglanmamalıdır.
- Eşzamanlı güncellemeler için sürüm numarası veya `updated_at` tabanlı iyimser kilitleme kullanılmalıdır.
- Kaynak ekleme, doğrulama, aktif/pasif yapma, link değiştirme ve manuel yeniden senkron işlemleri de audit geçmişine yazılmalıdır.
