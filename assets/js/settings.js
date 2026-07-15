/* ============================================================
   PAK VISION INVENTORY PRO — settings.js
   ============================================================ */

const Settings = {
  render() {
    const view = document.getElementById('view');
    const s = getSettings();
    view.innerHTML = `
      <div class="page-header"><div><h2>Settings</h2><p class="page-sub">Configure your shop details and preferences</p></div></div>

      <div class="settings-grid">
        <div class="card">
          <div class="card__header"><h3><i class="fa-solid fa-store"></i> Shop Information</h3></div>
          <form id="settingsForm" class="form-grid">
            <div class="form-row form-row--image">
              <label>Shop Logo</label>
              <div class="image-upload image-upload--sm" id="logoUploadBox">
                <img id="logoPreview" src="${s.logo || ''}" style="${s.logo ? '' : 'display:none;'}">
                <div id="logoPlaceholder" style="${s.logo ? 'display:none;' : ''}"><i class="fa-solid fa-image"></i><span>Upload logo</span></div>
                <input type="file" id="logoInput" accept="image/*" hidden>
              </div>
            </div>
            <div class="form-row"><label>Shop Name</label><input id="st_name" value="${escapeHtml(s.shopName)}"></div>
            <div class="form-row"><label>Phone</label><input id="st_phone" value="${escapeHtml(s.phone)}"></div>
            <div class="form-row form-row--full"><label>Address</label><input id="st_address" value="${escapeHtml(s.address)}"></div>
            <div class="form-row"><label>Currency Symbol</label><input id="st_currency" value="${escapeHtml(s.currencySymbol)}"></div>
            <div class="form-row"><label>Low Stock Threshold</label><input type="number" min="0" id="st_lowstock" value="${s.lowStockThreshold}"></div>
            <div class="form-row form-row--full"><label>Invoice Footer Message</label><textarea id="st_footer" rows="2">${escapeHtml(s.invoiceFooter)}</textarea></div>
            <div class="form-row"><label>Theme</label>
              <select id="st_theme">
                <option value="dark" ${s.theme === 'dark' ? 'selected' : ''}>Dark</option>
                <option value="light" ${s.theme === 'light' ? 'selected' : ''}>Light</option>
              </select>
            </div>
            <div class="form-row form-row--full modal__footer" style="padding:0;border:0;margin-top:8px;">
              <button type="submit" class="btn btn--primary"><i class="fa-solid fa-floppy-disk"></i> Save Settings</button>
            </div>
          </form>
        </div>

        <div class="card">
          <div class="card__header"><h3><i class="fa-solid fa-database"></i> Backup & Restore</h3></div>
          <p class="settings-note">Your data lives only in this browser's storage. Export a backup regularly, especially before clearing browser data or switching devices.</p>
          <div class="settings-actions">
            <button class="btn btn--primary" id="btnExportBackup"><i class="fa-solid fa-file-export"></i> Export Full Backup (JSON)</button>
            <label class="btn btn--ghost" style="cursor:pointer;">
              <i class="fa-solid fa-file-import"></i> Import Backup
              <input type="file" id="importBackupInput" accept=".json" hidden>
            </label>
            <button class="btn btn--danger" id="btnResetData"><i class="fa-solid fa-trash-can"></i> Reset All Data</button>
          </div>
          <div class="backup-status" id="backupStatus"></div>
        </div>
      </div>
    `;

    let logoData = s.logo || '';
    const box = document.getElementById('logoUploadBox');
    const input = document.getElementById('logoInput');
    box.onclick = () => input.click();
    input.onchange = async () => {
      if (input.files[0]) {
        logoData = await readFileAsDataURL(input.files[0]);
        document.getElementById('logoPreview').src = logoData;
        document.getElementById('logoPreview').style.display = 'block';
        document.getElementById('logoPlaceholder').style.display = 'none';
      }
    };

    document.getElementById('settingsForm').onsubmit = (e) => {
      e.preventDefault();
      saveSettings({
        shopName: document.getElementById('st_name').value.trim(),
        phone: document.getElementById('st_phone').value.trim(),
        address: document.getElementById('st_address').value.trim(),
        currencySymbol: document.getElementById('st_currency').value.trim() || 'Rs',
        lowStockThreshold: parseInt(document.getElementById('st_lowstock').value) || 5,
        invoiceFooter: document.getElementById('st_footer').value.trim(),
        theme: document.getElementById('st_theme').value,
        logo: logoData
      });
      App.applyTheme();
      App.refreshShopBranding();
      Toast.show('Settings saved successfully', 'success');
    };

    document.getElementById('btnExportBackup').onclick = () => Backup.exportBackup();
    document.getElementById('importBackupInput').onchange = (e) => Backup.importBackup(e.target.files[0]);
    document.getElementById('btnResetData').onclick = () => Backup.resetData();

    this.renderBackupStatus();
  },

  renderBackupStatus() {
    const el = document.getElementById('backupStatus');
    const s = getSettings();
    if (!el) return;
    if (s.lastBackupReminder) {
      el.innerHTML = `<i class="fa-solid fa-circle-check"></i> Last backup exported: ${fmtDateTime(s.lastBackupReminder)}`;
    } else {
      el.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> No backup exported yet. Please export one soon.`;
    }
  }
};
