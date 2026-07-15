/* ============================================================
   PAK VISION INVENTORY PRO — db.js
   LocalStorage database layer. No backend. No frameworks.
   Every collection is stored as a JSON array under its own key.
   ============================================================ */

const DB_PREFIX = 'pvip_';

const COLLECTIONS = [
  'products', 'sales', 'purchases', 'customers', 'suppliers',
  'expenses', 'settings', 'counters', 'stockLog'
];

const DEFAULT_SETTINGS = {
  shopName: 'Pak Vision Traders',
  logo: '',
  address: 'Main Bazaar, Lahore, Pakistan',
  phone: '+92 300 0000000',
  currency: 'PKR',
  currencySymbol: 'Rs',
  invoiceFooter: 'Thank you for shopping with us! Goods once sold on Eid/seasonal stock are not returnable after 3 days.',
  theme: 'dark',
  lastBackupReminder: null,
  lowStockThreshold: 5
};

const DEFAULT_COUNTERS = {
  product: 0,
  invoice: 0,
  purchase: 0,
  customer: 0,
  supplier: 0,
  expense: 0
};

/* ---------- Core get/set ---------- */

function dbGet(collection) {
  try {
    const raw = localStorage.getItem(DB_PREFIX + collection);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('DB read error for', collection, e);
    return null;
  }
}

function dbSet(collection, data) {
  try {
    localStorage.setItem(DB_PREFIX + collection, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('DB write error for', collection, e);
    if (e.name === 'QuotaExceededError') {
      Toast.show('Storage full! Please export a backup and clear old data.', 'error');
    }
    return false;
  }
}

function dbInit() {
  COLLECTIONS.forEach(col => {
    if (dbGet(col) === null) {
      if (col === 'settings') dbSet(col, DEFAULT_SETTINGS);
      else if (col === 'counters') dbSet(col, DEFAULT_COUNTERS);
      else dbSet(col, []);
    }
  });
  // Merge any newly-added default settings keys for existing installs
  const settings = dbGet('settings');
  const merged = Object.assign({}, DEFAULT_SETTINGS, settings);
  dbSet('settings', merged);
}

/* ---------- Generic CRUD helpers ---------- */

function dbAll(collection) {
  return dbGet(collection) || [];
}

function dbFind(collection, id) {
  return dbAll(collection).find(item => item.id === id) || null;
}

function dbInsert(collection, item) {
  const all = dbAll(collection);
  all.push(item);
  dbSet(collection, all);
  return item;
}

function dbUpdate(collection, id, patch) {
  const all = dbAll(collection);
  const idx = all.findIndex(i => i.id === id);
  if (idx === -1) return null;
  all[idx] = Object.assign({}, all[idx], patch);
  dbSet(collection, all);
  return all[idx];
}

function dbDelete(collection, id) {
  const all = dbAll(collection);
  const filtered = all.filter(i => i.id !== id);
  dbSet(collection, filtered);
  return filtered.length !== all.length;
}

/* ---------- ID / Counter generation ---------- */

function nextId(kind, prefix, pad = 4) {
  const counters = dbGet('counters') || DEFAULT_COUNTERS;
  counters[kind] = (counters[kind] || 0) + 1;
  dbSet('counters', counters);
  const num = String(counters[kind]).padStart(pad, '0');
  return `${prefix}-${num}`;
}

/* ---------- Settings shortcuts ---------- */

function getSettings() {
  return dbGet('settings') || DEFAULT_SETTINGS;
}

function saveSettings(patch) {
  const s = Object.assign({}, getSettings(), patch);
  dbSet('settings', s);
  return s;
}

/* ---------- Stock log (audit trail for stock changes) ---------- */

function logStockChange(productId, change, reason, refId) {
  const log = dbAll('stockLog');
  log.push({
    id: 'SL-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
    productId, change, reason, refId,
    date: new Date().toISOString()
  });
  // Keep log bounded to last 2000 entries to avoid runaway storage growth
  if (log.length > 2000) log.splice(0, log.length - 2000);
  dbSet('stockLog', log);
}

/* ---------- Backup / Restore ---------- */

function exportAllData() {
  const dump = {};
  COLLECTIONS.forEach(col => { dump[col] = dbGet(col); });
  dump._meta = { exportedAt: new Date().toISOString(), app: 'PakVisionInventoryPro', version: 1 };
  return dump;
}

function importAllData(dump) {
  if (!dump || typeof dump !== 'object') throw new Error('Invalid backup file');
  COLLECTIONS.forEach(col => {
    if (dump[col] !== undefined) dbSet(col, dump[col]);
  });
  return true;
}

function resetAllData() {
  COLLECTIONS.forEach(col => localStorage.removeItem(DB_PREFIX + col));
  dbInit();
}

/* Initialize on load */
dbInit();
