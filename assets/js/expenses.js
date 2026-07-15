/* ============================================================
   PAK VISION INVENTORY PRO — expenses.js
   ============================================================ */

const Expenses = {
  categories: ['Transport', 'Labour', 'Rent', 'Food', 'Utilities', 'Packaging', 'Miscellaneous'],

  render() {
    const view = document.getElementById('view');
    const all = dbAll('expenses').slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    const total = all.reduce((s, e) => s + (e.amount || 0), 0);
    const monthTotal = all.filter(e => e.date.slice(0, 7) === todayISO().slice(0, 7)).reduce((s, e) => s + e.amount, 0);

    view.innerHTML = `
      <div class="page-header">
        <div><h2>Expenses</h2><p class="page-sub">${all.length} records &middot; This month: ${fmtMoney(monthTotal)}</p></div>
        <div class="page-header__actions"><button class="btn btn--primary" id="btnAddExpense"><i class="fa-solid fa-money-bill-wave"></i> Add Expense</button></div>
      </div>
      <div class="stat-strip">
        <div class="stat-chip"><span>Total Expenses (all time)</span><strong>${fmtMoney(total)}</strong></div>
        <div class="stat-chip"><span>This Month</span><strong>${fmtMoney(monthTotal)}</strong></div>
      </div>
      <div class="table-wrap card"><table class="table" id="expensesTable"></table></div>
    `;
    document.getElementById('btnAddExpense').onclick = () => this.openForm();
    this.renderTable();
  },

  renderTable() {
    const table = document.getElementById('expensesTable');
    const all = dbAll('expenses').slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (!all.length) {
      table.innerHTML = `<tbody><tr><td class="empty-state"><i class="fa-solid fa-receipt"></i><p>No expenses recorded yet.</p></td></tr></tbody>`;
      return;
    }
    table.innerHTML = `
      <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th><th>Actions</th></tr></thead>
      <tbody>
        ${all.map(e => `
          <tr data-id="${e.id}">
            <td>${fmtDate(e.date)}</td>
            <td><span class="badge">${escapeHtml(e.category)}</span></td>
            <td>${escapeHtml(e.description || '-')}</td>
            <td class="mono">${fmtMoney(e.amount)}</td>
            <td class="row-actions">
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
    });
  },

  openForm(id = null) {
    const expense = id ? dbFind('expenses', id) : null;
    const isEdit = !!expense;
    const body = `
      <form id="expForm" class="form-grid">
        <div class="form-row"><label>Category *</label>
          <select id="e_category">${this.categories.map(c => `<option ${expense?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
        </div>
        <div class="form-row"><label>Amount *</label><input required type="number" min="0" step="0.01" id="e_amount" value="${expense?.amount ?? ''}"></div>
        <div class="form-row"><label>Date *</label><input required type="date" id="e_date" value="${expense?.date?.slice(0,10) || todayISO()}"></div>
        <div class="form-row form-row--full"><label>Description</label><input id="e_desc" value="${escapeHtml(expense?.description || '')}"></div>
        <div class="form-row form-row--full modal__footer" style="padding:0;border:0;margin-top:8px;">
          <button type="button" class="btn btn--ghost" id="btnCancelExp">Cancel</button>
          <button type="submit" class="btn btn--primary">${isEdit ? 'Save Changes' : 'Add Expense'}</button>
        </div>
      </form>`;
    openModal(`<i class="fa-solid fa-money-bill-wave"></i> ${isEdit ? 'Edit Expense' : 'Add Expense'}`, body, {
      onMount: (overlay) => {
        overlay.querySelector('#btnCancelExp').onclick = closeModal;
        overlay.querySelector('#expForm').onsubmit = (e) => {
          e.preventDefault();
          const amount = parseFloat(overlay.querySelector('#e_amount').value);
          if (!amount || amount <= 0) { Toast.show('Enter a valid amount', 'error'); return; }
          const data = {
            category: overlay.querySelector('#e_category').value,
            amount, date: overlay.querySelector('#e_date').value,
            description: overlay.querySelector('#e_desc').value.trim()
          };
          if (isEdit) { dbUpdate('expenses', expense.id, data); Toast.show('Expense updated', 'success'); }
          else { data.id = uid('EXP'); dbInsert('expenses', data); Toast.show('Expense added', 'success'); }
          closeModal(); this.render();
        };
      }
    });
  },

  async remove(id) {
    const ok = await confirmDialog('Delete this expense record?', 'Delete Expense');
    if (!ok) return;
    dbDelete('expenses', id);
    Toast.show('Expense deleted', 'success');
    this.renderTable();
  }
};
