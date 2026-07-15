/* ============================================================
   PAK VISION INVENTORY PRO — app.js
   Sidebar navigation, routing, global init.
   ============================================================ */

const App = {
  routes: {
    dashboard: { label: 'Dashboard', icon: 'fa-gauge-high', module: () => Dashboard },
    products: { label: 'Products', icon: 'fa-boxes-stacked', module: () => Products },
    sales: { label: 'Sales', icon: 'fa-cash-register', module: () => Sales },
    purchases: { label: 'Purchases', icon: 'fa-truck-ramp-box', module: () => Purchases },
    customers: { label: 'Customers', icon: 'fa-users', module: () => Customers },
    suppliers: { label: 'Suppliers', icon: 'fa-truck-fast', module: () => Suppliers },
    expenses: { label: 'Expenses', icon: 'fa-money-bill-wave', module: () => Expenses },
    reports: { label: 'Reports', icon: 'fa-chart-pie', module: () => Reports },
    settings: { label: 'Settings', icon: 'fa-gear', module: () => Settings }
  },
  currentRoute: 'dashboard',

  init() {
    Toast.init();
    this.applyTheme();
    this.buildSidebar();
    this.refreshShopBranding();
    this.navigate('dashboard');
    this.refreshBadges();
    Backup.checkReminder();

    document.getElementById('sidebarToggle').onclick = () => {
      document.getElementById('sidebar').classList.toggle('sidebar--open');
    };
    document.getElementById('themeToggle').onclick = () => {
      const s = getSettings();
      const newTheme = s.theme === 'dark' ? 'light' : 'dark';
      saveSettings({ theme: newTheme });
      this.applyTheme();
    };

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  },

  buildSidebar() {
    const nav = document.getElementById('sidebarNav');
    nav.innerHTML = Object.entries(this.routes).map(([key, r]) => `
      <button class="nav-item" data-route="${key}">
        <i class="fa-solid ${r.icon}"></i><span>${r.label}</span>
        ${key === 'products' ? '<span class="nav-badge" id="badgeLowStock" style="display:none;"></span>' : ''}
      </button>
    `).join('');
    nav.querySelectorAll('.nav-item').forEach(btn => {
      btn.onclick = () => {
        this.navigate(btn.dataset.route);
        document.getElementById('sidebar').classList.remove('sidebar--open');
      };
    });
  },

  navigate(route) {
    if (!this.routes[route]) route = 'dashboard';
    this.currentRoute = route;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('nav-item--active', b.dataset.route === route));
    document.getElementById('pageTitle').textContent = this.routes[route].label;
    this.routes[route].module().render();
  },

  refreshBadges() {
    const low = (typeof Products !== 'undefined') ? Products.getLowStock().length : 0;
    const badge = document.getElementById('badgeLowStock');
    if (badge) {
      if (low > 0) { badge.style.display = 'inline-flex'; badge.textContent = low; }
      else badge.style.display = 'none';
    }
  },

  applyTheme() {
    const s = getSettings();
    document.documentElement.setAttribute('data-theme', s.theme || 'dark');
    const icon = document.querySelector('#themeToggle i');
    if (icon) icon.className = s.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  },

  refreshShopBranding() {
    const s = getSettings();
    const nameEl = document.getElementById('brandShopName');
    const logoEl = document.getElementById('brandLogo');
    if (nameEl) nameEl.textContent = s.shopName;
    if (logoEl) {
      if (s.logo) { logoEl.src = s.logo; logoEl.style.display = 'block'; }
      else logoEl.style.display = 'none';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
