/* ════════════════════════════════════════════════════════════════════════════
   UX-HUB — Shared App Utilities
════════════════════════════════════════════════════════════════════════════ */

const API = window.UX_API || 'http://localhost:5000/api';

// ── AUTH ──────────────────────────────────────────────────────────────────────
const Auth = {
  getToken: () => localStorage.getItem('uxhub_token'),
  getUser:  () => { const u = localStorage.getItem('uxhub_user'); return u ? JSON.parse(u) : null; },
  setSession: (token, user) => {
    localStorage.setItem('uxhub_token', token);
    localStorage.setItem('uxhub_user', JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem('uxhub_token');
    localStorage.removeItem('uxhub_user');
  },
  isLoggedIn: () => !!localStorage.getItem('uxhub_token'),
  isCreator: () => { const u = Auth.getUser(); return u && (u.role === 'creator' || u.isCreator); },
  isAdmin: () => { const u = Auth.getUser(); return u && (u.role === 'admin' || u.role === 'moderator'); },
  isPremium: () => { const u = Auth.getUser(); return u && u.isPremium; },
  requireAuth: (redirect = '/login.html') => {
    if (!Auth.isLoggedIn()) window.location.href = redirect;
  },
  requireCreator: () => {
    if (!Auth.isCreator()) window.location.href = '/pages/become-creator.html';
  },
  logout: () => {
    Auth.clear();
    window.location.href = '/login.html';
  },
};

// ── API HELPER ────────────────────────────────────────────────────────────────
const api = {
  async req(path, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (Auth.getToken()) headers['Authorization'] = `Bearer ${Auth.getToken()}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${path}`, opts);
    const contentType = res.headers.get('content-type') || '';
    let data = null;
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { success: false, message: text || res.statusText || 'Unexpected server response' };
    }
    if (res.status === 401) { Auth.clear(); window.location.href = '/login.html'; }
    if (!res.ok) {
      const message = data?.message || `Request failed with status ${res.status}`;
      const error = new Error(message);
      error.status = res.status;
      error.response = data;
      throw error;
    }
    return data;
  },
  get:    (path)         => api.req(path),
  post:   (path, body)   => api.req(path, 'POST', body),
  put:    (path, body)   => api.req(path, 'PUT', body),
  delete: (path)         => api.req(path, 'DELETE'),
  patch:  (path, body)   => api.req(path, 'PATCH', body),
};

// ── THEME ─────────────────────────────────────────────────────────────────────
const Theme = {
  get: () => localStorage.getItem('uxhub_theme') || 'dark',
  set: (theme) => {
    localStorage.setItem('uxhub_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.className = el.className.replace(/ti-\S+/, '');
      el.classList.add(theme === 'dark' ? 'ti-sun' : 'ti-moon');
    });
  },
  toggle: () => Theme.set(Theme.get() === 'dark' ? 'light' : 'dark'),
  init: () => Theme.set(Theme.get()),
};

// ── FORMAT HELPERS ────────────────────────────────────────────────────────────
const fmt = {
  num: (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(n),
  money: (n, currency='USD') => currency === 'UGX'
    ? `UGX ${n.toLocaleString()}`
    : `$${n.toFixed(2)}`,
  date: (d) => new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }),
  timeAgo: (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60)   return 'Just now';
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  },
  bytes: (b) => b >= 1e6 ? (b/1e6).toFixed(1)+' MB' : b >= 1e3 ? (b/1e3).toFixed(1)+' KB' : b+' B',
  initials: (name) => name ? name.split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase() : '?',
  esc: (str) => String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
};

// ── AGE GATE ──────────────────────────────────────────────────────────────────
const AgeGate = {
  check: () => {
    if (!sessionStorage.getItem('ux_age_ok')) {
      const el = document.getElementById('ageGate');
      if (el) el.classList.add('open');
    }
  },
  accept: () => {
    sessionStorage.setItem('ux_age_ok', '1');
    document.getElementById('ageGate')?.classList.remove('open');
  },
  deny: () => { window.location.href = 'https://www.google.com'; },
};
window.ageAccept = AgeGate.accept;
window.ageDeny   = AgeGate.deny;

