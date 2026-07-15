/* ============================================================
   PAK VISION INVENTORY PRO — utils.js
   Toast notifications, modal/dialog system, formatting helpers.
   ============================================================ */

/* ---------- Toast Notifications ---------- */

const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toastContainer');
  },
  show(message, type = 'info', duration = 3200) {
    if (!this.container) this.init();
    if (!this.container) return;
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info', warning: 'fa-triangle-exclamation' };
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
    this.container.appendChild(el);
    requestAnimationFrame(() => el.classList.add('toast--show'));
    setTimeout(() => {
      el.classList.remove('toast--show');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }
};

/* ---------- Confirmation Dialog ---------- */

function confirmDialog(message, title = 'Please confirm') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal modal--small">
        <div class="modal__header">
          <h3><i class="fa-solid fa-circle-question"></i> ${escapeHtml(title)}</h3>
        </div>
        <div class="modal__body"><p>${escapeHtml(message)}</p></div>
        <div class="modal__footer">
          <button class="btn btn--ghost" data-act="cancel">Cancel</button>
          <button class="btn btn--danger" data-act="ok">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-overlay--show'));
    function close(val) {
      overlay.classList.remove('modal-overlay--show');
      setTimeout(() => overlay.remove(), 200);
      resolve(val);
    }
    overlay.querySelector('[data-act="ok"]').onclick = () => close(true);
    overlay.querySelector('[data-act="cancel"]').onclick = () => close(false);
    overlay.onclick = (e) => { if (e.target === overlay) close(false); };
  });
}

/* ---------- Generic Modal (form host) ---------- */

function openModal(title, bodyHtml, { size = '', onMount } = {}) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'activeModalOverlay';
  overlay.innerHTML = `
    <div class="modal ${size ? 'modal--' + size : ''}">
      <div class="modal__header">
        <h3>${title}</h3>
        <button class="modal__close" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal__body">${bodyHtml}</div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('modal-overlay--show'));
  overlay.querySelector('.modal__close').onclick = closeModal;
  overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
  if (onMount) onMount(overlay);
  return overlay;
}

function closeModal() {
  const existing = document.getElementById('activeModalOverlay');
  if (existing) {
    existing.classList.remove('modal-overlay--show');
    setTimeout(() => existing.remove(), 200);
  }
}

/* ---------- Loading overlay ---------- */

function showLoader(msg = 'Loading...') {
  let el = document.getElementById('globalLoader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'globalLoader';
    el.className = 'loader-overlay';
    document.body.appendChild(el);
  }
  el.innerHTML = `<div class="loader-spinner"></div><p>${escapeHtml(msg)}</p>`;
  el.classList.add('loader-overlay--show');
}
function hideLoader() {
  const el = document.getElementById('globalLoader');
  if (el) el.classList.remove('loader-overlay--show');
}

/* ---------- Formatting ---------- */

function fmtMoney(num) {
  const s = getSettings();
  const n = Number(num) || 0;
  return `${s.currencySymbol} ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

function fmtNum(num) {
  return Number(num || 0).toLocaleString('en-PK');
}

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function debounce(fn, wait = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

function uid(prefix = 'ID') {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 9999)}`;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadTextFile(filename, content, mime = 'application/json') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* Simple form validation helper: returns array of error messages */
function validateRequired(fields) {
  const errors = [];
  Object.entries(fields).forEach(([label, value]) => {
    if (value === undefined || value === null || String(value).trim() === '') {
      errors.push(`${label} is required.`);
    }
  });
  return errors;
}
