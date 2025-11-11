# RepoHub Sync Security Configuration

Bu doküman, RepoHub sync işlemlerinin güvenliği ve otomatikleştirilmesi için yapılandırmayı açıklar.

## Güvenlik Yapılandırması

### Environment Değişkenleri

`.env.local` dosyasına aşağı değişkenleri ekleyin:

```bash
# Sync Configuration
# Enable sync operations only from the server itself (set to 'true' on production server)
SYNC_SERVER_ONLY=true
# Automatic sync frequency in days (set to 0 to disable automatic sync)
AUTO_SYNC_DAYS=1
# Secret key to authorize sync operations from server
SYNC_SECRET_KEY=your_very_secure_secret_key_here
```

### Değişkenlerin Açıklaması

- **SYNC_SERVER_ONLY**: `true` olarak ayarlandığında, sync işlemleri sadece sunucudan yapılabilir
- **AUTO_SYNC_DAYS**: Otomatik sync sıklığı (gün olarak). `0` = otomatik sync kapalı
- **SYNC_SECRET_KEY**: Sunucu sync işlemleri için gerekli gizli anahtar

## Sunucu Sync İşlemleri

### 1. Manuel Sync (Sunucudan)

Sunucuda sync işlemleri yapmak için:

```bash
# Tüm platformları sync et
./scripts/server-sync.sh auto-sync

# Sadece Windows paketlerini sync et
./scripts/server-sync.sh sync-winget

# Sync durumunu kontrol et
./scripts/server-sync.sh status
```

### 2. Cron Job ile Otomatik Sync

Otomatik sync kurulumu için:

```bash
# Günlük otomatik sync kur
sudo ./scripts/cron-setup.sh install

# Haftalık otomatik sync kur (her 7 günde bir)
sudo AUTO_SYNC_DAYS=7 ./scripts/cron-setup.sh install

# Cron job durumunu kontrol et
sudo ./scripts/cron-setup.sh status

# Cron job'ı kaldır
sudo ./scripts/cron-setup.sh remove
```

## API Güvenliği

### Sync Endpoint'leri

Tüm sync endpoint'leri artık güvenlik kontrolü yapar:

- `/api/sync` - Genel sync endpoint'i
- `/api/sync-winget` - Windows paket sync'i
- `/api/sync-homebrew` - macOS paket sync'i
- `/api/sync-fedora` - Fedora paket sync'i
- `/api/sync-arch` - Arch paket sync'i
- `/api/auto-sync` - Otomatik sync

### Güvenlik Kontrolü

**Server-only modda (`SYNC_SERVER_ONLY=true`):**

1. **Secret Key Kontrolü**: Request header'ında `x-sync-secret` olmalı
2. **IP Kontrolü**: İstek localhost'tan gelmeli veya doğru secret key içermeli

**Normal modda (`SYNC_SERVER_ONLY=false`):**

- Herkes sync işlemi yapabilir (geliştirme için)

### Örnek API Kullanımı

```bash
# Server-only modda sync yapmak
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: your_secret_key" \
  -d '{}' \
  http://localhost:3002/api/sync-winget

# Sync durumunu kontrol et
curl -H "x-sync-secret: your_secret_key" \
  http://localhost:3002/api/sync
```

## Güvenlik İpuçları

### 1. Secret Key Güvenliği

- Güçlü ve rastgele bir secret key kullanın
- Secret key'i `.env.local` dosyasında saklayın, asla kod içine koymayın
- Secret key'i düzenli olarak değiştirin

### 2. Sunucu Güvenliği

- Sync script'lerini sadece sunucuda çalıştırın
- Cron job'ları root kullanıcısı olarak ayarlayın
- Log dosyalarını düzenli olarak kontrol edin

### 3. Ağ Güvenliği

- Sync endpoint'lerini firewall ile koruyun
- Sadece localhost'tan erişime izin verin
- SSL/TLS kullanın (production'da)

## Monitoring ve Logging

### Log Dosyaları

- **Sync Log**: `/var/log/repohub-sync.log`
- **Cron Log**: `/var/log/cron.log` (sistem bağımlı)

### Log İzleme

```bash
# Son 20 sync log satırını göster
tail -20 /var/log/repohub-sync.log

# Real-time log izleme
tail -f /var/log/repohub-sync.log

# Cron job loglarını kontrol et
sudo tail -20 /var/log/cron.log
```

## Troubleshooting

### Yaygın Sorunlar

1. **403 Forbidden Error**
   - `SYNC_SECRET_KEY` doğru ayarlanmamış
   - Header'da `x-sync-secret` eksik

2. **Cron Job Çalışmıyor**
   - Script executable değil
   - Environment değişkenleri eksik
   - Log dosyası izinleri yanlış

3. **Sync Başarısız**
   - API URL yanlış
   - Ağ bağlantısı sorunu
   - Disk alanı yetersiz

### Debug Komutları

```bash
# Sync script test et
./scripts/server-sync.sh test

# Cron job durumunu kontrol et
sudo ./scripts/cron-setup.sh status

# Environment değişkenlerini kontrol et
env | grep SYNC
```

## Production Dağıtımı

### Adım 1: Environment Ayarı

```bash
# .env.local dosyasını production'a kopyala
cp .env.local.example .env.local
# .env.local dosyasını production değerleriyle düzenle
```

### Adım 2: Secret Key Oluştur

```bash
# Güçlü secret key oluştur
openssl rand -hex 32
# Bu değeri .env.local dosyasına ekle
```

### Adım 3: Cron Job Kur

```bash
# Production cron job kur
sudo AUTO_SYNC_DAYS=1 ./scripts/cron-setup.sh install
```

### Adım 4: Test Et

```bash
# Sync işlemini test et
./scripts/server-sync.sh test

# Otomatik sync'i test et
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-sync-secret: your_secret_key" \
  -d '{}' \
  http://localhost:3002/api/auto-sync
```

Bu yapılandırma ile sync işlemleriniz güvenli ve otomatik hale gelecektir.
