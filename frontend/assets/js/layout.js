/* ════════════════════════════════════════════════════
   NXT-DOOR — Layout Builder v2.0
   Injects sidebar + header + bottom nav
════════════════════════════════════════════════════ */

const Layout = {
  navItems: [
    { section: 'Discover', items: [
      { icon: 'ti-layout-grid', label: 'Explore',      href: '/index.html',             page: 'index.html' },
      { icon: 'ti-flame',       label: 'Trending',     href: '/pages/trending.html',    page: 'trending.html' },
      { icon: 'ti-live-view',   label: 'Live Now',     href: '/pages/live.html',        page: 'live.html', badge: 'LIVE' },
      { icon: 'ti-search',      label: 'Search',       href: '/pages/search.html',      page: 'search.html' },
    ]},
    { section: 'My Account', items: [
      { icon: 'ti-home',        label: 'My Feed',      href: '/pages/feed.html',        page: 'feed.html',         authOnly: true },
      { icon: 'ti-message',     label: 'Messages',     href: '/pages/messages.html',    page: 'messages.html',     authOnly: true, badgeId: 'unreadCount' },
      { icon: 'ti-bell',        label: 'Notifications',href: '/pages/notifications.html',page:'notifications.html',authOnly: true },
      { icon: 'ti-calendar',    label: 'Bookings',     href: '/pages/bookings.html',    page: 'bookings.html',     authOnly: true },
      { icon: 'ti-heart',       label: 'Saved',        href: '/pages/saved.html',       page: 'saved.html',        authOnly: true },
      { icon: 'ti-wallet',      label: 'Wallet',       href: '/pages/wallet.html',      page: 'wallet.html',       authOnly: true },
      { icon: 'ti-user-circle', label: 'Profile',      href: '/pages/profile.html',     page: 'profile.html',      authOnly: true },
      { icon: 'ti-settings',    label: 'Settings',     href: '/pages/settings.html',    page: 'settings.html',     authOnly: true },
    ]},
    { section: 'Creator Hub', creatorOnly: true, items: [
      { icon: 'ti-chart-bar',      label: 'Dashboard',   href: '/creator/dashboard.html', page: 'dashboard.html' },
      { icon: 'ti-plus-circle',    label: 'New Post',    href: '/creator/new-post.html',  page: 'new-post.html' },
      { icon: 'ti-live-photo',     label: 'Go Live',     href: '/creator/go-live.html',   page: 'go-live.html' },
      { icon: 'ti-cash',           label: 'Earnings',    href: '/creator/earnings.html',  page: 'earnings.html' },
    ]},
  ],

  buildSidebar() {
    const user      = Auth.getUser();
    const isCreator = Auth.isCreator();
    const isAdmin   = Auth.isAdmin();

    let sectionsHtml = '';
    for (const section of this.navItems) {
      if (section.creatorOnly && !isCreator) continue;
      const items = section.items.filter(i => !i.authOnly || user);
      if (!items.length) continue;

      sectionsHtml += `
        <div class="sidebar-section">
          <div class="sidebar-section-label">${section.section}</div>
          ${items.map(i => `
            <a href="${i.href}" class="nav-link" data-page="${i.page}" aria-label="${i.label}">
              <i class="ti ${i.icon}"></i>
              <span>${i.label}</span>
              ${i.badge === 'LIVE' ? `<span class="badge-count" style="background:var(--red)">LIVE</span>` : ''}
              ${i.badgeId ? `<span class="badge-count" id="${i.badgeId}" style="display:none">0</span>` : ''}
            </a>
          `).join('')}
        </div>`;
    }

    if (isAdmin) {
      sectionsHtml += `
        <div class="sidebar-section">
          <div class="sidebar-section-label">Administration</div>
          <a href="/admin/dashboard.html" class="nav-link" data-page="dashboard.html">
            <i class="ti ti-shield-check"></i><span>Admin Panel</span>
          </a>
          <a href="/admin/moderation.html" class="nav-link" data-page="moderation.html">
            <i class="ti ti-eye"></i><span>Moderation</span>
          </a>
        </div>`;
    }

    const userFooter = user ? `
      <div class="sidebar-user">
        <a href="/pages/settings.html" style="text-decoration:none;">
          <div class="avatar avatar-sm">
            ${user.avatar ? `<img src="${user.avatar}" alt="${fmt.esc(user.username)}">` : fmt.initials(user.username)}
          </div>
        </a>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${fmt.esc(user.displayName || user.username)}</div>
          <div class="sidebar-user-role">
            ${user.isPremium ? '<i class="ti ti-crown" style="color:var(--gold);font-size:12px"></i> Premium' : user.role}
          </div>
        </div>
        <button class="btn btn-icon btn-icon-round btn-sm" onclick="Auth.logout()" title="Sign out" aria-label="Sign out">
          <i class="ti ti-logout"></i>
        </button>
      </div>` : `
      <div class="sidebar-user" style="flex-direction:column;gap:8px">
        <a href="/login.html" class="btn btn-outline btn-sm w-full">Sign In</a>
        <a href="/register.html" class="btn btn-gradient btn-sm w-full">
          <i class="ti ti-user-plus"></i> Join Free
        </a>
      </div>`;

    return `
      <a href="/index.html" class="sidebar-logo" aria-label="Nxt-door home">
        <div class="logo-mark">NX</div>
        <div>
          <div class="logo-name">Nxt-<span>door</span></div>
          <div class="logo-tagline">Knock, Knack.</div>
        </div>
      </a>
      ${sectionsHtml}
      ${userFooter}`;
  },

  buildHeader(title = '') {
    const user = Auth.getUser();
    return `
      <div class="header-left">
        <button class="hamburger-btn" onclick="toggleSidebar()" aria-label="Toggle menu">
          <i class="ti ti-menu-2"></i>
        </button>
        ${title
          ? `<span class="page-title">${fmt.esc(title)}</span>`
          : `<div class="search-wrap hide-mobile">
               <i class="ti ti-search"></i>
               <input type="text" placeholder="Search creators, content..." id="globalSearch" autocomplete="off" aria-label="Search"/>
             </div>`
        }
      </div>
      <div class="header-right">
        <button class="btn btn-icon" onclick="Theme.toggle()" title="Toggle theme" aria-label="Toggle theme">
          <i class="ti ti-moon" data-theme-icon></i>
        </button>
        ${user ? `
          <a href="/pages/messages.html" class="btn btn-icon notif-btn" title="Messages" aria-label="Messages">
            <i class="ti ti-message"></i>
            <span class="notif-dot" id="msgDot" style="display:none"></span>
          </a>
          <a href="/pages/notifications.html" class="btn btn-icon notif-btn" title="Notifications" aria-label="Notifications">
            <i class="ti ti-bell"></i>
            <span class="notif-dot" id="notifDot" style="display:none"></span>
          </a>
          <a href="/pages/settings.html" aria-label="Profile">
            <div class="avatar avatar-sm">
              ${user.avatar ? `<img src="${user.avatar}" alt="${fmt.esc(user.username)}">` : fmt.initials(user.username)}
            </div>
          </a>` : `
          <a href="/login.html" class="btn btn-outline btn-sm hide-mobile">Sign In</a>
          <a href="/register.html" class="btn btn-gradient btn-sm">
            <i class="ti ti-door-enter"></i> Join Free
          </a>`}
      </div>`;
  },

  buildBottomNav() {
    const user = Auth.getUser();
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const active = (page) => path === page ? 'active' : '';

    return `
      <a href="/index.html" class="bottom-nav-item ${active('index.html')}" aria-label="Explore">
        <i class="ti ti-layout-grid"></i>
        <span>Explore</span>
      </a>
      <a href="/pages/search.html" class="bottom-nav-item ${active('search.html')}" aria-label="Search">
        <i class="ti ti-search"></i>
        <span>Search</span>
      </a>
      <a href="/pages/live.html" class="bottom-nav-item bottom-nav-center ${active('live.html')}" aria-label="Live">
        <div class="bottom-nav-center-btn">
          <i class="ti ti-live-view"></i>
        </div>
      </a>
      ${user ? `
      <a href="/pages/messages.html" class="bottom-nav-item ${active('messages.html')}" aria-label="Messages" style="position:relative">
        <i class="ti ti-message"></i>
        <span>DMs</span>
        <span class="bottom-nav-badge" id="bottomMsgBadge" style="display:none">0</span>
      </a>
      <a href="/pages/settings.html" class="bottom-nav-item ${active('settings.html')}" aria-label="Profile">
        <div class="avatar avatar-xs">
          ${user.avatar ? `<img src="${user.avatar}" alt="">` : fmt.initials(user.username)}
        </div>
        <span>Me</span>
      </a>` : `
      <a href="/pages/trending.html" class="bottom-nav-item ${active('trending.html')}" aria-label="Trending">
        <i class="ti ti-flame"></i>
        <span>Hot</span>
      </a>
      <a href="/login.html" class="bottom-nav-item ${active('login.html')}" aria-label="Sign In">
        <i class="ti ti-user"></i>
        <span>Sign In</span>
      </a>`}`;
  },

  init(pageTitle = '') {
    // Sidebar
    const sidebar = document.getElementById('appSidebar');
    if (sidebar) sidebar.innerHTML = this.buildSidebar();

    // Header
    const header = document.getElementById('appHeader');
    if (header) header.innerHTML = this.buildHeader(pageTitle);

    // Bottom nav
    let bottomNav = document.getElementById('bottomNav');
    if (!bottomNav) {
      bottomNav = document.createElement('nav');
      bottomNav.id = 'bottomNav';
      bottomNav.className = 'bottom-nav';
      bottomNav.setAttribute('aria-label', 'Main navigation');
      document.body.appendChild(bottomNav);
    }
    bottomNav.innerHTML = this.buildBottomNav();

    // Active nav links
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link[data-page]').forEach(el => {
      el.classList.toggle('active', el.getAttribute('data-page') === path);
    });

    // Load notification counts
    if (Auth.isLoggedIn()) {
      api.get('/notifications/unread-count').then(res => {
        if (res.success && res.count > 0) {
          const dot = document.getElementById('notifDot');
          if (dot) dot.style.display = 'block';
        }
      }).catch(() => {});
    }

    // Global search
    const gs = document.getElementById('globalSearch');
    if (gs) {
      gs.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && gs.value.trim()) {
          window.location.href = `/pages/search.html?q=${encodeURIComponent(gs.value.trim())}`;
        }
      });
    }
  },
};
window.Layout = Layout;
