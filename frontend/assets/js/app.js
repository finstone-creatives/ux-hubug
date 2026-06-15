/* ════════════════════════════════════════════════════
   NXT-DOOR — Shared App Utilities v2.0
════════════════════════════════════════════════════ */

const API = window.NXT_API || '/api';

// ── AUTH ────────────────────────────────────────────────────────────
const Auth = {
  _TK: 'nxtdoor_token',
  _US: 'nxtdoor_user',
  // Migrate legacy ux-hub keys on first run
  migrate() {
    const legToken = localStorage.getItem('uxhub_token');
    const legUser  = localStorage.getItem('uxhub_user');
    if (legToken && !localStorage.getItem(this._TK)) {
      localStorage.setItem(this._TK, legToken);
      if (legUser) localStorage.setItem(this._US, legUser);
      localStorage.removeItem('uxhub_token');
      localStorage.removeItem('uxhub_user');
    }
  },
  getToken:  () => localStorage.getItem(Auth._TK),
  getUser:   () => { const u = localStorage.getItem(Auth._US); return u ? JSON.parse(u) : null; },
  setSession(token, user) {
    localStorage.setItem(this._TK, token);
    localStorage.setItem(this._US, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(this._TK);
    localStorage.removeItem(this._US);
  },
  isLoggedIn:  () => !!localStorage.getItem(Auth._TK),
  isCreator:   () => { const u = Auth.getUser(); return u && (u.role === 'creator' || u.accountType === 'creator' || u.isCreator); },
  isAdmin:     () => { const u = Auth.getUser(); return u && (u.role === 'admin' || u.role === 'moderator'); },
  isPremium:   () => { const u = Auth.getUser(); return u && u.isPremium; },
  requireAuth: (redirect = '/login.html') => { if (!Auth.isLoggedIn()) window.location.href = redirect; },
  requireCreator: () => {
    if (!Auth.isLoggedIn()) { window.location.href = '/login.html'; return; }
    if (!Auth.isCreator()) { window.location.href = '/pages/become-creator.html'; }
  },
  logout: () => { Auth.clear(); window.location.href = '/login.html'; },
};
Auth.migrate();
window.Auth = Auth;

// ── API HELPER ─────────────────────────────────────────────────────
const api = {
  async req(path, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (Auth.getToken()) headers['Authorization'] = `Bearer ${Auth.getToken()}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API}${path}`, opts);
    const ct = res.headers.get('content-type') || '';
    let data = null;
    if (ct.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { success: false, message: text || res.statusText || 'Unexpected response' };
    }
    if (res.status === 401) { Auth.clear(); window.location.href = '/login.html'; }
    if (!res.ok) {
      const err = new Error(data?.message || `Request failed (${res.status})`);
      err.status = res.status;
      err.response = data;
      throw err;
    }
    return data;
  },
  get:    (path)       => api.req(path),
  post:   (path, body) => api.req(path, 'POST', body),
  put:    (path, body) => api.req(path, 'PUT', body),
  patch:  (path, body) => api.req(path, 'PATCH', body),
  delete: (path)       => api.req(path, 'DELETE'),
  async upload(path, form, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API}${path}`);
      if (Auth.getToken()) xhr.setRequestHeader('Authorization', `Bearer ${Auth.getToken()}`);
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
        };
      }
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 401) { Auth.clear(); window.location.href = '/login.html'; }
          if (xhr.status >= 400) { reject(new Error(data?.message || 'Upload failed')); return; }
          resolve(data);
        } catch (e) { reject(new Error('Invalid server response')); }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(form);
    });
  },
};
window.api = api;

// ── THEME ───────────────────────────────────────────────────────────
const Theme = {
  _KEY: 'nxtdoor_theme',
  get:   () => localStorage.getItem('nxtdoor_theme') || localStorage.getItem('uxhub_theme') || 'dark',
  set(theme) {
    localStorage.setItem(this._KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('[data-theme-icon]').forEach(el => {
      el.className = el.className.replace(/ti-sun|ti-moon/, theme === 'dark' ? 'ti-sun' : 'ti-moon');
    });
  },
  toggle: () => Theme.set(Theme.get() === 'dark' ? 'light' : 'dark'),
  init:   () => Theme.set(Theme.get()),
};
window.Theme = Theme;

// ── FORMAT HELPERS ──────────────────────────────────────────────────
const fmt = {
  num: (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(n||0),
  money: (n, currency = 'USD') => currency === 'UGX'
    ? `UGX ${Number(n||0).toLocaleString()}`
    : `$${Number(n||0).toFixed(2)}`,
  date: (d) => new Date(d).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }),
  timeAgo: (d) => {
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60)    return 'Just now';
    if (s < 3600)  return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return `${Math.floor(s/86400)}d ago`;
  },
  bytes: (b) => b >= 1e6 ? (b/1e6).toFixed(1)+' MB' : b >= 1e3 ? (b/1e3).toFixed(1)+' KB' : b+' B',
  initials: (name) => name ? name.split(' ').map(w => w[0]).join('').substring(0,2).toUpperCase() : '?',
  esc: (str) => String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
  duration: (s) => { const m = Math.floor(s/60); return `${m}:${String(s%60).padStart(2,'0')}`; },
};
window.fmt = fmt;

// ── AGE GATE ───────────────────────────────────────────────────────────
const AgeGate = {
  _KEY: 'nxtdoor_age',
  check: () => {
    const ok = sessionStorage.getItem('nxtdoor_age') || sessionStorage.getItem('ux_age_ok');
    if (!ok) {
      const el = document.getElementById('ageGate');
      if (el) el.classList.add('open');
    }
  },
  accept: () => {
    sessionStorage.setItem('nxtdoor_age', '1');
    document.getElementById('ageGate')?.classList.remove('open');
  },
  deny: () => { window.location.href = 'https://www.google.com'; },
};
window.ageAccept = AgeGate.accept;
window.ageDeny   = AgeGate.deny;

// ── COOKIE BANNER ─────────────────────────────────────────────────────
const Cookies = {
  _KEY: 'nxtdoor_cookies',
  init: () => {
    const ok = localStorage.getItem('nxtdoor_cookies') || localStorage.getItem('ux_cookies');
    if (ok) document.getElementById('cookieBanner')?.remove();
  },
  accept: () => {
    localStorage.setItem('nxtdoor_cookies', '1');
    document.getElementById('cookieBanner')?.remove();
  },
};
window.cookieAccept = Cookies.accept;

// ── SIDEBAR ────────────────────────────────────────────────────────────
const Sidebar = {
  isOpen: () => document.body.classList.contains('sidebar-open'),
  open: () => {
    document.body.classList.add('sidebar-open');
    document.body.classList.remove('sidebar-collapsed');
    document.querySelector('.app-sidebar')?.classList.remove('closed');
    if (window.innerWidth <= 1280)
      document.querySelector('.sidebar-overlay')?.classList.add('open');
  },
  close: () => {
    document.body.classList.remove('sidebar-open');
    document.body.classList.add('sidebar-collapsed');
    document.querySelector('.app-sidebar')?.classList.add('closed');
    document.querySelector('.sidebar-overlay')?.classList.remove('open');
  },
  toggle: () => Sidebar.isOpen() ? Sidebar.close() : Sidebar.open(),
  init: () => {
    window.innerWidth > 1280 ? Sidebar.open() : Sidebar.close();
    window.addEventListener('resize', () => {
      window.innerWidth > 1280 ? Sidebar.open() : Sidebar.close();
    });
  },
};
window.toggleSidebar = Sidebar.toggle;
window.Sidebar = Sidebar;

// ── MODAL ─────────────────────────────────────────────────────────────
const Modal = {
  open:  (id) => document.getElementById(id)?.classList.add('open'),
  close: (id) => document.getElementById(id)?.classList.remove('open'),
};
window.openModal  = Modal.open;
window.closeModal = Modal.close;

// ── TOAST ─────────────────────────────────────────────────────────────
const Toast = {
  show: (msg, type = 'info', duration = 3500) => {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.style.cssText = 'position:fixed;bottom:72px;right:16px;z-index:9000;display:flex;flex-direction:column;gap:8px;max-width:320px;pointer-events:none;';
      document.body.appendChild(container);
    }
    const icons = { success:'ti-circle-check', error:'ti-alert-circle', warning:'ti-alert-triangle', info:'ti-info-circle' };
    const colors = { success:'var(--green)', error:'var(--red)', warning:'var(--orange)', info:'var(--blue)' };
    const t = document.createElement('div');
    t.style.cssText = `background:var(--card);border:1px solid var(--border2);border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;font-size:0.86rem;box-shadow:var(--shadow-lg);animation:fadeIn 0.25s ease;pointer-events:auto;`;
    t.innerHTML = `<i class="ti ${icons[type]||icons.info}" style="font-size:18px;color:${colors[type]||colors.info};flex-shrink:0;"></i><span style="color:var(--text);flex:1;line-height:1.4;">${fmt.esc(msg)}</span><button onclick="this.closest('div').remove()" style="background:none;border:none;cursor:pointer;color:var(--text4);font-size:18px;padding:0;display:flex;"><i class="ti ti-x"></i></button>`;
    container.appendChild(t);
    setTimeout(() => t.style.animation = 'fadeIn 0.25s ease reverse', duration - 250);
    setTimeout(() => t.remove(), duration);
  },
};
window.Toast = Toast;

// ── INLINE ALERT ────────────────────────────────────────────────────
function showAlert(containerId, msg, type = 'error') {
  const el = document.getElementById(containerId);
  if (!el) return;
  const icons = { success:'ti-circle-check', error:'ti-alert-circle', warning:'ti-alert-triangle', info:'ti-info-circle' };
  el.className = `alert alert-${type}`;
  el.innerHTML = `<i class="ti ${icons[type]||icons.error}"></i><span>${fmt.esc(msg)}</span>`;
  el.style.display = 'flex';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
window.showAlert = showAlert;

// ── FILE UPLOAD HELPER ─────────────────────────────────────────────
function initFileDrop(dropEl, inputEl, onChange) {
  if (!dropEl || !inputEl) return;
  ['dragover','dragenter'].forEach(ev => {
    dropEl.addEventListener(ev, (e) => { e.preventDefault(); dropEl.classList.add('drag-over'); });
  });
  dropEl.addEventListener('dragleave', () => dropEl.classList.remove('drag-over'));
  dropEl.addEventListener('drop', (e) => {
    e.preventDefault();
    dropEl.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length && onChange) onChange(files);
  });
  inputEl.addEventListener('change', () => { if (inputEl.files.length && onChange) onChange(inputEl.files); });
}
window.initFileDrop = initFileDrop;

// ── CONFIRM DIALOG ───────────────────────────────────────────────────
function confirmAction(msg, onConfirm) {
  if (window.confirm(msg)) onConfirm();
}
window.confirmAction = confirmAction;

// ── INIT ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  AgeGate.check();
  Cookies.init();
  Sidebar.init();

  // Theme toggle buttons
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', Theme.toggle);
  });

  // Sidebar overlay
  document.querySelector('.sidebar-overlay')?.addEventListener('click', Sidebar.close);

  // Hamburger
  document.querySelector('.hamburger-btn')?.addEventListener('click', Sidebar.toggle);

  // Close modals on backdrop click
  document.querySelectorAll('.modal-backdrop').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
  });

  // Sticky header shadow
  const header = document.querySelector('.app-header');
  if (header) {
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Highlight active nav
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link[data-page]').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-page') === path);
  });
});
