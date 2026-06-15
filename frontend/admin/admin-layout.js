/* Shared admin sidebar injector */
const AdminLayout = {
  links: [
    { group:'Overview',      items:[
      { href:'/admin/dashboard.html',     page:'dashboard.html',     icon:'ti-layout-dashboard', label:'Dashboard'      },
      { href:'/admin/analytics.html',     page:'analytics.html',     icon:'ti-chart-line',       label:'Analytics'      },
    ]},
    { group:'Content',       items:[
      { href:'/admin/users.html',         page:'users.html',         icon:'ti-users',            label:'Users',    badge:'2.4K', badgeColor:'var(--blue)' },
      { href:'/admin/creators.html',      page:'creators.html',      icon:'ti-camera',           label:'Creators'       },
      { href:'/admin/moderation.html',    page:'moderation.html',    icon:'ti-shield',           label:'Moderation', badge:'14' },
      { href:'/admin/reports.html',       page:'reports.html',       icon:'ti-flag',             label:'Reports'        },
    ]},
    { group:'Monetization',  items:[
      { href:'/admin/revenue.html',       page:'revenue.html',       icon:'ti-currency-dollar',  label:'Revenue'        },
      { href:'/admin/payouts.html',       page:'payouts.html',       icon:'ti-cash',             label:'Payouts'        },
      { href:'/admin/ads.html',           page:'ads.html',           icon:'ti-speakerphone',     label:'Ads'            },
      { href:'/admin/subscriptions.html', page:'subscriptions.html', icon:'ti-crown',            label:'Subscriptions'  },
    ]},
    { group:'System',        items:[
      { href:'/admin/settings.html',      page:'settings.html',      icon:'ti-settings',         label:'Site Settings'  },
      { href:'/admin/verification.html',  page:'verification.html',  icon:'ti-id',               label:'Verification', badge:'7' },
      { href:'/admin/live-streams.html',  page:'live-streams.html',  icon:'ti-live-view',        label:'Live Streams'   },
      { href:'/admin/logs.html',          page:'logs.html',          icon:'ti-terminal',         label:'Logs'           },
    ]},
  ],

  init() {
    const el = document.getElementById('adminSidebar');
    if (!el) return;
    const user = Auth.getUser();
    const page = location.pathname.split('/').pop();

    let html = `
      <div style="padding:18px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px">
        <div class="logo-mark">NX</div>
        <div>
          <div class="logo-name" style="font-size:1rem">Nxt<span>-door</span></div>
          <div style="font-size:0.68rem;color:var(--text3);font-weight:700;letter-spacing:0.08em;text-transform:uppercase">cPanel</div>
        </div>
      </div>
      <div style="padding:14px 10px;flex:1">`;

    for (const g of this.links) {
      html += `<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text3);padding:0 10px;margin:${g===this.links[0]?'0':'14px'} 0 6px">${g.group}</div>`;
      for (const l of g.items) {
        const active = l.page === page;
        html += `<a href="${l.href}" class="nav-link${active?' active':''}" data-page="${l.page}">
          <i class="ti ${l.icon}"></i> ${l.label}
          ${l.badge ? `<span class="badge-count" style="margin-left:auto${l.badgeColor?';background:'+l.badgeColor:''}">${l.badge}</span>` : ''}
        </a>`;
      }
    }

    html += `</div>
      <div style="padding:14px;border-top:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div class="avatar avatar-sm" style="background:var(--grad-brand)">${user ? user.username?.[0]?.toUpperCase() : 'A' : 'A'}</div>
          <div style="min-width:0">
            <div style="font-size:0.82rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user?.username || 'Admin'}</div>
            <div style="font-size:0.7rem;color:var(--text3)">${user?.role || 'admin'}</div>
          </div>
        </div>
        <div style="display:flex;gap:8px">
          <a href="/index.html" class="btn btn-surface btn-sm" style="flex:1"><i class="ti ti-home"></i> Site</a>
          <button class="btn btn-danger btn-sm" onclick="Auth.logout()"><i class="ti ti-logout"></i></button>
        </div>
      </div>`;

    el.innerHTML = html;
    el.style.cssText = 'width:240px;background:var(--bg2,#05000d);border-right:1px solid var(--border);position:fixed;top:0;left:0;bottom:0;display:flex;flex-direction:column;z-index:100;overflow-y:auto;transition:transform 0.35s ease';
  },
};
window.AdminLayout = AdminLayout;
