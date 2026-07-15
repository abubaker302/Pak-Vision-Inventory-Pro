# 🧾 Pak Vision Inventory Pro

**Offline-First Inventory & Sales Management System** — built for wholesalers, retailers, and seasonal businesses across Pakistan (Eid, 14 August, Ramadan, school supplies, gifts & decorations, and everyday general stores).

No backend. No database server. No monthly fees. Your data stays entirely in your own browser.

---

## 🔗 Live Demo

> Once GitHub Pages is enabled for this repo, your live link will be:
> **`https://abubaker302.github.io/Pak-Vision-Inventory-Pro/`**

---

## ✨ Key Features

| Module | What it does |
|---|---|
| 📊 **Dashboard** | Real-time stats — total products, stock, inventory value, today's/total sales, profit, monthly revenue, low-stock alerts, best sellers, recent sales, and sales trend charts (daily/weekly/monthly) |
| 📦 **Products** | Full CRUD, duplicate, search, filter, sort, product images, SKU/barcode, purchase/wholesale/retail pricing, low-stock thresholds |
| 🧾 **Sales** | Cart-based billing, customer selection, discounts (flat/%), multiple payment methods, auto stock deduction, auto profit calculation, print & reprint invoices |
| 🚚 **Purchases** | Supplier-linked purchase orders, multi-product entry, automatic stock top-up |
| 👥 **Customers** | Contact records, purchase history, running balance (udhaar) tracking |
| 🏭 **Suppliers** | Contact records and full purchase history per supplier |
| 💸 **Expenses** | Categorized tracking — transport, labour, rent, food, utilities, packaging, misc. |
| 📈 **Reports** | Daily / Weekly / Monthly / Yearly / Custom range — Sales, Profit, Expense, Stock & Low-Stock reports. Export as **PDF, Excel, or JSON**, or print directly |
| 🖨️ **Invoice Printing** | Professional printable invoice with shop logo, contact details, itemized table, discount & grand total |
| 💾 **Backup & Restore** | One-click full JSON export/import, reset-all option, and automatic backup reminders |
| ⚙️ **Settings** | Shop name, logo, address, phone, currency, invoice footer text, dark/light theme |

---

## 🛠️ Tech Stack

- **HTML5, CSS3, Vanilla JavaScript (ES6+)** — zero frameworks
- **LocalStorage** — the entire database lives in the browser
- [Chart.js](https://www.chartjs.org/) — dashboard charts
- [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) — PDF report export
- [SheetJS (xlsx)](https://sheetjs.com/) — Excel report export
- [Font Awesome](https://fontawesome.com/) — icons

> These libraries load from a CDN, so an internet connection is only needed for those specific export/chart features. Every core operation — adding products, billing, stock tracking, customer records — works **100% offline** once the page has loaded once.

---

## 📁 Folder Structure

```
PakVisionInventoryPro/
│
├── index.html              # Main entry point
├── assets/
│   ├── css/
│   │   └── style.css       # Full design system (dark/light theme)
│   ├── js/
│   │   ├── db.js            # LocalStorage database layer
│   │   ├── utils.js         # Toasts, modals, formatting helpers
│   │   ├── app.js           # Sidebar navigation & router
│   │   ├── dashboard.js
│   │   ├── products.js
│   │   ├── sales.js
│   │   ├── purchases.js
│   │   ├── customers.js
│   │   ├── suppliers.js
│   │   ├── expenses.js
│   │   ├── reports.js
│   │   ├── invoice.js
│   │   ├── settings.js
│   │   └── backup.js
│   ├── images/
│   ├── icons/
│   └── fonts/
├── pages/
├── invoices/
└── backups/
```

---

## 🚀 Getting Started

### Option 1 — Just open it
Download or clone this repo, then open `index.html` directly in any modern browser (Chrome, Edge, Firefox). That's it — no build step, no `npm install`.

### Option 2 — Host it live for free (GitHub Pages)
1. Push this repo to GitHub (or upload via the web UI)
2. Go to **Settings → Pages**
3. Under "Source," select the `main` branch and `/ (root)` folder
4. Save — your app will be live at `https://YOUR_USERNAME.github.io/REPO_NAME/`

---

## 🗄️ Data & Backup

All data (products, sales, purchases, customers, suppliers, expenses, settings) is stored in your browser's `localStorage`, scoped to the specific browser and device you're using.

- **This data does NOT sync across devices or browsers automatically.**
- Clearing your browser's site data/cache will erase it.
- Use **Settings → Export Full Backup (JSON)** regularly, and **Import Backup** to restore or move data to another device/browser.

---

## 🌐 Browser Support

Works on all modern browsers with `localStorage` support: Chrome, Edge, Firefox, Safari, and mobile browsers (Android/iOS). Fully responsive down to mobile screens.

---

## 📄 License

Released under the [MIT License](LICENSE) — free to use, modify, and distribute.

---

## 🙌 Credits

Built by **Pak Vision Technologies** for Pakistani wholesalers, retailers, and seasonal businesses.
