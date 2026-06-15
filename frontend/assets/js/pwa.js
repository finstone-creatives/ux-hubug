/* ════════════════════════════════════════════════════
   NXT-DOOR — PWA Install Handler
════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('[SW] Registered:', reg.scope))
        .catch(err => console.warn('[SW] Registration failed:', err));
    });
  }

  // Capture install prompt
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Notify layout.js to show the sidebar install button
    document.dispatchEvent(new CustomEvent('pwa-ready'));
    // Show banner if not recently dismissed
    const dismissed = localStorage.getItem('nxtdoor_pwa_dismissed');
    if (!dismissed || Date.now() - parseInt(dismissed) > 7 * 24 * 60 * 60 * 1000) {
      setTimeout(showPWABanner, 3000);
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hidePWABanner();
    if (window.Toast) Toast.show('Nxt-door installed! \u{1F389}', 'success');
  });

  function showPWABanner() {
    let banner = document.getElementById('pwaBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pwaBanner';
      banner.className = 'pwa-banner';
      banner.innerHTML = `
        <div class="logo-mark" style="width:44px;height:44px;font-size:16px;background:linear-gradient(135deg,#e50914,#e500cc);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-family:var(--font-display);flex-shrink:0">NX</div>
        <div class="pwa-banner-text">
          <strong>Install Nxt-door</strong>
          <span>Add to home screen for the best experience</span>
        </div>
        <div class="pwa-banner-actions">
          <button class="btn btn-gradient btn-sm" onclick="PWA.install()">Install</button>
          <button class="btn btn-ghost btn-sm" onclick="PWA.dismiss()"><i class="ti ti-x"></i></button>
        </div>`;
      document.body.appendChild(banner);
    }
    setTimeout(() => banner.classList.add('visible'), 50);
  }

  function hidePWABanner() {
    const banner = document.getElementById('pwaBanner');
    if (banner) {
      banner.classList.remove('visible');
      setTimeout(() => banner.remove(), 400);
    }
  }

  window.PWA = {
    install: async () => {
      if (!deferredPrompt) {
        if (window.Toast) Toast.show('App is already installed or not supported on this browser.', 'info');
        return;
      }
      hidePWABanner();
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (outcome === 'accepted' && window.Toast) {
        Toast.show('Installing Nxt-door...', 'info');
      }
    },
    dismiss: () => {
      localStorage.setItem('nxtdoor_pwa_dismissed', Date.now().toString());
      hidePWABanner();
    },
    isInstalled: () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone,
  };
})();
