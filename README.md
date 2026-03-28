# Microservice Dispatcher

API Gateway (Dispatcher) pattern ile çalışan bir microservice projesi.

## Proje Yapısı

```
├── dispatcher/        # API Gateway - İstekleri yönlendiren ana servis (port 3000)
├── user-service/      # Kullanıcı servisi (port 3001)
├── product-service/   # Ürün servisi (port 3002)
└── docker-compose.yml # Tüm servisleri tek komutla çalıştırma
```

## Servisler

### Dispatcher (Port 3000)
- Gelen HTTP isteklerini ilgili servise yönlendirir
- JWT ile authentication yapılır
- Service Registry pattern ile tüm servisler merkezi olarak yönetilir
- Path rewriting ile prefix otomatik olarak kaldırılır
- Proxy hata yakalama ve 502 yanıtı
- Request logging

**Rotalar:**
| Route | Hedef Servis | Açıklama |
|---|---|---|
| `GET /health` | - | Dispatcher sağlık kontrolü (auth gerektirmez) |
| `GET /services` | - | Kayıtlı servislerin listesi (auth gerektirmez) |
| `/users/**` | user-service:3001 | Kullanıcı CRUD işlemleri (JWT gerekli) |
| `/products/**` | product-service:3002 | Ürün CRUD işlemleri (JWT gerekli) |

### User Service (Port 3001)
- `GET /` - Tüm kullanıcıları listele (arama, filtreleme, sayfalama)
- `GET /:id` - ID'ye göre kullanıcı getir
- `POST /` - Yeni kullanıcı oluştur
- `PUT /:id` - Kullanıcıyı tamamen güncelle
- `PATCH /:id` - Kullanıcıyı kısmi güncelle
- `DELETE /:id` - Kullanıcıyı sil

### Product Service (Port 3002)
- `GET /` - Tüm ürünleri listele (arama, filtreleme, sayfalama)
- `GET /:id` - ID'ye göre ürün getir
- `POST /` - Yeni ürün oluştur
- `PUT /:id` - Ürünü tamamen güncelle
- `PATCH /:id` - Ürünü kısmi güncelle
- `DELETE /:id` - Ürünü sil

## Kurulum

```bash
# Her servis klasöründe bağımlılıkları yükle
cd dispatcher && npm install
cd ../user-service && npm install
cd ../product-service && npm install
```

## Çalıştırma

### Lokal
```bash
# Her servis klasöründe ayrı ayrı
npm start
```

### Docker ile
```bash
# Tüm servisleri birlikte çalıştır
docker compose up --build

# Arka planda çalıştır
docker compose up --build -d

# Durdur
docker compose down
```

## Test
```bash
# Dispatcher testleri
cd dispatcher && npm test

# User service testleri
cd user-service && npm test

# Product service testleri
cd product-service && npm test
```

## API Kullanım Örnekleri

```bash
# Health check (auth gerektirmez)
curl http://localhost:3000/health

# Servis listesi
curl http://localhost:3000/services

# JWT token oluştur (test için)
TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({user:'test'}, 'SECRET'))")

# Kullanıcıları listele (dispatcher üzerinden)
curl -H "Authorization: $TOKEN" http://localhost:3000/users

# Ürünleri listele (dispatcher üzerinden)
curl -H "Authorization: $TOKEN" http://localhost:3000/products

# Ürün detayı
curl -H "Authorization: $TOKEN" http://localhost:3000/products/1

# Yeni kullanıcı oluştur
curl -X POST -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}' \
  http://localhost:3000/users
```

## Kullanılan Teknolojiler
- Node.js & Express
- JWT (JSON Web Token)
- http-proxy-middleware
- Docker & Docker Compose
- Jest & Supertest (test)
