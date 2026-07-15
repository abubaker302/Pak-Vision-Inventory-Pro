/* ============================================================
   PAK VISION INVENTORY PRO — backup.js
   ============================================================ */

const Backup = {
  exportBackup() {
    const dump = exportAllData();
    downloadTextFile(`PakVisionInventoryPro_Backup_${todayISO()}.json`, JSON.stringify(dump, null, 2));
    saveSettings({ lastBackupReminder: new Date().toISOString() });
    Toast.show('Full backup exported successfully', 'success');
    if (window.Settings) Settings.renderBackupStatus();
  },

  async importBackup(file) {
    if (!file) return;
    const ok = await confirmDialog('Importing a backup will REPLACE all current data (products, sales, customers, etc). Continue?', 'Import Backup');
    if (!ok) return;
    try {
      showLoader('Importing backup...');
      const text = await file.text();
      const dump = JSON.parse(text);
      importAllData(dump);
      hideLoader();
      Toast.show('Backup imported successfully. Reloading...', 'success');
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      hideLoader();
      console.error(e);
      Toast.show('Invalid backup file. Import failed.', 'error');
    }
  },

  async resetData() {
    const first = await confirmDialog('This will permanently delete ALL products, sales, purchases, customers, suppliers and expenses. This cannot be undone.', 'Reset All Data');
    if (!first) return;
    const second = await confirmDialog('Are you absolutely sure? Consider exporting a backup first.', 'Final Confirmation');
    if (!second) return;
    resetAllData();
    Toast.show('All data has been reset', 'success');
    setTimeout(() => location.reload(), 1000);
  },

  /* Auto backup reminder: nudge if no backup in 7+ days */
  checkReminder() {
    const s = getSettings();
    const hasData = dbAll('products').length > 0 || dbAll('sales').length > 0;
    if (!hasData) return;
    if (!s.lastBackupReminder) {
      setTimeout(() => Toast.show('Tip: Export a backup from Settings to keep your data safe.', 'info', 5000), 2500);
      return;
    }
    const days = (Date.now() - new Date(s.lastBackupReminder).getTime()) / 86400000;
    if (days > 7) {
      setTimeout(() => Toast.show('It\'s been over a week since your last backup. Export one from Settings.', 'warning', 5000), 2500);
    }
  }
};
