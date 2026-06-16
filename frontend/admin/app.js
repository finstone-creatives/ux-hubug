const API = '/api';

function getToken() { return localStorage.getItem('uxhub_token'); }
function getUser() { const u = localStorage.getItem('uxhub_user'); return u ? JSON.parse(u) : null; }

// ─── AUTH GUARD ────────────────────────────────────────────────────────────────

function adminLogout() {
  localStorage.removeItem('uxhub_token');
  localStorage.removeItem('uxhub_user');
  window.location.href = '../login.html';
}

function checkAdminAuth() {
  const user = getUser();
  const token = getToken();
  if (!token || !user || !['admin', 'moderator'].includes(user.role)) {
    window.location.href = '../login.html';
    return false;
  }
  document.getElementById('adminName').textContent = `${user.username} (${user.role})`;
  return true;
}

// ─── NAV ──────────────────────────────────────────────────────────────────────

function showSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  event?.target?.closest('.nav-item')?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(btn => {
    if (btn.getAttribute('onclick')?.includes(name)) btn.classList.add('active');
  });

  // Load data for section
  if (name === 'dashboard') loadDashboard();
  if (name === 'users') loadUsers();
  if (name === 'videos') loadPendingVideos();
  if (name === 'ads') loadAds();
  if (name === 'revenue') loadRevenue();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ─── API HELPER ───────────────────────────────────────────────────────────────

