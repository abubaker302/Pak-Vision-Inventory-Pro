/* ============================================================
   PAK VISION INVENTORY PRO — dashboard.js
   ============================================================ */

const Dashboard = {
  charts: {},

  render() {
    const view = document.getElementById('view');
    const products = dbAll('products');
    const sales = dbAll('sales');
    const expenses = dbAll('expenses');

    const totalProducts = products.length;
    const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
    const totalInventoryValue = products.reduce((s, p) => s + (p.stock || 0) * (p.purchasePrice || 0), 0);

    const today = todayISO();
    const todaySales = sales.filter(s => s.date.slice(0, 10) === today);
    const todaySalesTotal = todaySales.reduce((s, x) => s + x.grandTotal, 0);
    const totalSales = sales.reduce((s, x) => s + x.grandTotal, 0);
    const totalProfit = sales.reduce((s, x) => s + x.totalProfit, 0);

    const thisMonth = today.slice(0, 7);
    const monthlyRevenue = sales.filter(s => s.date.slice(0, 7) === thisMonth).reduce((s, x) => s + x.grandTotal, 0);
    const monthlyExpense = expenses.filter(e => e.date.slice(0, 7) === thisMonth).reduce((s, x) => s + x.amount, 0);

    const lowStock = Products.getLowStock();
    const bestSellers = this.getBestSellers(5);
    const recentSales = sales.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

    view.innerHTML = `
      <div class="page-header">
        <div><h2>Dashboard</h2><p class="page-sub">Overview as of ${fmtDateTime(new Date().toISOString())}</p></div>
      </div>

      <div class="stat-grid">
        ${this.statCard('fa-boxes-stacked', 'Total Products', fmtNum(totalProducts), 'accent')}
        ${this.statCard('fa-warehouse', 'Total Stock', fmtNum(totalStock), 'teal')}
        ${this.statCard('fa-sack-dollar', 'Inventory Value', fmtMoney(totalInventoryValue), 'gold')}
        ${this.statCard('fa-calendar-day', "Today's Sales", fmtMoney(todaySalesTotal), 'accent')}
        ${this.statCard('fa-chart-line', 'Total Sales', fmtMoney(totalSales), 'teal')}
        ${this.statCard('fa-hand-holding-dollar', 'Total Profit', fmtMoney(totalProfit), 'gold')}
        ${this.statCard('fa-coins', 'Monthly Revenue', fmtMoney(monthlyRevenue), 'accent')}
        ${this.statCard('fa-triangle-exclamation', 'Low Stock Alerts', fmtNum(lowStock.length), 'danger')}
      </div>

      <div class="dashboard-grid">
        <div class="card chart-card">
          <div class="card__header"><h3><i class="fa-solid fa-chart-column"></i> Sales Trend</h3>
            <div class="chip-tabs" id="chartRangeTabs">
              <button class="chip-tab chip-tab--active" data-range="7">Daily (7d)</button>
              <button class="chip-tab" data-range="30">Weekly</button>
              <button class="chip-tab" data-range="365">Monthly</button>
            </div>
          </div>
          <canvas id="salesChart" height="110"></canvas>
        </div>

        <div class="card">
          <div class="card__header"><h3><i class="fa-solid fa-fire"></i> Best Selling Products</h3></div>
          <div class="mini-list">
            ${bestSellers.length ? bestSellers.map((b, i) => `
              <div class="mini-list__item">
                <span class="mini-rank">${i + 1}</span>
                <div class="mini-list__info"><strong>${escapeHtml(b.name)}</strong><span>${fmtNum(b.qty)} sold</span></div>
                <span class="mono">${fmtMoney(b.revenue)}</span>
              </div>`).join('') : `<p class="empty-note">No sales recorded yet.</p>`}
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="card">
          <div class="card__header"><h3><i class="fa-solid fa-triangle-exclamation"></i> Low Stock Alerts</h3></div>
          <div class="mini-list">
            ${lowStock.length ? lowStock.slice(0, 8).map(p => `
              <div class="mini-list__item">
                <div class="mini-list__info"><strong>${escapeHtml(p.name)}</strong><span>Min: ${p.minStock ?? getSettings().lowStockThreshold}</span></div>
                <span class="stock-badge stock-badge--low">${fmtNum(p.stock)} ${escapeHtml(p.unit || '')}</span>
              </div>`).join('') : `<p class="empty-note">All stock levels healthy.</p>`}
          </div>
        </div>

        <div class="card">
          <div class="card__header"><h3><i class="fa-solid fa-receipt"></i> Recent Sales</h3></div>
          <div class="mini-list">
            ${recentSales.length ? recentSales.map(s => `
              <div class="mini-list__item">
                <div class="mini-list__info"><strong>${escapeHtml(s.invoiceNo)}</strong><span>${escapeHtml(s.customerName)} &middot; ${fmtDate(s.date)}</span></div>
                <span class="mono">${fmtMoney(s.grandTotal)}</span>
              </div>`).join('') : `<p class="empty-note">No sales yet.</p>`}
          </div>
        </div>
      </div>
    `;

    this.renderChart(7);
    document.querySelectorAll('#chartRangeTabs .chip-tab').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('#chartRangeTabs .chip-tab').forEach(b => b.classList.remove('chip-tab--active'));
        btn.classList.add('chip-tab--active');
        this.renderChart(parseInt(btn.dataset.range));
      };
    });
  },

  statCard(icon, label, value, tone) {
    return `
      <div class="stat-card stat-card--${tone}">
        <div class="stat-card__icon"><i class="fa-solid ${icon}"></i></div>
        <div class="stat-card__body"><span class="stat-card__label">${label}</span><strong class="stat-card__value">${value}</strong></div>
      </div>`;
  },

  getBestSellers(limit = 5) {
    const sales = dbAll('sales');
    const map = {};
    sales.forEach(s => s.items.forEach(it => {
      if (!map[it.productId]) map[it.productId] = { name: it.name, qty: 0, revenue: 0 };
      map[it.productId].qty += it.qty;
      map[it.productId].revenue += it.price * it.qty;
    }));
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, limit);
  },

  renderChart(days) {
    const canvas = document.getElementById('salesChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const sales = dbAll('sales');
    let labels = [], data = [];

    if (days <= 30) {
      const n = days;
      for (let i = n - 1; i >= 0; i--) {
        const d = daysAgoISO(i);
        labels.push(fmtDate(d));
        const total = sales.filter(s => s.date.slice(0, 10) === d).reduce((s, x) => s + x.grandTotal, 0);
        data.push(total);
      }
    } else {
      // Monthly for last 12 months
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toISOString().slice(0, 7);
        labels.push(d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));
        const total = sales.filter(s => s.date.slice(0, 7) === key).reduce((s, x) => s + x.grandTotal, 0);
        data.push(total);
      }
    }

    if (this.charts.sales) this.charts.sales.destroy();
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 260);
    gradient.addColorStop(0, 'rgba(232,163,61,0.45)');
    gradient.addColorStop(1, 'rgba(232,163,61,0.02)');

    this.charts.sales = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Sales',
          data,
          borderColor: '#E8A33D',
          backgroundColor: gradient,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: '#E8A33D',
          pointBorderColor: '#0B1220'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8B93A7', font: { size: 11 } } },
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8B93A7', font: { size: 11 }, callback: (v) => fmtMoney(v) } }
        }
      }
    });
  }
};
