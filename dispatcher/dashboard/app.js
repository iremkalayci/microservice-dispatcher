/* ============================================================
   DISPATCHER API DASHBOARD — Application Logic
   ============================================================ */

const BASE_URL = window.location.origin;
let jwtToken = localStorage.getItem('dispatcher_jwt') || '';

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  checkServerHealth();
  updateAuthState();
  setupScrollSpy();
  setInterval(checkServerHealth, 30000); // Check health every 30s
});

// ============================================================
// SERVER HEALTH CHECK
// ============================================================
async function checkServerHealth() {
  const statusEl = document.getElementById('server-status');
  const statusText = statusEl.querySelector('.status-text');

  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(5000) });
    const duration = Date.now() - startTime;

    if (response.ok) {
      statusEl.className = 'server-status online';
      statusText.textContent = `Online (${duration}ms)`;
    } else {
      statusEl.className = 'server-status offline';
      statusText.textContent = 'Unhealthy';
    }
  } catch (err) {
    statusEl.className = 'server-status offline';
    statusText.textContent = 'Offline';
  }
}

// ============================================================
// AUTH PANEL
// ============================================================
function toggleAuthPanel() {
  const overlay = document.getElementById('auth-overlay');
  overlay.classList.toggle('active');
  
  if (overlay.classList.contains('active')) {
    const tokenInput = document.getElementById('jwt-token');
    tokenInput.value = jwtToken;
  }
}

function closeAuthPanel(event) {
  if (event.target === event.currentTarget) {
    toggleAuthPanel();
  }
}

function saveToken() {
  const tokenInput = document.getElementById('jwt-token');
  jwtToken = tokenInput.value.trim();
  localStorage.setItem('dispatcher_jwt', jwtToken);
  updateAuthState();
  showTokenStatus();
}

function updateAuthState() {
  const btn = document.getElementById('btn-auth');
  const tokenStatus = document.getElementById('token-status');
  
  if (jwtToken) {
    btn.classList.add('authorized');
    btn.querySelector('span').textContent = 'Authorized ✓';
    if (tokenStatus) {
      tokenStatus.className = 'token-status has-token';
      tokenStatus.textContent = '✓ Token kaydedildi';
    }
  } else {
    btn.classList.remove('authorized');
    btn.querySelector('span').textContent = 'Authorize';
    if (tokenStatus) {
      tokenStatus.className = 'token-status no-token';
      tokenStatus.textContent = 'Token henüz ayarlanmadı';
    }
  }
}

function showTokenStatus() {
  const tokenStatus = document.getElementById('token-status');
  if (jwtToken) {
    tokenStatus.className = 'token-status has-token';
    tokenStatus.textContent = '✓ Token başarıyla kaydedildi';
  } else {
    tokenStatus.className = 'token-status no-token';
    tokenStatus.textContent = 'Token temizlendi';
  }
}

// Quick Auth Functions
async function quickRegister() {
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  const resultEl = document.getElementById('quick-auth-result');

  if (!username || !password) {
    resultEl.innerHTML = '<span style="color: #f59e0b;">Username ve password gerekli</span>';
    return;
  }

  try {
    resultEl.innerHTML = '<span style="color: var(--text-muted);">Kayıt yapılıyor...</span>';
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    if (res.ok) {
      resultEl.innerHTML = '<span style="color: #10b981;">✓ Kayıt başarılı! Şimdi login yapabilirsiniz.</span>';
    } else {
      resultEl.innerHTML = `<span style="color: #ef4444;">✗ ${data.error || 'Kayıt başarısız'}</span>`;
    }
  } catch (err) {
    resultEl.innerHTML = `<span style="color: #ef4444;">✗ Bağlantı hatası: ${err.message}</span>`;
  }
}

async function quickLogin() {
  const username = document.getElementById('auth-username').value;
  const password = document.getElementById('auth-password').value;
  const resultEl = document.getElementById('quick-auth-result');

  if (!username || !password) {
    resultEl.innerHTML = '<span style="color: #f59e0b;">Username ve password gerekli</span>';
    return;
  }

  try {
    resultEl.innerHTML = '<span style="color: var(--text-muted);">Giriş yapılıyor...</span>';
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    
    if (res.ok && data.token) {
      jwtToken = data.token;
      localStorage.setItem('dispatcher_jwt', jwtToken);
      document.getElementById('jwt-token').value = jwtToken;
      updateAuthState();
      resultEl.innerHTML = '<span style="color: #10b981;">✓ Login başarılı! Token otomatik kaydedildi.</span>';
    } else {
      resultEl.innerHTML = `<span style="color: #ef4444;">✗ ${data.error || 'Giriş başarısız'}</span>`;
    }
  } catch (err) {
    resultEl.innerHTML = `<span style="color: #ef4444;">✗ Bağlantı hatası: ${err.message}</span>`;
  }
}

