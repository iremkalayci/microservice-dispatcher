from locust import HttpUser, task, between, events
import json

class DispatcherLoadTestUser(HttpUser):
    """
    Dispatcher API Gateway Yük Testi
    Profesyonel Load Testing - Locust ile
    
    Kullanım:
    locust -f locustfile.py --host=http://localhost:3000 --headless \
        -u 50 -r 10 -t 30s --csv=load_results/test
    
    Farklı eş zamanlı kullanıcı seviyeleri:
    50, 100, 200, 500 kullanıcı ile test edilmelidir.
    """
    wait_time = between(0.5, 1.5)
    token = None

    def on_start(self):
        """Her kullanıcı başladığında register + login yaparak token alır"""
        import random
        import string
        username = 'loadtest_' + ''.join(random.choices(string.ascii_lowercase, k=8))
        password = 'testpass123'
        
        # Register
        self.client.post("/auth/register", json={
            "username": username,
            "password": password
        })
        
        # Login ve token al
        response = self.client.post("/auth/login", json={
            "username": username,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            self.token = data.get("token", "")
        else:
            self.token = ""

    def get_headers(self):
        """JWT Authorization header döndürür"""
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    # ─── Gateway Testleri (Auth gerektirmeyen) ───────────────
    @task(3)
    def test_health_check(self):
        """Dispatcher health endpoint - yönlendirme doğruluğu"""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Health check failed: {response.status_code}")

    # ─── User Service Testleri (JWT gerekli) ─────────────────
    @task(5)
    def test_get_users(self):
        """GET /users - Kullanıcı listesi"""
        with self.client.get("/users", headers=self.get_headers(), catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"GET /users failed: {response.status_code}")

    @task(2)
    def test_get_user_by_id(self):
        """GET /users/:id - Tekil kullanıcı"""
        with self.client.get("/users/1", headers=self.get_headers(), catch_response=True) as response:
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"GET /users/1 failed: {response.status_code}")

    # ─── Product Service Testleri (JWT gerekli) ──────────────
    @task(5)
    def test_get_products(self):
        """GET /products - Ürün listesi"""
        with self.client.get("/products", headers=self.get_headers(), catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"GET /products failed: {response.status_code}")

    @task(2)
    def test_get_product_by_id(self):
        """GET /products/:id - Tekil ürün"""
        with self.client.get("/products/1", headers=self.get_headers(), catch_response=True) as response:
            if response.status_code in [200, 404]:
                response.success()
            else:
                response.failure(f"GET /products/1 failed: {response.status_code}")

    @task(1)
    def test_search_products(self):
        """GET /products?search=Laptop - Ürün arama"""
        with self.client.get("/products?search=Laptop", headers=self.get_headers(), catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Product search failed: {response.status_code}")

    # ─── Auth Service Testleri ───────────────────────────────
    @task(1)
    def test_auth_login(self):
        """POST /auth/login - Giriş denemesi"""
        with self.client.post("/auth/login",
            json={"username": "loadtest_invalid", "password": "wrong"},
            catch_response=True) as response:
            if response.status_code in [200, 401]:
                response.success()
            else:
                response.failure(f"Login test failed: {response.status_code}")

    # ─── 404 Handler Testi ───────────────────────────────────
    @task(1)
    def test_unknown_route(self):
        """GET /unknown - 404 handler kontrolü"""
        with self.client.get("/nonexistent", catch_response=True) as response:
            if response.status_code == 404:
                response.success()
            else:
                response.failure(f"404 handler failed: {response.status_code}")