// ── COOKIE BANNER ─────────────────────────────────────────────────────────────
const Cookies = {
  init: () => {
    if (localStorage.getItem('ux_cookies')) {
      document.getElementById('cookieBanner')?.remove();
    }
  },
  accept: () => {
    localStorage.setItem('ux_cookies', '1');
    document.getElementById('cookieBanner')?.remove();
  },
};
window.cookieAccept = Cookies.accept;

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
const Sidebar = {
  isOpen: () => document.body.classList.contains('sidebar-open'),
  open: () => {
    document.body.classList.add('sidebar-open');
    document.body.classList.remove('sidebar-collapsed');
    document.querySelector('.app-sidebar')?.classList.remove('closed');
    const overlay = document.querySelector('.sidebar-overlay');
    if (window.innerWidth <= 1024) overlay?.classList.add('open'); else overlay?.classList.remove('open');
  },
  close: () => {
    document.body.classList.add('sidebar-collapsed');
    document.body.classList.remove('sidebar-open');
    document.querySelector('.app-sidebar')?.classList.add('closed');
    document.querySelector('.sidebar-overlay')?.classList.remove('open');
  },
  toggle: () => {
    if (Sidebar.isOpen()) Sidebar.close(); else Sidebar.open();
  },
  init: () => {
    if (window.innerWidth > 1024) {
      Sidebar.open();
    } else {
      Sidebar.close();
    }
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024) {
        Sidebar.open();
      } else {
        Sidebar.close();
      }
    });
  },
};
window.toggleSidebar = Sidebar.toggle;

// ── MODAL HELPERS ─────────────────────────────────────────────────────────────
const Modal = {
  open:  (id) => document.getElementById(id)?.classList.add('open'),
  close: (id) => document.getElementById(id)?.classList.remove('open'),
};
window.openModal  = Modal.open;
window.closeModal = Modal.close;

// ── ALERT TOAST ───────────────────────────────────────────────────────────────
const Toast = {
  show: (msg, type = 'info', duration = 3500) => {
    const existing = document.getElementById('toastContainer');
    const container = existing || (() => {
      const c = document.createElement('div');
      c.id = 'toastContainer';
      c.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9000;display:flex;flex-direction:column;gap:10px;max-width:340px;';
      document.body.appendChild(c);
      return c;
    })();

    const iconMap = { success: 'ti-circle-check', error: 'ti-alert-circle', warning: 'ti-alert-triangle', info: 'ti-info-circle' };
    const t = document.createElement('div');
    t.style.cssText = `background:var(--surface);border:1px solid var(--border2);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:10px;font-size:0.88rem;box-shadow:var(--shadow);animation:fadeIn 0.25s ease;`;
    t.innerHTML = `<i class="ti ${iconMap[type]||iconMap.info}" style="font-size:18px;color:var(--${type==='success'?'green':type==='error'?'red':type==='warning'?'orange':'blue'});flex-shrink:0;"></i><span style="color:var(--text);flex:1;">${fmt.esc(msg)}</span><button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:18px;padding:0;display:flex;"><i class="ti ti-x"></i></button>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), duration);
  },
};
window.Toast = Toast;

// ── INLINE ALERT ──────────────────────────────────────────────────────────────
function showAlert(containerId, msg, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const iconMap = { success: 'ti-circle-check', error: 'ti-alert-circle', warning: 'ti-alert-triangle', info: 'ti-info-circle' };
  el.className = `alert alert-${type}`;
  el.innerHTML = `<i class="ti ${iconMap[type]}"></i><span>${fmt.esc(msg)}</span>`;
  el.style.display = 'flex';
}
window.showAlert = showAlert;

// ── ACTIVE NAV LINK ───────────────────────────────────────────────────────────
function highlightNav() {
  const path = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-link[data-page]').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-page') === path);
  });
}

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  AgeGate.check();
  Cookies.init();
  highlightNav();
  Sidebar.init();

  // Theme toggle
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', Theme.toggle);
  });

  // Sidebar overlay close
  document.querySelector('.sidebar-overlay')?.addEventListener('click', Sidebar.close);

  // Hamburger
  document.querySelector('.hamburger-btn')?.addEventListener('click', Sidebar.toggle);

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
  });
});
