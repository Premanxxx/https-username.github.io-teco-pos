/*
 * Te.Co Pandawa POS — Analytics Add-on v1.0.0
 * Adds daily/monthly variant recap, WhatsApp report, Excel sheets,
 * and ingredient usage analysis based on the uploaded recipe workbook.
 *
 * Install: add before </body> in the existing index.html:
 * <script src="./teco-analytics-addon.js?v=1.0.0"></script>
 */
(function () {
  'use strict';

  if (window.__TECO_ANALYTICS_ADDON__) return;
  window.__TECO_ANALYTICS_ADDON__ = true;

  const VERSION = '1.0.0';
  const TZ = 'Asia/Jakarta';
  const SETTINGS_KEY = 'teco_analytics_settings_v1';
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
    'KOPI MILO',
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
    'KOPI MILO': [
      { material: 'Kental Manis', qty: 10, unit: 'ml' },
      { material: 'Robusta', qty: 2, unit: 'gr' },
      { material: 'Milo', qty: 35, unit: 'gr' },
      { material: 'Air Hangat', qty: 50, unit: 'ml' },
      { material: 'UHT', qty: 50, unit: 'ml' }
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
    firebaseDbUrl: FIREBASE_DB_URL
  };

  const state = {
    settings: loadSettings(),
    transactions: [],
    sources: [],
    loadErrors: [],
    activeTab: 'daily',
    dailyDate: jakartaDateKey(new Date()),
    monthlyMonth: jakartaMonthKey(new Date()),
    cashier: 'ALL',
    loading: false,
    lastLoadedAt: null
  };

  function loadSettings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return Object.assign({}, DEFAULT_SETTINGS, parsed || {}, {
        productRecipeMap: Object.assign({}, DEFAULT_SETTINGS.productRecipeMap, parsed.productRecipeMap || {})
      });
    } catch (_) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }

  function normalizeText(value) {
    return String(value == null ? '' : value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, ' ')
      .trim()
      .toUpperCase();
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
      let m = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (m) {
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
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

  const DATE_KEYS = ['date', 'tanggal', 'createdAt', 'created_at', 'timestamp', 'time', 'datetime', 'waktu', 'paidAt', 'checkoutAt', 'created'];
  const ITEM_KEYS = ['items', 'cart', 'products', 'details', 'detail', 'orderItems', 'order_items', 'menu', 'pesanan', 'itemList', 'lineItems'];
  const NAME_KEYS = ['name', 'productName', 'product_name', 'itemName', 'item_name', 'menuName', 'title', 'product', 'item', 'nama', 'variantName'];
  const QTY_KEYS = ['qty', 'quantity', 'jumlah', 'count', 'cup', 'cups', 'amountQty'];
  const PRICE_KEYS = ['price', 'harga', 'unitPrice', 'unit_price'];
  const SUBTOTAL_KEYS = ['subtotal', 'lineTotal', 'line_total', 'totalPrice', 'total_price', 'amount'];
  const TOTAL_KEYS = ['total', 'grandTotal', 'grand_total', 'totalAmount', 'total_amount', 'amount', 'omzet', 'subtotal'];
  const CASHIER_KEYS = ['cashier', 'cashierName', 'cashier_name', 'kasir', 'user', 'operator', 'createdBy', 'created_by', 'staff'];
  const PAYMENT_KEYS = ['paymentMethod', 'payment_method', 'payment', 'method', 'metode', 'paymentType', 'payment_type'];
  const ID_KEYS = ['id', 'transactionId', 'transaction_id', 'orderId', 'order_id', 'invoice', 'receiptNo', 'receipt_no'];
  const VARIANT_KEYS = ['variant', 'variantName', 'variant_name', 'flavor', 'rasa', 'option', 'size', 'ukuran', 'modifier'];

  function objectValuesAsItems(value) {
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    const vals = Object.values(value);
    if (!vals.length) return [];
    if (vals.every((v) => v && typeof v === 'object')) return vals;
    return [];
  }

  function locateItems(obj) {
    if (!obj || typeof obj !== 'object') return [];
    for (const key of ITEM_KEYS) {
      const direct = firstValue(obj, [key]);
      const arr = objectValuesAsItems(direct);
      if (arr.length) return arr;
    }
    if (firstValue(obj, NAME_KEYS) && firstValue(obj, QTY_KEYS) !== undefined) return [obj];
    return [];
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const baseName = firstValue(raw, NAME_KEYS);
    if (!baseName) return null;
    let qty = toNumber(firstValue(raw, QTY_KEYS));
    if (!qty) qty = 1;
    if (qty <= 0) return null;
    const variant = firstValue(raw, VARIANT_KEYS);
    let name = String(baseName).trim();
    const variantText = variant == null ? '' : String(variant).trim();
    if (variantText && !normalizeText(name).includes(normalizeText(variantText))) {
      name = `${name} - ${variantText}`;
    }
    const price = toNumber(firstValue(raw, PRICE_KEYS));
    let subtotal = toNumber(firstValue(raw, SUBTOTAL_KEYS));
    if (!subtotal && price) subtotal = price * qty;
    return {
      name,
      baseName: String(baseName).trim(),
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
    const payment = String(firstValue(obj, PAYMENT_KEYS) || 'Tidak diketahui');
    const id = String(firstValue(obj, ID_KEYS) || fallbackKey || `${date.getTime()}-${items.length}-${total}`);
    return { id, date, total, cashier, payment, items, sourcePath: sourcePath || '', raw: obj };
  }

  function extractTransactions(root, sourceName) {
    const found = [];
    const seen = new WeakSet();
    const maxNodes = 30000;
    let visited = 0;

    function walk(node, path, keyHint, depth) {
      if (node == null || typeof node !== 'object' || depth > 8 || visited > maxNodes) return;
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

  function fingerprintTransaction(tx) {
    const items = tx.items.map((i) => `${normalizeText(i.name)}:${i.qty}:${i.subtotal}`).sort().join('|');
    return `${jakartaDateTime(tx.date)}|${normalizeText(tx.cashier)}|${Math.round(tx.total)}|${items}`;
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
    const sources = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || key === SETTINGS_KEY) continue;
      const raw = localStorage.getItem(key);
      if (!raw || raw.length < 2) continue;
      try {
        const parsed = JSON.parse(raw);
        const extracted = extractTransactions(parsed, `localStorage:${key}`);
        if (extracted.length) {
          txs.push(...extracted);
          sources.push({ name: `Local: ${key}`, count: extracted.length });
        }
        maybeDiscoverOwnerNumber(parsed);
      } catch (_) { /* non-JSON value */ }
    }
    return { txs, sources };
  }

  function scanKnownGlobals() {
    const txs = [];
    const sources = [];
    const names = ['transactions', 'transactionData', 'sales', 'orders', 'appData', 'dbData', 'allTransactions', 'riwayatTransaksi'];
    names.forEach((name) => {
      try {
        const value = window[name];
        if (!value || typeof value !== 'object') return;
        const extracted = extractTransactions(value, `window.${name}`);
        if (extracted.length) {
          txs.push(...extracted);
          sources.push({ name: `Window: ${name}`, count: extracted.length });
        }
      } catch (_) { /* blocked global */ }
    });
    return { txs, sources };
  }

  async function fetchFirebaseData() {
    const dbUrl = String(state.settings.firebaseDbUrl || FIREBASE_DB_URL).replace(/\/$/, '');
    const response = await fetch(`${dbUrl}/.json`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Firebase HTTP ${response.status}`);
    const data = await response.json();
    maybeDiscoverOwnerNumber(data);
    const txs = extractTransactions(data, 'firebase');
    return { data, txs, sources: txs.length ? [{ name: 'Firebase Realtime Database', count: txs.length }] : [] };
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

  async function loadTransactions() {
    if (state.loading) return;
    state.loading = true;
    state.loadErrors = [];
    renderStatus('Memuat data transaksi…');
    const all = [];
    const sources = [];

    const local = scanLocalStorage();
    all.push(...local.txs);
    sources.push(...local.sources);

    const globals = scanKnownGlobals();
    all.push(...globals.txs);
    sources.push(...globals.sources);

    try {
      const firebase = await fetchFirebaseData();
      all.push(...firebase.txs);
      sources.push(...firebase.sources);
    } catch (err) {
      state.loadErrors.push(`Firebase: ${err && err.message ? err.message : err}`);
    }

    state.transactions = dedupeTransactions(all);
    state.sources = sources;
    state.lastLoadedAt = new Date();
    state.loading = false;
    renderAll();
  }

  function mapRecipe(productName) {
    const normalized = normalizeText(productName);
    const manual = state.settings.productRecipeMap[normalized];
    if (manual && RECIPES[manual]) return manual;

    if (/MATCHA\s*PRESSO/.test(normalized)) return 'MATCHAPRESSO';
    if (/MATCHA.*AREN|AREN.*MATCHA/.test(normalized)) return 'MATCHA AREN';
    if (/KOPI.*MILO|MILO.*KOPI/.test(normalized)) return 'KOPI MILO';
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
      const cashierMatch = state.cashier === 'ALL' || normalizeText(tx.cashier) === normalizeText(state.cashier);
      return periodMatch && cashierMatch;
    });
  }

  function aggregate(mode) {
    const txs = filterTransactions(mode);
    const variants = new Map();
    let totalRevenue = 0;
    let totalCups = 0;

    txs.forEach((tx) => {
      totalRevenue += tx.total;
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

    const variantRows = Array.from(variants.values()).sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
    const materialResult = calculateMaterials(variantRows, totalCups);
    return {
      mode,
      txs,
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
    if (!state.sources.length) return 'Belum menemukan sumber transaksi';
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
    const values = new Set();
    state.transactions.forEach((tx) => values.add(tx.cashier || 'Tidak diketahui'));
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }

  function injectStyles() {
    if (document.getElementById('tecoAnalyticsStyles')) return;
    const style = document.createElement('style');
    style.id = 'tecoAnalyticsStyles';
    style.textContent = `
      #tecoAnalyticsFab{position:fixed;right:18px;bottom:84px;z-index:2147483000;border:0;border-radius:999px;padding:12px 16px;background:#0f766e;color:#fff;font:700 13px/1.2 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 25px rgba(0,0,0,.28);cursor:pointer;display:flex;align-items:center;gap:8px}
      #tecoAnalyticsFab:hover{transform:translateY(-1px);background:#115e59}
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
      .ta-map-select{width:100%;min-width:190px;border:1px solid #cbd5e1;border-radius:7px;padding:6px;background:#fff}.ta-settings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ta-settings .ta-field input{width:100%;box-sizing:border-box}.ta-note{font-size:12px;line-height:1.5;color:#475569;background:#fef3c7;border:1px solid #fde68a;padding:10px;border-radius:9px}.ta-recipe{margin-bottom:12px}.ta-recipe h4{margin:0 0 6px;font-size:13px}.ta-recipe ul{margin:0;padding-left:18px;color:#475569;font-size:12px}
      .ta-toast{position:fixed;left:50%;bottom:25px;transform:translateX(-50%);z-index:2147483200;background:#0f172a;color:#fff;padding:10px 14px;border-radius:9px;box-shadow:0 10px 30px rgba(0,0,0,.3);font:600 13px system-ui;opacity:0;pointer-events:none;transition:.2s}.ta-toast.show{opacity:1}
      @media(max-width:800px){#tecoAnalyticsFab{right:12px;bottom:72px;padding:11px 13px}.ta-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.ta-grid{grid-template-columns:1fr}.ta-actions{margin-left:0;width:100%}.ta-settings{grid-template-columns:1fr}.ta-toolbar{align-items:stretch}.ta-field{flex:1;min-width:130px}#tecoAnalyticsModal{height:96vh;border-radius:13px}.ta-head{padding:13px}.ta-body{padding:11px}}
    `;
    document.head.appendChild(style);
  }

  function createUi() {
    injectStyles();
    if (!document.getElementById('tecoAnalyticsFab')) {
      const fab = document.createElement('button');
      fab.id = 'tecoAnalyticsFab';
      fab.type = 'button';
      fab.innerHTML = '<span>📊</span><span>Analisis Penjualan</span>';
      fab.addEventListener('click', openModal);
      document.body.appendChild(fab);
    }

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
              <button class="ta-tab" data-tab="mapping" type="button">Mapping Resep</button>
              <button class="ta-tab" data-tab="recipes" type="button">Daftar Resep</button>
              <button class="ta-tab" data-tab="settings" type="button">Pengaturan</button>
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
  }

  function openModal(tab) {
    createUi();
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
    state.activeTab = tab;
    syncControls();
    renderAll();
  }

  function syncControls() {
    const overlay = document.getElementById('tecoAnalyticsOverlay');
    if (!overlay) return;
    overlay.querySelectorAll('.ta-tab').forEach((button) => button.classList.toggle('active', button.dataset.tab === state.activeTab));
    overlay.querySelector('#taDailyDate').value = state.dailyDate;
    overlay.querySelector('#taMonthlyMonth').value = state.monthlyMonth;
    overlay.querySelector('.ta-date-field').style.display = state.activeTab === 'daily' ? '' : 'none';
    overlay.querySelector('.ta-month-field').style.display = state.activeTab === 'monthly' ? '' : 'none';
    overlay.querySelector('.ta-cashier-field').style.display = ['daily', 'monthly', 'mapping'].includes(state.activeTab) ? '' : 'none';
    const actions = overlay.querySelector('.ta-actions');
    actions.style.display = ['daily', 'monthly'].includes(state.activeTab) ? 'flex' : 'none';
    const select = overlay.querySelector('#taCashier');
    const options = ['<option value="ALL">Semua Kasir</option>'].concat(getCashiers().map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`));
    select.innerHTML = options.join('');
    select.value = state.cashier;
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
      renderStatus('Memuat transaksi dari penyimpanan lokal dan Firebase…');
      return;
    }
    if (state.activeTab === 'daily' || state.activeTab === 'monthly') renderReport(state.activeTab);
    else if (state.activeTab === 'mapping') renderMapping();
    else if (state.activeTab === 'recipes') renderRecipes();
    else renderSettings();
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

    content.innerHTML = `
      <div class="ta-status">Periode: <strong>${escapeHtml(periodLabel)}</strong> • Sumber: ${escapeHtml(sourceSummary())}${escapeHtml(errorText)}</div>
      <div class="ta-cards">
        <div class="ta-card"><span>Transaksi</span><strong>${report.transactionCount}</strong></div>
        <div class="ta-card"><span>Total cup</span><strong>${formatDecimal(report.totalCups)}</strong></div>
        <div class="ta-card"><span>Varian berbeda</span><strong>${report.distinctVariants}</strong></div>
        <div class="ta-card"><span>Omzet</span><strong style="font-size:16px">${formatRupiah(report.totalRevenue)}</strong></div>
        <div class="ta-card"><span>Belum terpetakan</span><strong>${report.unmatched.length}</strong></div>
      </div>
      ${report.concentrateUsageMl > 0 ? `<div class="ta-note" style="margin-bottom:12px"><strong>Kebutuhan konsentrat:</strong> ${escapeHtml(formatMeasurement(report.concentrateUsageMl, 'ml'))} atau sekitar ${formatDecimal(report.concentrateBatches)} batch, dengan asumsi hasil satu batch ${formatDecimal(state.settings.concentrateBatchYieldMl)} ml.</div>` : ''}
      <div class="ta-grid">
        <section class="ta-panel"><h3>Rekap Varian Terjual</h3><div class="ta-table-wrap"><table class="ta-table"><thead><tr><th>No.</th><th>Varian</th><th class="ta-num">Cup</th><th class="ta-num">Omzet Item</th></tr></thead><tbody>${variantRows || '<tr><td colspan="4" class="ta-muted">Belum ada transaksi pada periode ini.</td></tr>'}</tbody></table></div></section>
        <section class="ta-panel"><h3>Analisis Bahan Terpakai</h3><div class="ta-table-wrap"><table class="ta-table"><thead><tr><th>No.</th><th>Bahan</th><th class="ta-num">Jumlah</th><th>Dipakai oleh</th></tr></thead><tbody>${materialRows || '<tr><td colspan="4" class="ta-muted">Belum ada bahan yang dapat dihitung.</td></tr>'}</tbody></table></div></section>
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

  function renderMapping() {
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
    const content = document.getElementById('taContent');
    const html = Object.entries(RECIPES).map(([name, items]) => `
      <div class="ta-recipe"><h4>${escapeHtml(name)}</h4><ul>${items.map((item) => `<li>${escapeHtml(item.material)} — ${escapeHtml(formatMeasurement(item.qty, item.unit))}</li>`).join('')}</ul></div>`).join('');
    content.innerHTML = `
      <div class="ta-note" style="margin-bottom:12px">Resep diambil dari file <strong>HPP_Resep_Bahan_Penggunaan.xlsx</strong>. Ejaan “Fruktosaa” dan “Gula Arenn” dinormalisasi. Kemasan dihitung otomatis satu set per cup, termasuk Kopi Milo.</div>
      <section class="ta-panel"><h3>Daftar Resep</h3><div class="ta-pad">${html}</div></section>`;
  }

  function renderSettings() {
    const content = document.getElementById('taContent');
    content.innerHTML = `
      <div class="ta-settings">
        <label class="ta-field"><span>Nomor WhatsApp Owner</span><input id="taOwnerWa" type="tel" placeholder="Contoh: 628123456789" value="${escapeHtml(state.settings.ownerWhatsApp)}"></label>
        <label class="ta-field"><span>Hasil 1 Batch Konsentrat (ml)</span><input id="taYield" type="number" min="1" step="1" value="${escapeHtml(state.settings.concentrateBatchYieldMl)}"></label>
        <label class="ta-field"><span>URL Firebase Realtime Database</span><input id="taFirebaseUrl" type="url" value="${escapeHtml(state.settings.firebaseDbUrl)}"></label>
        <label class="ta-field"><span>Ekspansi Konsentrat</span><select id="taExpand"><option value="yes"${state.settings.expandConcentrate ? ' selected' : ''}>Uraikan menjadi bahan baku</option><option value="no"${!state.settings.expandConcentrate ? ' selected' : ''}>Tampilkan sebagai Konsentrat</option></select></label>
      </div>
      <div class="ta-note" style="margin-top:12px">File resep tidak mencantumkan hasil akhir satu batch konsentrat. Nilai awal ditetapkan 1.000 ml dan dapat disesuaikan di sini agar kalkulasi bahan baku tepat dengan praktik produksi.</div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button id="taSaveSettings" class="ta-btn primary" type="button">Simpan Pengaturan</button><button id="taResetMapping" class="ta-btn warn" type="button">Reset Mapping Manual</button></div>
      <div class="ta-status" style="margin-top:12px">Sumber data terakhir: ${escapeHtml(sourceSummary())}. Terakhir dimuat: ${state.lastLoadedAt ? escapeHtml(jakartaDateTime(state.lastLoadedAt)) : 'belum pernah'}.</div>`;
    content.querySelector('#taSaveSettings').addEventListener('click', () => {
      state.settings.ownerWhatsApp = content.querySelector('#taOwnerWa').value.trim();
      state.settings.concentrateBatchYieldMl = Math.max(1, toNumber(content.querySelector('#taYield').value) || 1000);
      state.settings.firebaseDbUrl = content.querySelector('#taFirebaseUrl').value.trim() || FIREBASE_DB_URL;
      state.settings.expandConcentrate = content.querySelector('#taExpand').value === 'yes';
      saveSettings();
      toast('Pengaturan disimpan');
      renderSettings();
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
    lines.push(`Omzet: *${formatRupiah(report.totalRevenue)}*`);
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
      { Keterangan: 'Varian Belum Terpetakan', Nilai: report.unmatched.length }
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
      }
      if (mode === 'monthly' || mode === 'both') {
        const monthly = aggregate('monthly');
        addSheet(XLSX, workbook, 'Ringkasan Bulanan', summaryRows(monthly, 'monthly'));
        addSheet(XLSX, workbook, 'Varian Bulanan', variantExportRows(monthly));
        addSheet(XLSX, workbook, 'Bahan Bulanan', materialExportRows(monthly));
        addSheet(XLSX, workbook, 'Transaksi Bulanan', transactionRows(monthly));
      }
      addSheet(XLSX, workbook, 'Mapping Produk', mappingExportRows());
      addSheet(XLSX, workbook, 'Master Resep', recipeExportRows());
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
      if (!target || target.closest('#tecoAnalyticsOverlay') || target.id === 'tecoAnalyticsFab') return;
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
    window.TeCoAnalytics = {
      version: VERSION,
      open: openModal,
      reload: loadTransactions,
      exportDaily: () => exportExcel('daily'),
      exportMonthly: () => exportExcel('monthly'),
      exportBoth: () => exportExcel('both'),
      sendDailyWhatsApp: () => sendWhatsApp('daily'),
      sendMonthlyWhatsApp: () => sendWhatsApp('monthly'),
      getDailyReport: () => aggregate('daily'),
      getMonthlyReport: () => aggregate('monthly'),
      recipes: RECIPES
    };
  }

  function init() {
    createUi();
    hookExistingButtons();
    exposeApi();
    setTimeout(loadTransactions, 600);
    if (window.TECO_ANALYTICS_AUTO_OPEN) setTimeout(() => openModal('daily'), 900);
    console.info(`[TeCo Analytics] Add-on v${VERSION} aktif.`);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
