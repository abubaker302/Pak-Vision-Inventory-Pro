/* ============================================================
   PAK VISION INVENTORY PRO — purchases.js
   ============================================================ */

const Purchases = {
  cart: [], // { productId, name, cost, qty, unit }
  selectedSupplier: '',

  render() {
    const view = document.getElementById('view');
    const all = dbAll('purchases').slice().sort((a, b) => new Date(b.date) - new Date(a.date));

    view.innerHTML = `
      <div class="page-header">
        <div><h2>Purchases</h2><p class="page-sub">${all.length} purchase invoices recorded</p></div>
        <div class="page-header__actions">
          <button class="btn btn--primary" id="btnNewPurchase"><i class="fa-solid fa-truck-ramp-box"></i> New Purchase</button>
        </div>
      </div>
      <div class="table-wrap card">
        <table class="table" id="purchasesTable"></table>
      </div>
    `;
    document.getElementById('btnNewPurchase').onclick = () => this.openForm();
    this.renderTable();
  },

  renderTable() {
    const table = document.getElementById('purchasesTable');
    const all = dbAll('purchases').slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!all.length) {
      table.innerHTML = `<tbody><tr><td class="empty-state"><i class="fa-solid fa-truck"></i><p>No purchases recorded yet.</p></td></tr></tbody>`;
      return;
    }
    table.innerHTML = `
      <thead><tr><th>Purchase #</th><th>Date</th><th>Supplier</th><th>Items</th><th>Total Cost</th><th>Actions</th></tr></thead>
      <tbody>
        ${all.map(p => `
          <tr data-id="${p.id}">
            <td class="mono">${escapeHtml(p.purchaseNo)}</td>
            <td>${fmtDate(p.date)}</td>
            <td>${escapeHtml(p.supplierName || '-')}</td>
            <td>${p.items.length} item(s)</td>
            <td class="mono">${fmtMoney(p.totalCost)}</td>
            <td class="row-actions">
              <button class="icon-btn icon-btn--danger" data-act="del" title="Delete / Reverse Stock"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`).join('')}
      </tbody>
    `;
    table.querySelectorAll('tr[data-id]').forEach(row => {
      row.querySelector('[data-act="del"]').onclick = () => this.deletePurchase(row.dataset.id);
    });
  },

  async deletePurchase(id) {
    const purchase = dbFind('purchases', id);
    if (!purchase) return;
    const ok = await confirmDialog(`Delete purchase ${purchase.purchaseNo}? Stock added by this purchase will be reversed.`, 'Delete Purchase');
    if (!ok) return;
    purchase.items.forEach(it => {
      const p = dbFind('products', it.productId);
      if (p) {
        dbUpdate('products', p.id, { stock: Math.max(0, (p.stock || 0) - it.qty) });
        logStockChange(p.id, -it.qty, 'Purchase invoice deleted (reverse)', purchase.purchaseNo);
      }
    });
    dbDelete('purchases', id);
    Toast.show('Purchase deleted and stock reversed', 'success');
    this.renderTable();
    if (window.App) App.refreshBadges();
  },

  openForm() {
    this.cart = [];
    this.selectedSupplier = '';
    const products = dbAll('products');
    const suppliers = dbAll('suppliers');
    const purchaseNo = 'PUR-' + String((dbGet('counters')?.purchase || 0) + 1).padStart(5, '0');

    const body = `
      <div class="sale-form">
        <div class="sale-form__top">
          <div class="form-row">
            <label>Supplier</label>
            <div class="inline-add">
              <select id="p_supplier">
                <option value="">-- Select Supplier --</option>
                ${suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
              </select>
              <button type="button" class="btn btn--ghost btn--sm" id="btnQuickSupplier"><i class="fa-solid fa-plus"></i></button>
            </div>
          </div>
          <div class="form-row"><label>Purchase Date</label><input type="date" id="p_date" value="${todayISO()}"></div>
          <div class="form-row"><label>Purchase #</label><input value="${purchaseNo}" disabled class="mono"></div>
        </div>

        <div class="form-row">
          <label>Add Product</label>
          <select id="p_productPicker">
            <option value="">-- Select existing product --</option>
            ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} (current stock: ${p.stock})</option>`).join('')}
          </select>
          <small class="hint">New seasonal item? Add it first in the Products page, then purchase stock here.</small>
        </div>

        <div class="table-wrap" style="margin-top:10px;">
          <table class="table table--compact" id="pCartTable">
            <thead><tr><th>Product</th><th>Cost/Unit</th><th>Qty</th><th>Subtotal</th><th></th></tr></thead>
            <tbody id="pCartBody"><tr><td class="empty-state-sm">No items added yet.</td></tr></tbody>
          </table>
        </div>

        <div class="sale-form__totals" style="justify-content:flex-end;">
          <div class="totals-box">
            <div class="totals-row totals-row--grand"><span>Total Cost</span><strong id="p_total">${fmtMoney(0)}</strong></div>
          </div>
        </div>

        <div class="modal__footer" style="padding:0;border:0;margin-top:8px;">
          <button type="button" class="btn btn--ghost" id="btnCancelPurchase">Cancel</button>
          <button type="button" class="btn btn--primary" id="btnSavePurchase"><i class="fa-solid fa-floppy-disk"></i> Save Purchase</button>
        </div>
      </div>
    `;

    openModal(`<i class="fa-solid fa-truck-ramp-box"></i> New Purchase`, body, {
      size: 'xl',
      onMount: (overlay) => {
        overlay.querySelector('#p_supplier').onchange = (e) => this.selectedSupplier = e.target.value;
        overlay.querySelector('#btnQuickSupplier').onclick = () => Suppliers.openQuickAdd((newS) => {
          const sel = overlay.querySelector('#p_supplier');
          const opt = document.createElement('option');
          opt.value = newS.id; opt.textContent = newS.name;
          sel.appendChild(opt); sel.value = newS.id; this.selectedSupplier = newS.id;
        });
        overlay.querySelector('#p_productPicker').onchange = (e) => {
          const pid = e.target.value;
          if (!pid) return;
          const p = dbFind('products', pid);
          if (this.cart.find(c => c.productId === pid)) { Toast.show('Product already in list — adjust quantity there.', 'info'); }
          else this.cart.push({ productId: p.id, name: p.name, cost: p.purchasePrice, qty: 1, unit: p.unit });
          e.target.value = '';
          this.renderCart(overlay);
        };
        overlay.querySelector('#btnCancelPurchase').onclick = closeModal;
        overlay.querySelector('#btnSavePurchase').onclick = () => this.savePurchase(overlay);
      }
    });
  },

  renderCart(overlay) {
    const body = overlay.querySelector('#pCartBody');
    if (!this.cart.length) {
      body.innerHTML = `<tr><td class="empty-state-sm">No items added yet.</td></tr>`;
    } else {
      body.innerHTML = this.cart.map((c, idx) => `
        <tr>
          <td>${escapeHtml(c.name)}</td>
          <td><input type="number" min="0" step="0.01" class="pc-cost" data-idx="${idx}" value="${c.cost}" style="width:90px;"></td>
          <td><input type="number" min="1" class="pc-qty" data-idx="${idx}" value="${c.qty}" style="width:70px;"></td>
          <td class="mono">${fmtMoney(c.cost * c.qty)}</td>
          <td><button class="icon-btn icon-btn--danger pc-remove" data-idx="${idx}"><i class="fa-solid fa-xmark"></i></button></td>
        </tr>
      `).join('');
      body.querySelectorAll('.pc-qty').forEach(inp => inp.onchange = (e) => {
        this.cart[+e.target.dataset.idx].qty = parseInt(e.target.value) || 1;
        this.renderCart(overlay);
      });
      body.querySelectorAll('.pc-cost').forEach(inp => inp.onchange = (e) => {
        this.cart[+e.target.dataset.idx].cost = parseFloat(e.target.value) || 0;
        this.renderCart(overlay);
      });
      body.querySelectorAll('.pc-remove').forEach(btn => btn.onclick = (e) => {
        this.cart.splice(+e.currentTarget.dataset.idx, 1);
        this.renderCart(overlay);
      });
    }
    const total = this.cart.reduce((s, c) => s + c.cost * c.qty, 0);
    overlay.querySelector('#p_total').textContent = fmtMoney(total);
  },

  savePurchase(overlay) {
    if (!this.cart.length) { Toast.show('Add at least one product', 'error'); return; }
    const supplier = this.selectedSupplier ? dbFind('suppliers', this.selectedSupplier) : null;
    const totalCost = this.cart.reduce((s, c) => s + c.cost * c.qty, 0);

    const purchase = {
      id: uid('PUR'),
      purchaseNo: nextId('purchase', 'PUR', 5),
      date: overlay.querySelector('#p_date').value || todayISO(),
      supplierId: this.selectedSupplier || null,
      supplierName: supplier ? supplier.name : 'Unknown Supplier',
      items: this.cart.map(c => ({ productId: c.productId, name: c.name, cost: c.cost, qty: c.qty, unit: c.unit })),
      totalCost
    };
    dbInsert('purchases', purchase);

    this.cart.forEach(c => {
      const p = dbFind('products', c.productId);
      if (p) {
        dbUpdate('products', p.id, { stock: (p.stock || 0) + c.qty, purchasePrice: c.cost });
        logStockChange(p.id, c.qty, 'Purchase', purchase.purchaseNo);
      }
    });

    if (supplier) {
      dbUpdate('suppliers', supplier.id, { totalPurchases: (supplier.totalPurchases || 0) + totalCost });
    }

    Toast.show(`Purchase ${purchase.purchaseNo} saved. Stock updated.`, 'success');
    closeModal();
    this.renderTable();
    if (window.App) App.refreshBadges();
  }
};
