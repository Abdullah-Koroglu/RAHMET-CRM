# Production operasyon rehberi

## Release ve migration

1. Değişmez bir image etiketi veya digest üretin; `latest` ile rollback planlamayın.
2. Uygulamayı durdurmadan önce `scripts/backup.sh` ile `rahmet_crm` şemasını yedekleyin.
3. Yedeği ayrı bir PostgreSQL örneğine `scripts/restore.sh` ile geri yükleyerek doğrulayın.
4. DDL yetkili `MIGRATION_DATABASE_URL` ile `docker compose --profile tools run --rm migrate` çalıştırın.
5. `scripts/runtime-grants.sql.example` şablonunu gerçek rol adlarıyla uygulayın; DDL yetkisi olmayan `DATABASE_URL` ile `docker compose up -d app` çalıştırın.
6. `/api/health`, `/api/ready`, login ve anonimleştirilmiş bir webhook smoke kontrolünü tamamlayın.

İlk yönetici yalnız bir kez ve secret değerleri shell geçmişine yazılmadan oluşturulmalıdır:

```text
docker compose --profile tools run --rm bootstrap-admin
```

`CONFIRM_BOOTSTRAP=YES`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` ve `BOOTSTRAP_ADMIN_PASSWORD` komut ortamına güvenli secret deposundan verilmelidir. Komut mevcut yöneticinin parolasını yeniler, rolünü sessizce yükseltmez.

## Backup ve restore

`backup.sh` yalnız `rahmet_crm` şemasını custom-format olarak alır. Yedekler uygulama hostunda kalıcı bırakılmamalı; şifreli, erişimi sınırlı ve farklı bir failure domain'e kopyalanmalıdır. Restore komutu hedef şemayı temizleyebildiği için `CONFIRM_RESTORE=YES` olmadan çalışmaz. Retention, şifreleme, günlük/haftalık sıklık ve saklama adedi kurum politikasına göre scheduler tarafında tanımlanmalıdır.

PostgreSQL bağlantısı ağ üzerinden kuruluyorsa `DATABASE_URL` ve migration URL'sinde sunucu sertifikasını doğrulayan TLS ayarı kullanılmalıdır. Database diskleri, snapshot'lar ve dışarı aktarılan yedekler platform seviyesinde şifrelenmelidir. Telefon/doğum tarihi gibi alanlar uygulama katmanında ayrıca şifrelenmiyorsa bu karar risk kaydında açıkça kabul edilmeli; DB ve backup erişimi en az ayrıcalıkla sınırlandırılmalıdır.

Secret değerleri repository'ye veya image katmanına yazılmaz. Production'da Compose değişkenleri CI/CD ya da host secret deposundan enjekte edilmeli; `.env` kullanılması zorunluysa dosya yalnız servis hesabı tarafından okunabilmelidir.

## Veri saklama ve anonimleştirme

`node scripts/retention.mjs` varsayılan olarak yalnız dry-run raporu üretir. `CONFIRM_RETENTION=YES` verildiğinde dönüşmemiş ve reddedilmiş eski ön kayıtların kişisel alanlarını anonimleştirir. Varsayılan eşik 730 gündür; hukuki dayanak belirlenmeden production scheduler'a bağlanmamalıdır.

## Olay müdahalesi

1. Etkilenen kaynağı durdurun veya Nginx'te entegrasyon yolunu geçici kapatın.
2. İlgili session'ları DB'den silin; sızmış webhook/cron secret'larını döndürün.
3. JSON loglarını request ID üzerinden inceleyin; ham payload veya kişisel veriyi ticket'a kopyalamayın.
4. `audit_log`, `integration_event` ve Nginx access log zaman çizelgesini koruyun.
5. Etki kapsamını, bildirim yükümlülüklerini ve düzeltici aksiyonu kaydedin.

## Rollback

Uygulama image'ı önceki digest'e alınabilir. Migration geri dönüşü otomatik varsayılmaz: veri kaybettiren SQL çalıştırılmadan önce restore edilmiş staging kopyasında doğrulanmalı, gerektiğinde release öncesi yedek yeni bir database'e geri yüklenip DNS/proxy kontrollü geçirilmelidir.

## Google veri gizliliği

Kişisel veri içeren Sheet'i public/published yapmak production için önerilmez. `WEBHOOK_ONLY` kaynağı ve `scripts/google-apps-script-webhook.gs` kullanılarak özel Google Form yanıtları HMAC imzalı push ile gönderilebilir. Public CSV reconciliation yalnız açıkça kabul edilmiş, kişisel veri politikasıyla uyumlu kaynaklarda kullanılmalıdır.
