const API = '/api';
let currentPage = 1;
let currentFilter = 'all';

// ─── AUTH STATE ────────────────────────────────────────────────────────────────

function getToken() { return localStorage.getItem('uxhub_token'); }
function getUser() {
  const u = localStorage.getItem('uxhub_user');
  return u ? JSON.parse(u) : null;
}

function renderHeaderActions() {
  const container = document.getElementById('headerActions');
  if (!container) return;
  const user = getUser();

  if (user) {
    container.innerHTML = `
      <span class="user-greeting">👤 ${user.username}${user.isPremium ? ' ⭐' : ''}</span>
      <button class="btn-upload" onclick="openModal('uploadModal')">+ Upload</button>
      ${user.role === 'admin' || user.role === 'moderator' ? `<a href="admin/index.html" class="btn-admin">⚙ cPanel</a>` : ''}
      <button class="btn-outline" onclick="logout()">Logout</button>
    `;
  } else {
    container.innerHTML = `
      <a href="login.html" class="btn-outline">Login</a>
      <a href="register.html" class="btn-primary">Register</a>
    `;
  }
}

function logout() {
  localStorage.removeItem('uxhub_token');
  localStorage.removeItem('uxhub_user');
  window.location.reload();
}

// ─── AGE GATE ──────────────────────────────────────────────────────────────────

function enterSite() {
  sessionStorage.setItem('uxhub_age_ok', '1');
  document.getElementById('ageGate').style.display = 'none';
}

function checkAgeGate() {
  if (!sessionStorage.getItem('uxhub_age_ok')) {
    document.getElementById('ageGate').style.display = 'flex';
  } else {
    document.getElementById('ageGate').style.display = 'none';
  }
}

// ─── COOKIES ───────────────────────────────────────────────────────────────────

function acceptCookies() {
  localStorage.setItem('uxhub_cookies', '1');
  document.getElementById('cookieBanner').style.display = 'none';
}

function checkCookies() {
  if (localStorage.getItem('uxhub_cookies')) {
    const banner = document.getElementById('cookieBanner');
    if (banner) banner.style.display = 'none';
  }
}

// ─── VIDEOS ────────────────────────────────────────────────────────────────────

async function loadVideos(page = 1, search = '') {
  const grid = document.getElementById('videoGrid');
  if (!grid) return;

  grid.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading videos...</p></div>`;

  try {
    const params = new URLSearchParams({ page, limit: 12 });
    if (search) params.append('search', search);

    const res = await fetch(`${API}/videos?${params}`);
    const data = await res.json();

    if (!data.success || data.videos.length === 0) {
      grid.innerHTML = `<div class="empty-state"><p>No videos found.</p></div>`;
      return;
    }

    grid.innerHTML = data.videos.map(v => renderVideoCard(v)).join('');
    renderPagination(data.pagination);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><p>Failed to load videos. Is the server running?</p></div>`;
  }
}

function renderVideoCard(video) {
  const thumb = video.thumbnail ? `${API.replace('/api','')}/${video.thumbnail}` : null;
  const thumbBg = thumb ? `background-image:url('${thumb}')` : '';
  const premiumBadge = video.isPremium ? '<span class="badge-premium">⭐ Premium</span>' : '';
  const views = video.views >= 1000000 ? `${(video.views/1000000).toFixed(1)}M` :
                video.views >= 1000 ? `${(video.views/1000).toFixed(1)}K` : video.views;

  return `
    <div class="video-card" onclick="openVideo('${video._id}')">
      <div class="thumbnail" style="${thumbBg}">
        <div class="play-btn">▶</div>
        ${premiumBadge}
        <span class="resolution-badge">${video.resolution}</span>
      </div>
      <div class="video-info">
        <div class="video-title">${escHtml(video.title)}</div>
        <div class="video-meta">
          <span class="video-views">👁 ${views} views</span>
          <span class="video-uploader">by ${video.uploader?.username || 'Unknown'}</span>
        </div>
        <div class="video-bottom">
          <select onclick="event.stopPropagation()" class="resolution-select">
            <option>HD</option><option>SD</option><option>4K</option>
          </select>
          <button class="report-btn" onclick="event.stopPropagation(); reportVideo('${video._id}')">⚑</button>
        </div>
      </div>
    </div>
  `;
}

function openVideo(id) {
  window.location.href = `video.html?id=${id}`;
}

function renderPagination({ page, pages }) {
  const container = document.getElementById('pagination');
  if (!container || pages <= 1) return;

  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += `<div class="page ${i === page ? 'active' : ''}" onclick="changePage(${i})">${i}</div>`;
  }
  container.innerHTML = html;
}

function changePage(page) {
  currentPage = page;
  loadVideos(page);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterVideos(filter) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  loadVideos(1);
}

function searchVideos() {
  const q = document.getElementById('searchInput').value.trim();
  loadVideos(1, q);
}

document.getElementById('searchInput')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchVideos();
});

function searchTag(el) {
  document.getElementById('searchInput').value = el.textContent;
  searchVideos();
}

// ─── VIDEO UPLOAD ───────────────────────────────────────────────────────────────

async function submitUpload(e) {
  e.preventDefault();
  const token = getToken();
  if (!token) { window.location.href = 'login.html'; return; }

  const title = document.getElementById('videoTitle').value;
  const description = document.getElementById('videoDesc').value;
  const tags = document.getElementById('videoTags').value;
  const resolution = document.getElementById('videoResolution').value;
  const file = document.getElementById('videoFile').files[0];

  if (!file) return;

  const formData = new FormData();
  formData.append('video', file);
  formData.append('title', title);
  formData.append('description', description);
  formData.append('tags', tags);
  formData.append('resolution', resolution);

  document.getElementById('uploadProgress').style.display = 'block';

  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${API}/videos/upload`);
  xhr.setRequestHeader('Authorization', `Bearer ${token}`);

  xhr.upload.onprogress = (e) => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      document.getElementById('progressFill').style.width = pct + '%';
      document.getElementById('progressText').textContent = pct + '%';
    }
  };

  xhr.onload = () => {
    const data = JSON.parse(xhr.responseText);
    if (data.success) {
      closeModal('uploadModal');
      alert('Video uploaded! It will appear after moderation.');
    } else {
      alert(data.message);
    }
  };

  xhr.send(formData);
}

// ─── REPORT VIDEO ──────────────────────────────────────────────────────────────

async function reportVideo(id) {
  const token = getToken();
  if (!token) { window.location.href = 'login.html'; return; }
  const reason = prompt('Why are you reporting this video?');
  if (!reason) return;

  const res = await fetch(`${API}/videos/${id}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ reason }),
  });
  const data = await res.json();
  alert(data.message);
}

// ─── MODALS ────────────────────────────────────────────────────────────────────

function openModal(id) {
  const token = getToken();
  if (!token) { window.location.href = 'login.html'; return; }
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// ─── NAV ───────────────────────────────────────────────────────────────────────

function toggleMenu() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

// ─── UTILS ─────────────────────────────────────────────────────────────────────

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── INIT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  checkAgeGate();
  checkCookies();
  renderHeaderActions();
  loadVideos();
});

// Sticky header shadow on scroll
window.addEventListener('scroll', () => {
  const header = document.getElementById('mainHeader');
  if (header) header.classList.toggle('scrolled', window.scrollY > 10);
});