async function apiFetch(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  return res.json();
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

async function loadDashboard() {
  const data = await apiFetch('/admin/stats');
  if (!data.success) return;
  const s = data.stats;

  const statGrid = document.getElementById('statGrid');
  statGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Users</div>
      <div class="stat-value blue">${s.totalUsers.toLocaleString()}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Approved Videos</div>
      <div class="stat-value red">${s.totalVideos.toLocaleString()}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value gold">$${(s.totalRevenue || 0).toFixed(2)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active Ads</div>
      <div class="stat-value orange">${s.activeAds}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pending Videos</div>
      <div class="stat-value orange">${s.pendingVideos}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Banned Users</div>
      <div class="stat-value red">${s.bannedUsers}</div>
    </div>
  `;

  renderBarChart(s.monthlyRevenue || []);
}

function renderBarChart(data) {
  const wrap = document.getElementById('revenueChart');
  if (!data.length) {
    wrap.innerHTML = `<p style="color:var(--muted);text-align:center;padding:40px">No revenue data yet.</p>`;
    return;
  }
  const max = Math.max(...data.map(d => d.revenue), 1);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  wrap.innerHTML = `
    <div class="bar-chart">
      ${data.map(d => {
        const h = Math.round((d.revenue / max) * 160);
        const label = `${months[d._id.month - 1]} ${d._id.year}`;
        return `
          <div class="bar-item">
            <div class="bar-fill" style="height:${h}px" data-value="$${d.revenue.toFixed(2)} (${d.count} subs)"></div>
            <span class="bar-label">${label}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ─── USERS ────────────────────────────────────────────────────────────────────

let usersPage = 1;

async function loadUsers() {
  const search = document.getElementById('userSearch')?.value || '';
  const status = document.getElementById('userStatusFilter')?.value || '';
  const params = new URLSearchParams({ page: usersPage, limit: 15 });
  if (search) params.append('search', search);
  if (status) params.append('status', status);

  const data = await apiFetch(`/admin/users?${params}`);
  const tbody = document.getElementById('usersBody');
  if (!data.success) { tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Error loading users.</td></tr>`; return; }

  if (!data.users.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No users found.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.users.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.email}</td>
      <td>
        <select class="role-select" onchange="updateRole('${u._id}', this.value)">
          <option value="user" ${u.role==='user'?'selected':''}>User</option>
          <option value="moderator" ${u.role==='moderator'?'selected':''}>Moderator</option>
          <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
        </select>
      </td>
      <td><span class="badge badge-${u.status}">${u.status}</span></td>
      <td>${u.isPremium ? '<span class="badge badge-premium">⭐ Yes</span>' : '<span style="color:var(--muted)">No</span>'}</td>
      <td>${new Date(u.createdAt).toLocaleDateString()}</td>
      <td>
        <div class="action-btns">
          ${u.status !== 'banned'
            ? `<button class="btn-sm btn-danger" onclick="banUser('${u._id}', '${u.username}')">Ban</button>`
            : `<button class="btn-sm btn-success" onclick="unbanUser('${u._id}', '${u.username}')">Unban</button>`
          }
        </div>
      </td>
    </tr>
  `).join('');

  renderTablePagination('usersPagination', data.pages, usersPage, (p) => { usersPage = p; loadUsers(); });
}

async function banUser(id, username) {
  const reason = prompt(`Ban reason for ${username}:`);
  if (!reason) return;
  const data = await apiFetch(`/admin/users/${id}/ban`, 'PUT', { reason });
  alert(data.message);
  loadUsers();
}

async function unbanUser(id, username) {
  if (!confirm(`Unban ${username}?`)) return;
  const data = await apiFetch(`/admin/users/${id}/unban`, 'PUT');
  alert(data.message);
  loadUsers();
}

async function updateRole(id, role) {
  const data = await apiFetch(`/admin/users/${id}/role`, 'PUT', { role });
  if (!data.success) alert(data.message);
}

// ─── VIDEOS ───────────────────────────────────────────────────────────────────

async function loadPendingVideos() {
  const status = document.getElementById('videoStatusFilter')?.value || 'pending';
  const data = await apiFetch(`/admin/videos?status=${status}`);
  const grid = document.getElementById('videoModGrid');

  if (!data.success || !data.videos.length) {
    grid.innerHTML = `<div class="table-empty">No videos in this category.</div>`;
    return;
  }

  grid.innerHTML = data.videos.map(v => `
    <div class="mod-card">
      <div class="mod-thumb"><i class="ti ti-video" style="font-size:18px"></i></div>
      <div class="mod-info">
        <div class="mod-title">${escHtml(v.title)}</div>
        <div class="mod-meta">
          By: ${v.uploader?.username || 'Unknown'} · ${new Date(v.createdAt).toLocaleDateString()}
          · <span class="badge badge-${v.status}">${v.status}</span>
        </div>
        <div class="mod-meta" style="color:var(--muted2)">
          Reports: ${v.flagReports?.length || 0} · Size: ${formatBytes(v.fileSize)}
        </div>
        ${v.moderationNote ? `<div class="mod-meta" style="color:var(--orange)">Note: ${v.moderationNote}</div>` : ''}
        <div class="mod-actions">
          ${v.status !== 'approved' ? `<button class="btn-sm btn-success" onclick="moderateVideo('${v._id}', 'approved')">✓ Approve</button>` : ''}
          ${v.status !== 'rejected' ? `<button class="btn-sm btn-danger" onclick="moderateVideo('${v._id}', 'rejected')">✕ Reject</button>` : ''}
          <button class="btn-sm btn-ghost" onclick="moderateVideo('${v._id}', 'flagged')">⚑ Flag</button>
        </div>
      </div>
    </div>
  `).join('');
}

async function moderateVideo(id, action) {
  let note = '';
  if (action === 'rejected') {
    note = prompt('Rejection reason (optional):') || '';
  }
  const data = await apiFetch(`/admin/videos/${id}/moderate`, 'PUT', { action, note });
  alert(data.message);
  loadPendingVideos();
}

// ─── ADS ──────────────────────────────────────────────────────────────────────

let editingAdId = null;

async function loadAds() {
  const data = await apiFetch('/admin/ads');
  const tbody = document.getElementById('adsBody');
  if (!data.success || !data.ads.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No ads yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.ads.map(a => `
    <tr>
      <td><strong>${escHtml(a.title)}</strong></td>
      <td>${escHtml(a.advertiser)}</td>
      <td>${a.placement.replace('_', ' ')}</td>
      <td><span class="badge badge-${a.status === 'active' ? 'active' : 'pending'}">${a.status}</span></td>
      <td>${a.impressions.toLocaleString()}</td>
      <td>${a.clicks.toLocaleString()}</td>
      <td>$${a.budget.toFixed(2)}</td>
      <td>
        <div class="action-btns">
          <button class="btn-sm btn-info" onclick="editAd(${JSON.stringify(a).replace(/"/g,'&quot;')})">Edit</button>
          <button class="btn-sm btn-danger" onclick="deleteAd('${a._id}')">Delete</button>
          <button class="btn-sm ${a.status==='active'?'btn-warn':'btn-success'}" onclick="toggleAd('${a._id}', '${a.status==='active'?'paused':'active'}')">
            ${a.status==='active'?'Pause':'Activate'}
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openAdModal() {
  editingAdId = null;
  document.getElementById('adModalTitle').textContent = 'Create Ad';
  document.getElementById('adForm').reset();
  document.getElementById('adId').value = '';
  document.getElementById('adModal').classList.add('active');
}

function closeAdModal() {
  document.getElementById('adModal').classList.remove('active');
}

function editAd(ad) {
  editingAdId = ad._id;
  document.getElementById('adModalTitle').textContent = 'Edit Ad';
  document.getElementById('adId').value = ad._id;
  document.getElementById('adTitle').value = ad.title;
  document.getElementById('adAdvertiser').value = ad.advertiser;
  document.getElementById('adLink').value = ad.linkUrl;
  document.getElementById('adImage').value = ad.imageUrl || '';
  document.getElementById('adPlacement').value = ad.placement;
  document.getElementById('adBudget').value = ad.budget;
  document.getElementById('adStatus').value = ad.status;
  document.getElementById('adModal').classList.add('active');
}

async function saveAd(e) {
  e.preventDefault();
  const body = {
    title: document.getElementById('adTitle').value,
    advertiser: document.getElementById('adAdvertiser').value,
    linkUrl: document.getElementById('adLink').value,
    imageUrl: document.getElementById('adImage').value || null,
    placement: document.getElementById('adPlacement').value,
    budget: parseFloat(document.getElementById('adBudget').value) || 0,
    status: document.getElementById('adStatus').value,
  };

  const id = document.getElementById('adId').value;
  const data = id
    ? await apiFetch(`/admin/ads/${id}`, 'PUT', body)
    : await apiFetch('/admin/ads', 'POST', body);

  alert(data.success ? 'Ad saved!' : data.message);
  if (data.success) { closeAdModal(); loadAds(); }
}

async function deleteAd(id) {
  if (!confirm('Delete this ad?')) return;
  const data = await apiFetch(`/admin/ads/${id}`, 'DELETE');
  alert(data.message);
  loadAds();
}

async function toggleAd(id, status) {
  const data = await apiFetch(`/admin/ads/${id}`, 'PUT', { status });
  if (data.success) loadAds();
}

// ─── REVENUE ──────────────────────────────────────────────────────────────────

async function loadRevenue() {
  const data = await apiFetch('/admin/revenue');
  if (!data.success) return;

  document.getElementById('revStatGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-label">Total Revenue</div>
      <div class="stat-value gold">$${(data.totalRevenue || 0).toFixed(2)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Active Subscriptions</div>
      <div class="stat-value green">${data.subscriptions.length}</div>
    </div>
  `;

  const methodLabels = {
    stripe: 'Card / Stripe',
    mtn_momo: 'MTN MoMo',
    airtel_money: 'Airtel Money',
    card: 'Card',
  };

  document.getElementById('revBreakdown').innerHTML = data.byMethod.map(m => `
    <div class="rev-method-card">
      <div class="rev-method-name">${methodLabels[m._id] || m._id}</div>
      <div class="rev-method-amount">$${m.total.toFixed(2)}</div>
      <div class="rev-method-count">${m.count} subscription${m.count !== 1 ? 's' : ''}</div>
    </div>
  `).join('');

  const tbody = document.getElementById('revenueBody');
  if (!data.subscriptions.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">No subscriptions yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = data.subscriptions.map(s => `
    <tr>
      <td>${s.user?.username || 'N/A'}</td>
      <td>${s.plan}</td>
      <td>${methodLabels[s.paymentMethod] || s.paymentMethod}</td>
      <td><strong>${s.currency === 'UGX' ? 'UGX ' : '$'}${s.amount.toLocaleString()}</strong></td>
      <td>${s.currency}</td>
      <td>${new Date(s.createdAt).toLocaleDateString()}</td>
      <td><span class="badge badge-${s.status === 'active' ? 'active' : 'pending'}">${s.status}</span></td>
    </tr>
  `).join('');
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

function renderTablePagination(containerId, pages, current, onPage) {
  const el = document.getElementById(containerId);
  if (!el || pages <= 1) return;
  el.innerHTML = Array.from({ length: pages }, (_, i) => i + 1).map(p => `
    <button class="page-btn ${p === current ? 'active' : ''}" onclick="(${onPage})(${p})">${p}</button>
  `).join('');
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!checkAdminAuth()) return;
  loadDashboard();
});
