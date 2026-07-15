/* ============================================================
   PAK VISION INVENTORY PRO — sales.js
   ============================================================ */

const Sales = {
  cart: [], // { productId, name, price, qty, stock, unit }
  selectedCustomer: '',
  discount: 0,
  discountType: 'flat', // flat | percent
  paymentMethod: 'Cash',

  render() {
    const view = document.getElementById('view');
    const all = dbAll('sales').slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    view.innerHTML = `
      <div class="page-header">
        <div><h2>Sales</h2><p class="page-sub">${all.length} invoices recorded</p></div>
        <div class="page-header__actions">
          <button class="btn btn--primary" id="btnNewSale"><i class="fa-solid fa-cash-register"></i> New Sale</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="search-box"><i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="saleSearch" placeholder="Search invoice # or customer...">
        </div>
      </div>
      <div class="table-wrap card">
        <table class="table" id="salesTable"></table>
      </div>
    `;
    document.getElementById('btnNewSale').onclick = () => this.openSaleForm();
    document.getElementById('saleSearch').oninput = debounce((e) => this.renderTable(e.target.value), 200);
    this.renderTable('');
  },

  renderTable(query = '') {
    const table = document.getElementById('salesTable');
    let all = dbAll('sales').slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const q = query.trim().toLowerCase();
    if (q) all = all.filter(s => s.invoiceNo.toLowerCase().includes(q) || (s.customerName || '').toLowerCase().includes(q));

    if (!all.length) {
      table.innerHTML = `<tbody><tr><td class="empty-state"><i class="fa-solid fa-receipt"></i><p>No sales yet. Click "New Sale" to create your first invoice.</p></td></tr></tbody>`;
      return;
    }

    table.innerHTML = `
      <thead><tr><th>Invoice #</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Profit</th><th>Payment</th><th>Actions</th></tr></thead>
      <tbody>
        ${all.map(s => `
          <tr data-id="${s.id}">
            <td class="mono">${escapeHtml(s.invoiceNo)}</td>
            <td>${fmtDateTime(s.date)}</td>
            <td>${escapeHtml(s.customerName || 'Walk-in Customer')}</td>
            <td>${s.items.length} item(s)</td>
            <td class="mono">${fmtMoney(s.grandTotal)}</td>
            <td class="mono profit-cell">${fmtMoney(s.totalProfit)}</td>
            <td><span class="badge">${escapeHtml(s.paymentMethod)}</span></td>
            <td class="row-actions">
              <button class="icon-btn" data-act="print" title="Reprint Invoice"><i class="fa-solid fa-print"></i></button>
              <button class="icon-btn icon-btn--danger" data-act="del" title="Delete / Restock"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`).join('')}
      </tbody>
    `;
    table.querySelectorAll('tr[data-id]').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="print"]').onclick = () => Invoice.printSale(id);
      row.querySelector('[data-act="del"]').onclick = () => this.deleteSale(id);
    });
  },

  async deleteSale(id) {
    const sale = dbFind('sales', id);
    if (!sale) return;
    const ok = await confirmDialog(`Delete invoice ${sale.invoiceNo}? Stock will be restored for all items.`, 'Delete Invoice');
    if (!ok) return;
    sale.items.forEach(it => {
      const p = dbFind('products', it.productId);
      if (p) {
        dbUpdate('products', p.id, { stock: (p.stock || 0) + it.qty });
        logStockChange(p.id, it.qty, 'Sale invoice deleted (restock)', sale.invoiceNo);
      }
    });
    dbDelete('sales', id);
    Toast.show('Invoice deleted and stock restored', 'success');
    this.renderTable();
    if (window.App) App.refreshBadges();
  },

  openSaleForm() {
    this.cart = [];
    this.selectedCustomer = '';
    this.discount = 0;
    this.discountType = 'flat';
    this.paymentMethod = 'Cash';

    const products = dbAll('products').filter(p => p.stock > 0);
    const customers = dbAll('customers');
    const invoiceNo = 'INV-' + String((dbGet('counters')?.invoice || 0) + 1).padStart(5, '0');

    const body = `
      <div class="sale-form">
        <div class="sale-form__top">
          <div class="form-row">
            <label>Customer</label>
            <div class="inline-add">
              <select id="s_customer">
                <option value="">Walk-in Customer</option>
                ${customers.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.mobile || '')})</option>`).join('')}
              </select>
              <button type="button" class="btn btn--ghost btn--sm" id="btnQuickCustomer"><i class="fa-solid fa-plus"></i></button>
            </div>
          </div>
          <div class="form-row">
            <label>Payment Method</label>
            <select id="s_payment">
              <option>Cash</option><option>Bank Transfer</option><option>Credit / Udhaar</option><option>Card</option><option>Easypaisa/JazzCash</option>
            </select>
          </div>
          <div class="form-row"><label>Invoice #</label><input value="${invoiceNo}" disabled class="mono"></div>
        </div>

        <div class="form-row">
          <label>Add Product</label>
          <select id="s_productPicker">
            <option value="">-- Select a product to add --</option>
            ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} — Stock: ${p.stock} — ${fmtMoney(p.retailPrice)}</option>`).join('')}
          </select>
        </div>

        <div class="table-wrap" style="margin-top:10px;">
          <table class="table table--compact" id="cartTable">
            <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
            <tbody id="cartBody"><tr><td class="empty-state-sm">Cart is empty — add products above.</td></tr></tbody>
          </table>
        </div>

        <div class="sale-form__totals">
          <div class="form-row">
            <label>Discount</label>
            <div class="discount-input">
              <input type="number" min="0" id="s_discount" value="0">
              <select id="s_discountType"><option value="flat">${getSettings().currencySymbol}</option><option value="percent">%</option></select>
            </div>
          </div>
          <div class="totals-box">
            <div class="totals-row"><span>Subtotal</span><strong id="t_subtotal">${fmtMoney(0)}</strong></div>
            <div class="totals-row"><span>Discount</span><strong id="t_discount">${fmtMoney(0)}</strong></div>
            <div class="totals-row totals-row--grand"><span>Grand Total</span><strong id="t_grand">${fmtMoney(0)}</strong></div>
            <div class="totals-row totals-row--profit"><span>Est. Profit</span><strong id="t_profit">${fmtMoney(0)}</strong></div>
          </div>
        </div>

        <div class="modal__footer" style="padding:0;border:0;margin-top:8px;">
          <button type="button" class="btn btn--ghost" id="btnCancelSale">Cancel</button>
          <button type="button" class="btn btn--primary" id="btnSaveSale"><i class="fa-solid fa-floppy-disk"></i> Save Invoice</button>
          <button type="button" class="btn btn--accent" id="btnSaveSalePrint"><i class="fa-solid fa-print"></i> Save & Print</button>
        </div>
      </div>
    `;

    openModal(`<i class="fa-solid fa-cash-register"></i> New Sale`, body, {
      size: 'xl',
      onMount: (overlay) => {
        const recalc = () => this.recalcTotals(overlay);

        overlay.querySelector('#s_productPicker').onchange = (e) => {
          const pid = e.target.value;
          if (!pid) return;
          this.addToCart(pid);
          e.target.value = '';
          this.renderCart(overlay);
          recalc();
        };
        overlay.querySelector('#s_discount').oninput = (e) => { this.discount = parseFloat(e.target.value) || 0; recalc(); };
        overlay.querySelector('#s_discountType').onchange = (e) => { this.discountType = e.target.value; recalc(); };
        overlay.querySelector('#s_customer').onchange = (e) => { this.selectedCustomer = e.target.value; };
        overlay.querySelector('#s_payment').onchange = (e) => { this.paymentMethod = e.target.value; };
        overlay.querySelector('#btnCancelSale').onclick = closeModal;
        overlay.querySelector('#btnQuickCustomer').onclick = () => Customers.openQuickAdd((newC) => {
          const sel = overlay.querySelector('#s_customer');
          const opt = document.createElement('option');
          opt.value = newC.id; opt.textContent = `${newC.name} (${newC.mobile || ''})`;
          sel.appendChild(opt); sel.value = newC.id; this.selectedCustomer = newC.id;
        });
        overlay.querySelector('#btnSaveSale').onclick = () => this.saveSale(overlay, false);
        overlay.querySelector('#btnSaveSalePrint').onclick = () => this.saveSale(overlay, true);
      }
    });
  },

  addToCart(productId) {
    const p = dbFind('products', productId);
    if (!p) return;
    const existing = this.cart.find(c => c.productId === productId);
    if (existing) {
      if (existing.qty < p.stock) existing.qty++;
      else Toast.show('No more stock available for this product', 'warning');
    } else {
      this.cart.push({ productId: p.id, name: p.name, price: p.retailPrice, purchasePrice: p.purchasePrice, qty: 1, stock: p.stock, unit: p.unit });
    }
  },

  renderCart(overlay) {
    const body = overlay.querySelector('#cartBody');
    if (!this.cart.length) {
      body.innerHTML = `<tr><td class="empty-state-sm">Cart is empty — add products above.</td></tr>`;
      return;
    }
    body.innerHTML = this.cart.map((c, idx) => `
      <tr>
        <td>${escapeHtml(c.name)}</td>
        <td class="mono"><input type="number" min="0" step="0.01" class="cart-price" data-idx="${idx}" value="${c.price}" style="width:90px;"></td>
        <td><input type="number" min="1" max="${c.stock}" class="cart-qty" data-idx="${idx}" value="${c.qty}" style="width:70px;"></td>
        <td class="mono">${fmtMoney(c.price * c.qty)}</td>
        <td><button class="icon-btn icon-btn--danger cart-remove" data-idx="${idx}"><i class="fa-solid fa-xmark"></i></button></td>
      </tr>
    `).join('');

    body.querySelectorAll('.cart-qty').forEach(inp => {
      inp.onchange = (e) => {
        const idx = +e.target.dataset.idx;
        let val = parseInt(e.target.value) || 1;
        if (val > this.cart[idx].stock) { val = this.cart[idx].stock; Toast.show('Quantity capped at available stock', 'warning'); }
        if (val < 1) val = 1;
        this.cart[idx].qty = val;
        this.renderCart(overlay);
        this.recalcTotals(overlay);
      };
    });
    body.querySelectorAll('.cart-price').forEach(inp => {
      inp.onchange = (e) => {
        const idx = +e.target.dataset.idx;
        this.cart[idx].price = parseFloat(e.target.value) || 0;
        this.renderCart(overlay);
        this.recalcTotals(overlay);
      };
    });
    body.querySelectorAll('.cart-remove').forEach(btn => {
      btn.onclick = (e) => {
        const idx = +e.currentTarget.dataset.idx;
        this.cart.splice(idx, 1);
        this.renderCart(overlay);
        this.recalcTotals(overlay);
      };
    });
  },

  computeTotals() {
    const subtotal = this.cart.reduce((sum, c) => sum + c.price * c.qty, 0);
    const discountAmt = this.discountType === 'percent' ? subtotal * (this.discount / 100) : this.discount;
    const grandTotal = Math.max(0, subtotal - discountAmt);
    const totalCost = this.cart.reduce((sum, c) => sum + (c.purchasePrice || 0) * c.qty, 0);
    const totalProfit = grandTotal - totalCost;
    return { subtotal, discountAmt, grandTotal, totalProfit };
  },

  recalcTotals(overlay) {
    const { subtotal, discountAmt, grandTotal, totalProfit } = this.computeTotals();
    overlay.querySelector('#t_subtotal').textContent = fmtMoney(subtotal);
    overlay.querySelector('#t_discount').textContent = fmtMoney(discountAmt);
    overlay.querySelector('#t_grand').textContent = fmtMoney(grandTotal);
    overlay.querySelector('#t_profit').textContent = fmtMoney(totalProfit);
  },

  saveSale(overlay, andPrint) {
    if (!this.cart.length) { Toast.show('Add at least one product to the cart', 'error'); return; }
    for (const c of this.cart) {
      if (c.qty > c.stock) { Toast.show(`${c.name}: quantity exceeds available stock`, 'error'); return; }
    }
    const { subtotal, discountAmt, grandTotal, totalProfit } = this.computeTotals();
    const customer = this.selectedCustomer ? dbFind('customers', this.selectedCustomer) : null;

    const sale = {
      id: uid('SAL'),
      invoiceNo: nextId('invoice', 'INV', 5),
      date: new Date().toISOString(),
      customerId: this.selectedCustomer || null,
      customerName: customer ? customer.name : 'Walk-in Customer',
      items: this.cart.map(c => ({ productId: c.productId, name: c.name, price: c.price, qty: c.qty, purchasePrice: c.purchasePrice, unit: c.unit })),
      subtotal, discount: discountAmt, grandTotal, totalProfit,
      paymentMethod: this.paymentMethod
    };
    dbInsert('sales', sale);

    // Deduct stock
    this.cart.forEach(c => {
      const p = dbFind('products', c.productId);
      if (p) {
        dbUpdate('products', p.id, { stock: Math.max(0, (p.stock || 0) - c.qty) });
        logStockChange(p.id, -c.qty, 'Sale', sale.invoiceNo);
      }
    });

    // Update customer stats
    if (customer) {
      dbUpdate('customers', customer.id, {
        totalOrders: (customer.totalOrders || 0) + 1,
        totalSpent: (customer.totalSpent || 0) + grandTotal,
        balance: this.paymentMethod === 'Credit / Udhaar' ? (customer.balance || 0) + grandTotal : (customer.balance || 0)
      });
    }

    Toast.show(`Invoice ${sale.invoiceNo} saved successfully`, 'success');
    closeModal();
    this.renderTable();
    if (window.App) App.refreshBadges();
    if (andPrint) Invoice.printSale(sale.id);
  }
};