// ============================================================
// ENDPOINT TOGGLE
// ============================================================
function toggleEndpoint(id) {
  const card = document.getElementById(id);
  card.classList.toggle('open');
}

// ============================================================
// TRY IT OUT — API Requests
// ============================================================
async function tryEndpoint(method, path, bodyElId) {
  const resultId = getResultId(method, path);
  const resultEl = document.getElementById(resultId);
  
  if (!resultEl) {
    console.error('Result element not found:', resultId);
    return;
  }

  // Build request options
  const options = {
    method: method,
    headers: {}
  };

  // Add JWT token for protected endpoints
  if (jwtToken && !path.startsWith('/health') && !path.startsWith('/services') && !path.startsWith('/auth/')) {
    options.headers['Authorization'] = jwtToken;
  }

  // Add body for POST/PUT/PATCH
  if (bodyElId) {
    const bodyEl = document.getElementById(bodyElId);
    if (bodyEl) {
      try {
        const bodyContent = bodyEl.value.trim();
        JSON.parse(bodyContent); // Validate JSON
        options.headers['Content-Type'] = 'application/json';
        options.body = bodyContent;
      } catch (e) {
        renderResult(resultEl, null, 0, 'Geçersiz JSON body: ' + e.message);
        return;
      }
    }
  }

  // Show loading state
  resultEl.innerHTML = `
    <div class="result-container">
      <div class="result-header">
        <div class="result-status" style="color: var(--text-muted);">
          <div class="status-circle" style="animation: pulse 1s infinite;"></div>
          İstek gönderiliyor...
        </div>
      </div>
    </div>
  `;

  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}${path}`, options);
    const duration = Date.now() - startTime;
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    renderResult(resultEl, response.status, duration, null, data);
  } catch (err) {
    renderResult(resultEl, null, 0, `Bağlantı hatası: ${err.message}`);
  }
}

function getResultId(method, path) {
  // Map dynamic paths to static result IDs
  if (path.match(/^\/users\/\d+$/)) return `result-${method}-/users/id`;
  if (path.match(/^\/products\/\d+$/)) return `result-${method}-/products/id`;
  return `result-${method}-${path}`;
}

function renderResult(el, status, duration, error, data) {
  if (error) {
    el.innerHTML = `
      <div class="result-container">
        <div class="result-header">
          <div class="result-status" style="color: #ef4444;">
            <div class="status-circle"></div>
            Error
          </div>
        </div>
        <div class="result-error">${escapeHtml(error)}</div>
      </div>
    `;
    return;
  }

  const statusClass = status < 300 ? 'status-2xx' : status < 500 ? 'status-4xx' : 'status-5xx';
  const statusText = getStatusText(status);
  const formattedData = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;

  el.innerHTML = `
    <div class="result-container">
      <div class="result-header">
        <div class="result-status ${statusClass}">
          <div class="status-circle"></div>
          ${status} ${statusText}
        </div>
        <div class="result-time">${duration}ms</div>
      </div>
      <div class="result-body">${escapeHtml(formattedData)}</div>
    </div>
  `;
}

function getStatusText(status) {
  const map = {
    200: 'OK', 201: 'Created', 204: 'No Content',
    400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
    404: 'Not Found', 409: 'Conflict',
    500: 'Internal Server Error', 502: 'Bad Gateway'
  };
  return map[status] || '';
}

function escapeHtml(str) {
  if (typeof str !== 'string') str = String(str);
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================================
// SPECIALIZED TRY FUNCTIONS (with query params)
// ============================================================
function tryUsersGet() {
  const search = document.getElementById('q-users-list-search').value;
  const role = document.getElementById('q-users-list-role').value;
  
  let path = '/users';
  const params = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (role) params.push(`role=${encodeURIComponent(role)}`);
  if (params.length > 0) path += '?' + params.join('&');

  // Override result target
  tryEndpointWithCustomResult('GET', path, null, 'result-GET-/users');
}

function tryProductsGet() {
  const search = document.getElementById('q-products-list-search').value;
  const category = document.getElementById('q-products-list-category').value;
  
  let path = '/products';
  const params = [];
  if (search) params.push(`search=${encodeURIComponent(search)}`);
  if (category) params.push(`category=${encodeURIComponent(category)}`);
  if (params.length > 0) path += '?' + params.join('&');

  tryEndpointWithCustomResult('GET', path, null, 'result-GET-/products');
}

async function tryEndpointWithCustomResult(method, path, bodyElId, resultId) {
  const resultEl = document.getElementById(resultId);
  if (!resultEl) return;

  const options = {
    method: method,
    headers: {}
  };

  if (jwtToken && !path.startsWith('/health') && !path.startsWith('/services') && !path.startsWith('/auth/')) {
    options.headers['Authorization'] = jwtToken;
  }

  if (bodyElId) {
    const bodyEl = document.getElementById(bodyElId);
    if (bodyEl) {
      try {
        const bodyContent = bodyEl.value.trim();
        JSON.parse(bodyContent);
        options.headers['Content-Type'] = 'application/json';
        options.body = bodyContent;
      } catch (e) {
        renderResult(resultEl, null, 0, 'Geçersiz JSON body: ' + e.message);
        return;
      }
    }
  }

  resultEl.innerHTML = `
    <div class="result-container">
      <div class="result-header">
        <div class="result-status" style="color: var(--text-muted);">
          <div class="status-circle" style="animation: pulse 1s infinite;"></div>
          İstek gönderiliyor...
        </div>
      </div>
    </div>
  `;

  try {
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}${path}`, options);
    const duration = Date.now() - startTime;
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    renderResult(resultEl, response.status, duration, null, data);
  } catch (err) {
    renderResult(resultEl, null, 0, `Bağlantı hatası: ${err.message}`);
  }
}

