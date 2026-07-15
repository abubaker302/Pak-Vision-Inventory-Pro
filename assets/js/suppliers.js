/* ============================================================
   PAK VISION INVENTORY PRO — suppliers.js
   ============================================================ */

const Suppliers = {
  render() {
    const view = document.getElementById('view');
    const all = dbAll('suppliers');
    view.innerHTML = `
      <div class="page-header">
        <div><h2>Suppliers</h2><p class="page-sub">${all.length} suppliers</p></div>
        <div class="page-header__actions"><button class="btn btn--primary" id="btnAddSupplier"><i class="fa-solid fa-truck-fast"></i> Add Supplier</button></div>
      </div>
      <div class="table-wrap card"><table class="table" id="suppliersTable"></table></div>
    `;
    document.getElementById('btnAddSupplier').onclick = () => this.openForm();
    this.renderTable();
  },

  renderTable() {
    const table = document.getElementById('suppliersTable');
    const all = dbAll('suppliers');
    if (!all.length) {
      table.innerHTML = `<tbody><tr><td class="empty-state"><i class="fa-solid fa-truck"></i><p>No suppliers yet.</p></td></tr></tbody>`;
      return;
    }
    table.innerHTML = `
      <thead><tr><th>Name</th><th>Phone</th><th>Address</th><th>Total Purchases</th><th>Actions</th></tr></thead>
      <tbody>
        ${all.map(s => `
          <tr data-id="${s.id}">
            <td class="cell-title">${escapeHtml(s.name)}</td>
            <td class="mono">${escapeHtml(s.phone || '-')}</td>
            <td>${escapeHtml(s.address || '-')}</td>
            <td class="mono">${fmtMoney(s.totalPurchases || 0)}</td>
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
    const supplier = dbFind('suppliers', id);
    const purchases = dbAll('purchases').filter(p => p.supplierId === id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const body = `
      <div class="table-wrap">
        <table class="table table--compact">
          <thead><tr><th>Purchase #</th><th>Date</th><th>Items</th><th>Total Cost</th></tr></thead>
          <tbody>
            ${purchases.length ? purchases.map(p => `
              <tr><td class="mono">${escapeHtml(p.purchaseNo)}</td><td>${fmtDate(p.date)}</td><td>${p.items.length}</td><td class="mono">${fmtMoney(p.totalCost)}</td></tr>
            `).join('') : `<tr><td class="empty-state-sm">No purchase history yet.</td></tr>`}
          </tbody>
        </table>
      </div>`;
    openModal(`<i class="fa-solid fa-clock-rotate-left"></i> ${escapeHtml(supplier.name)} — History`, body, { size: 'large' });
  },

  openForm(id = null) {
    const supplier = id ? dbFind('suppliers', id) : null;
    const isEdit = !!supplier;
    const body = `
      <form id="supForm" class="form-grid">
        <div class="form-row"><label>Supplier Name *</label><input required id="s_name" value="${escapeHtml(supplier?.name || '')}"></div>
        <div class="form-row"><label>Phone</label><input id="s_phone" value="${escapeHtml(supplier?.phone || '')}"></div>
        <div class="form-row form-row--full"><label>Address</label><input id="s_address" value="${escapeHtml(supplier?.address || '')}"></div>
        <div class="form-row form-row--full modal__footer" style="padding:0;border:0;margin-top:8px;">
          <button type="button" class="btn btn--ghost" id="btnCancelSup">Cancel</button>
          <button type="submit" class="btn btn--primary">${isEdit ? 'Save Changes' : 'Add Supplier'}</button>
        </div>
      </form>`;
    openModal(`<i class="fa-solid fa-truck-fast"></i> ${isEdit ? 'Edit Supplier' : 'Add Supplier'}`, body, {
      onMount: (overlay) => {
        overlay.querySelector('#btnCancelSup').onclick = closeModal;
        overlay.querySelector('#supForm').onsubmit = (e) => {
          e.preventDefault();
          const name = overlay.querySelector('#s_name').value.trim();
          if (!name) { Toast.show('Supplier name is required', 'error'); return; }
          const data = { name, phone: overlay.querySelector('#s_phone').value.trim(), address: overlay.querySelector('#s_address').value.trim() };
          if (isEdit) { dbUpdate('suppliers', supplier.id, data); Toast.show('Supplier updated', 'success'); }
          else {
            data.id = uid('SUP'); data.totalPurchases = 0; data.dateAdded = new Date().toISOString();
            dbInsert('suppliers', data);
            Toast.show('Supplier added', 'success');
          }
          closeModal(); this.render();
        };
      }
    });
  },

  openQuickAdd(callback) {
    const body = `
      <form id="quickSupForm" class="form-grid">
        <div class="form-row"><label>Supplier Name *</label><input required id="qs_name"></div>
        <div class="form-row"><label>Phone</label><input id="qs_phone"></div>
        <div class="form-row form-row--full modal__footer" style="padding:0;border:0;margin-top:8px;">
          <button type="button" class="btn btn--ghost" id="btnCancelQS">Cancel</button>
          <button type="submit" class="btn btn--primary">Add</button>
        </div>
      </form>`;
    openModal(`<i class="fa-solid fa-truck-fast"></i> Quick Add Supplier`, body, {
      onMount: (overlay) => {
        overlay.querySelector('#btnCancelQS').onclick = closeModal;
        overlay.querySelector('#quickSupForm').onsubmit = (e) => {
          e.preventDefault();
          const name = overlay.querySelector('#qs_name').value.trim();
          if (!name) { Toast.show('Name is required', 'error'); return; }
          const newS = { id: uid('SUP'), name, phone: overlay.querySelector('#qs_phone').value.trim(), address: '', totalPurchases: 0, dateAdded: new Date().toISOString() };
          dbInsert('suppliers', newS);
          Toast.show('Supplier added', 'success');
          closeModal();
          callback(newS);
        };
      }
    });
  },

  async remove(id) {
    const ok = await confirmDialog('Delete this supplier? Their past purchase records will remain.', 'Delete Supplier');
    if (!ok) return;
    dbDelete('suppliers', id);
    Toast.show('Supplier deleted', 'success');
    this.renderTable();
  }
};
