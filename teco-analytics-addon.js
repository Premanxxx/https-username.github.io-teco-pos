/*
 * Te.Co Pandawa POS — Analytics Add-on v1.2.3
 * Adds daily/monthly variant recap, WhatsApp report, Excel sheets,
 * and ingredient usage analysis based on the uploaded recipe workbook.
 *
 * Install: add before </body> in the existing index.html:
 * <script src="./teco-analytics-addon.js?v=1.2.3"></script>
 */
(function () {
  'use strict';

  if (window.__TECO_ANALYTICS_ADDON__) return;
  window.__TECO_ANALYTICS_ADDON__ = true;

  const VERSION = '2.1.1';
  const TZ = 'Asia/Jakarta';
  const SETTINGS_KEY = 'teco_analytics_settings_v1';
  const ADJUSTMENTS_KEY = 'teco_analytics_report_adjustments_v1';
  const FIREBASE_DB_URL = 'https://teman-coffee-pandawa-default-rtdb.asia-southeast1.firebasedatabase.app';
  const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

  const RECIPE_NAMES = [
    'RENJANA',
    'SAKALA',
    'KAHWA',
    'AMERICANO',
    'PREMIUM SERIES (BUTTERSCOTCH, CARAMEL, HAZELNUT)',
    'NON COFFEE SERIES (MATCHA, CHOCO, TARO, REDVELVET)',
    'MATCHAPRESSO',
    'MATCHA AREN',
    'COFFEE MILO',
    'MILO BUTTERSCOTCH, CARAMEL, HAZELNUT',
    'REDBERRYCANO',
    'GOLDEN DRIFT',
    'LUMA PEARL',
    'KOPSU PISTACHIO'
  ];

  const RECIPES = {
    'KONSENTRAT': [
      { material: 'Kental Manis', qty: 200, unit: 'ml' },
      { material: 'Krimer', qty: 100, unit: 'gr' },
      { material: 'Sirup Vanilla', qty: 100, unit: 'ml' },
      { material: 'Robusta', qty: 45, unit: 'gr' },
      { material: 'Air', qty: 800, unit: 'ml' }
    ],
    'RENJANA': [
      { material: 'Konsentrat', qty: 60, unit: 'ml' },
      { material: 'UHT', qty: 80, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' },
      { material: 'Gula Aren', qty: 10, unit: 'ml' }
    ],
    'SAKALA': [
      { material: 'Konsentrat', qty: 40, unit: 'ml' },
      { material: 'UHT', qty: 100, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' },
      { material: 'Gula Aren', qty: 10, unit: 'ml' }
    ],
    'KAHWA': [
      { material: 'Robusta', qty: 2, unit: 'gr' },
      { material: 'Sirup Vanilla', qty: 5, unit: 'ml' },
      { material: 'Fruktosa', qty: 10, unit: 'ml' },
      { material: 'Air Mineral', qty: 130, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' },
      { material: 'Gula Aren', qty: 10, unit: 'ml' }
    ],
    'AMERICANO': [
      { material: 'Robusta', qty: 2, unit: 'gr' },
      { material: 'Air Mineral', qty: 130, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' }
    ],
    'PREMIUM SERIES (BUTTERSCOTCH, CARAMEL, HAZELNUT)': [
      { material: 'Konsentrat', qty: 40, unit: 'ml' },
      { material: 'Sirup', qty: 15, unit: 'ml' },
      { material: 'UHT', qty: 100, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' }
    ],
    'NON COFFEE SERIES (MATCHA, CHOCO, TARO, REDVELVET)': [
      { material: 'Kental Manis', qty: 20, unit: 'ml' },
      { material: 'Bubuk Rasa', qty: 20, unit: 'gr' },
      { material: 'UHT', qty: 100, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' }
    ],
    'MATCHAPRESSO': [
      { material: 'Kental Manis', qty: 15, unit: 'ml' },
      { material: 'Krimer', qty: 15, unit: 'gr' },
      { material: 'Bubuk Rasa', qty: 18, unit: 'gr' },
      { material: 'Robusta', qty: 2, unit: 'gr' },
      { material: 'Air Hangat', qty: 50, unit: 'ml' },
      { material: 'UHT', qty: 80, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' }
    ],
    'MATCHA AREN': [
      { material: 'Gula Aren', qty: 15, unit: 'ml' },
      { material: 'Matcha', qty: 18, unit: 'gr' },
      { material: 'Kental Manis', qty: 15, unit: 'ml' },
      { material: 'Air Hangat', qty: 15, unit: 'ml' },
      { material: 'UHT', qty: 100, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' }
    ],
    'COFFEE MILO': [
      { material: 'Kental Manis', qty: 10, unit: 'ml' },
      { material: 'Robusta', qty: 2, unit: 'gr' },
      { material: 'Milo', qty: 35, unit: 'gr' },
      { material: 'Air Hangat', qty: 50, unit: 'ml' },
      { material: 'UHT', qty: 50, unit: 'ml' }
    ],
    'MILO MALAYSIA': [
      { material: 'Milo', qty: 35, unit: 'gr' },
      { material: 'Air Hangat', qty: 50, unit: 'ml' },
      { material: 'UHT', qty: 50, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' }
    ],
    'MILO BUTTERSCOTCH, CARAMEL, HAZELNUT': [
      { material: 'Sirup', qty: 15, unit: 'ml' },
      { material: 'Milo', qty: 35, unit: 'gr' },
      { material: 'Air Hangat', qty: 50, unit: 'ml' },
      { material: 'UHT', qty: 50, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' }
    ],
    'REDBERRYCANO': [
      { material: 'Robusta', qty: 2, unit: 'gr' },
      { material: 'Air Mineral', qty: 20, unit: 'ml' },
      { material: 'Sirup Raspberry', qty: 10, unit: 'ml' },
      { material: 'Sirup Lemon', qty: 10, unit: 'ml' },
      { material: 'Air Mineral', qty: 130, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' }
    ],
    'GOLDEN DRIFT': [
      { material: 'Robusta', qty: 2, unit: 'gr' },
      { material: 'Air Mineral', qty: 20, unit: 'ml' },
      { material: 'Sirup Raspberry', qty: 10, unit: 'ml' },
      { material: 'Sirup Leci', qty: 10, unit: 'ml' },
      { material: 'Air Mineral', qty: 130, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' }
    ],
    'LUMA PEARL': [
      { material: 'Robusta', qty: 2, unit: 'gr' },
      { material: 'Air Mineral', qty: 20, unit: 'ml' },
      { material: 'Sirup Passion Fruit', qty: 10, unit: 'ml' },
      { material: 'Air Mineral', qty: 130, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' }
    ],
    'KOPSU PISTACHIO': [
      { material: 'Konsentrat', qty: 60, unit: 'ml' },
      { material: 'Sirup Pistachio', qty: 15, unit: 'ml' },
      { material: 'UHT', qty: 80, unit: 'ml' },
      { material: 'Cup + Tutup', qty: 1, unit: 'pcs' },
      { material: 'Gula Aren', qty: 10, unit: 'ml' }
    ]
  };

  const DEFAULT_SETTINGS = {
    ownerWhatsApp: '',
    concentrateBatchYieldMl: 1000,
    expandConcentrate: true,
    productRecipeMap: {},
    firebaseDbUrl: FIREBASE_DB_URL,
    storageMode: 'auto'
  };

  const state = {
    settings: loadSettings(),
    adjustments: loadAdjustments(),
    session: { authenticated: false, role: 'guest', name: '' },
    transactions: [],
    expenses: [],
    sources: [],
    loadErrors: [],
    activeTab: 'daily',
    dailyDate: jakartaDateKey(new Date()),
    monthlyMonth: jakartaMonthKey(new Date()),
    cashier: 'ALL',
    loading: false,
    reloadQueued: false,
    lastLoadedAt: null,
    lastSyncReason: '',
    firebaseStatus: { state: 'idle', message: 'Belum diuji', lastChecked: null }
  };

  let dataReloadTimer = null;
  let storageHooksInstalled = false;
  let firebaseRealtimeInstalled = false;
  let firebaseRealtimeHandlers = [];

  function loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      const merged = Object.assign({}, DEFAULT_SETTINGS, parsed || {}, {
        productRecipeMap: Object.assign({}, DEFAULT_SETTINGS.productRecipeMap, parsed.productRecipeMap || {})
      });
      if (!['auto', 'firebase', 'local'].includes(merged.storageMode)) merged.storageMode = 'auto';
      
    const migratedProductRecipeMap = {};
    Object.entries(merged.productRecipeMap || {}).forEach(([productName, recipeName]) => {
      const canonicalProduct = canonicalProductName(productName);
      const canonicalRecipe = normalizeText(recipeName) === 'SAKATA' ? 'SAKALA' : recipeName;
      migratedProductRecipeMap[canonicalProduct] = canonicalRecipe;
    });
    merged.productRecipeMap = migratedProductRecipeMap;

    return merged;
    } catch (_) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function getStorageMode() {
    return ['auto', 'firebase', 'local'].includes(state.settings.storageMode) ? state.settings.storageMode : 'auto';
  }

  function storageModeLabel(mode) {
    const value = mode || getStorageMode();
    if (value === 'local') return 'Lokal saja';
    if (value === 'firebase') return 'Firebase (cadangan lokal)';
    return 'Otomatis (lokal + Firebase)';
  }

  function setFirebaseStatus(status, message) {
    state.firebaseStatus = {
      state: status || 'idle',
      message: String(message || ''),
      lastChecked: new Date()
    };
  }

  function firebaseStatusText() {
    const info = state.firebaseStatus || {};
    const checked = info.lastChecked ? ` • ${jakartaDateTime(info.lastChecked)}` : '';
    if (getStorageMode() === 'local') return 'Dinonaktifkan karena mode Lokal saja';
    if (info.state === 'connected') return `Terhubung — ${info.message || 'Firebase dapat diakses'}${checked}`;
    if (info.state === 'fallback') return `Menggunakan cadangan lokal — ${info.message || 'Firebase tidak tersedia'}${checked}`;
    if (info.state === 'failed') return `Gagal — ${info.message || 'Firebase tidak dapat diakses'}${checked}`;
    return `${info.message || 'Belum diuji'}${checked}`;
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function loadAdjustments() {
    try {
      const rows = JSON.parse(localStorage.getItem(ADJUSTMENTS_KEY) || '[]');
      return Array.isArray(rows) ? rows.filter((row) => row && typeof row === 'object') : [];
    } catch (_) {
      return [];
    }
  }

  function saveAdjustments() {
    localStorage.setItem(ADJUSTMENTS_KEY, JSON.stringify(state.adjustments));
  }

  function normalizeAdjustmentCollection(value) {
    const rows = Array.isArray(value) ? value : (value && typeof value === 'object' ? Object.values(value) : []);
    return rows.filter((row) => row && typeof row === 'object' && row.id && row.date && row.cashier && row.variant)
      .map((row) => ({
        id: String(row.id),
        date: String(row.date),
        cashier: String(row.cashier),
        variant: canonicalProductName(row.variant),
        qtyDelta: toNumber(row.qtyDelta),
        revenueDelta: toNumber(row.revenueDelta),
        note: String(row.note || ''),
        createdAt: String(row.createdAt || ''),
        createdBy: String(row.createdBy || ''),
        updatedAt: String(row.updatedAt || ''),
        updatedBy: String(row.updatedBy || '')
      }));
  }

  function mergeAdjustments(...collections) {
    const map = new Map();
    collections.flat().forEach((row) => {
      if (!row || !row.id) return;
      const existing = map.get(String(row.id));
      const stamp = String(row.updatedAt || row.createdAt || '');
      const existingStamp = existing ? String(existing.updatedAt || existing.createdAt || '') : '';
      if (!existing || stamp >= existingStamp) map.set(String(row.id), row);
    });
    return Array.from(map.values());
  }

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function canonicalProductName(value) {
    return String(value == null ? '' : value)
      .replace(/\bSAKATA\b/gi, 'Sakala')
      .trim();
  }

  function cashierKey(value) {
    return normalizeText(value)
      .replace(/^CASHIER/, 'KASIR')
      .replace(/\s+/g, '');
  }

  function sameCashier(a, b) {
    if (!a || !b) return false;
    return cashierKey(a) === cashierKey(b);
  }

  function parseMaybeJson(value) {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    if (!text || !/^[\[{]/.test(text)) return value;
    try { return JSON.parse(text); } catch (_) { return value; }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value == null) return 0;
    let text = String(value).trim();
    if (!text) return 0;
    text = text.replace(/Rp/gi, '').replace(/\s/g, '');
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) {
      text = text.replace(/,/g, '');
    } else {
      text = text.replace(/[^0-9,.-]/g, '');
      if (text.includes(',') && !text.includes('.')) text = text.replace(',', '.');
    }
    const n = Number(text);
    return Number.isFinite(n) ? n : 0;
  }

  function formatRupiah(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(toNumber(value));
  }

  function parseDate(value, fallbackKey) {
    if (value && typeof value === 'object') {
      if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
      if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
      if (typeof value.toDate === 'function') {
        try { return value.toDate(); } catch (_) { /* noop */ }
      }
    }
    if (typeof value === 'number') {
      const ms = value < 100000000000 ? value * 1000 : value;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (typeof value === 'string') {
      const text = value.trim();
      if (/^\d{10,13}$/.test(text)) {
        const num = Number(text);
        const d = new Date(text.length === 10 ? num * 1000 : num);
        if (!Number.isNaN(d.getTime())) return d;
      }
      let m = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?/);
      if (m) {
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
        if (!Number.isNaN(d.getTime())) return d;
      }
      m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?/);
      if (m) {
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
        if (!Number.isNaN(d.getTime())) return d;
      }
      const d = new Date(text);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (fallbackKey) {
      const m = String(fallbackKey).match(/(\d{13}|\d{10})/);
      if (m) {
        const num = Number(m[1]);
        const d = new Date(m[1].length === 10 ? num * 1000 : num);
        if (!Number.isNaN(d.getTime())) return d;
      }
      const dm = String(fallbackKey).match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
      if (dm) return new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]));
    }
    return null;
  }

  function jakartaParts(date) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date);
    const out = {};
    parts.forEach((p) => { if (p.type !== 'literal') out[p.type] = p.value; });
    return out;
  }

  function jakartaDateKey(date) {
    const p = jakartaParts(date);
    return `${p.year}-${p.month}-${p.day}`;
  }

  function jakartaMonthKey(date) {
    const p = jakartaParts(date);
    return `${p.year}-${p.month}`;
  }

  function jakartaDateTime(date) {
    const p = jakartaParts(date);
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
  }

  function longDate(dateKey) {
    const d = new Date(`${dateKey}T12:00:00+07:00`);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(d);
  }

  function monthLabel(monthKey) {
    const d = new Date(`${monthKey}-15T12:00:00+07:00`);
    return new Intl.DateTimeFormat('id-ID', { timeZone: TZ, month: 'long', year: 'numeric' }).format(d);
  }

  function firstValue(obj, keys) {
    if (!obj || typeof obj !== 'object') return undefined;
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
    }
    const normMap = {};
    Object.keys(obj).forEach((k) => { normMap[normalizeText(k)] = k; });
    for (const key of keys) {
      const actual = normMap[normalizeText(key)];
      if (actual && obj[actual] !== undefined && obj[actual] !== null && obj[actual] !== '') return obj[actual];
    }
    return undefined;
  }

  const DATE_KEYS = ['date', 'tanggal', 'createdAt', 'created_at', 'timestamp', 'time', 'datetime', 'waktu', 'paidAt', 'checkoutAt', 'created', 'expenseDate', 'expense_date', 'transactionDate', 'tanggalPengeluaran'];
  const ITEM_KEYS = ['items', 'cart', 'products', 'details', 'detail', 'orderItems', 'order_items', 'menu', 'pesanan', 'itemList', 'lineItems', 'cartItems', 'cart_items', 'transactionItems', 'transaction_items', 'saleItems', 'sale_items', 'orderDetails', 'order_details', 'produk', 'daftarProduk'];
  const NAME_KEYS = ['name', 'productName', 'product_name', 'itemName', 'item_name', 'menuName', 'title', 'label', 'product', 'item', 'menu', 'nama', 'namaProduk', 'nama_produk', 'variantName'];
  const QTY_KEYS = ['qty', 'quantity', 'jumlah', 'count', 'cup', 'cups', 'amountQty', 'jumlahCup', 'jumlah_cup', 'totalQty'];
  const PRICE_KEYS = ['price', 'harga', 'unitPrice', 'unit_price', 'sellingPrice', 'selling_price', 'hargaSatuan'];
  const SUBTOTAL_KEYS = ['subtotal', 'lineTotal', 'line_total', 'totalPrice', 'total_price', 'amount', 'itemTotal', 'item_total', 'jumlahHarga'];
  const TOTAL_KEYS = ['total', 'grandTotal', 'grand_total', 'totalAmount', 'total_amount', 'amount', 'omzet', 'subtotal', 'finalTotal', 'final_total', 'netTotal', 'totalBayar'];
  const CASHIER_KEYS = ['cashier', 'cashierName', 'cashier_name', 'cashierId', 'cashier_id', 'kasir', 'namaKasir', 'nama_kasir', 'user', 'operator', 'createdBy', 'created_by', 'staff', 'username'];
  const PAYMENT_KEYS = ['paymentMethod', 'payment_method', 'payment', 'method', 'metode', 'paymentType', 'payment_type', 'tipePembayaran', 'tipe_pembayaran', 'jenisPembayaran'];
  const ID_KEYS = ['id', 'transactionId', 'transaction_id', 'orderId', 'order_id', 'invoice', 'receiptNo', 'receipt_no', 'invoiceNo', 'invoice_no', 'kodeTransaksi'];
  const VARIANT_KEYS = ['variant', 'variantName', 'variant_name', 'flavor', 'rasa', 'option', 'size', 'ukuran', 'modifier'];
  const NOTE_KEYS = ['note', 'notes', 'catatan', 'remark', 'remarks', 'description', 'keterangan', 'memo', 'customerNote', 'orderNote', 'transactionNote', 'noteText'];
  const EXPENSE_AMOUNT_KEYS = ['amount', 'nominal', 'value', 'total', 'expenseAmount', 'expense_amount', 'jumlah', 'biaya', 'expense', 'cost'];
  const EXPENSE_CATEGORY_KEYS = ['category', 'kategori', 'type', 'jenis', 'expenseType', 'expense_type'];

  function objectValuesAsItems(value) {
    value = parseMaybeJson(value);
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    const vals = Object.values(value);
    if (!vals.length) return [];
    if (vals.every((v) => v != null && (typeof v === 'object' || typeof v === 'string'))) return vals;
    return [];
  }

  function locateItems(obj) {
    obj = parseMaybeJson(obj);
    if (!obj || typeof obj !== 'object') return [];
    for (const key of ITEM_KEYS) {
      const direct = parseMaybeJson(firstValue(obj, [key]));
      const arr = objectValuesAsItems(direct);
      if (arr.length) return arr;
    }
    if (firstValue(obj, NAME_KEYS) && firstValue(obj, QTY_KEYS) !== undefined) return [obj];
    return [];
  }

  function nestedItemValue(raw, keys) {
    let value = firstValue(raw, keys);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = firstValue(value, keys.concat(['name', 'nama', 'title', 'label', 'value']));
      if (nested !== undefined) value = nested;
    }
    return value;
  }

  function normalizeItem(raw) {
    raw = parseMaybeJson(raw);
    if (typeof raw === 'string' || typeof raw === 'number') {
      const name = canonicalProductName(raw);
      return name ? { name, baseName: name, variant: '', qty: 1, price: 0, subtotal: 0, raw } : null;
    }
    if (Array.isArray(raw)) {
      raw = { name: raw[0], qty: raw[1], price: raw[2], subtotal: raw[3] };
    }
    if (!raw || typeof raw !== 'object') return null;
    const baseName = nestedItemValue(raw, NAME_KEYS);
    if (!baseName || typeof baseName === 'object') return null;
    let qty = toNumber(nestedItemValue(raw, QTY_KEYS));
    if (!qty) qty = 1;
    if (qty <= 0) return null;
    const variant = nestedItemValue(raw, VARIANT_KEYS);
    const canonicalBaseName = canonicalProductName(baseName);
    let name = canonicalBaseName;
    let variantText = variant == null || typeof variant === 'object' ? '' : String(variant).trim();
    const options = firstValue(raw, ['options', 'modifiers', 'customizations', 'selectedOptions']);
    if (!variantText && options && typeof options === 'object') {
      variantText = Object.values(options).filter((v) => typeof v === 'string' || typeof v === 'number').join(' / ');
    }
    if (variantText && !normalizeText(name).includes(normalizeText(variantText))) {
      name = `${name} - ${variantText}`;
    }
    let price = toNumber(nestedItemValue(raw, PRICE_KEYS));
    if (!price) {
      const productNode = firstValue(raw, ['product', 'item', 'menu']);
      if (productNode && typeof productNode === 'object') price = toNumber(firstValue(productNode, PRICE_KEYS));
    }
    let subtotal = toNumber(nestedItemValue(raw, SUBTOTAL_KEYS));
    if (!subtotal && price) subtotal = price * qty;
    return {
      name,
      baseName: canonicalProductName(baseName),
      variant: variantText,
      qty,
      price,
      subtotal,
      raw
    };
  }

  function looksLikeTransaction(obj, path) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const items = locateItems(obj).map(normalizeItem).filter(Boolean);
    if (!items.length) return false;
    const hasDate = firstValue(obj, DATE_KEYS) !== undefined || /transaction|transaksi|sales|penjualan|orders|pesanan/i.test(path || '');
    const hasTotal = firstValue(obj, TOTAL_KEYS) !== undefined;
    return hasDate || hasTotal;
  }

  function normalizeTransaction(obj, fallbackKey, sourcePath) {
    obj = parseMaybeJson(obj);
    const rawItems = locateItems(obj);
    const items = rawItems.map(normalizeItem).filter(Boolean);
    if (!items.length) return null;
    const date = parseDate(firstValue(obj, DATE_KEYS), fallbackKey);
    if (!date) return null;
    let total = toNumber(firstValue(obj, TOTAL_KEYS));
    if (!total) total = items.reduce((sum, item) => sum + item.subtotal, 0);
    const cashierRaw = firstValue(obj, CASHIER_KEYS);
    const cashier = typeof cashierRaw === 'object'
      ? String(firstValue(cashierRaw, ['name', 'username', 'displayName']) || 'Tidak diketahui')
      : String(cashierRaw || 'Tidak diketahui');
    const paymentRaw = firstValue(obj, PAYMENT_KEYS);
    const payment = typeof paymentRaw === 'object'
      ? String(firstValue(paymentRaw, ['name', 'label', 'type', 'method', 'metode']) || 'Tidak diketahui')
      : String(paymentRaw || 'Tidak diketahui');
    const note = String(firstValue(obj, NOTE_KEYS) || '').trim();
    const id = String(firstValue(obj, ID_KEYS) || fallbackKey || `${date.getTime()}-${items.length}-${total}`);
    return { id, date, total, cashier, payment, note, items, sourcePath: sourcePath || '', raw: obj };
  }

  function extractTransactions(root, sourceName) {
    const found = [];
    const seen = new WeakSet();
    const maxNodes = 30000;
    let visited = 0;

    function walk(node, path, keyHint, depth) {
      node = parseMaybeJson(node);
      if (node == null || typeof node !== 'object' || depth > 11 || visited > maxNodes) return;
      if (seen.has(node)) return;
      seen.add(node);
      visited += 1;

      if (!Array.isArray(node) && looksLikeTransaction(node, path)) {
        const tx = normalizeTransaction(node, keyHint, `${sourceName}:${path}`);
        if (tx) found.push(tx);
        return;
      }

      if (Array.isArray(node)) {
        node.forEach((child, index) => walk(child, `${path}[${index}]`, String(index), depth + 1));
        return;
      }

      Object.entries(node).forEach(([key, child]) => {
        if (/^(menu|menus|products|users|settings|config|expenses|pengeluaran|stock|stok|recipes|resep)$/i.test(key) && depth > 1) return;
        walk(child, path ? `${path}.${key}` : key, key, depth + 1);
      });
    }

    walk(root, '', '', 0);
    return found;
  }

  function normalizeExpense(obj, fallbackKey, sourcePath) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
    if (locateItems(obj).length) return null;
    const amount = toNumber(firstValue(obj, EXPENSE_AMOUNT_KEYS));
    if (!(amount > 0)) return null;
    const date = parseDate(firstValue(obj, DATE_KEYS), fallbackKey);
    if (!date) return null;
    const category = String(firstValue(obj, EXPENSE_CATEGORY_KEYS) || 'Lain-lain').trim() || 'Lain-lain';
    const note = String(firstValue(obj, NOTE_KEYS) || '').trim();
    const cashierRaw = firstValue(obj, CASHIER_KEYS);
    const cashier = typeof cashierRaw === 'object'
      ? String(firstValue(cashierRaw, ['name', 'username', 'displayName']) || 'Tidak diketahui')
      : String(cashierRaw || 'Tidak diketahui');
    const id = String(firstValue(obj, ID_KEYS) || fallbackKey || `${date.getTime()}-${amount}-${category}`);
    return { id, date, amount, category, note, cashier, sourcePath: sourcePath || '', raw: obj };
  }

  function extractExpenses(root, sourceName) {
    const found = [];
    const seen = new WeakSet();
    let visited = 0;
    const maxNodes = 30000;

    function walk(node, path, keyHint, depth, inExpenseBranch) {
      node = parseMaybeJson(node);
      if (node == null || typeof node !== 'object' || depth > 11 || visited > maxNodes) return;
      if (seen.has(node)) return;
      seen.add(node);
      visited += 1;

      const pathLooksExpense = inExpenseBranch || /(^|[.\[\]_ -])(expenses?|pengeluaran|biaya)([.\]\[_ -]|$)/i.test(path || '');
      if (!Array.isArray(node) && pathLooksExpense) {
        const expense = normalizeExpense(node, keyHint, `${sourceName}:${path}`);
        if (expense) {
          found.push(expense);
          return;
        }
      }

      if (Array.isArray(node)) {
        node.forEach((child, index) => walk(child, `${path}[${index}]`, String(index), depth + 1, pathLooksExpense));
        return;
      }

      Object.entries(node).forEach(([key, child]) => {
        const childExpenseBranch = pathLooksExpense || /^(expenses?|pengeluaran|biaya|expenseData|dailyExpenses)$/i.test(key);
        walk(child, path ? `${path}.${key}` : key, key, depth + 1, childExpenseBranch);
      });
    }

    const sourceLooksExpense = /(expenses?|pengeluaran|biaya|expenseData|dailyExpenses)/i.test(String(sourceName || ''));
    walk(root, '', '', 0, sourceLooksExpense);
    return found;
  }

  function fingerprintExpense(row) {
    return `${jakartaDateTime(row.date)}|${cashierKey(row.cashier)}|${Math.round(row.amount)}|${normalizeText(row.category)}|${normalizeText(row.note)}`;
  }

  function dedupeExpenses(list) {
    const map = new Map();
    list.forEach((row) => {
      const fingerprint = fingerprintExpense(row);
      const id = String(row.id || '').trim();
      // ID membedakan dua transaksi yang memang terpisah, sedangkan fingerprint
      // mencegah salinan transaksi yang sama dari beberapa sumber dihitung ganda.
      const key = id ? `${id}|${fingerprint}` : `LEGACY|${fingerprint}`;
      if (!map.has(key)) map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => b.date - a.date);
  }

  function fingerprintTransaction(tx) {
    const items = tx.items.map((i) => `${normalizeText(i.name)}:${i.qty}:${i.subtotal}`).sort().join('|');
    return `${jakartaDateTime(tx.date)}|${cashierKey(tx.cashier)}|${Math.round(tx.total)}|${items}`;
  }

  function dedupeTransactions(list) {
    const map = new Map();
    list.forEach((tx) => {
      const key = fingerprintTransaction(tx);
      if (!map.has(key)) map.set(key, tx);
    });
    return Array.from(map.values()).sort((a, b) => b.date - a.date);
  }

  function scanLocalStorage() {
    const txs = [];
    const expenses = [];
    const sources = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || key === SETTINGS_KEY || key === ADJUSTMENTS_KEY) continue;
      const raw = localStorage.getItem(key);
      if (!raw || raw.length < 2) continue;
      try {
        const parsed = JSON.parse(raw);
        const extracted = extractTransactions(parsed, `localStorage:${key}`);
        const extractedExpenses = extractExpenses(parsed, `localStorage:${key}`);
        if (extracted.length) {
          txs.push(...extracted);
          sources.push({ name: `Local: ${key}`, count: extracted.length });
        }
        if (extractedExpenses.length) expenses.push(...extractedExpenses);
        maybeDiscoverOwnerNumber(parsed);
      } catch (_) { /* non-JSON value */ }
    }
    return { txs, expenses, sources };
  }

  function readGlobalBinding(name) {
    try {
      const value = (0, eval)(name);
      return value && typeof value === 'object' ? value : null;
    } catch (_) {
      return null;
    }
  }

  function scanKnownGlobals() {
    const txs = [];
    const expenses = [];
    const sources = [];
    const names = [
      'transactions', 'transactionData', 'transactionsData', 'transactionHistory', 'riwayatTransaksi',
      'sales', 'salesData', 'orders', 'ordersData', 'appData', 'dbData', 'allTransactions',
      'posData', 'appState',
      '__TECO_ANALYTICS_LIVE_STATE__', 'storeData', 'dataStore', 'expenses', 'expensesData', 'expenseData',
      'pengeluaran', 'dailyExpenses'
    ];
    const scanned = new Set();
    names.forEach((name) => {
      const candidates = [
        { label: `window.${name}`, value: (() => { try { return window[name]; } catch (_) { return null; } })() },
        { label: `global:${name}`, value: readGlobalBinding(name) }
      ];
      candidates.forEach(({ label, value }) => {
        if (!value || typeof value !== 'object' || scanned.has(value)) return;
        scanned.add(value);
        const extracted = extractTransactions(value, label);
        const extractedExpenses = extractExpenses(value, label);
        if (extracted.length) {
          txs.push(...extracted);
          sources.push({ name: `Aplikasi: ${name}`, count: extracted.length });
        }
        if (extractedExpenses.length) expenses.push(...extractedExpenses);
        maybeDiscoverOwnerNumber(value);
      });
    });
    return { txs, expenses, sources };
  }

  function promiseWithTimeout(promise, milliseconds, label) {
    let timer;
    return Promise.race([
      Promise.resolve(promise).finally(() => clearTimeout(timer)),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label || 'Operasi'} timeout`)), milliseconds);
      })
    ]);
  }

  function firebaseDataResult(data, sourceLabel) {
    maybeDiscoverOwnerNumber(data);
    const txs = extractTransactions(data, sourceLabel);
    const expenses = extractExpenses(data, sourceLabel);
    const adjustments = normalizeAdjustmentCollection(data && (data.analyticsAdjustments || data.tecoAnalyticsAdjustments));
    return {
      data,
      txs,
      expenses,
      adjustments,
      sources: txs.length ? [{ name: sourceLabel, count: txs.length }] : []
    };
  }

  function getCompatFirebaseDatabases() {
    const candidates = [];
    try {
      if (window.firebase && typeof window.firebase.database === 'function') candidates.push(window.firebase.database());
    } catch (_) { /* noop */ }
    ['database', 'firebaseDatabase', 'realtimeDatabase', 'rtdb'].forEach((name) => {
      try {
        const value = window[name] || readGlobalBinding(name);
        if (value && typeof value.ref === 'function') candidates.push(value);
      } catch (_) { /* noop */ }
    });
    return candidates.filter((db, index) => db && candidates.indexOf(db) === index);
  }

  async function fetchFirebaseSdkData() {
    const databases = getCompatFirebaseDatabases();
    let lastError = null;
    for (const db of databases) {
      try {
        const ref = db.ref('/');
        const snapshot = await promiseWithTimeout(ref.once('value'), 8000, 'Firebase SDK');
        const data = snapshot && typeof snapshot.val === 'function' ? snapshot.val() : snapshot;
        return firebaseDataResult(data || {}, 'Firebase SDK aplikasi');
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) throw lastError;
    throw new Error('Firebase SDK aplikasi tidak ditemukan');
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async function fetchFirebaseData(customDbUrl) {
    const sdkDatabases = getCompatFirebaseDatabases();
    if (sdkDatabases.length) {
      try { return await fetchFirebaseSdkData(); } catch (_) { /* lanjut ke REST */ }
    }

    const dbUrl = String(customDbUrl || state.settings.firebaseDbUrl || FIREBASE_DB_URL).replace(/\/$/, '');
    try {
      const data = await fetchJson(`${dbUrl}/.json`);
      return firebaseDataResult(data || {}, 'Firebase Realtime Database');
    } catch (rootError) {
      const paths = [
        'transactions', 'sales', 'orders', 'transactionData', 'riwayatTransaksi',
        'data/transactions', 'appData/transactions', 'posData/transactions',
        'expenses', 'pengeluaran', 'dailyExpenses', 'analyticsAdjustments'
      ];
      const settled = await Promise.allSettled(paths.map(async (path) => ({ path, data: await fetchJson(`${dbUrl}/${path}.json`) })));
      const merged = {};
      let successful = 0;
      settled.forEach((result) => {
        if (result.status !== 'fulfilled' || result.value.data == null) return;
        successful += 1;
        const parts = result.value.path.split('/');
        let cursor = merged;
        parts.forEach((part, index) => {
          if (index === parts.length - 1) cursor[part] = result.value.data;
          else cursor = cursor[part] || (cursor[part] = {});
        });
      });
      if (!successful) throw rootError;
      return firebaseDataResult(merged, 'Firebase REST per koleksi');
    }
  }

  function maybeDiscoverOwnerNumber(root) {
    if (state.settings.ownerWhatsApp || root == null || typeof root !== 'object') return;
    const keyPattern = /(whatsapp|waowner|ownerwa|ownerwhatsapp|phoneowner|nomorwa|nowa)/i;
    const seen = new WeakSet();
    let visited = 0;
    function walk(node, depth) {
      if (state.settings.ownerWhatsApp || !node || typeof node !== 'object' || depth > 6 || visited > 5000) return;
      if (seen.has(node)) return;
      seen.add(node);
      visited += 1;
      for (const [key, value] of Object.entries(node)) {
        if (keyPattern.test(key) && (typeof value === 'string' || typeof value === 'number')) {
          const digits = String(value).replace(/\D/g, '');
          if (digits.length >= 9) {
            state.settings.ownerWhatsApp = String(value);
            saveSettings();
            return;
          }
        }
        if (value && typeof value === 'object') walk(value, depth + 1);
      }
    }
    walk(root, 0);
  }

  async function loadTransactions(options = {}) {
    if (!isAuthenticated()) return;

    if (state.loading) {
      state.reloadQueued = true;
      return;
    }

    state.loading = true;
    state.reloadQueued = false;
    state.loadErrors = [];

    try {
      // POS utama tetap mengelola penyimpanan dan sinkronisasi.
      // Analisis hanya membaca state aplikasi yang sudah aktif di memori.
      const liveData = scanKnownGlobals();

      state.transactions = dedupeTransactions(liveData.txs || []);
      state.expenses = dedupeExpenses(liveData.expenses || []);
      state.sources = liveData.sources && liveData.sources.length
        ? liveData.sources
        : [{ name: 'State aplikasi aktif', count: state.transactions.length }];
      state.lastLoadedAt = new Date();
      state.lastSyncReason = options.reason || 'state aplikasi aktif';

      setFirebaseStatus('disabled', 'Analisis memakai state aplikasi aktif');
      renderAll();
    } catch (error) {
      console.error('[Te.Co Analytics] Gagal membaca state aplikasi:', error);
      state.loadErrors = [String(error && error.message ? error.message : error)];
      setFirebaseStatus('error', 'State aplikasi belum tersedia');
      renderAll();
    } finally {
      state.loading = false;
      window.__TECO_DAILY_REPORT_RENDER_FIX_V131__ = true;
      window.requestAnimationFrame(() => {
        try {
          renderAll();
        } catch (renderError) {
          console.error('[TeCo Analytics] Gagal merender laporan harian:', renderError);
        }
      });

      if (state.reloadQueued) {
        state.reloadQueued = false;
        window.setTimeout(() => loadTransactions({ reason: 'perubahan state lanjutan' }), 60);
      }
    }
  }

  function scheduleDataReload(reason, delay) {
    if (!isAuthenticated()) return;
    clearTimeout(dataReloadTimer);
    dataReloadTimer = setTimeout(() => {
      dataReloadTimer = null;
      loadTransactions({ silent: true, reason: reason || 'perubahan data' });
    }, Number.isFinite(delay) ? delay : 450);
  }

  function clearFirebaseRealtimeSync() {
    firebaseRealtimeHandlers.forEach(({ ref, handler }) => {
      try { if (ref && typeof ref.off === 'function') ref.off('value', handler); } catch (_) { /* noop */ }
    });
    firebaseRealtimeHandlers = [];
    firebaseRealtimeInstalled = false;
  }

  function installFirebaseRealtimeSync() {
    if (getStorageMode() === 'local') {
      clearFirebaseRealtimeSync();
      return;
    }
    if (firebaseRealtimeInstalled) return;
    const databases = getCompatFirebaseDatabases();
    if (!databases.length) return;
    firebaseRealtimeInstalled = true;
    databases.forEach((db) => {
      try {
        const ref = db.ref('/');
        const handler = () => scheduleDataReload('Firebase realtime', 300);
        ref.on('value', handler, () => {});
        firebaseRealtimeHandlers.push({ ref, handler });
      } catch (_) { /* noop */ }
    });
  }

  function installStorageSyncHooks() {
    if (window.__tecoAnalyticsLiveBridgeInstalled) return;
    window.__tecoAnalyticsLiveBridgeInstalled = true;

    const liveState = window.__TECO_ANALYTICS_LIVE_STATE__ || {};
    window.__TECO_ANALYTICS_LIVE_STATE__ = liveState;

    // Baca snapshot lama satu kali. Tidak ada request Firebase dan tidak ada spinner.
    if (!window.__TECO_EXISTING_DATA_SEEDED_V131__) {
      window.__TECO_EXISTING_DATA_SEEDED_V131__ = true;
      try {
        for (let index = 0; index < localStorage.length; index += 1) {
          const key = localStorage.key(index);
          if (!key) continue;
          const rawValue = localStorage.getItem(key);
          if (rawValue == null) continue;
          try {
            liveState[key] = JSON.parse(rawValue);
          } catch (parseError) {
            // Nilai non-JSON bukan data transaksi.
          }
        }
      } catch (seedError) {
        console.warn('[TeCo Analytics] Snapshot data lama tidak dapat dibaca:', seedError);
      }
    }

    const rememberPayload = (key, rawValue) => {
      if (!key) return;
      if (rawValue == null) {
        delete liveState[key];
        return;
      }

      try {
        liveState[key] = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
      } catch (error) {
        // Nilai non-JSON tidak dibutuhkan oleh analisis transaksi.
      }
    };

    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;

    Storage.prototype.setItem = function patchedSetItem(key, value) {
      const result = originalSetItem.apply(this, arguments);
      rememberPayload(String(key || ''), value);
      scheduleDataReload(`state:${String(key || '').slice(0, 40)}`, 40);
      return result;
    };

    Storage.prototype.removeItem = function patchedRemoveItem(key) {
      const result = originalRemoveItem.apply(this, arguments);
      rememberPayload(String(key || ''), null);
      scheduleDataReload(`hapus-state:${String(key || '').slice(0, 40)}`, 40);
      return result;
    };

    Storage.prototype.clear = function patchedClear() {
      const result = originalClear.apply(this, arguments);
      Object.keys(liveState).forEach((key) => delete liveState[key]);
      scheduleDataReload('reset-state', 40);
      return result;
    };

    window.addEventListener('storage', (event) => {
      rememberPayload(String(event.key || ''), event.newValue);
      scheduleDataReload('state-antartab', 40);
    });
  }

  function startSalesSyncMonitor() {
    // Storage hook hanya menjadi pemicu perubahan. Analisis tidak membaca ulang localStorage.
    installStorageSyncHooks();

    const refreshFromActiveState = (reason) => {
      scheduleDataReload(reason, 60);
    };

    ['teco:transaction-saved', 'teco:expense-saved', 'teco:data-changed'].forEach((eventName) => {
      window.addEventListener(eventName, () => refreshFromActiveState(eventName));
    });

    window.addEventListener('focus', () => refreshFromActiveState('fokus aplikasi'));

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshFromActiveState('aplikasi aktif');
    });

    document.addEventListener('click', (event) => {
      const target = event.target && event.target.closest
        ? event.target.closest('button, a, [role="button"]')
        : null;
      if (!target) return;

      const label = normalizeText(
        target.textContent || target.getAttribute('aria-label') || target.getAttribute('title') || ''
      );

      if (/BAYAR|KONFIRMASI|SIMPAN|HAPUS|IMPORT|RESET|TRANSAKSI BARU|PENGELUARAN/.test(label)) {
        refreshFromActiveState(`aksi:${label.slice(0, 40)}`);
      }
    });
  }

  function mapRecipe(productName) {
    const normalized = normalizeText(productName);
    const manual = state.settings.productRecipeMap[normalized];
    if (manual && RECIPES[manual]) return manual;

    if (/MATCHA\s*PRESSO/.test(normalized)) return 'MATCHAPRESSO';
    if (/MATCHA.*AREN|AREN.*MATCHA/.test(normalized)) return 'MATCHA AREN';
    if (/(KOPI|COFFEE).*MILO|MILO.*(KOPI|COFFEE)/.test(normalized)) return 'COFFEE MILO';
    if (/MILO.*MALAYSIA|MILO.*ORIGINAL/.test(normalized)) return 'MILO MALAYSIA';
    if (/MILO/.test(normalized) && /(BUTTERSCOTCH|CARAMEL|HAZELNUT)/.test(normalized)) return 'MILO BUTTERSCOTCH, CARAMEL, HAZELNUT';
    if (/REDBERRY|RED\s*BERRY/.test(normalized)) return 'REDBERRYCANO';
    if (/GOLDEN.*DRIFT/.test(normalized)) return 'GOLDEN DRIFT';
    if (/LUMA.*PEARL/.test(normalized)) return 'LUMA PEARL';
    if (/PISTACHIO/.test(normalized)) return 'KOPSU PISTACHIO';
    if (/RENJANA/.test(normalized)) return 'RENJANA';
    if (/SAKALA/.test(normalized)) return 'SAKALA';
    if (/KAHWA/.test(normalized)) return 'KAHWA';
    if (/AMERICANO/.test(normalized)) return 'AMERICANO';
    if (/(BUTTERSCOTCH|CARAMEL|HAZELNUT)/.test(normalized)) return 'PREMIUM SERIES (BUTTERSCOTCH, CARAMEL, HAZELNUT)';
    if (/(CHOCO|CHOCOLATE|TARO|RED\s*VELVET|REDVELVET)/.test(normalized)) return 'NON COFFEE SERIES (MATCHA, CHOCO, TARO, REDVELVET)';
    if (/^MATCHA$|MATCHA\s*(ORIGINAL|LATTE)?$/.test(normalized)) return 'NON COFFEE SERIES (MATCHA, CHOCO, TARO, REDVELVET)';
    return '';
  }

  function filterTransactions(mode) {
    const period = mode === 'monthly' ? state.monthlyMonth : state.dailyDate;
    return state.transactions.filter((tx) => {
      const periodMatch = mode === 'monthly' ? jakartaMonthKey(tx.date) === period : jakartaDateKey(tx.date) === period;
      const cashierMatch = state.cashier === 'ALL' || sameCashier(tx.cashier, state.cashier);
      return periodMatch && cashierMatch;
    });
  }

  function filterExpenses(mode) {
    const period = mode === 'monthly' ? state.monthlyMonth : state.dailyDate;
    return state.expenses.filter((row) => {
      const periodMatch = mode === 'monthly' ? jakartaMonthKey(row.date) === period : jakartaDateKey(row.date) === period;
      const cashierMatch = state.cashier === 'ALL' || sameCashier(row.cashier, state.cashier);
      return periodMatch && cashierMatch;
    });
  }

  function normalizePaymentLabel(value) {
    const text = normalizeText(value);
    if (!text || text === 'TIDAK DIKETAHUI') return 'Tidak diketahui';
    if (/CASH|TUNAI/.test(text)) return 'Tunai';
    if (/QRIS|QR CODE|QR/.test(text)) return 'QRIS';
    if (/TRANSFER|BANK/.test(text)) return 'Transfer';
    return String(value || 'Tidak diketahui').trim();
  }

  function collectReportNotes(txs, adjustments) {
    const notes = [];
    const seen = new Set();
    txs.forEach((tx) => {
      const note = String(tx.note || '').trim();
      if (!note) return;
      const label = `${jakartaDateKey(tx.date)} • ${tx.cashier}: ${note}`;
      const key = normalizeText(label);
      if (!seen.has(key)) { seen.add(key); notes.push(label); }
    });
    adjustments.forEach((row) => {
      const note = String(row.note || '').trim();
      if (!note) return;
      const label = `${row.date} • ${row.cashier} • Penyesuaian ${row.variant}: ${note}`;
      const key = normalizeText(label);
      if (!seen.has(key)) { seen.add(key); notes.push(label); }
    });
    return notes;
  }

  function adjustmentMatchesPeriod(row, mode) {
    const period = mode === 'monthly' ? state.monthlyMonth : state.dailyDate;
    const date = String(row.date || '');
    const periodMatch = mode === 'monthly' ? date.slice(0, 7) === period : date === period;
    const cashierMatch = state.cashier === 'ALL' || sameCashier(row.cashier, state.cashier);
    return periodMatch && cashierMatch;
  }

  function reportAdjustments(mode) {
    return state.adjustments.filter((row) => adjustmentMatchesPeriod(row, mode));
  }

  function aggregateExpenseClassifications(expenses) {
    const map = new Map();
    expenses.forEach((row) => {
      const category = String(row.category || 'Lain-lain').trim() || 'Lain-lain';
      const note = String(row.note || '-').trim() || '-';
      const key = `${normalizeText(category)}|${normalizeText(note)}`;
      if (!map.has(key)) map.set(key, { category, note, count: 0, amount: 0 });
      const item = map.get(key);
      item.count += 1;
      item.amount += toNumber(row.amount);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category));
  }

  function aggregate(mode) {
    const txs = filterTransactions(mode);
    const variants = new Map();
    const payments = new Map();
    let totalRevenue = 0;
    let totalCups = 0;

    txs.forEach((tx) => {
      totalRevenue += tx.total;
      const paymentName = normalizePaymentLabel(tx.payment);
      const paymentKey = normalizeText(paymentName);
      if (!payments.has(paymentKey)) payments.set(paymentKey, { name: paymentName, count: 0, amount: 0 });
      const paymentRow = payments.get(paymentKey);
      paymentRow.count += 1;
      paymentRow.amount += tx.total;
      tx.items.forEach((item) => {
        const label = item.name || item.baseName || 'Tanpa nama';
        const key = normalizeText(label);
        if (!variants.has(key)) {
          variants.set(key, {
            key,
            name: label,
            qty: 0,
            revenue: 0,
            recipe: mapRecipe(label)
          });
        }
        const row = variants.get(key);
        row.qty += item.qty;
        row.revenue += item.subtotal;
        totalCups += item.qty;
      });
    });

    const adjustments = reportAdjustments(mode);
    adjustments.forEach((adjustment) => {
      const label = String(adjustment.variant || 'Penyesuaian Umum').trim() || 'Penyesuaian Umum';
      const key = normalizeText(label);
      if (!variants.has(key)) {
        variants.set(key, { key, name: label, qty: 0, revenue: 0, recipe: mapRecipe(label) });
      }
      const row = variants.get(key);
      row.qty += toNumber(adjustment.qtyDelta);
      row.revenue += toNumber(adjustment.revenueDelta);
      totalRevenue += toNumber(adjustment.revenueDelta);
    });

    const variantRows = Array.from(variants.values())
      .map((row) => Object.assign({}, row, { qty: Math.max(0, row.qty), revenue: Math.max(0, row.revenue) }))
      .filter((row) => row.qty > 0 || row.revenue > 0)
      .sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
    totalCups = variantRows.reduce((sum, row) => sum + row.qty, 0);
    totalRevenue = Math.max(0, totalRevenue);
    const materialResult = calculateMaterials(variantRows, totalCups);
    const expenses = filterExpenses(mode);
    const expenseClassifications = aggregateExpenseClassifications(expenses);
    const totalExpenses = expenses.reduce((sum, row) => sum + toNumber(row.amount), 0);
    const adjustmentRevenue = adjustments.reduce((sum, row) => sum + toNumber(row.revenueDelta), 0);
    const paymentRows = Array.from(payments.values()).sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
    const notes = collectReportNotes(txs, adjustments);
    return {
      mode,
      txs,
      expenses,
      expenseClassifications,
      totalExpenses,
      netRevenue: totalRevenue - totalExpenses,
      adjustmentRevenue,
      payments: paymentRows,
      notes,
      adjustments,
      adjustmentCount: adjustments.length,
      transactionCount: txs.length,
      totalRevenue,
      totalCups,
      distinctVariants: variantRows.length,
      variants: variantRows,
      materials: materialResult.materials,
      concentrateUsageMl: materialResult.concentrateUsageMl,
      concentrateBatches: materialResult.concentrateBatches,
      unmatched: variantRows.filter((row) => !row.recipe)
    };
  }

  function materialKey(material, unit) {
    return `${normalizeText(material)}|${normalizeText(unit)}`;
  }

  function addMaterial(map, material, qty, unit, recipeName, type) {
    const cleanMaterial = material === 'Fruktosaa' ? 'Fruktosa' : (material === 'Gula Arenn' ? 'Gula Aren' : material);
    const key = materialKey(cleanMaterial, unit);
    if (!map.has(key)) {
      map.set(key, { material: cleanMaterial, qty: 0, unit, recipes: new Set(), type: type || 'Bahan baku' });
    }
    const row = map.get(key);
    row.qty += qty;
    if (recipeName) row.recipes.add(recipeName);
  }

  function calculateMaterials(variantRows, totalCups) {
    const map = new Map();
    let concentrateUsageMl = 0;
    variantRows.forEach((variant) => {
      if (!variant.recipe || !RECIPES[variant.recipe]) return;
      RECIPES[variant.recipe].forEach((ingredient) => {
        if (normalizeText(ingredient.material) === 'CUP TUTUP') return;
        const qty = ingredient.qty * variant.qty;
        if (normalizeText(ingredient.material) === 'KONSENTRAT') {
          concentrateUsageMl += qty;
          if (state.settings.expandConcentrate) {
            const yieldMl = Math.max(1, toNumber(state.settings.concentrateBatchYieldMl) || 1000);
            const ratio = qty / yieldMl;
            RECIPES.KONSENTRAT.forEach((base) => {
              addMaterial(map, base.material, base.qty * ratio, base.unit, variant.recipe, 'Bahan baku konsentrat');
            });
          } else {
            addMaterial(map, 'Konsentrat', qty, 'ml', variant.recipe, 'Bahan antara');
          }
        } else {
          addMaterial(map, ingredient.material, qty, ingredient.unit, variant.recipe, 'Bahan baku');
        }
      });
    });

    addMaterial(map, 'Cup + Tutup', totalCups, 'pcs', 'Semua produk', 'Kemasan');
    const materials = Array.from(map.values()).map((row) => ({
      material: row.material,
      qty: row.qty,
      unit: row.unit,
      recipes: Array.from(row.recipes).sort(),
      type: row.type
    })).sort((a, b) => a.material.localeCompare(b.material));
    const yieldMl = Math.max(1, toNumber(state.settings.concentrateBatchYieldMl) || 1000);
    return {
      materials,
      concentrateUsageMl,
      concentrateBatches: concentrateUsageMl / yieldMl
    };
  }

  function formatMeasurement(qty, unit) {
    const n = toNumber(qty);
    if ((unit === 'ml' || unit === 'gr') && Math.abs(n) >= 1000) {
      return `${formatDecimal(n / 1000)} ${unit === 'ml' ? 'liter' : 'kg'}`;
    }
    if (unit === 'pcs') return `${formatDecimal(n)} set`;
    return `${formatDecimal(n)} ${unit}`;
  }

  function formatDecimal(value) {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(toNumber(value));
  }

  function sourceSummary() {
    if (!state.sources.length) {
      return state.loadErrors.length ? `Belum menemukan transaksi • ${state.loadErrors.join(' • ')}` : 'Belum menemukan sumber transaksi';
    }
    const unique = [];
    const seen = new Set();
    state.sources.forEach((source) => {
      if (seen.has(source.name)) return;
      seen.add(source.name);
      unique.push(`${source.name} (${source.count})`);
    });
    return unique.join(' • ');
  }

  function getCashiers() {
    const values = new Map();
    state.transactions.forEach((tx) => {
      const label = tx.cashier || 'Tidak diketahui';
      const key = cashierKey(label) || normalizeText(label);
      if (!values.has(key)) values.set(key, label);
    });
    return Array.from(values.values()).sort((a, b) => a.localeCompare(b));
  }

  function injectStyles() {
    if (document.getElementById('tecoAnalyticsStyles')) return;
    const style = document.createElement('style');
    style.id = 'tecoAnalyticsStyles';
    style.textContent = `
      #tecoAnalyticsReportEntry{margin:16px 0;width:100%;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
      .ta-report-entry-card{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px;border:1px solid #99f6e4;border-radius:14px;background:linear-gradient(135deg,#ecfdf5,#f0fdfa);box-shadow:0 6px 18px rgba(15,118,110,.10);color:#0f172a}
      .ta-report-entry-copy{display:flex;align-items:center;gap:12px;min-width:0}.ta-report-entry-icon{display:grid;place-items:center;flex:0 0 auto;width:44px;height:44px;border-radius:12px;background:#0f766e;color:#fff;font-size:22px}.ta-report-entry-copy strong{display:block;font-size:15px}.ta-report-entry-copy small{display:block;margin-top:3px;color:#475569;line-height:1.4}
      .ta-report-open{flex:0 0 auto;border:0;border-radius:10px;padding:10px 14px;background:#0f766e;color:#fff;font-weight:800;cursor:pointer}.ta-report-open:hover{background:#115e59}.ta-role-badge{display:inline-block;margin-top:6px;padding:3px 8px;border-radius:999px;background:#ccfbf1;color:#115e59;font-size:10px;font-weight:800}.ta-role-badge.admin{background:#fef3c7;color:#92400e}
      #tecoAnalyticsOverlay{position:fixed;inset:0;z-index:2147483100;background:rgba(2,6,23,.72);display:none;align-items:center;justify-content:center;padding:14px;font-family:system-ui,-apple-system,Segoe UI,sans-serif}
      #tecoAnalyticsOverlay.open{display:flex}
      #tecoAnalyticsModal{width:min(1120px,100%);height:min(92vh,900px);background:#f8fafc;color:#0f172a;border-radius:18px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.45);display:flex;flex-direction:column}
      .ta-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;background:#0f172a;color:#fff}
      .ta-head h2{font-size:18px;margin:0}.ta-head small{display:block;color:#cbd5e1;margin-top:3px}.ta-close{border:0;background:rgba(255,255,255,.12);color:#fff;width:36px;height:36px;border-radius:10px;font-size:22px;cursor:pointer}
      .ta-toolbar{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px;background:#fff;border-bottom:1px solid #e2e8f0;align-items:end}
      .ta-tabs{display:flex;gap:6px;flex-wrap:wrap}.ta-tab{border:1px solid #cbd5e1;background:#fff;padding:8px 12px;border-radius:9px;cursor:pointer;font-weight:700;color:#334155}.ta-tab.active{background:#0f766e;color:#fff;border-color:#0f766e}
      .ta-field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#475569}.ta-field input,.ta-field select{border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;background:#fff;color:#0f172a;min-height:36px}
      .ta-actions{margin-left:auto;display:flex;gap:7px;flex-wrap:wrap}.ta-btn{border:0;border-radius:9px;padding:9px 12px;font-weight:700;cursor:pointer;background:#e2e8f0;color:#0f172a}.ta-btn.primary{background:#0f766e;color:#fff}.ta-btn.wa{background:#16a34a;color:#fff}.ta-btn.excel{background:#166534;color:#fff}.ta-btn.warn{background:#f59e0b;color:#111827}
      .ta-body{padding:16px;overflow:auto;flex:1}.ta-status{padding:8px 11px;border-radius:9px;background:#e0f2fe;color:#075985;font-size:12px;margin-bottom:12px}.ta-status.error{background:#fee2e2;color:#991b1b}
      .ta-cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:14px}.ta-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px}.ta-card span{display:block;color:#64748b;font-size:11px}.ta-card strong{font-size:20px;display:block;margin-top:5px}
      .ta-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.ta-panel{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}.ta-panel h3{font-size:14px;margin:0;padding:12px 14px;border-bottom:1px solid #e2e8f0;background:#f8fafc}.ta-panel .ta-pad{padding:12px}
      .ta-table-wrap{overflow:auto;max-height:430px}.ta-table{width:100%;border-collapse:collapse;font-size:12px}.ta-table th{position:sticky;top:0;background:#f1f5f9;color:#334155;text-align:left;padding:9px;border-bottom:1px solid #cbd5e1;z-index:1}.ta-table td{padding:8px 9px;border-bottom:1px solid #e2e8f0;vertical-align:top}.ta-table tr:hover td{background:#f8fafc}.ta-num{text-align:right;white-space:nowrap}.ta-muted{color:#64748b}.ta-badge{display:inline-block;padding:3px 7px;border-radius:999px;background:#dcfce7;color:#166534;font-size:10px;font-weight:700}.ta-badge.miss{background:#fee2e2;color:#991b1b}
      .ta-map-select{width:100%;min-width:190px;border:1px solid #cbd5e1;border-radius:7px;padding:6px;background:#fff}.ta-adjust-form{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.ta-adjust-form .wide{grid-column:span 2}.ta-lock{font-size:12px;line-height:1.5;color:#7c2d12;background:#ffedd5;border:1px solid #fdba74;padding:10px;border-radius:9px}.ta-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ta-settings .ta-field input,.ta-settings .ta-field select{width:100%;box-sizing:border-box}.ta-note{font-size:12px;line-height:1.5;color:#475569;background:#fef3c7;border:1px solid #fde68a;padding:10px;border-radius:9px}.ta-recipe{margin-bottom:12px}.ta-recipe h4{margin:0 0 6px;font-size:13px}.ta-recipe ul{margin:0;padding-left:18px;color:#475569;font-size:12px}
      .ta-toast{position:fixed;left:50%;bottom:25px;transform:translateX(-50%);z-index:2147483200;background:#0f172a;color:#fff;padding:10px 14px;border-radius:9px;box-shadow:0 10px 30px rgba(0,0,0,.3);font:600 13px system-ui;opacity:0;pointer-events:none;transition:.2s}.ta-toast.show{opacity:1}
      @media(max-width:800px){.ta-adjust-form{grid-template-columns:1fr}.ta-adjust-form .wide{grid-column:auto}.ta-report-entry-card{align-items:stretch;flex-direction:column}.ta-report-open{width:100%}.ta-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.ta-grid{grid-template-columns:1fr}.ta-actions{margin-left:0;width:100%}.ta-settings{grid-template-columns:1fr}.ta-toolbar{align-items:stretch}.ta-field{flex:1;min-width:130px}#tecoAnalyticsModal{height:96vh;border-radius:13px}.ta-head{padding:13px}.ta-body{padding:11px}}
    `;
    document.head.appendChild(style);
  }

  function isVisible(element) {
    if (!element || !element.isConnected) return false;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function sessionValueLooksLoggedIn(value) {
    if (!value) return false;
    if (typeof value === 'string') {
      const text = normalizeText(value);
      return Boolean(text && !['NULL', 'UNDEFINED', 'FALSE', 'LOGOUT', 'GUEST'].includes(text));
    }
    if (typeof value !== 'object' || Array.isArray(value)) return false;
    if (value.loggedIn === false || value.isLoggedIn === false || value.authenticated === false) return false;
    return Boolean(
      value.loggedIn === true || value.isLoggedIn === true || value.authenticated === true ||
      value.role || value.userRole || value.username || value.name || value.nama ||
      value.cashier || value.kasir || value.id
    );
  }

  function roleFromValue(value) {
    if (!value) return '';
    let parts = [];
    if (typeof value === 'string' || typeof value === 'number') {
      parts = [String(value)];
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      parts = [
        value.role, value.userRole, value.level, value.type, value.userType,
        value.username, value.name, value.nama, value.cashier, value.kasir, value.id
      ].filter((item) => item != null).map(String);
    }
    const text = normalizeText(parts.join(' '));
    if (/\bADMIN\b|OWNER|PEMILIK/.test(text)) return 'admin';
    if (/\bKASIR\b|CASHIER|OPERATOR|STAFF/.test(text)) return 'cashier';
    return '';
  }

  function nameFromValue(value) {
    if (!value) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    if (typeof value !== 'object' || Array.isArray(value)) return '';
    return String(
      value.name || value.nama || value.username || value.displayName ||
      value.cashier || value.kasir || value.id || ''
    ).trim();
  }

  function storedSessionCandidates() {
    const keys = [
      'currentUser', 'loggedInUser', 'activeUser', 'sessionUser', 'userSession',
      'teco_current_user', 'tecoCurrentUser', 'pos_current_user', 'posCurrentUser',
      'currentCashier', 'activeCashier', 'loggedInCashier', 'authUser'
    ];
    const values = [];
    for (const key of keys) {
      try {
        const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (!raw) continue;
        let value = raw;
        try { value = JSON.parse(raw); } catch (_) { /* use string */ }
        if (sessionValueLooksLoggedIn(value)) values.push(value);
      } catch (_) { /* storage may be blocked */ }
    }
    return values;
  }

  function globalSessionCandidates() {
    return [
      window.currentUser, window.loggedInUser, window.activeUser, window.sessionUser,
      window.currentCashier, window.activeCashier, window.authUser, window.userSession
    ].filter(sessionValueLooksLoggedIn);
  }

  function visibleControlTextMatches(test) {
    return Array.from(document.querySelectorAll('button,a,[role="button"]'))
      .some((el) => isVisible(el) && test(normalizeText(el.textContent)));
  }

  function firstVisibleText(pattern) {
    const elements = Array.from(document.querySelectorAll('button,a,span,strong,small,div,p,h1,h2,h3,h4,label'));
    for (const el of elements) {
      if (!isVisible(el) || el.children.length > 3) continue;
      const raw = String(el.textContent || '').trim();
      const normalized = normalizeText(raw);
      pattern.lastIndex = 0;
      if (pattern.test(normalized)) return raw;
    }
    return '';
  }

  function visibleExactText(pattern) {
    return Boolean(firstVisibleText(pattern));
  }

  function getCurrentSession() {
    const loginButtonVisible = visibleControlTextMatches((text) => text === 'MASUK' || text === 'LOGIN');
    const loginUserSelectVisible = Array.from(document.querySelectorAll('select'))
      .some((select) => isVisible(select) && normalizeText(select.textContent).includes('PILIH KASIR'));
    if (loginButtonVisible && loginUserSelectVisible) {
      return { authenticated: false, role: 'guest', name: '' };
    }

    const candidates = globalSessionCandidates().concat(storedSessionCandidates());
    let authenticated = candidates.length > 0;
    let role = '';
    let name = '';

    for (const value of candidates) {
      if (!role) role = roleFromValue(value);
      if (!name) name = nameFromValue(value);
    }

    const hasVisibleLogout = visibleControlTextMatches((text) => text === 'KELUAR' || text === 'LOGOUT');
    const visibleTexts = Array.from(document.querySelectorAll('button,a,[role="button"]'))
      .filter(isVisible)
      .map((el) => normalizeText(el.textContent));
    const hasAppNavigation = visibleTexts.includes('LAPORAN') &&
      (visibleTexts.includes('TRANSAKSI') || visibleTexts.includes('KASIR'));
    authenticated = authenticated || hasVisibleLogout || hasAppNavigation;

    if (!authenticated) return { authenticated: false, role: 'guest', name: '' };

    // Panel Admin hanya terlihat pada sesi admin di aplikasi utama.
    const adminPanelVisible = visibleExactText(/^(PANEL ADMIN|ADMIN)$/) ||
      visibleControlTextMatches((text) => text === 'PANEL ADMIN');
    if (adminPanelVisible) role = 'admin';

    if (!role) {
      if (visibleExactText(/^KASIR\s*[1-9][0-9]*$/)) role = 'cashier';
      else role = 'cashier';
    }

    if (!name) {
      const exactVisibleName = role === 'admin'
        ? firstVisibleText(/^ADMIN$/)
        : firstVisibleText(/^KASIR\s*[1-9][0-9]*$/);
      const userLabels = Array.from(document.querySelectorAll('[data-user],[data-cashier],[id*="currentUser"],[id*="currentCashier"],[id*="userName"],[id*="cashierName"],.current-user,.current-cashier,.user-name,.cashier-name'))
        .filter(isVisible)
        .map((el) => String(el.textContent || '').trim())
        .filter(Boolean);
      name = exactVisibleName || userLabels[0] || (role === 'admin' ? 'Admin' : 'Kasir');
    }

    if (role === 'admin') name = name || 'Admin';
    return { authenticated: true, role, name };
  }

  function isAuthenticated() {
    return getCurrentSession().authenticated;
  }

  function isAdmin() {
    return getCurrentSession().role === 'admin';
  }

  function currentCashierName() {
    const session = getCurrentSession();
    if (session.role !== 'cashier') return '';
    const key = cashierKey(session.name);
    const known = getCashiers().find((name) => cashierKey(name) === key);
    if (known) return known;
    const match = key.match(/KASIR([0-9]+)/);
    if (match) {
      const byNumber = getCashiers().find((name) => cashierKey(name) === `KASIR${match[1]}`);
      return byNumber || `Kasir ${match[1]}`;
    }
    return session.name && !/^KASIR$/i.test(session.name) ? session.name : '';
  }

  function elementText(element) {
    return normalizeText(element && element.textContent);
  }

  function scoreReportContainer(element) {
    if (!element || element === document.body || element === document.documentElement) return -1;
    const text = elementText(element);
    let score = 0;
    if (text.includes('LAPORAN ANALISIS')) score += 5;
    if (text.includes('GRAFIK PENJUALAN')) score += 3;
    if (text.includes('RINGKASAN')) score += 2;
    if (text.includes('KIRIM LAPORAN KE OWNER')) score += 2;
    if (text.includes('CATATAN STOK')) score += 1;
    if (element.matches('[data-page],[data-tab-content],section,main,.page,.tab-content,.content-section')) score += 1;
    return score;
  }

  function findReportHost() {
    const selectors = [
      '#reportsPage', '#reportPage', '#laporanPage', '#reports-page', '#report-page',
      '#laporan-page', '#reports', '#laporan', '[data-page="reports"]', '[data-page="report"]',
      '[data-page="laporan"]', '.reports-page', '.report-page', '.laporan-page'
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    const anchors = Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,button,a,div,section'))
      .filter((el) => {
        const text = elementText(el);
        return text === 'LAPORAN ANALISIS' || text === 'LAPORAN & ANALISIS' ||
          text === 'KIRIM LAPORAN KE OWNER' || text === 'GRAFIK PENJUALAN';
      });

    let best = null;
    let bestScore = -1;
    let bestSize = Number.POSITIVE_INFINITY;
    anchors.forEach((anchor) => {
      let node = anchor;
      for (let depth = 0; node && depth < 9; depth += 1, node = node.parentElement) {
        const score = scoreReportContainer(node);
        const size = node.querySelectorAll ? node.querySelectorAll('*').length : 999999;
        if (score > bestScore || (score === bestScore && size < bestSize)) {
          best = node;
          bestScore = score;
          bestSize = size;
        }
      }
    });
    return bestScore >= 5 ? best : null;
  }

  function createReportEntry() {
    const entry = document.createElement('section');
    entry.id = 'tecoAnalyticsReportEntry';
    entry.setAttribute('aria-label', 'Analisis penjualan dan bahan');
    entry.innerHTML = `
      <div class="ta-report-entry-card">
        <div class="ta-report-entry-copy">
          <span class="ta-report-entry-icon" aria-hidden="true">📊</span>
          <span><strong>Analisis Penjualan & Bahan</strong><small class="ta-report-entry-desc"></small><span class="ta-role-badge"></span></span>
        </div>
        <button class="ta-report-open" type="button">Buka Analisis</button>
      </div>`;
    entry.querySelector('.ta-report-open').addEventListener('click', () => openModal('daily'));
    updateReportEntry(entry);
    return entry;
  }

  function updateReportEntry(entry) {
    if (!entry) return;
    const session = getCurrentSession();
    const admin = session.role === 'admin';
    const desc = entry.querySelector('.ta-report-entry-desc');
    const badge = entry.querySelector('.ta-role-badge');
    if (desc) desc.textContent = admin
      ? 'Rekap cup/varian, analisis bahan, penyesuaian laporan, mapping resep, dan pengaturan.'
      : 'Rekap cup/varian, analisis bahan, ekspor laporan, dan penyesuaian laporan kasir.';
    if (badge) {
      badge.textContent = admin ? 'Akses Admin — pengaturan dapat diedit' : 'Akses Kasir — hanya penyesuaian laporan';
      badge.classList.toggle('admin', admin);
    }
  }

  function mountReportEntry() {
    if (!isAuthenticated()) return false;
    const host = findReportHost();
    if (!host) return false;
    let entry = document.getElementById('tecoAnalyticsReportEntry');
    if (!entry) entry = createReportEntry();
    if (entry.parentElement !== host) host.appendChild(entry);
    updateReportEntry(entry);
    return true;
  }

  function destroyProtectedUi() {
    const entry = document.getElementById('tecoAnalyticsReportEntry');
    if (entry) entry.remove();
    const overlay = document.getElementById('tecoAnalyticsOverlay');
    if (overlay) overlay.remove();
    const toastElement = document.getElementById('tecoAnalyticsToast');
    if (toastElement) toastElement.remove();
  }

  function syncAccessAndPlacement() {
    state.session = getCurrentSession();
    if (!state.session.authenticated) {
      destroyProtectedUi();
      return;
    }
    mountReportEntry();
  }

  function startAccessMonitor() {
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      setTimeout(() => {
        queued = false;
        syncAccessAndPlacement();
      }, 80);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden'] });
    document.addEventListener('click', schedule, true);
    window.addEventListener('storage', schedule);
    setInterval(syncAccessAndPlacement, 1200);
    syncAccessAndPlacement();
  }

  function createUi() {
    injectStyles();
    if (!isAuthenticated()) return false;

    if (!document.getElementById('tecoAnalyticsOverlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'tecoAnalyticsOverlay';
      overlay.innerHTML = `
        <div id="tecoAnalyticsModal" role="dialog" aria-modal="true" aria-labelledby="tecoAnalyticsTitle">
          <div class="ta-head">
            <div><h2 id="tecoAnalyticsTitle">Te.Co — Laporan & Analisis Bahan</h2><small>Rekap cup, varian, Excel harian/bulanan, dan kebutuhan bahan • v${VERSION}</small></div>
            <button class="ta-close" type="button" aria-label="Tutup">×</button>
          </div>
          <div class="ta-toolbar">
            <div class="ta-tabs">
              <button class="ta-tab active" data-tab="daily" type="button">Harian</button>
              <button class="ta-tab" data-tab="monthly" type="button">Bulanan</button>
              <button class="ta-tab" data-tab="adjustments" type="button">Penyesuaian Laporan</button>
              <button class="ta-tab ta-admin-only" data-tab="mapping" type="button">Mapping Resep</button>
              <button class="ta-tab ta-admin-only" data-tab="recipes" type="button">Daftar Resep</button>
              <button class="ta-tab ta-admin-only" data-tab="settings" type="button">Pengaturan</button>
            </div>
            <label class="ta-field ta-date-field"><span>Tanggal</span><input id="taDailyDate" type="date"></label>
            <label class="ta-field ta-month-field" style="display:none"><span>Bulan</span><input id="taMonthlyMonth" type="month"></label>
            <label class="ta-field ta-cashier-field"><span>Kasir</span><select id="taCashier"></select></label>
            <div class="ta-actions">
              <button class="ta-btn" data-teco-action="reload" type="button">↻ Muat Ulang</button>
              <button class="ta-btn wa" data-teco-action="wa" type="button">WhatsApp</button>
              <button class="ta-btn excel" data-teco-action="excel" type="button">Excel</button>
              <button class="ta-btn primary" data-teco-action="excelBoth" type="button">Harian + Bulanan</button>
            </div>
          </div>
          <div class="ta-body"><div id="taContent"></div></div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('.ta-close').addEventListener('click', closeModal);
      overlay.addEventListener('click', (event) => { if (event.target === overlay) closeModal(); });
      overlay.querySelectorAll('.ta-tab').forEach((button) => button.addEventListener('click', () => setTab(button.dataset.tab)));
      overlay.querySelector('#taDailyDate').addEventListener('change', (event) => { state.dailyDate = event.target.value; renderAll(); });
      overlay.querySelector('#taMonthlyMonth').addEventListener('change', (event) => { state.monthlyMonth = event.target.value; renderAll(); });
      overlay.querySelector('#taCashier').addEventListener('change', (event) => { state.cashier = event.target.value; renderAll(); });
      overlay.querySelector('[data-teco-action="reload"]').addEventListener('click', loadTransactions);
      overlay.querySelector('[data-teco-action="wa"]').addEventListener('click', () => sendWhatsApp(state.activeTab === 'monthly' ? 'monthly' : 'daily'));
      overlay.querySelector('[data-teco-action="excel"]').addEventListener('click', () => exportExcel(state.activeTab === 'monthly' ? 'monthly' : 'daily'));
      overlay.querySelector('[data-teco-action="excelBoth"]').addEventListener('click', () => exportExcel('both'));
    }
    return true;
  }

  function openModal(tab) {
    if (!isAuthenticated() || !createUi()) {
      console.warn('[TeCo Analytics] Akses ditolak: pengguna belum login.');
      return;
    }
    if (tab) state.activeTab = tab;
    document.getElementById('tecoAnalyticsOverlay').classList.add('open');
    syncControls();
    renderAll();
    if (!state.lastLoadedAt) loadTransactions();
  }

  function closeModal() {
    const overlay = document.getElementById('tecoAnalyticsOverlay');
    if (overlay) overlay.classList.remove('open');
  }

  function setTab(tab) {
    const adminOnly = ['mapping', 'recipes', 'settings'];
    if (adminOnly.includes(tab) && !isAdmin()) {
      state.activeTab = 'adjustments';
      toast('Akun kasir hanya dapat menyesuaikan data laporan');
    } else {
      state.activeTab = tab;
    }
    syncControls();
    renderAll();
  }

  function syncControls() {
    const overlay = document.getElementById('tecoAnalyticsOverlay');
    if (!overlay) return;
    const session = getCurrentSession();
    const admin = session.role === 'admin';
    if (!admin && ['mapping', 'recipes', 'settings'].includes(state.activeTab)) state.activeTab = 'daily';

    overlay.querySelectorAll('.ta-admin-only').forEach((element) => { element.style.display = admin ? '' : 'none'; });
    overlay.querySelectorAll('.ta-tab').forEach((button) => button.classList.toggle('active', button.dataset.tab === state.activeTab));
    overlay.querySelector('#taDailyDate').value = state.dailyDate;
    overlay.querySelector('#taMonthlyMonth').value = state.monthlyMonth;
    overlay.querySelector('.ta-date-field').style.display = ['daily', 'adjustments'].includes(state.activeTab) ? '' : 'none';
    overlay.querySelector('.ta-month-field').style.display = state.activeTab === 'monthly' ? '' : 'none';
    overlay.querySelector('.ta-cashier-field').style.display = ['daily', 'monthly', 'adjustments', 'mapping'].includes(state.activeTab) ? '' : 'none';
    const actions = overlay.querySelector('.ta-actions');
    actions.style.display = ['daily', 'monthly'].includes(state.activeTab) ? 'flex' : 'none';
    const select = overlay.querySelector('#taCashier');
    const cashiers = getCashiers();
    if (admin) {
      const options = ['<option value="ALL">Semua Kasir</option>'].concat(cashiers.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`));
      select.innerHTML = options.join('');
      if (state.cashier !== 'ALL') {
        const matchedCashier = cashiers.find((name) => sameCashier(name, state.cashier));
        state.cashier = matchedCashier || 'ALL';
      }
      select.value = state.cashier;
      select.disabled = false;
    } else {
      const ownName = currentCashierName() || state.cashier || 'Kasir';
      state.cashier = ownName;
      select.innerHTML = `<option value="${escapeHtml(ownName)}">${escapeHtml(ownName)}</option>`;
      select.value = ownName;
      select.disabled = true;
    }
  }

  function renderStatus(message, isError) {
    const content = document.getElementById('taContent');
    if (!content) return;
    content.innerHTML = `<div class="ta-status${isError ? ' error' : ''}">${escapeHtml(message)}</div>`;
  }

  function renderAll() {
    const content = document.getElementById('taContent');
    if (!content) return;
    syncControls();
    if (state.loading) {
      renderStatus(`Memuat transaksi — mode ${storageModeLabel()}…`);
      return;
    }
    if (state.activeTab === 'daily' || state.activeTab === 'monthly') renderReport(state.activeTab);
    else if (state.activeTab === 'adjustments') renderAdjustments();
    else if (state.activeTab === 'mapping' && isAdmin()) renderMapping();
    else if (state.activeTab === 'recipes' && isAdmin()) renderRecipes();
    else if (state.activeTab === 'settings' && isAdmin()) renderSettings();
    else {
      state.activeTab = 'daily';
      renderReport('daily');
    }
  }

  function renderReport(mode) {
    const content = document.getElementById('taContent');
    const report = aggregate(mode);
    const periodLabel = mode === 'daily' ? longDate(state.dailyDate) : monthLabel(state.monthlyMonth);
    const errorText = state.loadErrors.length ? ` • ${state.loadErrors.join(' • ')}` : '';
    const variantRows = report.variants.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(row.name)}</strong><br><span class="${row.recipe ? 'ta-badge' : 'ta-badge miss'}">${escapeHtml(row.recipe || 'Belum dipetakan')}</span></td>
        <td class="ta-num"><strong>${formatDecimal(row.qty)}</strong> cup</td>
        <td class="ta-num">${formatRupiah(row.revenue)}</td>
      </tr>`).join('');
    const materialRows = report.materials.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(row.material)}</strong><br><span class="ta-muted">${escapeHtml(row.type)}</span></td>
        <td class="ta-num"><strong>${escapeHtml(formatMeasurement(row.qty, row.unit))}</strong></td>
        <td class="ta-muted">${escapeHtml(row.recipes.join(', '))}</td>
      </tr>`).join('');
    const expenseRows = report.expenseClassifications.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeHtml(row.category)}</strong><br><span class="ta-muted">${escapeHtml(row.note)}</span></td>
        <td class="ta-num"><strong>${row.count}</strong> transaksi</td>
        <td class="ta-num"><strong>${formatRupiah(row.amount)}</strong></td>
      </tr>`).join('');

    content.innerHTML = `
      <div class="ta-status">Periode: <strong>${escapeHtml(periodLabel)}</strong> • Sumber: ${escapeHtml(sourceSummary())}${escapeHtml(errorText)}</div>
      <div class="ta-cards">
        <div class="ta-card"><span>Transaksi</span><strong>${report.transactionCount}</strong></div>
        <div class="ta-card"><span>Total cup</span><strong>${formatDecimal(report.totalCups)}</strong></div>
        <div class="ta-card"><span>Varian berbeda</span><strong>${report.distinctVariants}</strong></div>
        <div class="ta-card"><span>Omzet</span><strong style="font-size:16px">${formatRupiah(report.totalRevenue)}</strong></div>
        <div class="ta-card"><span>Pengeluaran</span><strong style="font-size:16px">${formatRupiah(report.totalExpenses)}</strong></div>
        <div class="ta-card"><span>Penyesuaian</span><strong>${report.adjustmentCount}</strong></div>
      </div>
      ${report.adjustmentCount ? `<div class="ta-status" style="margin-bottom:12px">Laporan ini memuat <strong>${report.adjustmentCount}</strong> penyesuaian manual. Transaksi asli tidak diubah.</div>` : ''}
      ${report.concentrateUsageMl > 0 ? `<div class="ta-note" style="margin-bottom:12px"><strong>Kebutuhan konsentrat:</strong> ${escapeHtml(formatMeasurement(report.concentrateUsageMl, 'ml'))} atau sekitar ${formatDecimal(report.concentrateBatches)} batch, dengan asumsi hasil satu batch ${formatDecimal(state.settings.concentrateBatchYieldMl)} ml.</div>` : ''}
      <div class="ta-grid">
        <section class="ta-panel"><h3>Rekap Varian Terjual</h3><div class="ta-table-wrap"><table class="ta-table"><thead><tr><th>No.</th><th>Varian</th><th class="ta-num">Cup</th><th class="ta-num">Omzet Item</th></tr></thead><tbody>${variantRows || '<tr><td colspan="4" class="ta-muted">Belum ada transaksi pada periode ini.</td></tr>'}</tbody></table></div></section>
        <section class="ta-panel"><h3>Analisis Bahan Terpakai</h3><div class="ta-table-wrap"><table class="ta-table"><thead><tr><th>No.</th><th>Bahan</th><th class="ta-num">Jumlah</th><th>Dipakai oleh</th></tr></thead><tbody>${materialRows || '<tr><td colspan="4" class="ta-muted">Belum ada bahan yang dapat dihitung.</td></tr>'}</tbody></table></div></section>
        <section class="ta-panel" style="grid-column:1/-1"><h3>Rekap Pengeluaran per Klasifikasi</h3><div class="ta-table-wrap"><table class="ta-table"><thead><tr><th>No.</th><th>Klasifikasi & Keterangan</th><th class="ta-num">Frekuensi</th><th class="ta-num">Total</th></tr></thead><tbody>${expenseRows || '<tr><td colspan="4" class="ta-muted">Belum ada pengeluaran pada periode ini.</td></tr>'}</tbody></table></div></section>
      </div>`;
  }

  function allKnownVariants() {
    const map = new Map();
    state.transactions.forEach((tx) => tx.items.forEach((item) => {
      const key = normalizeText(item.name);
      if (!map.has(key)) map.set(key, item.name);
    }));
    return Array.from(map.entries()).map(([key, name]) => ({ key, name, recipe: mapRecipe(name) })).sort((a, b) => a.name.localeCompare(b.name));
  }

  function recipeOptions(selected) {
    return ['<option value="">— Belum dipetakan —</option>'].concat(RECIPE_NAMES.map((name) => `<option value="${escapeHtml(name)}"${name === selected ? ' selected' : ''}>${escapeHtml(name)}</option>`)).join('');
  }

  async function syncAdjustmentToCloud(row, remove) {
    if (getStorageMode() === 'local') return { skipped: true, reason: 'Mode Lokal saja' };
    const dbUrl = String(state.settings.firebaseDbUrl || FIREBASE_DB_URL).replace(/\/$/, '');
    const id = encodeURIComponent(String(row.id));
    try {
      const response = await fetch(`${dbUrl}/analyticsAdjustments/${id}.json`, {
        method: remove ? 'DELETE' : 'PUT',
        headers: remove ? undefined : { 'Content-Type': 'application/json' },
        body: remove ? undefined : JSON.stringify(row)
      });
      if (!response.ok) throw new Error(`Firebase HTTP ${response.status}`);
      setFirebaseStatus('connected', 'Penyesuaian laporan berhasil disinkronkan');
      return { skipped: false };
    } catch (err) {
      setFirebaseStatus('fallback', err && err.message ? err.message : String(err));
      throw err;
    }
  }

  function adjustmentId() {
    return `adj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function canManageAdjustment(row) {
    if (isAdmin()) return true;
    const own = currentCashierName();
    return Boolean(own && sameCashier(row.cashier, own));
  }

  function renderAdjustments(editId) {
    const content = document.getElementById('taContent');
    const session = getCurrentSession();
    const admin = session.role === 'admin';
    const ownName = currentCashierName();
    const editing = editId ? state.adjustments.find((row) => row.id === editId && canManageAdjustment(row)) : null;
    const selectedDate = editing ? editing.date : state.dailyDate;
    const selectedCashier = editing ? editing.cashier : (admin ? (state.cashier === 'ALL' ? '' : state.cashier) : ownName);
    const variantNames = Array.from(new Set(allKnownVariants().map((row) => row.name))).sort((a, b) => a.localeCompare(b));
    const visibleRows = state.adjustments
      .filter((row) => admin || sameCashier(row.cashier, ownName))
      .filter((row) => !admin || state.cashier === 'ALL' || sameCashier(row.cashier, state.cashier))
      .filter((row) => !state.dailyDate || row.date === state.dailyDate)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const cashierOptions = getCashiers().map((name) => `<option value="${escapeHtml(name)}"${sameCashier(name, selectedCashier) ? ' selected' : ''}>${escapeHtml(name)}</option>`).join('');

    content.innerHTML = `
      <div class="ta-status">Penyesuaian hanya mengoreksi hasil laporan dan analisis bahan; transaksi asli tetap tersimpan tanpa perubahan. Nilai positif menambah, nilai negatif mengurangi.</div>
      ${admin ? '<div class="ta-note" style="margin-bottom:12px"><strong>Admin:</strong> dapat membuat, mengedit, dan menghapus penyesuaian semua kasir.</div>' : '<div class="ta-lock" style="margin-bottom:12px"><strong>Akun kasir:</strong> hanya dapat mengelola penyesuaian laporan milik akun sendiri. Mapping resep dan pengaturan analisis dikunci.</div>'}
      <section class="ta-panel" style="margin-bottom:14px"><h3>${editing ? 'Edit' : 'Tambah'} Penyesuaian Laporan</h3><div class="ta-pad">
        <div class="ta-adjust-form">
          <label class="ta-field"><span>Tanggal</span><input id="taAdjDate" type="date" value="${escapeHtml(selectedDate)}"></label>
          <label class="ta-field"><span>Kasir</span><select id="taAdjCashier"${admin ? '' : ' disabled'}>${admin ? `<option value="">Pilih kasir</option>${cashierOptions}` : `<option value="${escapeHtml(ownName)}">${escapeHtml(ownName || 'Kasir')}</option>`}</select></label>
          <label class="ta-field"><span>Varian</span><input id="taAdjVariant" list="taVariantList" placeholder="Nama varian" value="${escapeHtml(editing ? editing.variant : '')}"><datalist id="taVariantList">${variantNames.map((name) => `<option value="${escapeHtml(name)}"></option>`).join('')}</datalist></label>
          <label class="ta-field"><span>Koreksi Cup (+/-)</span><input id="taAdjQty" type="number" step="1" value="${escapeHtml(editing ? editing.qtyDelta : 0)}"></label>
          <label class="ta-field"><span>Koreksi Omzet (+/- Rp)</span><input id="taAdjRevenue" type="number" step="1" value="${escapeHtml(editing ? editing.revenueDelta : 0)}"></label>
          <label class="ta-field wide"><span>Catatan/alasan</span><input id="taAdjNote" type="text" maxlength="200" placeholder="Contoh: salah input 1 cup" value="${escapeHtml(editing ? editing.note : '')}"></label>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button id="taSaveAdjustment" class="ta-btn primary" type="button">${editing ? 'Simpan Perubahan' : '+ Tambah Penyesuaian'}</button>${editing ? '<button id="taCancelAdjustment" class="ta-btn" type="button">Batal Edit</button>' : ''}</div>
      </div></section>
      <section class="ta-panel"><h3>Riwayat Penyesuaian — ${escapeHtml(longDate(state.dailyDate))}</h3><div class="ta-table-wrap"><table class="ta-table"><thead><tr><th>Tanggal</th><th>Kasir</th><th>Varian</th><th class="ta-num">Cup</th><th class="ta-num">Omzet</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>
        ${visibleRows.map((row) => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.cashier)}</td><td>${escapeHtml(row.variant)}</td><td class="ta-num">${row.qtyDelta > 0 ? '+' : ''}${formatDecimal(row.qtyDelta)}</td><td class="ta-num">${row.revenueDelta > 0 ? '+' : ''}${formatRupiah(row.revenueDelta)}</td><td>${escapeHtml(row.note || '-')}<br><span class="ta-muted">oleh ${escapeHtml(row.createdBy || '-')}</span></td><td>${canManageAdjustment(row) ? `<button class="ta-btn" data-adj-edit="${escapeHtml(row.id)}" type="button">Edit</button> <button class="ta-btn warn" data-adj-delete="${escapeHtml(row.id)}" type="button">Hapus</button>` : '-'}</td></tr>`).join('') || '<tr><td colspan="7" class="ta-muted">Belum ada penyesuaian pada tanggal ini.</td></tr>'}
      </tbody></table></div></section>`;

    content.querySelector('#taSaveAdjustment').addEventListener('click', () => {
      const date = content.querySelector('#taAdjDate').value;
      const cashier = admin ? content.querySelector('#taAdjCashier').value : ownName;
      const variant = content.querySelector('#taAdjVariant').value.trim();
      const qtyDelta = toNumber(content.querySelector('#taAdjQty').value);
      const revenueDelta = toNumber(content.querySelector('#taAdjRevenue').value);
      const note = content.querySelector('#taAdjNote').value.trim();
      if (!date || !cashier || !variant) { toast('Tanggal, kasir, dan varian wajib diisi'); return; }
      if (!qtyDelta && !revenueDelta) { toast('Isi koreksi cup atau omzet'); return; }
      if (editing) {
        Object.assign(editing, { date, cashier, variant, qtyDelta, revenueDelta, note, updatedAt: new Date().toISOString(), updatedBy: session.name });
      } else {
        state.adjustments.push({ id: adjustmentId(), date, cashier, variant, qtyDelta, revenueDelta, note, createdAt: new Date().toISOString(), createdBy: session.name || cashier });
      }
      saveAdjustments();
      const savedRow = editing || state.adjustments[state.adjustments.length - 1];
      syncAdjustmentToCloud(savedRow, false).catch((err) => {
        console.warn('[TeCo Analytics] Penyesuaian tersimpan lokal, sinkron cloud gagal:', err);
        toast('Tersimpan di perangkat; sinkron cloud gagal');
      });
      state.dailyDate = date;
      toast(editing ? 'Penyesuaian diperbarui' : 'Penyesuaian ditambahkan');
      renderAdjustments();
    });
    const cancel = content.querySelector('#taCancelAdjustment');
    if (cancel) cancel.addEventListener('click', () => renderAdjustments());
    content.querySelectorAll('[data-adj-edit]').forEach((button) => button.addEventListener('click', () => renderAdjustments(button.dataset.adjEdit)));
    content.querySelectorAll('[data-adj-delete]').forEach((button) => button.addEventListener('click', () => {
      const row = state.adjustments.find((item) => item.id === button.dataset.adjDelete);
      if (!row || !canManageAdjustment(row)) return;
      state.adjustments = state.adjustments.filter((item) => item.id !== row.id);
      saveAdjustments();
      syncAdjustmentToCloud(row, true).catch((err) => {
        console.warn('[TeCo Analytics] Penyesuaian terhapus lokal, sinkron cloud gagal:', err);
        toast('Terhapus di perangkat; sinkron cloud gagal');
      });
      toast('Penyesuaian dihapus');
      renderAdjustments();
    }));
  }

  function renderMapping() {
    if (!isAdmin()) { setTab('adjustments'); return; }
    const content = document.getElementById('taContent');
    const rows = allKnownVariants();
    content.innerHTML = `
      <div class="ta-status">Mapping menentukan resep yang digunakan untuk menghitung bahan. Sistem sudah mencoba mengenali nama varian secara otomatis; pilihan manual akan disimpan di perangkat ini.</div>
      <section class="ta-panel"><h3>Mapping Produk/Varian ke Resep</h3><div class="ta-table-wrap"><table class="ta-table"><thead><tr><th>No.</th><th>Nama di Transaksi</th><th>Resep</th><th>Status</th></tr></thead><tbody>
        ${rows.map((row, index) => `<tr><td>${index + 1}</td><td><strong>${escapeHtml(row.name)}</strong></td><td><select class="ta-map-select" data-map-key="${escapeHtml(row.key)}">${recipeOptions(row.recipe)}</select></td><td><span class="${row.recipe ? 'ta-badge' : 'ta-badge miss'}">${row.recipe ? 'Terpetakan' : 'Perlu dipilih'}</span></td></tr>`).join('') || '<tr><td colspan="4" class="ta-muted">Belum ada nama produk dari transaksi.</td></tr>'}
      </tbody></table></div></section>`;
    content.querySelectorAll('[data-map-key]').forEach((select) => select.addEventListener('change', (event) => {
      const key = event.target.dataset.mapKey;
      const value = event.target.value;
      if (value) state.settings.productRecipeMap[key] = value;
      else delete state.settings.productRecipeMap[key];
      saveSettings();
      renderMapping();
      toast('Mapping resep disimpan');
    }));
  }

  function renderRecipes() {
    if (!isAdmin()) { setTab('adjustments'); return; }
    const content = document.getElementById('taContent');
    const html = Object.entries(RECIPES).map(([name, items]) => `
      <div class="ta-recipe"><h4>${escapeHtml(name)}</h4><ul>${items.map((item) => `<li>${escapeHtml(item.material)} — ${escapeHtml(formatMeasurement(item.qty, item.unit))}</li>`).join('')}</ul></div>`).join('');
    content.innerHTML = `
      <div class="ta-note" style="margin-bottom:12px">Resep diambil dari file <strong>HPP_Resep_Bahan_Penggunaan.xlsx</strong>. Ejaan “Fruktosaa” dan “Gula Arenn” dinormalisasi. Kemasan dihitung otomatis satu set per cup, termasuk Coffee Milo.</div>
      <section class="ta-panel"><h3>Daftar Resep</h3><div class="ta-pad">${html}</div></section>`;
  }

  function renderSettings() {
    if (!isAdmin()) { setTab('adjustments'); return; }
    const content = document.getElementById('taContent');
    const mode = getStorageMode();
    const statusClass = state.firebaseStatus && ['failed', 'fallback'].includes(state.firebaseStatus.state) ? ' error' : '';
    content.innerHTML = `
      <div class="ta-settings">
        <label class="ta-field"><span>Nomor WhatsApp Owner</span><input id="taOwnerWa" type="tel" placeholder="Contoh: 628123456789" value="${escapeHtml(state.settings.ownerWhatsApp)}"></label>
        <label class="ta-field"><span>Hasil 1 Batch Konsentrat (ml)</span><input id="taYield" type="number" min="1" step="1" value="${escapeHtml(state.settings.concentrateBatchYieldMl)}"></label>
        <label class="ta-field"><span>Sumber/Penyimpanan Data</span><select id="taStorageMode"><option value="auto"${mode === 'auto' ? ' selected' : ''}>Otomatis — gabungkan lokal dan Firebase</option><option value="firebase"${mode === 'firebase' ? ' selected' : ''}>Firebase — cadangan lokal jika gagal</option><option value="local"${mode === 'local' ? ' selected' : ''}>Lokal saja — tanpa Firebase</option></select></label>
        <label class="ta-field"><span>URL Firebase Realtime Database</span><input id="taFirebaseUrl" type="url" value="${escapeHtml(state.settings.firebaseDbUrl)}"></label>
        <label class="ta-field"><span>Ekspansi Konsentrat</span><select id="taExpand"><option value="yes"${state.settings.expandConcentrate ? ' selected' : ''}>Uraikan menjadi bahan baku</option><option value="no"${!state.settings.expandConcentrate ? ' selected' : ''}>Tampilkan sebagai Konsentrat</option></select></label>
      </div>
      <div class="ta-note" style="margin-top:12px"><strong>Pilihan penyimpanan:</strong> Otomatis menggabungkan data aplikasi dan Firebase. Firebase menjadikan cloud sebagai sumber utama tetapi tetap memakai data lokal bila cloud gagal. Lokal saja menonaktifkan semua permintaan Firebase dan menyimpan penyesuaian hanya pada perangkat ini.</div>
      <div id="taFirebaseStatus" class="ta-status${statusClass}" style="margin-top:12px"><strong>Status Firebase:</strong> ${escapeHtml(firebaseStatusText())}</div>
      <div class="ta-note" style="margin-top:12px">File resep tidak mencantumkan hasil akhir satu batch konsentrat. Nilai awal ditetapkan 1.000 ml dan dapat disesuaikan di sini agar kalkulasi bahan baku tepat dengan praktik produksi.</div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button id="taSaveSettings" class="ta-btn primary" type="button">Simpan Pengaturan</button><button id="taTestFirebase" class="ta-btn" type="button">Uji Firebase</button><button id="taResetMapping" class="ta-btn warn" type="button">Reset Mapping Manual</button></div>
      <div class="ta-status" style="margin-top:12px">Mode aktif: <strong>${escapeHtml(storageModeLabel())}</strong>. Sumber data terakhir: ${escapeHtml(sourceSummary())}. Terakhir dimuat: ${state.lastLoadedAt ? escapeHtml(jakartaDateTime(state.lastLoadedAt)) : 'belum pernah'}.</div>`;
    content.querySelector('#taSaveSettings').addEventListener('click', () => {
      const previousMode = getStorageMode();
      state.settings.ownerWhatsApp = content.querySelector('#taOwnerWa').value.trim();
      state.settings.concentrateBatchYieldMl = Math.max(1, toNumber(content.querySelector('#taYield').value) || 1000);
      state.settings.storageMode = content.querySelector('#taStorageMode').value;
      state.settings.firebaseDbUrl = content.querySelector('#taFirebaseUrl').value.trim() || FIREBASE_DB_URL;
      state.settings.expandConcentrate = content.querySelector('#taExpand').value === 'yes';
      saveSettings();
      if (state.settings.storageMode === 'local') clearFirebaseRealtimeSync();
      else if (previousMode === 'local') firebaseRealtimeInstalled = false;
      toast(`Pengaturan disimpan — ${storageModeLabel()}`);
      loadTransactions({ silent: true, reason: 'perubahan mode penyimpanan' });
      renderSettings();
    });
    content.querySelector('#taTestFirebase').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const url = content.querySelector('#taFirebaseUrl').value.trim() || FIREBASE_DB_URL;
      button.disabled = true;
      button.textContent = 'Menguji…';
      try {
        const result = await fetchFirebaseData(url);
        const count = (result.txs || []).length;
        setFirebaseStatus('connected', `Koneksi berhasil; ${count} transaksi ditemukan`);
        toast('Firebase berhasil terhubung');
      } catch (err) {
        const message = err && err.message ? err.message : String(err);
        setFirebaseStatus('failed', message);
        toast('Firebase gagal; pilih Lokal saja atau periksa URL/rules');
      } finally {
        renderSettings();
      }
    });
    content.querySelector('#taResetMapping').addEventListener('click', () => {
      state.settings.productRecipeMap = {};
      saveSettings();
      toast('Mapping manual direset');
      renderSettings();
    });
  }

  function reportTitle(mode) {
    return mode === 'monthly' ? `Bulanan ${monthLabel(state.monthlyMonth)}` : `Harian ${longDate(state.dailyDate)}`;
  }

  function buildWhatsAppMessage(mode) {
    const report = aggregate(mode);
    const lines = [];
    lines.push(`*LAPORAN PENJUALAN TE.CO — ${mode === 'monthly' ? 'BULANAN' : 'HARIAN'}*`);
    lines.push(`Periode: ${mode === 'monthly' ? monthLabel(state.monthlyMonth) : longDate(state.dailyDate)}`);
    lines.push(`Kasir: ${state.cashier === 'ALL' ? 'Semua Kasir' : state.cashier}`);
    lines.push('');
    lines.push(`Total transaksi: *${report.transactionCount}*`);
    lines.push(`Total cup terjual: *${formatDecimal(report.totalCups)} cup*`);
    lines.push(`Jumlah varian: *${report.distinctVariants}*`);
    lines.push(`Omzet kotor: *${formatRupiah(report.totalRevenue)}*`);
    lines.push(`Total pengeluaran: *${formatRupiah(report.totalExpenses)}*`);
    lines.push(`Saldo bersih: *${formatRupiah(report.netRevenue)}*`);
    if (report.adjustmentCount) lines.push(`Penyesuaian manual: *${report.adjustmentCount}* (${formatRupiah(report.adjustmentRevenue)})`);

    lines.push('');
    lines.push('*TIPE PEMBAYARAN*');
    if (!report.payments.length) lines.push('- Belum ada data pembayaran');
    report.payments.forEach((row) => lines.push(`- ${row.name}: *${row.count} transaksi* — ${formatRupiah(row.amount)}`));
    if (report.adjustmentRevenue) lines.push(`- Penyesuaian laporan tanpa tipe pembayaran: ${formatRupiah(report.adjustmentRevenue)}`);

    lines.push('');
    lines.push('*REKAP PENGELUARAN PER KLASIFIKASI*');
    if (!report.expenseClassifications.length) {
      lines.push('- Tidak ada pengeluaran pada periode ini');
    } else {
      report.expenseClassifications.forEach((row, index) => {
        lines.push(`${index + 1}. ${row.category} — ${row.note}: *${row.count} transaksi / ${formatRupiah(row.amount)}*`);
      });
    }

    lines.push('');
    lines.push('*DETAIL PENGELUARAN*');
    if (!report.expenses.length) {
      lines.push('- Tidak ada pengeluaran pada periode ini');
    } else {
      report.expenses.slice().sort((a, b) => a.date - b.date).slice(0, 50).forEach((row, index) => {
        const note = row.note ? ` — ${row.note}` : '';
        const cashier = row.cashier && normalizeText(row.cashier) !== 'TIDAK DIKETAHUI' ? ` • ${row.cashier}` : '';
        lines.push(`${index + 1}. ${jakartaDateKey(row.date)}${cashier} • ${row.category}: *${formatRupiah(row.amount)}*${note}`);
      });
      if (report.expenses.length > 50) lines.push(`- ...dan ${report.expenses.length - 50} pengeluaran lainnya`);
    }

    lines.push('');
    lines.push('*CATATAN*');
    if (!report.notes.length && !report.expenses.some((row) => row.note)) {
      lines.push('- Tidak ada catatan');
    } else {
      report.notes.slice(0, 30).forEach((note) => lines.push(`- ${note}`));
      const expenseNotes = report.expenses
        .filter((row) => row.note)
        .map((row) => `${jakartaDateKey(row.date)} • Pengeluaran ${row.category}: ${row.note}`);
      expenseNotes.slice(0, Math.max(0, 30 - report.notes.length)).forEach((note) => lines.push(`- ${note}`));
      const shown = Math.min(30, report.notes.length + expenseNotes.length);
      const totalNotes = report.notes.length + expenseNotes.length;
      if (totalNotes > shown) lines.push(`- ...dan ${totalNotes - shown} catatan lainnya`);
    }

    lines.push('');
    lines.push('*REKAP VARIAN TERJUAL*');
    if (!report.variants.length) lines.push('- Belum ada transaksi');
    report.variants.slice(0, 50).forEach((row, index) => lines.push(`${index + 1}. ${row.name}: *${formatDecimal(row.qty)} cup*`));

    lines.push('');
    lines.push('*ANALISIS BAHAN TERPAKAI*');
    if (report.concentrateUsageMl > 0) {
      lines.push(`Konsentrat: *${formatMeasurement(report.concentrateUsageMl, 'ml')}* (±${formatDecimal(report.concentrateBatches)} batch)`);
    }
    report.materials.slice(0, 50).forEach((row) => lines.push(`- ${row.material}: ${formatMeasurement(row.qty, row.unit)}`));
    if (report.unmatched.length) {
      lines.push('');
      lines.push('*VARIAN BELUM DIPETAKAN KE RESEP*');
      report.unmatched.forEach((row) => lines.push(`- ${row.name}: ${formatDecimal(row.qty)} cup`));
    }
    lines.push('');
    lines.push(`Dibuat otomatis oleh Te.Co Analytics v${VERSION}`);
    return lines.join('\n');
  }

  function normalizePhone(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
    return digits;
  }

  async function sendWhatsApp(mode) {
    if (!isAuthenticated()) {
      console.warn('[TeCo Analytics] WhatsApp tidak dibuka karena pengguna belum login.');
      return;
    }
    if (!state.lastLoadedAt) await loadTransactions();
    const message = buildWhatsAppMessage(mode);
    const phone = normalizePhone(state.settings.ownerWhatsApp);
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function transactionRows(report) {
    const rows = [];
    report.txs.slice().sort((a, b) => a.date - b.date).forEach((tx) => {
      tx.items.forEach((item) => {
        rows.push({
          Tanggal: jakartaDateKey(tx.date),
          Waktu: jakartaDateTime(tx.date).slice(11),
          ID_Transaksi: tx.id,
          Kasir: tx.cashier,
          Pembayaran: tx.payment,
          Catatan: tx.note || '',
          Varian: item.name,
          Qty_Cup: item.qty,
          Harga_Satuan: item.price,
          Subtotal_Item: item.subtotal,
          Total_Transaksi: tx.total,
          Sumber: tx.sourcePath
        });
      });
    });
    return rows;
  }

  function summaryRows(report, mode) {
    return [
      { Keterangan: 'Jenis Laporan', Nilai: mode === 'monthly' ? 'Bulanan' : 'Harian' },
      { Keterangan: 'Periode', Nilai: mode === 'monthly' ? monthLabel(state.monthlyMonth) : longDate(state.dailyDate) },
      { Keterangan: 'Kasir', Nilai: state.cashier === 'ALL' ? 'Semua Kasir' : state.cashier },
      { Keterangan: 'Total Transaksi', Nilai: report.transactionCount },
      { Keterangan: 'Total Cup', Nilai: report.totalCups },
      { Keterangan: 'Jumlah Varian', Nilai: report.distinctVariants },
      { Keterangan: 'Omzet', Nilai: report.totalRevenue },
      { Keterangan: 'Konsentrat Terpakai (ml)', Nilai: report.concentrateUsageMl },
      { Keterangan: 'Perkiraan Batch Konsentrat', Nilai: report.concentrateBatches },
      { Keterangan: 'Asumsi Hasil 1 Batch (ml)', Nilai: state.settings.concentrateBatchYieldMl },
      { Keterangan: 'Varian Belum Terpetakan', Nilai: report.unmatched.length },
      { Keterangan: 'Jumlah Penyesuaian Manual', Nilai: report.adjustmentCount }
    ];
  }

  function variantExportRows(report) {
    return report.variants.map((row, index) => ({
      No: index + 1,
      Varian: row.name,
      Total_Cup: row.qty,
      Omzet_Item: row.revenue,
      Resep: row.recipe || 'BELUM DIPETAKAN'
    }));
  }

  function materialExportRows(report) {
    const rows = report.materials.map((row, index) => ({
      No: index + 1,
      Bahan: row.material,
      Jumlah: row.qty,
      Satuan: row.unit,
      Tampilan: formatMeasurement(row.qty, row.unit),
      Jenis: row.type,
      Dipakai_Oleh: row.recipes.join(', ')
    }));
    if (report.concentrateUsageMl > 0) {
      rows.unshift({
        No: 0,
        Bahan: 'Konsentrat (kebutuhan produksi)',
        Jumlah: report.concentrateUsageMl,
        Satuan: 'ml',
        Tampilan: formatMeasurement(report.concentrateUsageMl, 'ml'),
        Jenis: 'Bahan antara',
        Dipakai_Oleh: 'Produk berbasis konsentrat'
      });
    }
    return rows;
  }

  function adjustmentExportRows(report) {
    return report.adjustments.map((row, index) => ({
      No: index + 1,
      Tanggal: row.date,
      Kasir: row.cashier,
      Varian: row.variant,
      Koreksi_Cup: row.qtyDelta,
      Koreksi_Omzet: row.revenueDelta,
      Catatan: row.note || '',
      Dibuat_Oleh: row.createdBy || '',
      Dibuat_Pada: row.createdAt || '',
      Diubah_Oleh: row.updatedBy || '',
      Diubah_Pada: row.updatedAt || ''
    }));
  }

  function recipeExportRows() {
    const rows = [];
    Object.entries(RECIPES).forEach(([recipe, items]) => {
      items.forEach((item) => rows.push({ Resep: recipe, Bahan: item.material, Jumlah_per_Cup_atau_Batch: item.qty, Satuan: item.unit }));
    });
    return rows;
  }

  function mappingExportRows() {
    return allKnownVariants().map((row, index) => ({ No: index + 1, Nama_Produk_Varian: row.name, Resep: row.recipe || 'BELUM DIPETAKAN' }));
  }

  async function ensureXlsx() {
    if (window.XLSX) return window.XLSX;
    await new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src*="xlsx.full.min.js"]`);
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = XLSX_CDN;
      script.onload = resolve;
      script.onerror = () => reject(new Error('Gagal memuat pustaka Excel'));
      document.head.appendChild(script);
    });
    if (!window.XLSX) throw new Error('Pustaka Excel tidak tersedia');
    return window.XLSX;
  }

  function addSheet(XLSX, workbook, name, rows) {
    const safeName = name.slice(0, 31);
    const data = rows.length ? rows : [{ Keterangan: 'Tidak ada data pada periode ini' }];
    const sheet = XLSX.utils.json_to_sheet(data);
    const widths = Object.keys(data[0] || {}).map((key) => ({ wch: Math.min(42, Math.max(12, key.length + 3)) }));
    sheet['!cols'] = widths;
    XLSX.utils.book_append_sheet(workbook, sheet, safeName);
  }

  async function exportExcel(mode) {
    if (!isAuthenticated()) {
      console.warn('[TeCo Analytics] Ekspor dibatalkan karena pengguna belum login.');
      return;
    }
    try {
      if (!state.lastLoadedAt) await loadTransactions();
      const XLSX = await ensureXlsx();
      const workbook = XLSX.utils.book_new();
      if (mode === 'daily' || mode === 'both') {
        const daily = aggregate('daily');
        addSheet(XLSX, workbook, 'Ringkasan Harian', summaryRows(daily, 'daily'));
        addSheet(XLSX, workbook, 'Varian Harian', variantExportRows(daily));
        addSheet(XLSX, workbook, 'Bahan Harian', materialExportRows(daily));
        addSheet(XLSX, workbook, 'Transaksi Harian', transactionRows(daily));
        addSheet(XLSX, workbook, 'Penyesuaian Harian', adjustmentExportRows(daily));
      }
      if (mode === 'monthly' || mode === 'both') {
        const monthly = aggregate('monthly');
        addSheet(XLSX, workbook, 'Ringkasan Bulanan', summaryRows(monthly, 'monthly'));
        addSheet(XLSX, workbook, 'Varian Bulanan', variantExportRows(monthly));
        addSheet(XLSX, workbook, 'Bahan Bulanan', materialExportRows(monthly));
        addSheet(XLSX, workbook, 'Transaksi Bulanan', transactionRows(monthly));
        addSheet(XLSX, workbook, 'Penyesuaian Bulanan', adjustmentExportRows(monthly));
      }
      if (isAdmin()) {
        addSheet(XLSX, workbook, 'Mapping Produk', mappingExportRows());
        addSheet(XLSX, workbook, 'Master Resep', recipeExportRows());
      }
      const period = mode === 'daily' ? state.dailyDate : (mode === 'monthly' ? state.monthlyMonth : `${state.dailyDate}_${state.monthlyMonth}`);
      XLSX.writeFile(workbook, `Laporan_TeCo_${mode}_${period}.xlsx`);
      toast('File Excel berhasil dibuat');
    } catch (err) {
      console.error('[TeCo Analytics] Excel export error:', err);
      toast(`Gagal membuat Excel: ${err && err.message ? err.message : err}`);
    }
  }

  function toast(message) {
    let el = document.getElementById('tecoAnalyticsToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tecoAnalyticsToast';
      el.className = 'ta-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el.__timer);
    el.__timer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function hookExistingButtons() {
    document.addEventListener('click', (event) => {
      const target = event.target && event.target.closest ? event.target.closest('button,a') : null;
      if (!target || target.closest('#tecoAnalyticsOverlay') || target.closest('#tecoAnalyticsReportEntry')) return;
      if (!isAuthenticated()) return;
      const text = normalizeText(target.textContent);
      if (!text) return;
      if (text === 'EXPORT EXCEL') {
        event.preventDefault();
        event.stopImmediatePropagation();
        exportExcel('daily');
      } else if (text === 'EXPORT BULANAN') {
        event.preventDefault();
        event.stopImmediatePropagation();
        exportExcel('monthly');
      } else if (text.includes('KIRIM WA OWNER') || text.includes('KIRIM LAPORAN KE OWNER')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sendWhatsApp('daily');
      }
    }, true);
  }

  function exposeApi() {
    const protectedReport = (mode) => isAuthenticated() ? aggregate(mode) : null;
    const api = {
      version: VERSION,
      open: openModal,
      reload: loadTransactions,
      exportDaily: () => exportExcel('daily'),
      exportMonthly: () => exportExcel('monthly'),
      exportBoth: () => exportExcel('both'),
      sendDailyWhatsApp: () => sendWhatsApp('daily'),
      sendMonthlyWhatsApp: () => sendWhatsApp('monthly'),
      getDailyReport: () => protectedReport('daily'),
      getMonthlyReport: () => protectedReport('monthly'),
      getCurrentRole: () => getCurrentSession().role,
      getAdjustments: () => isAuthenticated() ? state.adjustments.slice() : null,
      getRecipes: () => isAuthenticated() ? RECIPES : null
    };
    Object.defineProperty(api, 'recipes', {
      enumerable: true,
      get: () => isAuthenticated() ? RECIPES : null
    });
    window.TeCoAnalytics = api;
  }

  function init() {
    injectStyles();
    hookExistingButtons();
    exposeApi();
    startAccessMonitor();
    startSalesSyncMonitor();
    console.info(`[TeCo Analytics] Add-on v${VERSION} aktif dengan sinkronisasi penjualan realtime.`);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
/*
 * Te.Co Pandawa POS — Analytics Add-on v1.3.0 (FULL INTEGRATED)
 * + Owner Dashboard Module
 * + Profit Overview
 * + Role-based UI
 */

(function () {
  'use strict';

  if (window.__TECO_ANALYTICS_ADDON__) return;
  window.__TECO_ANALYTICS_ADDON__ = true;

  const VERSION = '1.3.1';

  /* =========================
   * STATE EXTENSION
   * ========================= */
  const state = window.state || {};

  state.ownerDashboard = {
    visible: false
  };

  /* =========================
   * ROLE HELPERS
   * ========================= */
  function isOwner() {
    return state.session && state.session.role === 'owner';
  }

  function isAdmin() {
    return state.session && (state.session.role === 'admin' || state.session.role === 'owner');
  }

  /* =========================
   * OWNER DASHBOARD CORE
   * ========================= */
  function openOwnerDashboard() {
    if (!isOwner()) {
      alert('Akses ditolak');
      return;
    }

    state.ownerDashboard.visible = true;
    renderOwnerDashboard();
  }

  function renderOwnerDashboard() {
    const el = document.getElementById('owner-dashboard');
    if (!el) return;

    const report = aggregate('daily');

    el.style.display = 'block';

    el.innerHTML = `
      <div class="ta-owner-wrap">
        <h2>📊 Owner Dashboard</h2>

        <div class="ta-grid">
          <div class="ta-card">Revenue<br><b>${formatRupiah(report.totalRevenue)}</b></div>
          <div class="ta-card">Expense<br><b>${formatRupiah(report.totalExpenses)}</b></div>
          <div class="ta-card">Net Profit<br><b>${formatRupiah(report.netRevenue)}</b></div>
          <div class="ta-card">Transactions<br><b>${report.transactionCount}</b></div>
        </div>

        <h3>🔥 Top Produk</h3>
        <ul>
          ${report.variants.slice(0, 7).map(v =>
            `<li>${v.name} — ${v.qty} cup</li>`
          ).join('')}
        </ul>

        <h3>💳 Payment Breakdown</h3>
        <ul>
          ${report.payments.map(p =>
            `<li>${p.name}: ${formatRupiah(p.amount)}</li>`
          ).join('')}
        </ul>

        <h3>📝 Notes</h3>
        <ul>
          ${report.notes.slice(0, 10).map(n => `<li>${n}</li>`).join('')}
        </ul>

        <button onclick="document.getElementById('owner-dashboard').style.display='none'">
          Close
        </button>
      </div>
    `;
  }

  /* =========================
   * UI INJECTION
   * ========================= */
  function injectOwnerButton() {
    if (!isOwner()) return;

    let btn = document.getElementById('btnOwnerDash');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'btnOwnerDash';
      btn.innerText = 'Owner Dashboard';
      btn.onclick = openOwnerDashboard;
      document.body.appendChild(btn);
    }
  }

  function injectDashboardContainer() {
    if (document.getElementById('owner-dashboard')) return;

    const div = document.createElement('div');
    div.id = 'owner-dashboard';
    div.style.display = 'none';
    div.style.position = 'fixed';
    div.style.top = '10%';
    div.style.left = '10%';
    div.style.right = '10%';
    div.style.bottom = '10%';
    div.style.background = '#fff';
    div.style.zIndex = 9999;
    div.style.overflow = 'auto';
    div.style.padding = '20px';

    document.body.appendChild(div);
  }

  /* =========================
   * PATCH INIT HOOK
   * ========================= */
  function initOwnerModule() {
    if (!state.session) return;

    injectDashboardContainer();
    injectOwnerButton();
  }

  /* =========================
   * AUTO ATTACH
   * ========================= */
  const interval = setInterval(() => {
    try {
      if (window.state && window.state.session) {
        initOwnerModule();
      }
    } catch (e) {}
  }, 1000);

})();
