/* ============================================================
   PAK VISION INVENTORY PRO — reports.js
   ============================================================ */

const Reports = {
  state: { period: 'daily', reportType: 'sales', fromDate: todayISO(), toDate: todayISO() },

  render() {
    const view = document.getElementById('view');
    view.innerHTML = `
      <div class="page-header">
        <div><h2>Reports</h2><p class="page-sub">Generate and export business reports</p></div>
      </div>

      <div class="toolbar toolbar--reports">
        <select id="repType" class="select">
          <option value="sales">Sales Report</option>
          <option value="profit">Profit Report</option>
          <option value="expense">Expense Report</option>
          <option value="stock">Stock Report</option>
          <option value="lowstock">Low Stock Report</option>
        </select>
        <select id="repPeriod" class="select">
          <option value="daily">Today</option>
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
          <option value="yearly">This Year</option>
          <option value="custom">Custom Range</option>
        </select>
        <input type="date" id="repFrom" class="select" style="display:none;">
        <input type="date" id="repTo" class="select" style="display:none;">
        <button class="btn btn--ghost" id="btnPrintReport"><i class="fa-solid fa-print"></i> Print</button>
        <button class="btn btn--ghost" id="btnExportPDF"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        <button class="btn btn--ghost" id="btnExportExcel"><i class="fa-solid fa-file-excel"></i> Excel</button>
        <button class="btn btn--ghost" id="btnExportJSON"><i class="fa-solid fa-file-code"></i> JSON</button>
      </div>

      <div id="reportOutput" class="card report-output"></div>
    `;

    const from = document.getElementById('repFrom'), to = document.getElementById('repTo');
    document.getElementById('repType').onchange = (e) => { this.state.reportType = e.target.value; this.renderReport(); };
    document.getElementById('repPeriod').onchange = (e) => {
      this.state.period = e.target.value;
      const custom = e.target.value === 'custom';
      from.style.display = custom ? 'inline-block' : 'none';
      to.style.display = custom ? 'inline-block' : 'none';
      this.renderReport();
    };
    from.onchange = (e) => { this.state.fromDate = e.target.value; this.renderReport(); };
    to.onchange = (e) => { this.state.toDate = e.target.value; this.renderReport(); };
    document.getElementById('btnPrintReport').onclick = () => window.print();
    document.getElementById('btnExportPDF').onclick = () => this.exportPDF();
    document.getElementById('btnExportExcel').onclick = () => this.exportExcel();
    document.getElementById('btnExportJSON').onclick = () => this.exportJSON();

    this.renderReport();
  },

  getRange() {
    const now = new Date();
    let from, to;
    switch (this.state.period) {
      case 'daily': from = to = todayISO(); break;
      case 'weekly': from = daysAgoISO(6); to = todayISO(); break;
      case 'monthly': from = todayISO().slice(0, 8) + '01'; to = todayISO(); break;
      case 'yearly': from = todayISO().slice(0, 4) + '-01-01'; to = todayISO(); break;
      case 'custom': from = this.state.fromDate; to = this.state.toDate; break;
      default: from = to = todayISO();
    }
    return { from, to };
  },

  getData() {
    const { from, to } = this.getRange();
    const inRange = (dateStr) => {
      const d = dateStr.slice(0, 10);
      return d >= from && d <= to;
    };

    if (this.state.reportType === 'sales') {
      const sales = dbAll('sales').filter(s => inRange(s.date));
      return {
        title: 'Sales Report', from, to,
        columns: ['Invoice #', 'Date', 'Customer', 'Items', 'Subtotal', 'Discount', 'Grand Total', 'Payment'],
        rows: sales.map(s => [s.invoiceNo, fmtDate(s.date), s.customerName, s.items.length, s.subtotal, s.discount, s.grandTotal, s.paymentMethod]),
        summary: [
          ['Total Invoices', sales.length],
          ['Total Sales Value', fmtMoney(sales.reduce((a, s) => a + s.grandTotal, 0))],
          ['Total Discount Given', fmtMoney(sales.reduce((a, s) => a + s.discount, 0))]
        ]
      };
    }
    if (this.state.reportType === 'profit') {
      const sales = dbAll('sales').filter(s => inRange(s.date));
      const expenses = dbAll('expenses').filter(e => inRange(e.date));
      const totalProfit = sales.reduce((a, s) => a + s.totalProfit, 0);
      const totalExpense = expenses.reduce((a, e) => a + e.amount, 0);
      return {
        title: 'Profit Report', from, to,
        columns: ['Invoice #', 'Date', 'Grand Total', 'Profit'],
        rows: sales.map(s => [s.invoiceNo, fmtDate(s.date), s.grandTotal, s.totalProfit]),
        summary: [
          ['Gross Profit (Sales)', fmtMoney(totalProfit)],
          ['Total Expenses', fmtMoney(totalExpense)],
          ['Net Profit', fmtMoney(totalProfit - totalExpense)]
        ]
      };
    }
    if (this.state.reportType === 'expense') {
      const expenses = dbAll('expenses').filter(e => inRange(e.date));
      return {
        title: 'Expense Report', from, to,
        columns: ['Date', 'Category', 'Description', 'Amount'],
        rows: expenses.map(e => [fmtDate(e.date), e.category, e.description || '-', e.amount]),
        summary: [['Total Expenses', fmtMoney(expenses.reduce((a, e) => a + e.amount, 0))]]
      };
    }
    if (this.state.reportType === 'stock') {
      const products = dbAll('products');
      return {
        title: 'Stock Report', from, to,
        columns: ['Product', 'Category', 'Stock', 'Unit', 'Purchase Price', 'Stock Value'],
        rows: products.map(p => [p.name, p.category || '-', p.stock, p.unit, p.purchasePrice, (p.stock || 0) * (p.purchasePrice || 0)]),
        summary: [
          ['Total Products', products.length],
          ['Total Stock Units', fmtNum(products.reduce((a, p) => a + p.stock, 0))],
          ['Total Stock Value', fmtMoney(products.reduce((a, p) => a + p.stock * p.purchasePrice, 0))]
        ]
      };
    }
    if (this.state.reportType === 'lowstock') {
      const low = Products.getLowStock();
      return {
        title: 'Low Stock Report', from, to,
        columns: ['Product', 'Category', 'Current Stock', 'Min Stock', 'Unit'],
        rows: low.map(p => [p.name, p.category || '-', p.stock, p.minStock ?? getSettings().lowStockThreshold, p.unit]),
        summary: [['Products Below Minimum', low.length]]
      };
    }
  },

  renderReport() {
    const out = document.getElementById('reportOutput');
    const data = this.getData();
    out.innerHTML = `
      <div class="report-header">
        <h3>${data.title}</h3>
        <p>${fmtDate(data.from)} — ${fmtDate(data.to)}</p>
      </div>
      <div class="report-summary">
        ${data.summary.map(([k, v]) => `<div class="report-summary__item"><span>${escapeHtml(k)}</span><strong>${v}</strong></div>`).join('')}
      </div>
      <table class="table">
        <thead><tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr></thead>
        <tbody>
          ${data.rows.length ? data.rows.map(r => `<tr>${r.map((c, i) => {
            const isMoney = data.columns[i] && /price|total|amount|value|discount|profit/i.test(data.columns[i]) && typeof c === 'number';
            return `<td class="${isMoney ? 'mono' : ''}">${isMoney ? fmtMoney(c) : escapeHtml(String(c))}</td>`;
          }).join('')}</tr>`).join('') : `<tr><td class="empty-state" colspan="${data.columns.length}"><i class="fa-solid fa-chart-simple"></i><p>No data for this period.</p></td></tr>`}
        </tbody>
      </table>
    `;
  },

  exportPDF() {
    if (typeof window.jspdf === 'undefined') { Toast.show('PDF library not available offline. Check your assets folder.', 'error'); return; }
    const data = this.getData();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const settings = getSettings();
    doc.setFontSize(16); doc.text(settings.shopName, 14, 16);
    doc.setFontSize(11); doc.text(`${data.title} (${fmtDate(data.from)} - ${fmtDate(data.to)})`, 14, 24);
    doc.autoTable({
      startY: 30,
      head: [data.columns],
      body: data.rows.map(r => r.map(String)),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [18, 35, 59] }
    });
    doc.save(`${data.title.replace(/\s+/g, '_')}_${todayISO()}.pdf`);
    Toast.show('Report exported as PDF', 'success');
  },

  exportExcel() {
    if (typeof XLSX === 'undefined') { Toast.show('Excel library not available offline. Check your assets folder.', 'error'); return; }
    const data = this.getData();
    const ws = XLSX.utils.aoa_to_sheet([data.columns, ...data.rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, data.title.slice(0, 30));
    XLSX.writeFile(wb, `${data.title.replace(/\s+/g, '_')}_${todayISO()}.xlsx`);
    Toast.show('Report exported as Excel', 'success');
  },

  exportJSON() {
    const data = this.getData();
    downloadTextFile(`${data.title.replace(/\s+/g, '_')}_${todayISO()}.json`, JSON.stringify(data, null, 2));
    Toast.show('Report exported as JSON', 'success');
  }
};
