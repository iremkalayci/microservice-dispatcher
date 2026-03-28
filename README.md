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
- `/users` → user-service'e proxy
- `/products` → product-service'e proxy

### User Service (Port 3001)
- Kullanıcılarla ilgili CRUD işlemleri

### Product Service (Port 3002)
- Ürünlerle ilgili CRUD işlemleri

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
cd dispatcher
npm test
```

## Kullanılan Teknolojiler
- Node.js & Express
- JWT (JSON Web Token)
- http-proxy-middleware
- Docker & Docker Compose
- Jest & Supertest (test)
