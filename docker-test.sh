#!/bin/sh
# ═══════════════════════════════════════════════════════════════
#  Docker Integration Test Script
#  Container içinden çalıştırılır: servisler arası iletişimi test eder
# ═══════════════════════════════════════════════════════════════

PASS=0
FAIL=0
TOTAL=0

# Color codes
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
NC="\033[0m"

assert_status() {
  TOTAL=$((TOTAL + 1))
  local description="$1"
  local expected="$2"
  local actual="$3"

  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS + 1))
    printf "${GREEN}  ✓ PASS${NC} %s (status: %s)\n" "$description" "$actual"
  else
    FAIL=$((FAIL + 1))
    printf "${RED}  ✗ FAIL${NC} %s (expected: %s, got: %s)\n" "$description" "$expected" "$actual"
  fi
}

assert_contains() {
  TOTAL=$((TOTAL + 1))
  local description="$1"
  local expected="$2"
  local body="$3"

  if echo "$body" | grep -q "$expected"; then
    PASS=$((PASS + 1))
    printf "${GREEN}  ✓ PASS${NC} %s (contains: '%s')\n" "$description" "$expected"
  else
    FAIL=$((FAIL + 1))
    printf "${RED}  ✗ FAIL${NC} %s (missing: '%s')\n" "$description" "$expected"
  fi
}

printf "\n${CYAN}═══════════════════════════════════════════════════════════${NC}\n"
printf "${CYAN}  DOCKER INTEGRATION TESTS${NC}\n"
printf "${CYAN}  Container: $(hostname)${NC}\n"
printf "${CYAN}═══════════════════════════════════════════════════════════${NC}\n"

# ─── TEST 1: Container İçinden Servis Adıyla Erişim ─────────────
printf "\n${YELLOW}[1] Container İçi - Servis Adıyla Erişim (Docker DNS)${NC}\n"
printf "    NOT: Container'lar birbirine servis adıyla ulaşır (localhost DEĞİL)\n\n"

