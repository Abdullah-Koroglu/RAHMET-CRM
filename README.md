# RAHMET CRM

Next.js App Router, shadcn/ui, PostgreSQL ve Prisma ile geliştirilmiş akademi/kurs yönetimi uygulaması.

## Uygulanan özellikler

- Dashboard, ders, öğretmen, akademik yıl, ön kayıt ve öğrenci yönetimi.
- PostgreSQL-backed kişisel oturumlar; `scrypt` parola hash'i, HttpOnly/Secure/SameSite cookie, süre dolumu ve rotasyon.
- Backend seviyesinde `ADMIN`, `OPERATOR`, `VIEWER` yetkilendirmesi ve genel audit günlüğü.
- Google Forms için HMAC webhook; özel Sheet'lerde webhook-only çalışma modu.
- Public CSV kaynaklarında kararlı yanıt kimliği, artımlı reconciliation, periyodik full scan, bounded retry ve dead-letter kaydı.
- Ön kaydı idempotent transaction ile öğrenci ve ders kaydına dönüştürme.
- Ayrı `rahmet_crm` PostgreSQL şeması; migration ve uygulama runtime kimlikleri ayrılabilir.
- JSON structured log, request ID, liveness/readiness ve entegrasyon sağlık uçları.

## Roller

- `VIEWER`: Yönetim verilerini salt okunur görüntüler.
- `OPERATOR`: Ön kayıt durumu, not ve kesin kayıt dönüşümünü yönetir.
- `ADMIN`: Ders, öğretmen, dönem, kaynak, manuel reconciliation ve entegrasyon yönetimini yapar.

Yetki yalnız UI'da gizleme değildir; her Server Action ve korumalı sayfa backend'de oturumu yeniden doğrular.

## Yerel kurulum

1. `.env.example` dosyasını `.env` olarak kopyalayın. Yerelde `APP_ORIGIN=http://localhost:3000` kullanın.
2. PostgreSQL'i `docker compose -f compose.dev.yaml up -d` ile veya mevcut sunucunuzda başlatın.
3. `npm ci`
4. `npm run db:generate`
5. `npm run db:migrate:dev`
6. `DEV_ADMIN_PASSWORD` için en az 14 karakterli geliştirme parolası tanımlayıp `npm run db:seed:demo` çalıştırın.
7. `npm run dev`

Demo seed production ortamında çalışmayı reddeder. İçindeki örnek dersler ve sahte Sheet kimlikleri yalnız geliştirme içindir; gerçek kişisel veri kaynağı içermez.

## Production release

Uygulama container'ı migration veya seed çalıştırmaz. Önce DDL yetkili ayrı kimlikle migration uygulanır:

```text
docker compose --profile tools run --rm migrate
```

İlk admin açıkça ve yalnız gerektiğinde bootstrap edilir:

```text
docker compose --profile tools run --rm bootstrap-admin
```

Sonra DDL yetkisi olmayan runtime `DATABASE_URL` ile uygulama başlatılır:

```text
docker compose build app
docker compose up -d app
```

Host portu yalnız `127.0.0.1:3018` üzerinde dinler. Dış trafik HTTPS Nginx üzerinden gelmelidir. Örnek: `nginx/rahmet-crm.conf.example`.

## Entegrasyon uçları

- `POST /api/integrations/google-forms/sources/{sourceId}/responses`: timestamp + HMAC SHA-256 imzası ister.
- `POST /api/integrations/google-forms/reconcile`: sabit-zamanlı karşılaştırılan Bearer cron secret ister.
- `GET /api/health`: process liveness.
- `GET /api/ready`: database ve migration readiness.
- `GET /api/health/integrations`: yalnız ADMIN için aggregate entegrasyon sağlığı.

Kişisel veri içeren Google Sheet production'da public/published yapılmamalıdır. `WEBHOOK_ONLY` kaynak ve `scripts/google-apps-script-webhook.gs` kullanılması önerilir. Public CSV modu yalnız kurumun veri politikası açıkça izin veriyorsa kullanılmalıdır.

## Operasyon

Backup/restore, retention, olay müdahalesi ve rollback adımları `docs/operations.md` dosyasındadır. Scriptler gerçek scheduler veya secret store yapılandırmaz; production ortamına bağlanmadan önce kurumun saklama ve erişim politikalarıyla tamamlanmalıdır.

### Aylık tahsilata geçiş

`20261006120000_monthly_student_charges` migration'ı mevcut ders/oturum kaynaklı cari hareketlerini değiştirmez veya dönüştürmez. Yeni `student_monthly_charge` kayıtları öğrenci ve ay başına tekildir; Tahsilatlar ekranı yalnız bu yeni aylık tahakkuklara bağlı ödemeleri hesaplar. Canlıya almadan önce standart veritabanı yedeğini alın, migration'ı DDL yetkili `migrate` profiliyle uygulayın ve ilk ayın tahakkuklarını yönetici hesabıyla oluşturun.

## Statik kalite komutları

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run db:generate`

Test komutları bu hardening çalışmasının kapsamı dışında bırakılmıştır.
