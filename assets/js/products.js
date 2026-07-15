/* ============================================================
   PAK VISION INVENTORY PRO — products.js
   ============================================================ */

const Products = {
  state: { search: '', category: '', sortBy: 'name-asc' },

  render() {
    const view = document.getElementById('view');
    const all = dbAll('products');
    const categories = [...new Set(all.map(p => p.category).filter(Boolean))].sort();

    view.innerHTML = `
      <div class="page-header">
        <div>
          <h2>Products</h2>
          <p class="page-sub">${all.length} products in catalog</p>
        </div>
        <div class="page-header__actions">
          <button class="btn btn--ghost" id="btnExportProducts"><i class="fa-solid fa-file-export"></i> Export</button>
          <button class="btn btn--primary" id="btnAddProduct"><i class="fa-solid fa-plus"></i> Add Product</button>
        </div>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="prodSearch" placeholder="Search by name, SKU, barcode, brand..." value="${escapeHtml(this.state.search)}">
        </div>
        <select id="prodCategoryFilter" class="select">
          <option value="">All Categories</option>
          ${categories.map(c => `<option value="${escapeHtml(c)}" ${this.state.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
        </select>
        <select id="prodSort" class="select">
          <option value="name-asc" ${this.state.sortBy === 'name-asc' ? 'selected' : ''}>Name (A-Z)</option>
          <option value="name-desc" ${this.state.sortBy === 'name-desc' ? 'selected' : ''}>Name (Z-A)</option>
          <option value="stock-asc" ${this.state.sortBy === 'stock-asc' ? 'selected' : ''}>Stock (Low-High)</option>
          <option value="stock-desc" ${this.state.sortBy === 'stock-desc' ? 'selected' : ''}>Stock (High-Low)</option>
          <option value="price-asc" ${this.state.sortBy === 'price-asc' ? 'selected' : ''}>Retail Price (Low-High)</option>
          <option value="price-desc" ${this.state.sortBy === 'price-desc' ? 'selected' : ''}>Retail Price (High-Low)</option>
          <option value="date-desc" ${this.state.sortBy === 'date-desc' ? 'selected' : ''}>Newest First</option>
        </select>
      </div>

      <div class="table-wrap card">
        <table class="table" id="productsTable"></table>
      </div>
    `;

    document.getElementById('btnAddProduct').onclick = () => this.openForm();
    document.getElementById('btnExportProducts').onclick = () => this.exportCSV();
    document.getElementById('prodSearch').oninput = debounce((e) => { this.state.search = e.target.value; this.renderTable(); }, 200);
    document.getElementById('prodCategoryFilter').onchange = (e) => { this.state.category = e.target.value; this.renderTable(); };
    document.getElementById('prodSort').onchange = (e) => { this.state.sortBy = e.target.value; this.renderTable(); };

    this.renderTable();
  },

  getFiltered() {
    let all = dbAll('products');
    const q = this.state.search.trim().toLowerCase();
    if (q) {
      all = all.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        (p.brand || '').toLowerCase().includes(q)
      );
    }
    if (this.state.category) all = all.filter(p => p.category === this.state.category);

    const [key, dir] = this.state.sortBy.split('-');
    all.sort((a, b) => {
      let va, vb;
      if (key === 'name') { va = (a.name || '').toLowerCase(); vb = (b.name || '').toLowerCase(); }
      else if (key === 'stock') { va = a.stock || 0; vb = b.stock || 0; }
      else if (key === 'price') { va = a.retailPrice || 0; vb = b.retailPrice || 0; }
      else { va = a.dateAdded || ''; vb = b.dateAdded || ''; }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    return all;
  },

  renderTable() {
    const table = document.getElementById('productsTable');
    const list = this.getFiltered();
    const settings = getSettings();

    if (list.length === 0) {
      table.innerHTML = `<tbody><tr><td class="empty-state"><i class="fa-solid fa-box-open"></i><p>No products found. Try adjusting search/filters or add a new product.</p></td></tr></tbody>`;
      return;
    }

    table.innerHTML = `
      <thead>
        <tr>
          <th></th><th>Product</th><th>Category</th><th>SKU</th>
          <th>Stock</th><th>Purchase</th><th>Wholesale</th><th>Retail</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(p => {
          const low = p.stock <= (p.minStock || settings.lowStockThreshold);
          return `
          <tr data-id="${p.id}">
            <td class="td-img">${p.image ? `<img src="${p.image}" alt="">` : `<div class="img-placeholder"><i class="fa-solid fa-box"></i></div>`}</td>
            <td>
              <div class="cell-title">${escapeHtml(p.name)}</div>
              <div class="cell-sub">${escapeHtml(p.brand || '')}</div>
            </td>
            <td>${escapeHtml(p.category || '-')}</td>
            <td class="mono">${escapeHtml(p.sku || '-')}</td>
            <td>
              <span class="stock-badge ${low ? 'stock-badge--low' : ''}">${fmtNum(p.stock)} ${escapeHtml(p.unit || '')}</span>
              ${low ? '<i class="fa-solid fa-triangle-exclamation low-icon" title="Low stock"></i>' : ''}
            </td>
            <td class="mono">${fmtMoney(p.purchasePrice)}</td>
            <td class="mono">${fmtMoney(p.wholesalePrice)}</td>
            <td class="mono">${fmtMoney(p.retailPrice)}</td>
            <td class="row-actions">
              <button class="icon-btn" data-act="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
              <button class="icon-btn" data-act="dup" title="Duplicate"><i class="fa-solid fa-copy"></i></button>
              <button class="icon-btn icon-btn--danger" data-act="del" title="Delete"><i class="fa-solid fa-trash"></i></button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    `;

    table.querySelectorAll('tr[data-id]').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="edit"]').onclick = () => this.openForm(id);
      row.querySelector('[data-act="dup"]').onclick = () => this.duplicate(id);
      row.querySelector('[data-act="del"]').onclick = () => this.remove(id);
    });
  },

  openForm(id = null) {
    const product = id ? dbFind('products', id) : null;
    const isEdit = !!product;
    const categories = [...new Set(dbAll('products').map(p => p.category).filter(Boolean))].sort();

    const body = `
      <form id="productForm" class="form-grid">
        <div class="form-row form-row--image">
          <label>Product Image</label>
          <div class="image-upload" id="imageUploadBox">
            <img id="imagePreview" src="${product?.image || ''}" style="${product?.image ? '' : 'display:none;'}">
            <div id="imagePlaceholder" style="${product?.image ? 'display:none;' : ''}"><i class="fa-solid fa-camera"></i><span>Upload image</span></div>
            <input type="file" id="imageInput" accept="image/*" hidden>
          </div>
        </div>
        <div class="form-row"><label>Product Name *</label><input required id="f_name" value="${escapeHtml(product?.name || '')}" placeholder="e.g. Eid Greeting Card Pack"></div>
        <div class="form-row"><label>Category</label><input id="f_category" list="catList" value="${escapeHtml(product?.category || '')}" placeholder="e.g. Eid, Decoration, School"></div>
        <datalist id="catList">${categories.map(c => `<option value="${escapeHtml(c)}">`).join('')}</datalist>
        <div class="form-row"><label>Brand</label><input id="f_brand" value="${escapeHtml(product?.brand || '')}"></div>
        <div class="form-row"><label>SKU</label><input id="f_sku" value="${escapeHtml(product?.sku || '')}" placeholder="Auto-generated if blank"></div>
        <div class="form-row"><label>Barcode (optional)</label><input id="f_barcode" value="${escapeHtml(product?.barcode || '')}"></div>
        <div class="form-row"><label>Supplier</label>
          <select id="f_supplier">
            <option value="">-- None --</option>
            ${dbAll('suppliers').map(s => `<option value="${s.id}" ${product?.supplier === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-row"><label>Unit</label>
          <select id="f_unit">
            ${['Piece','Dozen','Pack','Box','Kg','Meter','Set'].map(u => `<option ${product?.unit === u ? 'selected' : ''}>${u}</option>`).join('')}
          </select>
        </div>
        <div class="form-row"><label>Purchase Price *</label><input required type="number" min="0" step="0.01" id="f_purchase" value="${product?.purchasePrice ?? ''}"></div>
        <div class="form-row"><label>Wholesale Price *</label><input required type="number" min="0" step="0.01" id="f_wholesale" value="${product?.wholesalePrice ?? ''}"></div>
        <div class="form-row"><label>Retail Price *</label><input required type="number" min="0" step="0.01" id="f_retail" value="${product?.retailPrice ?? ''}"></div>
        <div class="form-row"><label>Current Stock *</label><input required type="number" min="0" id="f_stock" value="${product?.stock ?? 0}" ${isEdit ? 'disabled' : ''}></div>
        ${isEdit ? `<div class="form-row"><label>Stock Adjustment</label><input type="number" id="f_stockAdjust" value="0" placeholder="+10 or -5"><small class="hint">Use Purchase/Sales modules for normal stock movement. This is for manual correction only.</small></div>` : ''}
        <div class="form-row"><label>Minimum Stock (alert level)</label><input type="number" min="0" id="f_minstock" value="${product?.minStock ?? 5}"></div>
        <div class="form-row form-row--full"><label>Description</label><textarea id="f_desc" rows="2">${escapeHtml(product?.description || '')}</textarea></div>
        <div class="form-row form-row--full modal__footer" style="padding:0;border:0;margin-top:8px;">
          <button type="button" class="btn btn--ghost" id="btnCancelForm">Cancel</button>
          <button type="submit" class="btn btn--primary">${isEdit ? 'Save Changes' : 'Add Product'}</button>
        </div>
      </form>
    `;

    openModal(`<i class="fa-solid fa-box"></i> ${isEdit ? 'Edit Product' : 'Add New Product'}`, body, {
      size: 'large',
      onMount: (overlay) => {
        let imageData = product?.image || '';
        const box = overlay.querySelector('#imageUploadBox');
        const input = overlay.querySelector('#imageInput');
        box.onclick = () => input.click();
        input.onchange = async () => {
          if (input.files[0]) {
            imageData = await readFileAsDataURL(input.files[0]);
            overlay.querySelector('#imagePreview').src = imageData;
            overlay.querySelector('#imagePreview').style.display = 'block';
            overlay.querySelector('#imagePlaceholder').style.display = 'none';
          }
        };

        overlay.querySelector('#btnCancelForm').onclick = closeModal;
        overlay.querySelector('#productForm').onsubmit = (e) => {
          e.preventDefault();
          const errors = validateRequired({
            'Product Name': overlay.querySelector('#f_name').value,
            'Purchase Price': overlay.querySelector('#f_purchase').value,
            'Wholesale Price': overlay.querySelector('#f_wholesale').value,
            'Retail Price': overlay.querySelector('#f_retail').value,
          });
          if (errors.length) { Toast.show(errors[0], 'error'); return; }

          const data = {
            name: overlay.querySelector('#f_name').value.trim(),
            category: overlay.querySelector('#f_category').value.trim(),
            brand: overlay.querySelector('#f_brand').value.trim(),
            sku: overlay.querySelector('#f_sku').value.trim(),
            barcode: overlay.querySelector('#f_barcode').value.trim(),
            supplier: overlay.querySelector('#f_supplier').value,
            unit: overlay.querySelector('#f_unit').value,
            purchasePrice: parseFloat(overlay.querySelector('#f_purchase').value) || 0,
            wholesalePrice: parseFloat(overlay.querySelector('#f_wholesale').value) || 0,
            retailPrice: parseFloat(overlay.querySelector('#f_retail').value) || 0,
            minStock: parseInt(overlay.querySelector('#f_minstock').value) || 0,
            description: overlay.querySelector('#f_desc').value.trim(),
            image: imageData
          };

          if (isEdit) {
            const adjust = parseInt(overlay.querySelector('#f_stockAdjust')?.value || '0') || 0;
            if (adjust !== 0) {
              data.stock = Math.max(0, (product.stock || 0) + adjust);
              logStockChange(product.id, adjust, 'Manual adjustment', null);
            }
            if (!data.sku) data.sku = product.sku;
            dbUpdate('products', product.id, data);
            Toast.show('Product updated successfully', 'success');
          } else {
            data.id = uid('PRD');
            data.sku = data.sku || nextId('product', 'SKU', 5);
            data.stock = parseInt(overlay.querySelector('#f_stock').value) || 0;
            data.dateAdded = new Date().toISOString();
            dbInsert('products', data);
            if (data.stock > 0) logStockChange(data.id, data.stock, 'Initial stock', null);
            Toast.show('Product added successfully', 'success');
          }
          closeModal();
          this.render();
          if (window.App) App.refreshBadges();
        };
      }
    });
  },

  duplicate(id) {
    const product = dbFind('products', id);
    if (!product) return;
    const copy = Object.assign({}, product, {
      id: uid('PRD'),
      name: product.name + ' (Copy)',
      sku: nextId('product', 'SKU', 5),
      stock: 0,
      dateAdded: new Date().toISOString()
    });
    dbInsert('products', copy);
    Toast.show('Product duplicated. Set its stock before selling.', 'success');
    this.renderTable();
  },

  async remove(id) {
    const product = dbFind('products', id);
    if (!product) return;
    const ok = await confirmDialog(`Delete "${product.name}"? This cannot be undone.`, 'Delete Product');
    if (!ok) return;
    dbDelete('products', id);
    Toast.show('Product deleted', 'success');
    this.renderTable();
    if (window.App) App.refreshBadges();
  },

  exportCSV() {
    const all = this.getFiltered();
    if (!all.length) { Toast.show('No products to export', 'warning'); return; }
    const headers = ['ID','Name','Category','Brand','SKU','Barcode','Purchase Price','Wholesale Price','Retail Price','Stock','Min Stock','Unit','Supplier','Date Added'];
    const rows = all.map(p => [p.id, p.name, p.category, p.brand, p.sku, p.barcode, p.purchasePrice, p.wholesalePrice, p.retailPrice, p.stock, p.minStock, p.unit, p.supplier, p.dateAdded]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(',')).join('\n');
    downloadTextFile(`products_${todayISO()}.csv`, csv, 'text/csv');
    Toast.show('Products exported as CSV', 'success');
  },

  getLowStock() {
    const settings = getSettings();
    return dbAll('products').filter(p => p.stock <= (p.minStock ?? settings.lowStockThreshold));
  }
};