# user-service'e servis adıyla erişim
STATUS=$(wget -qO- --server-response http://user-service:3001/ 2>&1 | awk '/HTTP/{print $2}' | tail -1)
BODY=$(wget -qO- http://user-service:3001/ 2>/dev/null)
assert_status "user-service:3001 erişilebilir" "200" "$STATUS"
assert_contains "user-service data döndürüyor" "data" "$BODY"

# product-service'e servis adıyla erişim
STATUS=$(wget -qO- --server-response http://product-service:3002/ 2>&1 | awk '/HTTP/{print $2}' | tail -1)
BODY=$(wget -qO- http://product-service:3002/ 2>/dev/null)
assert_status "product-service:3002 erişilebilir" "200" "$STATUS"
assert_contains "product-service data döndürüyor" "data" "$BODY"

# dispatcher health check
STATUS=$(wget -qO- --server-response http://dispatcher:3000/health 2>&1 | awk '/HTTP/{print $2}' | tail -1)
BODY=$(wget -qO- http://dispatcher:3000/health 2>/dev/null)
assert_status "dispatcher:3000/health erişilebilir" "200" "$STATUS"
assert_contains "health status ok" "ok" "$BODY"

# ─── TEST 2: localhost vs Container Adı Farkı ───────────────────
printf "\n${YELLOW}[2] localhost vs Container Adı Farkı${NC}\n"
printf "    NOT: localhost sadece KENDI container'ının portuna işaret eder\n\n"

# localhost:3001 bu container'da çalışmaz (user-service farklı container'da)
STATUS=$(wget -qO- --server-response --timeout=2 http://localhost:3001/ 2>&1 | awk '/HTTP/{print $2}' | tail -1)
if [ -z "$STATUS" ]; then
  TOTAL=$((TOTAL + 1))
  PASS=$((PASS + 1))
  printf "${GREEN}  ✓ PASS${NC} localhost:3001 bu container'da ERİŞİLEMEZ (beklenen davranış)\n"
else
  TOTAL=$((TOTAL + 1))
  FAIL=$((FAIL + 1))
  printf "${RED}  ✗ FAIL${NC} localhost:3001 beklenmedik şekilde erişilebilir (status: %s)\n" "$STATUS"
fi

# localhost:3002 de bu container'da çalışmaz
STATUS=$(wget -qO- --server-response --timeout=2 http://localhost:3002/ 2>&1 | awk '/HTTP/{print $2}' | tail -1)
if [ -z "$STATUS" ]; then
  TOTAL=$((TOTAL + 1))
  PASS=$((PASS + 1))
  printf "${GREEN}  ✓ PASS${NC} localhost:3002 bu container'da ERİŞİLEMEZ (beklenen davranış)\n"
else
  TOTAL=$((TOTAL + 1))
  FAIL=$((FAIL + 1))
  printf "${RED}  ✗ FAIL${NC} localhost:3002 beklenmedik şekilde erişilebilir (status: %s)\n" "$STATUS"
fi

# ─── TEST 3: Dispatcher Auth ────────────────────────────────────
printf "\n${YELLOW}[3] Dispatcher - Auth Kontrolü${NC}\n\n"

# Token olmadan 401
STATUS=$(wget -qO- --server-response http://dispatcher:3000/users 2>&1 | awk '/HTTP/{print $2}' | tail -1)
assert_status "/users token olmadan 401 döner" "401" "$STATUS"

STATUS=$(wget -qO- --server-response http://dispatcher:3000/products 2>&1 | awk '/HTTP/{print $2}' | tail -1)
assert_status "/products token olmadan 401 döner" "401" "$STATUS"

# ─── TEST 4: Dispatcher Proxy Routing ───────────────────────────
printf "\n${YELLOW}[4] Dispatcher - Proxy Routing (Token ile)${NC}\n\n"

# JWT token oluştur (node ile)
TOKEN=$(node -e "console.log(require('jsonwebtoken').sign({user:'dockertest'}, process.env.JWT_SECRET || 'SECRET'))")

# /users routing
STATUS=$(wget -qO- --server-response --header="Authorization: $TOKEN" http://dispatcher:3000/users 2>&1 | awk '/HTTP/{print $2}' | tail -1)
BODY=$(wget -qO- --header="Authorization: $TOKEN" http://dispatcher:3000/users 2>/dev/null)
assert_status "GET /users -> user-service proxy çalışıyor" "200" "$STATUS"
assert_contains "/users response'da kullanıcı verisi var" "Ali" "$BODY"

# /products routing
STATUS=$(wget -qO- --server-response --header="Authorization: $TOKEN" http://dispatcher:3000/products 2>&1 | awk '/HTTP/{print $2}' | tail -1)
BODY=$(wget -qO- --header="Authorization: $TOKEN" http://dispatcher:3000/products 2>/dev/null)
assert_status "GET /products -> product-service proxy çalışıyor" "200" "$STATUS"
assert_contains "/products response'da ürün verisi var" "Laptop" "$BODY"

# /users/:id routing
STATUS=$(wget -qO- --server-response --header="Authorization: $TOKEN" http://dispatcher:3000/users/1 2>&1 | awk '/HTTP/{print $2}' | tail -1)
BODY=$(wget -qO- --header="Authorization: $TOKEN" http://dispatcher:3000/users/1 2>/dev/null)
assert_status "GET /users/1 -> tek kullanıcı getirme çalışıyor" "200" "$STATUS"
assert_contains "/users/1 Ali Yılmaz verisi" "Ali" "$BODY"

# /products/:id routing
STATUS=$(wget -qO- --server-response --header="Authorization: $TOKEN" http://dispatcher:3000/products/2 2>&1 | awk '/HTTP/{print $2}' | tail -1)
BODY=$(wget -qO- --header="Authorization: $TOKEN" http://dispatcher:3000/products/2 2>/dev/null)
assert_status "GET /products/2 -> tek ürün getirme çalışıyor" "200" "$STATUS"
assert_contains "/products/2 Telefon verisi" "Telefon" "$BODY"

# ─── TEST 5: 404 Handling ───────────────────────────────────────
printf "\n${YELLOW}[5] Dispatcher - 404 Bilinmeyen Route${NC}\n\n"

STATUS=$(wget -qO- --server-response http://dispatcher:3000/orders 2>&1 | awk '/HTTP/{print $2}' | tail -1)
assert_status "GET /orders -> 404 döner" "404" "$STATUS"

# ─── TEST 6: Port Doğrulama ─────────────────────────────────────
printf "\n${YELLOW}[6] Port Doğrulama${NC}\n\n"

# Dispatcher 3000 portunda
STATUS=$(wget -qO- --server-response http://dispatcher:3000/health 2>&1 | awk '/HTTP/{print $2}' | tail -1)
assert_status "Dispatcher 3000 portunda çalışıyor" "200" "$STATUS"

# User service 3001 portunda
STATUS=$(wget -qO- --server-response http://user-service:3001/ 2>&1 | awk '/HTTP/{print $2}' | tail -1)
assert_status "User service 3001 portunda çalışıyor" "200" "$STATUS"

# Product service 3002 portunda
STATUS=$(wget -qO- --server-response http://product-service:3002/ 2>&1 | awk '/HTTP/{print $2}' | tail -1)
assert_status "Product service 3002 portunda çalışıyor" "200" "$STATUS"

# ─── SONUÇ ──────────────────────────────────────────────────────
printf "\n${CYAN}═══════════════════════════════════════════════════════════${NC}\n"
if [ "$FAIL" -eq 0 ]; then
  printf "${GREEN}  SONUÇ: %s/%s test BAŞARILI ✓${NC}\n" "$PASS" "$TOTAL"
else
  printf "${RED}  SONUÇ: %s/%s test başarılı, %s BAŞARISIZ ✗${NC}\n" "$PASS" "$TOTAL" "$FAIL"
fi
printf "${CYAN}═══════════════════════════════════════════════════════════${NC}\n\n"

exit $FAIL