// ============================================================
// SCROLL SPY (Sidebar active state)
// ============================================================
function setupScrollSpy() {
  const sections = document.querySelectorAll('.api-section');
  const links = document.querySelectorAll('.sidebar-link');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        const sectionName = id.replace('section-', '');
        
        links.forEach(link => {
          link.classList.toggle('active', link.getAttribute('data-section') === sectionName);
        });
      }
    });
  }, {
    rootMargin: '-30% 0px -60% 0px',
    threshold: 0
  });

  sections.forEach(section => observer.observe(section));
}

// ============================================================
// KEYBOARD SHORTCUTS
// ============================================================
document.addEventListener('keydown', (e) => {
  // Escape closes auth panel
  if (e.key === 'Escape') {
    const overlay = document.getElementById('auth-overlay');
    if (overlay.classList.contains('active')) {
      toggleAuthPanel();
    }
  }
});
let statusChartInstance = null;
let timeChartInstance = null;

async function refreshMetrics() {
    try {
        const response = await fetch(`${BASE_URL}/api/logs`);
        const logs = await response.json();
        
        if (!logs || logs.length === 0) return;
        
        // 1. Status Kodları Analizi (Pie Chart)
        const statusCounts = {};
        logs.forEach(log => {
            const sc = log.statusCode;
            statusCounts[sc] = (statusCounts[sc] || 0) + 1;
        });

        const statusLabels = Object.keys(statusCounts);
        const statusData = Object.values(statusCounts);
        const statusColors = statusLabels.map(code => 
            parseInt(code) < 300 ? '#10b981' : 
            parseInt(code) < 400 ? '#3b82f6' :
            parseInt(code) < 500 ? '#f59e0b' : '#ef4444'
        );

        const ctxStatus = document.getElementById('statusChart');
        if (ctxStatus) {
            if (statusChartInstance) statusChartInstance.destroy();
            statusChartInstance = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: statusLabels.map(l => l + ' ' + getStatusText(parseInt(l))),
                    datasets: [{
                        data: statusData,
                        backgroundColor: statusColors,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { position: 'right', labels: { color: '#fff' } } 
                    }
                }
            });
        }

        // 2. İstek Süreleri (Line Chart)
        // Son 50 isteği zaman sırasına göre chart'a dökelim
        const recentLogs = logs.slice(0, 50).reverse();
        const timeLabels = recentLogs.map(l => new Date(l.timestamp).toLocaleTimeString());
        const durationData = recentLogs.map(l => l.responseTime);

        const ctxTime = document.getElementById('timeChart');
        if (ctxTime) {
            if (timeChartInstance) timeChartInstance.destroy();
            timeChartInstance = new Chart(ctxTime, {
                type: 'line',
                data: {
                    labels: timeLabels,
                    datasets: [{
                        label: 'Response Time (ms)',
                        data: durationData,
                        borderColor: '#a855f7',
                        backgroundColor: 'rgba(168, 85, 247, 0.2)',
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#a0aabf' } },
                        x: { grid: { display: false }, ticks: { display: false } }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        }

    } catch (err) {
        console.error("Metrik hatası:", err);
    }
}

// 5 saniyede bir güncelle
setInterval(refreshMetrics, 5000);
refreshMetrics();
