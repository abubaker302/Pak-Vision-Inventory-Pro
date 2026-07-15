/* ============================================================
   PAK VISION INVENTORY PRO — customers.js
   ============================================================ */

const Customers = {
  render() {
    const view = document.getElementById('view');
    const all = dbAll('customers');
    view.innerHTML = `
      <div class="page-header">
        <div><h2>Customers</h2><p class="page-sub">${all.length} customers</p></div>
        <div class="page-header__actions">
          <button class="btn btn--primary" id="btnAddCustomer"><i class="fa-solid fa-user-plus"></i> Add Customer</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="search-box"><i class="fa-solid fa-magnifying-glass"></i><input type="text" id="custSearch" placeholder="Search by name or mobile..."></div>
      </div>
      <div class="table-wrap card"><table class="table" id="customersTable"></table></div>
    `;
    document.getElementById('btnAddCustomer').onclick = () => this.openForm();
    document.getElementById('custSearch').oninput = debounce((e) => this.renderTable(e.target.value), 200);
    this.renderTable('');
  },

  renderTable(query = '') {
    const table = document.getElementById('customersTable');
    let all = dbAll('customers');
    const q = query.trim().toLowerCase();
    if (q) all = all.filter(c => c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q));

    if (!all.length) {
      table.innerHTML = `<tbody><tr><td class="empty-state"><i class="fa-solid fa-users"></i><p>No customers yet.</p></td></tr></tbody>`;
      return;
    }
    table.innerHTML = `
      <thead><tr><th>Name</th><th>Mobile</th><th>Address</th><th>Total Orders</th><th>Total Spent</th><th>Balance (Udhaar)</th><th>Actions</th></tr></thead>
      <tbody>
        ${all.map(c => `
          <tr data-id="${c.id}">
            <td class="cell-title">${escapeHtml(c.name)}</td>
            <td class="mono">${escapeHtml(c.mobile || '-')}</td>
            <td>${escapeHtml(c.address || '-')}</td>
            <td>${fmtNum(c.totalOrders || 0)}</td>
            <td class="mono">${fmtMoney(c.totalSpent || 0)}</td>
            <td class="mono ${c.balance > 0 ? 'balance-due' : ''}">${fmtMoney(c.balance || 0)}</td>
            <td class="row-actions">
              <button class="icon-btn" data-act="history" title="Purchase History"><i class="fa-solid fa-clock-rotate-left"></i></button>
              <button class="icon-btn" data-act="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="icon-btn icon-btn--danger" data-act="del" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`).join('')}
      </tbody>
    `;
    table.querySelectorAll('tr[data-id]').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="edit"]').onclick = () => this.openForm(id);
      row.querySelector('[data-act="del"]').onclick = () => this.remove(id);
      row.querySelector('[data-act="history"]').onclick = () => this.showHistory(id);
    });
  },

  showHistory(id) {
    const customer = dbFind('customers', id);
    const sales = dbAll('sales').filter(s => s.customerId === id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const body = `
      <div class="table-wrap">
        <table class="table table--compact">
          <thead><tr><th>Invoice #</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th></tr></thead>
          <tbody>
            ${sales.length ? sales.map(s => `
              <tr><td class="mono">${escapeHtml(s.invoiceNo)}</td><td>${fmtDate(s.date)}</td><td>${s.items.length}</td><td class="mono">${fmtMoney(s.grandTotal)}</td><td>${escapeHtml(s.paymentMethod)}</td></tr>
            `).join('') : `<tr><td class="empty-state-sm">No purchase history yet.</td></tr>`}
          </tbody>
        </table>
      </div>`;
    openModal(`<i class="fa-solid fa-clock-rotate-left"></i> ${escapeHtml(customer.name)} — History`, body, { size: 'large' });
  },

  openForm(id = null) {
    const customer = id ? dbFind('customers', id) : null;
    const isEdit = !!customer;
    const body = `
      <form id="custForm" class="form-grid">
        <div class="form-row"><label>Name *</label><input required id="c_name" value="${escapeHtml(customer?.name || '')}"></div>
        <div class="form-row"><label>Mobile</label><input id="c_mobile" value="${escapeHtml(customer?.mobile || '')}"></div>
        <div class="form-row form-row--full"><label>Address</label><input id="c_address" value="${escapeHtml(customer?.address || '')}"></div>
        <div class="form-row"><label>Opening Balance (Udhaar)</label><input type="number" id="c_balance" value="${customer?.balance ?? 0}"></div>
        <div class="form-row form-row--full modal__footer" style="padding:0;border:0;margin-top:8px;">
          <button type="button" class="btn btn--ghost" id="btnCancelCust">Cancel</button>
          <button type="submit" class="btn btn--primary">${isEdit ? 'Save Changes' : 'Add Customer'}</button>
        </div>
      </form>`;
    openModal(`<i class="fa-solid fa-user"></i> ${isEdit ? 'Edit Customer' : 'Add Customer'}`, body, {
      onMount: (overlay) => {
        overlay.querySelector('#btnCancelCust').onclick = closeModal;
        overlay.querySelector('#custForm').onsubmit = (e) => {
          e.preventDefault();
          const name = overlay.querySelector('#c_name').value.trim();
          if (!name) { Toast.show('Customer name is required', 'error'); return; }
          const data = {
            name, mobile: overlay.querySelector('#c_mobile').value.trim(),
            address: overlay.querySelector('#c_address').value.trim(),
            balance: parseFloat(overlay.querySelector('#c_balance').value) || 0
          };
          if (isEdit) { dbUpdate('customers', customer.id, data); Toast.show('Customer updated', 'success'); }
          else {
            data.id = uid('CUS'); data.totalOrders = 0; data.totalSpent = 0; data.dateAdded = new Date().toISOString();
            dbInsert('customers', data);
            Toast.show('Customer added', 'success');
          }
          closeModal(); this.render();
        };
      }
    });
  },

  openQuickAdd(callback) {
    const body = `
      <form id="quickCustForm" class="form-grid">
        <div class="form-row"><label>Name *</label><input required id="qc_name"></div>
        <div class="form-row"><label>Mobile</label><input id="qc_mobile"></div>
        <div class="form-row form-row--full modal__footer" style="padding:0;border:0;margin-top:8px;">
          <button type="button" class="btn btn--ghost" id="btnCancelQC">Cancel</button>
          <button type="submit" class="btn btn--primary">Add</button>
        </div>
      </form>`;
    openModal(`<i class="fa-solid fa-user-plus"></i> Quick Add Customer`, body, {
      onMount: (overlay) => {
        overlay.querySelector('#btnCancelQC').onclick = closeModal;
        overlay.querySelector('#quickCustForm').onsubmit = (e) => {
          e.preventDefault();
          const name = overlay.querySelector('#qc_name').value.trim();
          if (!name) { Toast.show('Name is required', 'error'); return; }
          const newC = { id: uid('CUS'), name, mobile: overlay.querySelector('#qc_mobile').value.trim(), address: '', balance: 0, totalOrders: 0, totalSpent: 0, dateAdded: new Date().toISOString() };
          dbInsert('customers', newC);
          Toast.show('Customer added', 'success');
          closeModal();
          callback(newC);
        };
      }
    });
  },

  async remove(id) {
    const ok = await confirmDialog('Delete this customer? Their past invoices will remain but will show as unassigned.', 'Delete Customer');
    if (!ok) return;
    dbDelete('customers', id);
    Toast.show('Customer deleted', 'success');
    this.renderTable();
  }
};
