/* ════════════════════════════════════════════════════════════════════════════
   UX-HUB — Layout Builder
   Injects sidebar + header into any page
════════════════════════════════════════════════════════════════════════════ */

const Layout = {
  // Sidebar nav items config
  navItems: [
    { section: 'Discover', items: [
      { icon: 'ti-layout-grid', label: 'Explore',    href: '/index.html',          page: 'index.html' },
      { icon: 'ti-flame',       label: 'Trending',   href: '/pages/trending.html', page: 'trending.html' },
      { icon: 'ti-live-view',   label: 'Live Now',   href: '/pages/live.html',     page: 'live.html', badge: 'LIVE' },
      { icon: 'ti-search',      label: 'Search',     href: '/pages/search.html',   page: 'search.html' },
    ]},
    { section: 'My Account', items: [
      { icon: 'ti-home',        label: 'Feed',       href: '/pages/feed.html',     page: 'feed.html', authOnly: true },
      { icon: 'ti-message',     label: 'Messages',   href: '/pages/messages.html', page: 'messages.html', authOnly: true, badge: null, badgeId: 'unreadCount' },
      { icon: 'ti-calendar',    label: 'Bookings',   href: '/pages/bookings.html', page: 'bookings.html', authOnly: true },
      { icon: 'ti-heart',       label: 'Saved',      href: '/pages/saved.html',    page: 'saved.html', authOnly: true },
      { icon: 'ti-wallet',      label: 'Wallet',     href: '/pages/wallet.html',   page: 'wallet.html', authOnly: true },
      { icon: 'ti-settings',    label: 'Settings',   href: '/pages/settings.html', page: 'settings.html', authOnly: true },
    ]},
    { section: 'Creator Hub', creatorOnly: true, items: [
      { icon: 'ti-chart-bar',   label: 'Dashboard',  href: '/creator/dashboard.html', page: 'dashboard.html' },
      { icon: 'ti-plus',        label: 'New Post',   href: '/creator/new-post.html',  page: 'new-post.html' },
      { icon: 'ti-video',       label: 'Go Live',    href: '/creator/go-live.html',   page: 'go-live.html' },
      { icon: 'ti-calendar-event', label: 'My Bookings', href: '/creator/bookings.html', page: 'bookings.html' },
      { icon: 'ti-cash',        label: 'Earnings',   href: '/creator/earnings.html',  page: 'earnings.html' },
    ]},
  ],

  buildSidebar() {
    const user = Auth.getUser();
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
            <a href="${i.href}" class="nav-link" data-page="${i.page}">
              <i class="ti ${i.icon}"></i>
              ${i.label}
              ${i.badge === 'LIVE' ? `<span class="badge-count" style="background:var(--red)">LIVE</span>` : ''}
              ${i.badgeId ? `<span class="badge-count" id="${i.badgeId}" style="display:none">0</span>` : ''}
            </a>
          `).join('')}
        </div>`;
    }

    if (isAdmin) {
      sectionsHtml += `
        <div class="sidebar-section">
          <div class="sidebar-section-label">Admin</div>
          <a href="/admin/dashboard.html" class="nav-link" data-page="dashboard.html">
            <i class="ti ti-shield"></i> cPanel
          </a>
        </div>`;
    }

    const userFooter = user ? `
      <div class="sidebar-user">
        <div class="avatar avatar-sm" onclick="window.location='/pages/settings.html'" style="cursor:pointer">
          ${user.avatar ? `<img src="${user.avatar}" />` : fmt.initials(user.username)}
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${fmt.esc(user.username)}</div>
          <div class="sidebar-user-role">${user.isPremium ? 'Premium' : user.role}</div>
        </div>
        <button class="btn btn-icon btn-icon-round btn-sm" onclick="Auth.logout()" title="Logout" style="margin-left:auto">
          <i class="ti ti-logout"></i>
        </button>
      </div>` : `
      <div class="sidebar-user" style="gap:8px">
        <a href="/login.html" class="btn btn-outline btn-sm w-full">Sign In</a>
        <a href="/register.html" class="btn btn-brand btn-sm w-full">Join</a>
      </div>`;

    return `
      <div class="sidebar-logo">
        <div class="logo-mark">UX</div>
        <span class="logo-name">UX<span>HUB</span></span>
      </div>
      ${sectionsHtml}
      ${userFooter}`;
  },

  buildHeader(title = '') {
    const user = Auth.getUser();
    return `
      <div class="header-left">
        <button class="hamburger-btn" onclick="toggleSidebar()"><i class="ti ti-menu-2"></i></button>
        ${title ? `<span class="page-title">${title}</span>` : `
          <div class="search-wrap hide-mobile">
            <i class="ti ti-search"></i>
            <input type="text" placeholder="Search creators, content..." id="globalSearch" />
          </div>`}
      </div>
      <div class="header-right">
        <button class="theme-toggle" title="Toggle theme">
          <i class="ti ti-moon" data-theme-icon></i>
        </button>
        ${user ? `
          <a href="/pages/messages.html" class="btn btn-icon notif-btn" title="Messages">
            <i class="ti ti-message"></i>
            <span class="notif-dot" id="msgDot" style="display:none"></span>
          </a>
          <a href="/pages/notifications.html" class="btn btn-icon notif-btn" title="Notifications">
            <i class="ti ti-bell"></i>
            <span class="notif-dot" id="notifDot" style="display:none"></span>
          </a>
          <a href="/pages/settings.html">
            <div class="avatar avatar-sm">
              ${user.avatar ? `<img src="${user.avatar}">` : fmt.initials(user.username)}
            </div>
          </a>` : `
          <a href="/login.html" class="btn btn-outline btn-sm">Sign In</a>
          <a href="/register.html" class="btn btn-brand btn-sm">Join Free</a>`}
      </div>`;
  },

  init(pageTitle = '') {
    const sidebar = document.getElementById('appSidebar');
    const header  = document.getElementById('appHeader');
    if (sidebar) sidebar.innerHTML = this.buildSidebar();
    if (header)  header.innerHTML  = this.buildHeader(pageTitle);

    if (Auth.isLoggedIn()) {
      api.get('/notifications/unread-count').then(res => {
        if (res.success && typeof res.count === 'number') {
          const dot = document.getElementById('notifDot');
          if (dot) {
            dot.style.display = res.count > 0 ? 'block' : 'none';
          }
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
