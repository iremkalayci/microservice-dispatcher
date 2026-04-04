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
async function refreshLogs() {
    try {
        const response = await fetch('http://localhost:3000/api/logs'); // Dispatcher'daki log endpoint'in
        const logs = await response.json();
        const tableBody = document.getElementById('logBody');
        
        if (!tableBody) return;
        tableBody.innerHTML = ''; 

        logs.forEach(log => {
            const statusColor = log.statusCode < 400 ? '#98c379' : '#e06c75';
            const statusBg = log.statusCode < 400 ? 'rgba(152, 195, 121, 0.1)' : 'rgba(224, 108, 117, 0.1)';
            
            const row = `<tr>
                <td class="method-${log.method.toLowerCase()}">${log.method}</td>
                <td style="color: #abb2bf; font-family: 'JetBrains Mono'">${log.endpoint}</td>
                <td>
                    <span class="status-badge" style="background:${statusBg}; color:${statusColor}; border: 1px solid ${statusColor}44">
                        ${log.statusCode}
                    </span>
                </td>
                <td style="color: #c678dd">${log.responseTime} ms</td>
                <td style="color: #5c6370">${new Date(log.timestamp).toLocaleTimeString()}</td>
            </tr>`;
            tableBody.innerHTML += row;
        });
    } catch (err) {
        console.error("Log hatası:", err);
    }
}

// 5 saniyede bir güncelle
setInterval(refreshLogs, 5000);
refreshLogs();

