from locust import HttpUser, task, between, stats

class DispatcherTestUser(HttpUser):
    # İstekler arasında 1 saniye bekle (Gerçekçi simülasyon)
    wait_time = between(1, 1)

    @task
    def test_gateway(self):
        # Madde 4.4: Yönlendirme doğruluğu ve yanıt süresi ölçümü
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Hata: {response.status_code}")

    # Opsiyonel: Mikroservis testi (Token gerekmiyorsa)
    # @task
    # def test_products(self):
    #     self.client.get("/products")