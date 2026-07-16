(function () {
  'use strict';

  const VERSION = '3.0.1';
  const PRIMARY_STORAGE_KEY = 'teco_pos_data';
  const TIME_ZONE = 'Asia/Jakarta';
  const RECIPES_RAW = __TECO_RECIPE_JSON__;
  const ADMIN_PIN = '0000';
  const CONFIG_KEY = 'nativeReportConfig';

  const state = {
    mode: 'daily',
    date: '',
    month: '',
    weekDate: '',
    cashier: 'ALL',
    dateTouched: false,
    monthTouched: false,
    weekTouched: false,
    cachedRoot: null,
    renderTimer: null,
    observer: null,
    session: { role: 'cashier', name: '' },
    editorTab: 'variants',
    selectedRecipe: '',
    adjustmentEditId: ''
  };

  const TX_ITEM_KEYS = [
    'items', 'cart', 'products', 'details', 'detail', 'orderItems',
    'order_items', 'menuItems', 'pesanan', 'itemList', 'lineItems',
    'cartItems', 'cart_items', 'transactionItems', 'transaction_items',
    'saleItems', 'sale_items', 'orderDetails', 'order_details',
    'produk', 'daftarProduk', 'keranjang'
  ];

  const DATE_KEYS = [
    'date', 'tanggal', 'createdAt', 'created_at', 'timestamp', 'time',
    'datetime', 'waktu', 'paidAt', 'paid_at', 'checkoutAt',
    'transactionDate', 'transaction_date'
  ];

  const TOTAL_KEYS = [
    'total', 'grandTotal', 'grand_total', 'totalAmount', 'total_amount',
    'amount', 'omzet', 'finalTotal', 'final_total', 'netTotal',
    'totalBayar', 'total_bayar', 'totalAkhir', 'totalPembayaran'
  ];

  const CASHIER_KEYS = [
    'cashier', 'cashierName', 'cashier_name', 'cashierId', 'cashier_id',
    'kasir', 'namaKasir', 'nama_kasir', 'operator', 'createdBy',
    'created_by', 'staff', 'username', 'user'
  ];

  const ID_KEYS = [
    'id', 'transactionId', 'transaction_id', 'trxId', 'trx_id',
    'orderId', 'order_id', 'invoice', 'receiptNo', 'receipt_no',
    'noStruk', 'kodeTransaksi'
  ];


  const PAYMENT_KEYS = [
    'paymentMethod', 'payment_method', 'payment', 'method', 'metode',
    'metodePembayaran', 'metode_pembayaran', 'caraBayar', 'cara_bayar'
  ];

  const NOTE_KEYS = [
    'note', 'notes', 'catatan', 'description', 'deskripsi',
    'keterangan', 'remark', 'remarks'
  ];

  const EXPENSE_AMOUNT_KEYS = [
    'amount', 'nominal', 'total', 'value', 'nilai', 'biaya',
    'expenseAmount', 'expense_amount'
  ];

  function deepClone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_) {
      return value;
    }
  }

  function defaultNativeConfig() {
    return {
      version: 1,
      variantOverrides: {},
      recipes: {},
      concentrateYield: 0,
      adjustments: []
    };
  }

  function mergeNativeConfig(raw) {
    const base = defaultNativeConfig();
    raw = parseMaybeJson(raw) || {};
    return {
      version: 1,
      variantOverrides: raw.variantOverrides && typeof raw.variantOverrides === 'object'
        ? raw.variantOverrides
        : {},
      recipes: raw.recipes && typeof raw.recipes === 'object'
        ? raw.recipes
        : {},
      concentrateYield: toNumber(raw.concentrateYield),
      adjustments: Array.isArray(raw.adjustments) ? raw.adjustments : []
    };
  }

  function readNativeConfig(root) {
    return mergeNativeConfig(root && root[CONFIG_KEY]);
  }

  function visibleElement(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
  }

  function sessionFromObject(root) {
    const sessionKeys = [
      'currentUser', 'current_user', 'loggedInUser', 'logged_in_user',
      'activeUser', 'active_user', 'currentCashier', 'current_cashier',
      'authUser', 'auth_user', 'session', 'loginSession'
    ];
    const seen = new WeakSet();

    function normalizeIdentity(value) {
      value = parseMaybeJson(value);
      if (!value) return null;
      if (typeof value === 'string') {
        const name = canonical(value);
        if (/^admin$/i.test(name)) return { role: 'admin', name: 'Admin' };
        if (/^kasir\s*\d+$/i.test(name)) return { role: 'cashier', name };
        return null;
      }
      if (typeof value !== 'object') return null;
      const name = canonical(first(value, [
        'name', 'nama', 'username', 'userName', 'displayName',
        'cashier', 'kasir', 'label'
      ]));
      const role = canonical(first(value, ['role', 'type', 'level', 'akses']));
      if (/admin/i.test(role) || /^admin$/i.test(name)) {
        return { role: 'admin', name: name || 'Admin' };
      }
      if (/cashier|kasir/i.test(role) || /^kasir\s*\d+$/i.test(name)) {
        return { role: 'cashier', name: name || 'Kasir' };
      }
      return null;
    }

    function walk(node, depth) {
      node = parseMaybeJson(node);
      if (!node || typeof node !== 'object' || depth > 5 || seen.has(node)) return null;
      seen.add(node);
      for (const key of sessionKeys) {
        if (Object.prototype.hasOwnProperty.call(node, key)) {
          const identity = normalizeIdentity(node[key]);
          if (identity) return identity;
        }
      }
      for (const [key, value] of Object.entries(node)) {
        if (/users|daftaruser|accounts|menu|products|transactions|transaksi/i.test(key)) continue;
        const identity = walk(value, depth + 1);
        if (identity) return identity;
      }
      return null;
    }
    return walk(root, 0);
  }

  function sessionFromDom() {
    const selectors = [
      '#currentUser', '#current-user', '#userBadge', '#user-badge',
      '#currentCashier', '#current-cashier', '.current-user', '.user-badge',
      '.current-cashier', '.topbar .badge', '.app-header .badge',
      'header .badge', '.header .badge', '.top-header span', '.navbar span'
    ];
    const candidates = [];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => candidates.push(element));
    });
    for (const element of candidates) {
      if (!visibleElement(element)) continue;
      const text = canonical(element.textContent);
      if (/^admin$/i.test(text)) return { role: 'admin', name: 'Admin' };
      if (/^kasir\s*\d+$/i.test(text)) return { role: 'cashier', name: text };
    }
    return null;
  }

  function detectSession(root) {
    const identity = sessionFromDom() || sessionFromObject(root);
    if (identity) state.session = identity;
    return state.session;
  }

  function isAdmin() {
    return state.session && state.session.role === 'admin';
  }

  function ensureAdmin() {
    detectSession(getPrimaryRoot());
    if (isAdmin()) return true;
    const pin = window.prompt('Masukkan PIN admin:');
    if (pin === ADMIN_PIN) {
      state.session = { role: 'admin', name: 'Admin' };
      return true;
    }
    if (pin !== null) alert('PIN admin salah.');
    return false;
  }

  function parseMaybeJson(value) {
    if (typeof value !== 'string') return value;
    const text = value.trim();
    if (!text || !/^[\[{]/.test(text)) return value;
    try {
      return JSON.parse(text);
    } catch (_) {
      return value;
    }
  }

  function first(object, keys) {
    object = parseMaybeJson(object);
    if (!object || typeof object !== 'object') return undefined;

    for (const key of keys) {
      if (
        Object.prototype.hasOwnProperty.call(object, key) &&
        object[key] !== undefined &&
        object[key] !== null &&
        object[key] !== ''
      ) {
        return object[key];
      }
    }

    const normalized = {};
    Object.keys(object).forEach((key) => {
      normalized[String(key).toLowerCase().replace(/[^a-z0-9]/g, '')] = key;
    });

    for (const key of keys) {
      const actual = normalized[String(key).toLowerCase().replace(/[^a-z0-9]/g, '')];
      if (
        actual &&
        object[actual] !== undefined &&
        object[actual] !== null &&
        object[actual] !== ''
      ) {
        return object[actual];
      }
    }

    return undefined;
  }

  function toNumber(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value == null || value === '') return 0;

    let text = String(value).trim().replace(/Rp/gi, '').replace(/\s/g, '');

    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) {
      text = text.replace(/,/g, '');
    } else {
      text = text.replace(/[^0-9,.-]/g, '');
      if (text.includes(',') && !text.includes('.')) text = text.replace(',', '.');
    }

    const number = Number(text);
    return Number.isFinite(number) ? number : 0;
  }
  function canonical(value) {
    return String(value == null ? '' : value)
      .replace(/\bSakata\b/gi, 'Sakala')
      .replace(/\bKopi\s+Milo\b/gi, 'Coffee Milo')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizePayment(value) {
    if (value && typeof value === 'object') {
      value = first(value, ['name', 'label', 'type', 'method', 'metode']);
    }

    const text = canonical(value || 'Tidak diketahui');
    const key = keyText(text);

    if (/^(CASH|TUNAI)$/.test(key)) return 'Tunai';
    if (/QRIS|QR CODE/.test(key)) return 'QRIS';
    if (/TRANSFER|BANK/.test(key)) return 'Transfer';
    if (/DEBIT|KARTU|CARD/.test(key)) return 'Kartu/Debit';
    return text || 'Tidak diketahui';
  }

  function keyText(value) {
    return canonical(value)
      .toUpperCase()
      .replace(/&/g, ' DAN ')
      .replace(/[^A-Z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatMoney(value) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(toNumber(value));
  }

  function formatQuantity(value) {
    const number = toNumber(value);
    return new Intl.NumberFormat('id-ID', {
      maximumFractionDigits: Number.isInteger(number) ? 0 : 2
    }).format(number);
  }

  function parseDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Date(value.getTime());
    }

    if (value && typeof value === 'object') {
      if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
      if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
      if (typeof value.toDate === 'function') {
        try {
          const result = value.toDate();
          if (result instanceof Date && !Number.isNaN(result.getTime())) return result;
        } catch (_) {}
      }
    }

    if (typeof value === 'number') {
      const milliseconds = value < 100000000000 ? value * 1000 : value;
      const result = new Date(milliseconds);
      return Number.isNaN(result.getTime()) ? null : result;
    }

    if (typeof value === 'string') {
      const text = value.trim();

      if (/^\d{10,13}$/.test(text)) {
        const number = Number(text);
        const result = new Date(text.length === 10 ? number * 1000 : number);
        return Number.isNaN(result.getTime()) ? null : result;
      }

      let match = text.match(
        /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?/
      );

      if (match) {
        const result = new Date(
          Number(match[3]),
          Number(match[2]) - 1,
          Number(match[1]),
          Number(match[4] || 0),
          Number(match[5] || 0),
          Number(match[6] || 0)
        );
        return Number.isNaN(result.getTime()) ? null : result;
      }

      match = text.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?/
      );

      if (match) {
        const result = new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          Number(match[4] || 0),
          Number(match[5] || 0),
          Number(match[6] || 0)
        );
        return Number.isNaN(result.getTime()) ? null : result;
      }

      const result = new Date(text);
      return Number.isNaN(result.getTime()) ? null : result;
    }

    return null;
  }

  function jakartaParts(date) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const parts = {};
    formatter.formatToParts(date).forEach((part) => {
      if (part.type !== 'literal') parts[part.type] = part.value;
    });

    return {
      year: parts.year,
      month: parts.month,
      day: parts.day
    };
  }

  function dateKey(date) {
    const parts = jakartaParts(date);
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function monthKey(date) {
    const parts = jakartaParts(date);
    return `${parts.year}-${parts.month}`;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function currentMonthKey() {
    return monthKey(new Date());
  }


  function dateFromKey(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00+07:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function weekRange(period) {
    const anchor = dateFromKey(period) || dateFromKey(todayKey()) || new Date();
    const day = anchor.getDay();
    const offsetToMonday = day === 0 ? -6 : 1 - day;
    const start = new Date(anchor.getTime());
    start.setDate(start.getDate() + offsetToMonday);
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 6);
    return {
      start,
      end,
      startKey: dateKey(start),
      endKey: dateKey(end)
    };
  }

  function matchesPeriod(date, mode, period) {
    if (mode === 'daily') return dateKey(date) === period;
    if (mode === 'monthly') return monthKey(date) === period;
    if (mode === 'weekly') {
      const range = weekRange(period);
      const key = dateKey(date);
      return key >= range.startKey && key <= range.endKey;
    }
    return false;
  }

  function asArray(value) {
    value = parseMaybeJson(value);
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];
    return Object.values(value).filter((item) => item !== undefined && item !== null);
  }

  function locateItems(object) {
    object = parseMaybeJson(object);
    if (!object || typeof object !== 'object') return [];

    for (const key of TX_ITEM_KEYS) {
      const value = first(object, [key]);
      const rows = asArray(value);
      if (rows.length) return rows;
    }

    const nested = first(object, [
      'transaction', 'transaksi', 'order', 'sale', 'checkout',
      'receipt', 'struk', 'payload', 'data'
    ]);

    if (nested && nested !== object) {
      for (const key of TX_ITEM_KEYS) {
        const rows = asArray(first(nested, [key]));
        if (rows.length) return rows;
      }
    }

    return [];
  }

  function normalizeItem(raw) {
    raw = parseMaybeJson(raw);

    if (typeof raw === 'string' || typeof raw === 'number') {
      const name = canonical(raw);
      return name
        ? { name, baseName: name, variant: '', qty: 1, price: 0, subtotal: 0 }
        : null;
    }

    if (Array.isArray(raw)) {
      raw = {
        name: raw[0],
        qty: raw[1],
        price: raw[2],
        subtotal: raw[3]
      };
    }

    if (!raw || typeof raw !== 'object') return null;

    let productNode = first(raw, ['product', 'item', 'menu']);
    productNode = parseMaybeJson(productNode);

    let baseName = first(raw, [
      'name', 'nama', 'productName', 'product_name', 'itemName',
      'item_name', 'menuName', 'title', 'label', 'namaProduk',
      'nama_produk'
    ]);

    if (
      (!baseName || typeof baseName === 'object') &&
      productNode &&
      typeof productNode === 'object'
    ) {
      baseName = first(productNode, [
        'name', 'nama', 'productName', 'product_name',
        'title', 'label', 'namaProduk'
      ]);
    }

    if (baseName && typeof baseName === 'object') {
      baseName = first(baseName, ['name', 'nama', 'title', 'label']);
    }

    baseName = canonical(baseName);
    if (!baseName) return null;

    let variant = first(raw, [
      'variant', 'variantName', 'variant_name', 'flavor', 'rasa',
      'size', 'ukuran', 'option', 'pilihan'
    ]);

    if (variant && typeof variant === 'object') {
      variant = first(variant, ['name', 'nama', 'label', 'value']);
    }

    variant = canonical(variant);

    const qty =
      toNumber(first(raw, [
        'qty', 'quantity', 'jumlah', 'count', 'cup', 'cups',
        'amountQty', 'jumlahCup', 'jumlah_cup', 'totalQty'
      ])) || 1;

    let price = toNumber(first(raw, [
      'price', 'harga', 'unitPrice', 'unit_price',
      'sellingPrice', 'hargaSatuan'
    ]));

    if (!price && productNode && typeof productNode === 'object') {
      price = toNumber(first(productNode, [
        'price', 'harga', 'unitPrice', 'unit_price', 'sellingPrice'
      ]));
    }

    let subtotal = toNumber(first(raw, [
      'subtotal', 'lineTotal', 'line_total', 'totalPrice',
      'total_price', 'amount', 'itemTotal', 'item_total',
      'jumlahHarga'
    ]));

    if (!subtotal) subtotal = price * qty;

    const name =
      variant && !keyText(baseName).includes(keyText(variant))
        ? `${baseName} - ${variant}`
        : baseName;

    return {
      name: canonical(name),
      baseName,
      variant,
      qty,
      price,
      subtotal
    };
  }

  function normalizeTransaction(raw, fallbackId) {
    raw = parseMaybeJson(raw);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

    const rawItems = locateItems(raw);
    const items = rawItems.map(normalizeItem).filter(Boolean);
    if (!items.length) return null;

    const date = parseDate(first(raw, DATE_KEYS));
    if (!date) return null;

    let total = toNumber(first(raw, TOTAL_KEYS));
    if (!total) total = items.reduce((sum, item) => sum + item.subtotal, 0);

    let cashier = first(raw, CASHIER_KEYS);
    if (cashier && typeof cashier === 'object') {
      cashier = first(cashier, ['name', 'username', 'displayName', 'id']);
    }

    const id = String(first(raw, ID_KEYS) || fallbackId || `${date.getTime()}-${total}`);
    const payment = normalizePayment(first(raw, PAYMENT_KEYS));
    const note = canonical(first(raw, NOTE_KEYS) || '');

    return {
      id,
      date,
      total,
      cashier: canonical(cashier || 'Tidak diketahui'),
      payment,
      note,
      items,
      raw
    };
  }

  function extractTransactions(root) {
    root = parseMaybeJson(root);
    const found = [];
    const seen = new WeakSet();
    let visited = 0;

    function walk(node, path, keyHint, depth) {
      node = parseMaybeJson(node);

      if (
        node == null ||
        typeof node !== 'object' ||
        depth > 10 ||
        visited > 25000
      ) {
        return;
      }

      if (seen.has(node)) return;
      seen.add(node);
      visited += 1;

      if (!Array.isArray(node)) {
        const items = locateItems(node);
        const hasDate = first(node, DATE_KEYS) !== undefined;
        const pathLooksTransaction =
          /transaction|transaksi|sales|penjualan|orders|pesanan|history|riwayat/i.test(path);

        if (items.length && (hasDate || pathLooksTransaction)) {
          const transaction = normalizeTransaction(node, keyHint);
          if (transaction) {
            found.push(transaction);
            return;
          }
        }
      }

      if (Array.isArray(node)) {
        node.forEach((child, index) => {
          walk(child, `${path}[${index}]`, String(index), depth + 1);
        });
        return;
      }

      Object.entries(node).forEach(([key, child]) => {
        if (
          /^(menu|menus|products|users|settings|config|expenses|pengeluaran|stock|stok|recipes|resep)$/i.test(key) &&
          depth > 0
        ) {
          return;
        }

        walk(child, path ? `${path}.${key}` : key, key, depth + 1);
      });
    }

    walk(root, '', '', 0);

    const map = new Map();

    found.forEach((transaction) => {
      const itemSignature = transaction.items
        .map((item) => `${keyText(item.name)}:${item.qty}:${item.subtotal}`)
        .sort()
        .join('|');

      const signature = [
        dateKey(transaction.date),
        transaction.date.getTime(),
        keyText(transaction.cashier),
        Math.round(transaction.total),
        itemSignature
      ].join('::');

      if (!map.has(signature)) map.set(signature, transaction);
    });

    return Array.from(map.values()).sort((a, b) => b.date - a.date);
  }

  function normalizeExpense(raw, fallbackId) {
    raw = parseMaybeJson(raw);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    if (locateItems(raw).length) return null;

    const date = parseDate(first(raw, DATE_KEYS));
    const amount = toNumber(first(raw, EXPENSE_AMOUNT_KEYS));
    if (!date || !(amount > 0)) return null;

    let cashier = first(raw, CASHIER_KEYS);
    if (cashier && typeof cashier === 'object') {
      cashier = first(cashier, ['name', 'username', 'displayName', 'id']);
    }

    const category = canonical(first(raw, [
      'category', 'kategori', 'type', 'tipe', 'jenis', 'expenseType', 'expense_type'
    ]) || 'Lain-lain');

    const note = canonical(first(raw, NOTE_KEYS) || category);
    const id = String(first(raw, ID_KEYS) || fallbackId || `${date.getTime()}-${amount}-${category}`);

    return {
      id,
      date,
      amount,
      cashier: canonical(cashier || 'Tidak diketahui'),
      category,
      note,
      raw
    };
  }

  function extractExpenses(root) {
    root = parseMaybeJson(root);
    const found = [];
    const seen = new WeakSet();
    let visited = 0;

    function walk(node, path, keyHint, depth) {
      node = parseMaybeJson(node);
      if (!node || typeof node !== 'object' || depth > 10 || visited > 25000) return;
      if (seen.has(node)) return;
      seen.add(node);
      visited += 1;

      if (!Array.isArray(node)) {
        const pathLooksExpense = /expense|pengeluaran|biaya|cost/i.test(path);
        const hasAmount = first(node, EXPENSE_AMOUNT_KEYS) !== undefined;
        const hasDate = first(node, DATE_KEYS) !== undefined;
        const hasExpenseSignal = first(node, [
          'category', 'kategori', 'expenseType', 'expense_type', 'nominal', 'biaya'
        ]) !== undefined;

        if ((pathLooksExpense || hasExpenseSignal) && hasAmount && hasDate) {
          const expense = normalizeExpense(node, keyHint);
          if (expense) {
            found.push(expense);
            return;
          }
        }
      }

      if (Array.isArray(node)) {
        node.forEach((child, index) => walk(child, `${path}[${index}]`, String(index), depth + 1));
        return;
      }

      Object.entries(node).forEach(([key, child]) => {
        if (/^(menu|menus|products|users|settings|config|stock|stok|recipes|resep)$/i.test(key) && depth > 0) return;
        walk(child, path ? `${path}.${key}` : key, key, depth + 1);
      });
    }

    walk(root, '', '', 0);

    const map = new Map();
    found.forEach((expense) => {
      const signature = [
        expense.id,
        expense.date.getTime(),
        cashierKey(expense.cashier),
        Math.round(expense.amount),
        keyText(expense.category),
        keyText(expense.note)
      ].join('::');
      if (!map.has(signature)) map.set(signature, expense);
    });

    return Array.from(map.values()).sort((a, b) => b.date - a.date);
  }

  function getPrimaryRoot() {
    const candidates = [
      window.__TECO_NATIVE_DATA__,
      window.appData,
      window.posData,
      window.appState,
      window.dbData,
      window.data
    ];

    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object') continue;
      const transactions = extractTransactions(candidate);
      if (transactions.length) return candidate;
    }

    if (state.cachedRoot && typeof state.cachedRoot === 'object') {
      return state.cachedRoot;
    }

    try {
      const raw = localStorage.getItem(PRIMARY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state.cachedRoot = parsed;
        return parsed;
      }
    } catch (error) {
      console.warn('[Te.Co Native] Data utama tidak dapat dibaca:', error);
    }

    return {};
  }

  function normalizeRecipes(raw) {
    raw = parseMaybeJson(raw) || {};
    const source = raw.recipes && typeof raw.recipes === 'object'
      ? raw.recipes
      : raw;

    const recipes = {};

    Object.entries(source || {}).forEach(([productName, materials]) => {
      const rows = asArray(materials)
        .map((row) => {
          if (!row || typeof row !== 'object') return null;

          const material = canonical(first(row, [
            'material', 'bahan', 'ingredient', 'name', 'nama'
          ]));

          const qty = toNumber(first(row, [
            'qty', 'quantity', 'jumlah', 'amount', 'takaran'
          ]));

          const unit = canonical(first(row, [
            'unit', 'satuan'
          ]) || 'unit');

          if (!material || !(qty > 0)) return null;
          return { material, qty, unit };
        })
        .filter(Boolean);

      if (rows.length) recipes[keyText(productName)] = rows;
    });

    return {
      recipes,
      concentrateYield: toNumber(raw.concentrateBatchYieldMl) || 1000
    };
  }

  const BASE_RECIPE_DATA = normalizeRecipes(RECIPES_RAW);
  let runtimeConfig = defaultNativeConfig();
  let runtimeRecipeData = deepClone(BASE_RECIPE_DATA);

  function refreshRuntimeConfig(root) {
    runtimeConfig = readNativeConfig(root || getPrimaryRoot());
    const mergedRecipes = deepClone(BASE_RECIPE_DATA.recipes || {});
    Object.entries(runtimeConfig.recipes || {}).forEach(([name, rows]) => {
      const normalizedRows = asArray(rows).map((row) => ({
        material: canonical(first(row, ['material', 'bahan', 'name', 'nama'])),
        qty: toNumber(first(row, ['qty', 'quantity', 'jumlah', 'amount', 'takaran'])),
        unit: canonical(first(row, ['unit', 'satuan']) || 'unit')
      })).filter((row) => row.material && row.qty > 0);
      if (normalizedRows.length) mergedRecipes[keyText(name)] = normalizedRows;
    });
    runtimeRecipeData = {
      recipes: mergedRecipes,
      concentrateYield: runtimeConfig.concentrateYield > 0
        ? runtimeConfig.concentrateYield
        : BASE_RECIPE_DATA.concentrateYield
    };
    return runtimeConfig;
  }

  function variantOverride(productName) {
    return runtimeConfig.variantOverrides[keyText(productName)] || {};
  }
  function findRecipe(productName, forcedRecipeKey) {
    const key = keyText(productName);
    const forcedKey = keyText(forcedRecipeKey);
    if (!key && !forcedKey) return null;

    if (forcedKey && runtimeRecipeData.recipes[forcedKey]) {
      return { name: forcedKey, rows: runtimeRecipeData.recipes[forcedKey] };
    }

    const aliases = [
      { test: /\b(COFFEE|KOPI)\s+MILO\b/, recipe: 'COFFEE MILO' },
      { test: /\bMILO\s+(MALAYSIA|ORIGINAL)\b/, recipe: 'MILO MALAYSIA' }
    ];
    for (const alias of aliases) {
      if (alias.test.test(key) && runtimeRecipeData.recipes[alias.recipe]) {
        return { name: alias.recipe, rows: runtimeRecipeData.recipes[alias.recipe] };
      }
    }

    if (runtimeRecipeData.recipes[key]) {
      return { name: key, rows: runtimeRecipeData.recipes[key] };
    }

    const directKeys = Object.keys(runtimeRecipeData.recipes)
      .filter((recipeKey) => recipeKey !== 'KONSENTRAT')
      .sort((a, b) => b.length - a.length);

    for (const recipeKey of directKeys) {
      if (key.includes(recipeKey) || recipeKey.includes(key)) {
        return { name: recipeKey, rows: runtimeRecipeData.recipes[recipeKey] };
      }
    }

    if (/\bMILO\b/.test(key) && /(BUTTERSCOTCH|CARAMEL|HAZELNUT)/.test(key)) {
      const recipeKey = Object.keys(runtimeRecipeData.recipes)
        .find((candidate) => candidate.includes('MILO') && candidate.includes('BUTTERSCOTCH'));
      if (recipeKey) return { name: recipeKey, rows: runtimeRecipeData.recipes[recipeKey] };
    }

    if (/(BUTTERSCOTCH|CARAMEL|HAZELNUT)/.test(key) && !/\bMILO\b/.test(key)) {
      const recipeKey = Object.keys(runtimeRecipeData.recipes)
        .find((candidate) => candidate.includes('PREMIUM SERIES'));
      if (recipeKey) return { name: recipeKey, rows: runtimeRecipeData.recipes[recipeKey] };
    }

    if (/(MATCHA|CHOCO|TARO|RED ?VELVET)/.test(key) && !/(MATCHAPRESSO|MATCHA AREN)/.test(key)) {
      const recipeKey = Object.keys(runtimeRecipeData.recipes)
        .find((candidate) => candidate.includes('NON COFFEE SERIES'));
      if (recipeKey) return { name: recipeKey, rows: runtimeRecipeData.recipes[recipeKey] };
    }

    return null;
  }

  function aggregateProducts(transactions) {
    const map = new Map();

    transactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        const sourceName = canonical(item.name);
        const override = variantOverride(sourceName);
        const name = canonical(override.displayName || sourceName);
        const multiplier = toNumber(override.cupMultiplier) > 0
          ? toNumber(override.cupMultiplier)
          : 1;
        const quantity = toNumber(item.qty) * multiplier;
        const key = keyText(name);

        if (!map.has(key)) {
          map.set(key, {
            name,
            qty: 0,
            revenue: 0,
            recipeKey: canonical(override.recipeKey || ''),
            sourceNames: new Set()
          });
        }

        const row = map.get(key);
        row.qty += quantity;
        row.revenue += toNumber(item.subtotal);
        if (override.recipeKey) row.recipeKey = canonical(override.recipeKey);
        row.sourceNames.add(sourceName);
      });
    });

    return Array.from(map.values())
      .map((row) => ({
        name: row.name,
        qty: row.qty,
        revenue: row.revenue,
        recipeKey: row.recipeKey,
        sourceNames: Array.from(row.sourceNames)
      }))
      .sort((a, b) => b.qty - a.qty);
  }

  function aggregateMaterials(products) {
    const materials = new Map();
    const unmapped = [];
    const concentrateRecipe = runtimeRecipeData.recipes.KONSENTRAT || [];
    const concentrateYield = runtimeRecipeData.concentrateYield || 1000;
    let concentrateMl = 0;

    function addMaterial(material, qty, unit, productName, kind) {
      const name = canonical(material);
      const key = `${keyText(name)}::${keyText(unit)}`;

      if (!materials.has(key)) {
        materials.set(key, {
          material: name,
          qty: 0,
          unit: canonical(unit || 'unit'),
          kind: kind || 'Bahan baku',
          products: new Set()
        });
      }

      const row = materials.get(key);
      row.qty += toNumber(qty);
      if (kind === 'Bahan baku' || row.kind !== 'Bahan baku') row.kind = kind || row.kind;
      row.products.add(canonical(productName));
    }

    products.forEach((product) => {
      const recipe = findRecipe(product.name, product.recipeKey);

      if (!recipe) {
        unmapped.push(product.name);
        addMaterial('Cup + Tutup', product.qty, 'pcs', product.name, 'Kemasan');
        return;
      }

      let hasPackaging = false;

      recipe.rows.forEach((row) => {
        const materialKey = keyText(row.material);
        const usedQty = row.qty * product.qty;

        if (materialKey === 'CUP TUTUP' || materialKey === 'CUP DAN TUTUP') {
          hasPackaging = true;
        }

        if (
          materialKey === 'KONSENTRAT' &&
          concentrateRecipe.length &&
          concentrateYield > 0
        ) {
          concentrateMl += usedQty;
          concentrateRecipe.forEach((component) => {
            addMaterial(
              component.material,
              (usedQty / concentrateYield) * component.qty,
              component.unit,
              product.name,
              'Bahan baku konsentrat'
            );
          });
        } else {
          addMaterial(
            row.material,
            usedQty,
            row.unit,
            product.name,
            materialKey.includes('CUP') ? 'Kemasan' : 'Bahan baku'
          );
        }
      });

      if (!hasPackaging) {
        addMaterial('Cup + Tutup', product.qty, 'pcs', product.name, 'Kemasan');
      }
    });

    return {
      rows: Array.from(materials.values())
        .map((row) => ({
          material: row.material,
          qty: row.qty,
          unit: row.unit,
          kind: row.kind,
          products: Array.from(row.products).sort()
        }))
        .sort((a, b) => a.material.localeCompare(b.material, 'id')),
      concentrateMl,
      concentrateBatches: concentrateYield > 0 ? concentrateMl / concentrateYield : 0,
      concentrateYield,
      unmapped: Array.from(new Set(unmapped)).sort()
    };
  }

  function writePrimaryRoot(root) {
    state.cachedRoot = root;
    window.__TECO_NATIVE_DATA__ = root;
    try {
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(root));
    } catch (error) {
      console.error('[Te.Co Native] Gagal menyimpan konfigurasi:', error);
      alert('Konfigurasi tidak dapat disimpan di browser ini.');
      return false;
    }
    window.dispatchEvent(new CustomEvent('teco:data-changed', {
      detail: { reason: 'native-report-config', version: VERSION }
    }));
    return true;
  }

  function saveNativeConfig(config) {
    const root = getPrimaryRoot();
    root[CONFIG_KEY] = mergeNativeConfig(config);
    if (!writePrimaryRoot(root)) return false;
    refreshRuntimeConfig(root);
    return true;
  }
  function adjustmentMatches(adjustment, mode, period, cashier) {
    const date = canonical(adjustment.date);
    const parsedDate = dateFromKey(date);
    const periodMatch = parsedDate ? matchesPeriod(parsedDate, mode, period) : false;
    const cashierMatch = cashier === 'ALL'
      || cashierKey(adjustment.cashier) === cashierKey(cashier)
      || cashierKey(adjustment.cashier) === 'SEMUA';
    return periodMatch && cashierMatch;
  }

  function reportAdjustments(mode, period, cashier) {
    return (runtimeConfig.adjustments || [])
      .filter((row) => adjustmentMatches(row, mode, period, cashier))
      .map((row) => ({
        id: canonical(row.id),
        date: canonical(row.date),
        cashier: canonical(row.cashier || 'Semua'),
        cupDelta: toNumber(row.cupDelta),
        revenueDelta: toNumber(row.revenueDelta),
        expenseDelta: toNumber(row.expenseDelta),
        note: canonical(row.note),
        updatedBy: canonical(row.updatedBy || 'Admin')
      }));
  }

  function adjustmentTotals(rows) {
    return rows.reduce((total, row) => {
      total.cup += toNumber(row.cupDelta);
      total.revenue += toNumber(row.revenueDelta);
      total.expense += toNumber(row.expenseDelta);
      return total;
    }, { cup: 0, revenue: 0, expense: 0 });
  }

  function cashierKey(value) {
    return keyText(value).replace(/\s+/g, '');
  }
  function filterTransactions(transactions) {
    return transactions.filter((transaction) => {
      const period = state.mode === 'daily'
        ? state.date
        : state.mode === 'weekly'
          ? state.weekDate
          : state.month;
      const periodMatch = matchesPeriod(transaction.date, state.mode, period);
      const cashierMatch = state.cashier === 'ALL'
        || cashierKey(transaction.cashier) === cashierKey(state.cashier);
      return periodMatch && cashierMatch;
    });
  }

  function latestTransactionDate(transactions) {
    return transactions.length ? dateKey(transactions[0].date) : todayKey();
  }

  function latestTransactionMonth(transactions) {
    return transactions.length ? monthKey(transactions[0].date) : currentMonthKey();
  }

  function findReportHost() {
    const selectors = [
      '#page-laporan',
      '#page-reports',
      '#reportsPage',
      '#reportPage',
      '#reports',
      '[data-page="laporan"]',
      '[data-page="reports"]',
      '.page-laporan',
      '.reports-page'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, .page-title, .section-title')
    );

    const heading = headings.find((element) =>
      /Laporan\s*&\s*Analisis/i.test(element.textContent || '')
    );

    if (!heading) return null;

    return (
      heading.closest('[id*="page"], .page, main, section, .content') ||
      heading.parentElement
    );
  }

  function hideLegacyAnalyticsLaunchers() {
    document.querySelectorAll('button, a, .card, .admin-card').forEach((element) => {
      const text = canonical(element.textContent);
      if (
        /BUKA ANALISIS/i.test(text) ||
        /^ANALISIS PENJUALAN\s*&\s*BAHAN$/i.test(text)
      ) {
        const card = element.closest('.card, .admin-card, .setting-card');
        if (card && !card.contains(document.getElementById('teco-native-report'))) {
          card.style.display = 'none';
        }
      }
    });

    [
      '#tecoAnalyticsModal',
      '#teco-analytics-modal',
      '.teco-analytics-modal'
    ].forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => element.remove());
    });
  }

  function ensureMounted() {
    const host = findReportHost();
    if (!host) return false;

    let root = document.getElementById('teco-native-report');

    if (!root) {
      root = document.createElement('section');
      root.id = 'teco-native-report';
      root.className = 'teco-native-report';

      const heading = Array.from(host.querySelectorAll('h1, h2, h3, .page-title'))
        .find((element) => /Laporan\s*&\s*Analisis/i.test(element.textContent || ''));

      if (heading) heading.insertAdjacentElement('afterend', root);
      else host.prepend(root);
    }

    hideLegacyAnalyticsLaunchers();
    return true;
  }

  function renderCashierOptions(transactions) {
    const cashiers = Array.from(
      new Set(
        transactions
          .map((transaction) => canonical(transaction.cashier))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'id'));

    return [
      '<option value="ALL">Semua Kasir</option>',
      ...cashiers.map((cashier) => (
        `<option value="${escapeHtml(cashier)}" ${
          cashierKey(cashier) === cashierKey(state.cashier) ? 'selected' : ''
        }>${escapeHtml(cashier)}</option>`
      ))
    ].join('');
  }

  function transactionRows(transactions) {
    if (!transactions.length) {
      return '<tr><td colspan="5" class="teco-native-empty">Tidak ada transaksi pada periode dan kasir yang dipilih.</td></tr>';
    }

    return transactions.map((transaction, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(
          new Intl.DateTimeFormat('id-ID', {
            timeZone: TIME_ZONE,
            dateStyle: 'medium',
            timeStyle: 'short'
          }).format(transaction.date)
        )}</td>
        <td>${escapeHtml(transaction.cashier)}</td>
        <td>${escapeHtml(
          transaction.items
            .map((item) => `${item.name} x${formatQuantity(item.qty)}`)
            .join(', ')
        )}</td>
        <td class="teco-native-number">${formatMoney(transaction.total)}</td>
      </tr>
    `).join('');
  }

  function productRows(products) {
    if (!products.length) {
      return '<tr><td colspan="5" class="teco-native-empty">Belum ada produk terjual pada periode ini.</td></tr>';
    }

    return products.map((product, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(product.name)}</td>
        <td class="teco-native-number">${formatQuantity(product.qty)}</td>
        <td class="teco-native-number">${formatMoney(product.revenue)}</td>
        <td>${escapeHtml(recipeNameForProduct(product.name, product.recipeKey))}</td>
      </tr>
    `).join('');
  }

  function materialRows(materials) {
    if (!materials.length) {
      return '<tr><td colspan="5" class="teco-native-empty">Belum ada bahan terpakai pada periode ini.</td></tr>';
    }

    return materials.map((material, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(material.material)}</td>
        <td class="teco-native-number">${formatQuantity(material.qty)}</td>
        <td>${escapeHtml(material.unit)}</td>
        <td>${escapeHtml(material.products.join(', '))}</td>
      </tr>
    `).join('');
  }
  function expenseClassificationRows(rows) {
    if (!rows.length) {
      return '<tr><td colspan="5" class="teco-native-empty">Belum ada pengeluaran pada periode ini.</td></tr>';
    }
    return rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.category)}</td>
        <td>${escapeHtml(row.note)}</td>
        <td class="teco-native-number">${row.count}</td>
        <td class="teco-native-number">${formatMoney(row.amount)}</td>
      </tr>
    `).join('');
  }

  function filterExpenses(expenses, mode, period, cashier) {
    return expenses.filter((expense) => {
      const periodMatch = matchesPeriod(expense.date, mode, period);
      const cashierMatch = cashier === 'ALL'
        || cashierKey(expense.cashier) === cashierKey(cashier);
      return periodMatch && cashierMatch;
    });
  }
  function formatPeriodLabel(mode, period) {
    if (mode === 'daily') {
      const date = dateFromKey(period);
      if (!date) return period;
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: TIME_ZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
    }

    if (mode === 'weekly') {
      const range = weekRange(period);
      const startMonth = new Intl.DateTimeFormat('id-ID', { timeZone: TIME_ZONE, month: 'long' }).format(range.start);
      const endMonth = new Intl.DateTimeFormat('id-ID', { timeZone: TIME_ZONE, month: 'long' }).format(range.end);
      const year = new Intl.DateTimeFormat('id-ID', { timeZone: TIME_ZONE, year: 'numeric' }).format(range.end);
      const startDay = new Intl.DateTimeFormat('id-ID', { timeZone: TIME_ZONE, day: 'numeric' }).format(range.start);
      const endDay = new Intl.DateTimeFormat('id-ID', { timeZone: TIME_ZONE, day: 'numeric' }).format(range.end);
      return startMonth === endMonth
        ? `${startDay}–${endDay} ${endMonth} ${year}`
        : `${startDay} ${startMonth}–${endDay} ${endMonth} ${year}`;
    }

    const date = new Date(`${period}-01T12:00:00+07:00`);
    if (Number.isNaN(date.getTime())) return period;
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TIME_ZONE,
      month: 'long',
      year: 'numeric'
    }).format(date);
  }

  function timeText(date) {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: TIME_ZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  }

  function materialDisplay(material) {
    const qty = toNumber(material.qty);
    const unitKey = keyText(material.unit);
    const nameKey = keyText(material.material);

    if (nameKey.includes('CUP') && unitKey === 'PCS') {
      return `${formatQuantity(qty)} set`;
    }

    if (unitKey === 'ML' && qty >= 1000) {
      return `${formatQuantity(qty / 1000)} liter`;
    }

    return `${formatQuantity(qty)} ${material.unit}`;
  }

  function aggregatePayments(transactions) {
    const map = new Map();
    transactions.forEach((transaction) => {
      const name = normalizePayment(transaction.payment);
      const key = keyText(name);
      if (!map.has(key)) map.set(key, { name, count: 0, amount: 0 });
      const row = map.get(key);
      row.count += 1;
      row.amount += toNumber(transaction.total);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }
  function aggregateExpenseClassifications(expenses) {
    const map = new Map();
    expenses.forEach((expense) => {
      const category = canonical(expense.category || 'Lain-lain') || 'Lain-lain';
      const note = canonical(expense.note || '-') || '-';
      const key = `${keyText(category)}::${keyText(note)}`;
      if (!map.has(key)) map.set(key, { category, note, count: 0, amount: 0 });
      const row = map.get(key);
      row.count += 1;
      row.amount += toNumber(expense.amount);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category, 'id'));
  }
  function buildReportData(mode, period, cashier) {
    const root = getPrimaryRoot();
    detectSession(root);
    refreshRuntimeConfig(root);
    const allTransactions = extractTransactions(root);
    const allExpenses = extractExpenses(root);

    const transactions = allTransactions.filter((transaction) => {
      const periodMatch = matchesPeriod(transaction.date, mode, period);
      const cashierMatch = cashier === 'ALL'
        || cashierKey(transaction.cashier) === cashierKey(cashier);
      return periodMatch && cashierMatch;
    });

    const expenses = filterExpenses(allExpenses, mode, period, cashier);
    const expenseClassifications = aggregateExpenseClassifications(expenses);
    const products = aggregateProducts(transactions);
    const materials = aggregateMaterials(products);
    const adjustments = reportAdjustments(mode, period, cashier);
    const adjustment = adjustmentTotals(adjustments);
    const rawRevenue = transactions.reduce((sum, transaction) => sum + toNumber(transaction.total), 0);
    const rawExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
    const rawCups = products.reduce((sum, product) => sum + toNumber(product.qty), 0);
    const revenue = rawRevenue + adjustment.revenue;
    const totalExpenses = rawExpenses + adjustment.expense;
    const totalCups = rawCups + adjustment.cup;
    const notes = Array.from(new Set(
      transactions.map((transaction) => canonical(transaction.note)).filter(Boolean)
    ));

    return {
      mode,
      period,
      periodLabel: formatPeriodLabel(mode, period),
      cashier,
      cashierLabel: cashier === 'ALL' ? 'Semua Kasir' : cashier,
      transactions,
      expenses,
      expenseClassifications,
      products,
      materials,
      payments: aggregatePayments(transactions),
      notes,
      adjustments,
      adjustment,
      rawRevenue,
      rawExpenses,
      rawCups,
      revenue,
      totalExpenses,
      netBalance: revenue - totalExpenses,
      totalCups,
      root
    };
  }
  function activeReport() {
    const period = state.mode === 'daily'
      ? state.date
      : state.mode === 'weekly'
        ? state.weekDate
        : state.month;
    return buildReportData(state.mode, period, state.cashier);
  }
  function buildWhatsAppText(report) {
    const typeMap = { daily: 'HARIAN', weekly: 'MINGGUAN', monthly: 'BULANAN' };
    const type = typeMap[report.mode] || String(report.mode || '').toUpperCase();
    const lines = [
      `*LAPORAN PENJUALAN TE.CO — ${type}*`,
      `Periode: ${report.periodLabel}`,
      `Kasir: ${report.cashierLabel}`,
      '',
      `Total transaksi: ${report.transactions.length}`,
      `Total cup terjual: *${formatQuantity(report.totalCups)} cup*`,
      `Jumlah varian: *${report.products.length}*`,
      `Omzet kotor: *${formatMoney(report.revenue)}*`,
      `Total pengeluaran: *${formatMoney(report.totalExpenses)}*`,
      `Saldo bersih: *${formatMoney(report.netBalance)}*`,
      '',
      '*TIPE PEMBAYARAN*'
    ];

    if (report.payments.length) {
      report.payments.forEach((payment) => {
        lines.push(`• ${payment.name}: ${payment.count} transaksi — ${formatMoney(payment.amount)}`);
      });
    } else {
      lines.push('• Tidak ada pembayaran pada periode ini');
    }

    lines.push('', '*REKAP PENGELUARAN PER KLASIFIKASI*');
    if (report.expenseClassifications.length) {
      report.expenseClassifications.forEach((row) => {
        lines.push(`• ${row.category} — ${row.note}: ${row.count} transaksi — *${formatMoney(row.amount)}*`);
      });
    } else {
      lines.push('• Tidak ada pengeluaran pada periode ini');
    }

    lines.push('', '*DETAIL PENGELUARAN*');
    if (report.expenses.length) {
      report.expenses.forEach((expense) => {
        lines.push(`• ${expense.category}: ${formatMoney(expense.amount)} — ${expense.note || '-'}`);
      });
    } else {
      lines.push('• Tidak ada pengeluaran pada periode ini');
    }

    lines.push('', '*CATATAN*');
    if (report.notes.length) report.notes.forEach((note) => lines.push(`• ${note}`));
    else lines.push('• Tidak ada catatan');

    if (report.adjustments.length) {
      lines.push('', '*PENYESUAIAN LAPORAN*');
      report.adjustments.forEach((row) => {
        const parts = [];
        if (row.cupDelta) parts.push(`cup ${row.cupDelta > 0 ? '+' : ''}${formatQuantity(row.cupDelta)}`);
        if (row.revenueDelta) parts.push(`omzet ${row.revenueDelta > 0 ? '+' : ''}${formatMoney(row.revenueDelta)}`);
        if (row.expenseDelta) parts.push(`pengeluaran ${row.expenseDelta > 0 ? '+' : ''}${formatMoney(row.expenseDelta)}`);
        lines.push(`• ${row.date} — ${parts.join(', ') || 'catatan'}${row.note ? ` — ${row.note}` : ''}`);
      });
    }

    lines.push('', '*REKAP VARIAN TERJUAL*');
    if (report.products.length) {
      report.products.forEach((product, index) => {
        lines.push(`${index + 1}. ${product.name}: ${formatQuantity(product.qty)} cup`);
      });
    } else {
      lines.push('• Tidak ada varian terjual');
    }

    lines.push('', '*ANALISIS BAHAN TERPAKAI*');
    if (report.materials.concentrateMl > 0) {
      lines.push(
        `Konsentrat: ${formatQuantity(report.materials.concentrateMl)} ml ` +
        `(+${formatQuantity(report.materials.concentrateBatches)} batch)`
      );
    }

    if (report.materials.rows.length) {
      report.materials.rows.forEach((material) => {
        lines.push(`• ${material.material}: ${materialDisplay(material)}`);
      });
    } else {
      lines.push('• Tidak ada bahan terpakai');
    }

    if (report.materials.unmapped.length) {
      lines.push('', '*VARIAN BELUM DIPETAKAN KE RESEP*');
      report.materials.unmapped.forEach((name) => lines.push(`• ${name}`));
    }

    lines.push('', `Dibuat otomatis oleh Te.Co Analytics v${VERSION}`);
    return lines.join('\n');
  }

  function findOwnerWhatsApp(root) {
    const exactKeys = [
      'ownerWhatsapp', 'ownerWhatsApp', 'whatsappOwner', 'waOwner',
      'ownerPhone', 'phoneOwner', 'noWhatsAppOwner', 'nomorWhatsAppOwner'
    ];
    const seen = new WeakSet();
    let fallback = '';

    function walk(node, depth) {
      node = parseMaybeJson(node);
      if (!node || typeof node !== 'object' || depth > 8 || seen.has(node)) return '';
      seen.add(node);

      for (const key of exactKeys) {
        const value = first(node, [key]);
        if (value) return String(value);
      }

      for (const [key, value] of Object.entries(node)) {
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (/owner/.test(normalizedKey) && /(wa|whatsapp|phone|telepon)/.test(normalizedKey) && value) {
          return String(value);
        }
        if (!fallback && /whatsapp|nomorwa|nowa/.test(normalizedKey) && value) fallback = String(value);
      }

      for (const value of Object.values(node)) {
        const result = walk(value, depth + 1);
        if (result) return result;
      }
      return '';
    }

    return walk(root, 0) || fallback;
  }

  function normalizeWhatsAppNumber(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
    else if (digits.startsWith('8')) digits = `62${digits}`;
    return digits;
  }
  function sendWhatsAppReport(reportOverride) {
    const report = reportOverride && reportOverride.transactions
      ? reportOverride
      : activeReport();
    const text = buildWhatsAppText(report);
    const number = normalizeWhatsAppNumber(findOwnerWhatsApp(report.root));
    const url = number
      ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup && navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Laporan disalin. Izinkan pop-up browser lalu klik WhatsApp lagi.');
      });
    }
    return text;
  }

  function recipeNameForProduct(productName, forcedRecipeKey) {
    const recipe = findRecipe(productName, forcedRecipeKey);
    return recipe ? recipe.name : 'BELUM DIPETAKAN';
  }

  function materialKind(material) {
    if (keyText(material.material).includes('CUP')) return 'Kemasan';
    return material.kind || 'Bahan baku';
  }

  function reportSheets(report) {
    const suffix = report.mode === 'daily' ? 'Harian' : report.mode === 'weekly' ? 'Mingguan' : 'Bulanan';
    const summary = [
      ['Keterangan', 'Nilai'],
      ['Jenis Laporan', suffix],
      ['Periode', report.periodLabel],
      ['Kasir', report.cashierLabel],
      ['Total Transaksi', report.transactions.length],
      ['Total Cup Sebelum Penyesuaian', report.rawCups],
      ['Penyesuaian Cup', report.adjustment.cup],
      ['Total Cup', report.totalCups],
      ['Jumlah Varian', report.products.length],
      ['Omzet Sebelum Penyesuaian', report.rawRevenue],
      ['Penyesuaian Omzet', report.adjustment.revenue],
      ['Omzet', report.revenue],
      ['Pengeluaran Sebelum Penyesuaian', report.rawExpenses],
      ['Penyesuaian Pengeluaran', report.adjustment.expense],
      ['Total Pengeluaran', report.totalExpenses],
      ['Saldo Bersih', report.netBalance],
      ['Konsentrat Terpakai (ml)', report.materials.concentrateMl],
      ['Perkiraan Batch Konsentrat', report.materials.concentrateBatches],
      ['Asumsi Hasil 1 Batch (ml)', report.materials.concentrateYield],
      ['Varian Belum Terpetakan', report.materials.unmapped.length],
      ['Jumlah Catatan', report.notes.length]
    ];

    const variants = [['No', 'Varian', 'Total_Cup', 'Omzet_Item', 'Resep', 'Sumber_Varian']];
    report.products.forEach((product, index) => variants.push([
      index + 1, product.name, product.qty, product.revenue,
      recipeNameForProduct(product.name, product.recipeKey),
      (product.sourceNames || []).join(', ')
    ]));

    const materials = [['No', 'Bahan', 'Jumlah', 'Satuan', 'Tampilan', 'Jenis', 'Dipakai_Oleh']];
    let materialNo = 0;
    if (report.materials.concentrateMl > 0) {
      materials.push([
        materialNo++, 'Konsentrat (kebutuhan produksi)',
        report.materials.concentrateMl, 'ml',
        `${formatQuantity(report.materials.concentrateMl)} ml`,
        'Bahan antara', 'Produk berbasis konsentrat'
      ]);
    }
    report.materials.rows.forEach((material) => materials.push([
      materialNo++, material.material, material.qty, material.unit,
      materialDisplay(material), materialKind(material),
      material.products.join(', ')
    ]));

    const transactions = [[
      'Tanggal', 'Waktu', 'ID_Transaksi', 'Kasir', 'Pembayaran', 'Catatan',
      'Varian', 'Qty_Cup', 'Harga_Satuan', 'Subtotal_Item',
      'Total_Transaksi', 'Sumber'
    ]];
    report.transactions.forEach((transaction) => {
      transaction.items.forEach((item) => transactions.push([
        dateKey(transaction.date), timeText(transaction.date), transaction.id,
        transaction.cashier, transaction.payment, transaction.note || '',
        item.name, item.qty, item.price, item.subtotal, transaction.total,
        PRIMARY_STORAGE_KEY
      ]));
    });

    const expenses = [['Tanggal', 'Waktu', 'ID_Pengeluaran', 'Kasir', 'Kategori', 'Catatan', 'Nominal']];
    report.expenses.forEach((expense) => expenses.push([
      dateKey(expense.date), timeText(expense.date), expense.id,
      expense.cashier, expense.category, expense.note, expense.amount
    ]));

    const expenseRecap = [['No', 'Kategori', 'Keterangan', 'Frekuensi_Transaksi', 'Total_Nominal']];
    report.expenseClassifications.forEach((row, index) => expenseRecap.push([
      index + 1, row.category, row.note, row.count, row.amount
    ]));

    const payments = [['No', 'Tipe_Pembayaran', 'Jumlah_Transaksi', 'Nominal']];
    report.payments.forEach((payment, index) => payments.push([
      index + 1, payment.name, payment.count, payment.amount
    ]));

    const adjustments = [['Tanggal', 'Kasir', 'Penyesuaian_Cup', 'Penyesuaian_Omzet', 'Penyesuaian_Pengeluaran', 'Catatan', 'Diubah_Oleh']];
    report.adjustments.forEach((row) => adjustments.push([
      row.date, row.cashier, row.cupDelta, row.revenueDelta,
      row.expenseDelta, row.note, row.updatedBy
    ]));

    return {
      [`Ringkasan ${suffix}`]: summary,
      [`Varian ${suffix}`]: variants,
      [`Bahan ${suffix}`]: materials,
      [`Penyesuaian ${suffix}`]: adjustments,
      [`Transaksi ${suffix}`]: transactions,
      [`Pengeluaran ${suffix}`]: expenses,
      [`Rekap Pengeluaran ${suffix}`]: expenseRecap,
      [`Pembayaran ${suffix}`]: payments
    };
  }

  function mappingSheet(reports) {
    const map = new Map();
    reports.forEach((report) => {
      report.products.forEach((product) => {
        map.set(keyText(product.name), [product.name, recipeNameForProduct(product.name, product.recipeKey)]);
      });
    });
    const rows = [['No', 'Nama_Produk_Varian', 'Resep']];
    Array.from(map.values())
      .sort((a, b) => a[0].localeCompare(b[0], 'id'))
      .forEach((row, index) => rows.push([index + 1, row[0], row[1]]));
    return rows;
  }

  function masterRecipeSheet() {
    const rows = [['Resep', 'Bahan', 'Jumlah_per_Cup_atau_Batch', 'Satuan']];
    Object.entries(runtimeRecipeData.recipes).forEach(([recipeName, materials]) => {
      materials.forEach((material) => rows.push([
        recipeName, material.material, material.qty, material.unit
      ]));
    });
    return rows;
  }

  function buildWorkbookSheets(reports) {
    const sheets = {};
    reports.forEach((report) => Object.assign(sheets, reportSheets(report)));
    sheets['Mapping Produk'] = mappingSheet(reports);
    sheets['Master Resep'] = masterRecipeSheet();
    return sheets;
  }

  function autoColumns(rows) {
    const columnCount = Math.max(1, ...rows.map((row) => row.length));
    return Array.from({ length: columnCount }, (_, column) => {
      const max = Math.max(8, ...rows.map((row) => String(row[column] == null ? '' : row[column]).length));
      return { wch: Math.min(42, max + 2) };
    });
  }

  let xlsxLoadingPromise = null;
  function ensureXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (xlsxLoadingPromise) return xlsxLoadingPromise;

    xlsxLoadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.async = true;
      script.onload = () => window.XLSX ? resolve(window.XLSX) : reject(new Error('XLSX tidak tersedia'));
      script.onerror = () => reject(new Error('Library XLSX gagal dimuat'));
      document.head.appendChild(script);
    });

    return xlsxLoadingPromise;
  }

  function xmlEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function fallbackSpreadsheetXml(sheets, filename) {
    const worksheets = Object.entries(sheets).map(([name, rows]) => {
      const rowXml = rows.map((row) => {
        const cells = row.map((value) => {
          const isNumber = typeof value === 'number' && Number.isFinite(value);
          return `<Cell><Data ss:Type="${isNumber ? 'Number' : 'String'}">${xmlEscape(value)}</Data></Cell>`;
        }).join('');
        return `<Row>${cells}</Row>`;
      }).join('');
      return `<Worksheet ss:Name="${xmlEscape(name.slice(0, 31))}"><Table>${rowXml}</Table></Worksheet>`;
    }).join('');

    const xml = `<?xml version="1.0"?>\n` +
      `<?mso-application progid="Excel.Sheet"?>\n` +
      `<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" ` +
      `xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">${worksheets}</Workbook>`;

    const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename.replace(/\.xlsx$/i, '.xls');
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportReports(reports, filename) {
    const sheets = buildWorkbookSheets(reports);

    try {
      const XLSX = await ensureXlsx();
      const workbook = XLSX.utils.book_new();

      Object.entries(sheets).forEach(([sheetName, rows]) => {
        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        worksheet['!cols'] = autoColumns(rows);
        if (rows.length && rows[0].length) {
          worksheet['!autofilter'] = { ref: XLSX.utils.encode_range({
            s: { r: 0, c: 0 },
            e: { r: Math.max(0, rows.length - 1), c: Math.max(0, rows[0].length - 1) }
          }) };
        }
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
      });

      XLSX.writeFile(workbook, filename, { compression: true });
    } catch (error) {
      console.warn('[Te.Co Native] Export XLSX gagal, memakai format Excel XML:', error);
      fallbackSpreadsheetXml(sheets, filename);
    }
  }
  function exportActiveSheets() {
    const report = activeReport();
    const type = report.mode === 'daily' ? 'harian' : report.mode === 'weekly' ? 'mingguan' : 'bulanan';
    exportReports([report], `Laporan_TeCo_${type}_${report.period}.xlsx`);
  }

  function exportDailySheets() {
    const report = buildReportData('daily', state.date, state.cashier);
    exportReports([report], `Laporan_TeCo_harian_${state.date}.xlsx`);
  }



  function exportWeeklySheets() {
    const report = buildReportData('weekly', state.weekDate, state.cashier);
    const range = weekRange(state.weekDate);
    exportReports([report], `Laporan_TeCo_mingguan_${range.startKey}_${range.endKey}.xlsx`);
  }

  function exportMonthlySheets() {
    const report = buildReportData('monthly', state.month, state.cashier);
    exportReports([report], `Laporan_TeCo_bulanan_${state.month}.xlsx`);
  }
  function exportBothSheets() {
    const daily = buildReportData('daily', state.date, state.cashier);
    const weekly = buildReportData('weekly', state.weekDate, state.cashier);
    const monthly = buildReportData('monthly', state.month, state.cashier);
    exportReports(
      [daily, weekly, monthly],
      `Laporan_TeCo_lengkap_${state.date}_${state.month}.xlsx`
    );
  }

  function downloadCsv(filename, rows) {
    const text = '\ufeff' + rows
      .map((row) => row.map((cell) => {
        const value = String(cell == null ? '' : cell);
        return /[;"\n]/.test(value)
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(';'))
      .join('\n');

    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCurrent() {
    exportActiveSheets();
  }

  function adjustmentRows(rows, editable) {
    if (!rows.length) {
      return '<tr><td colspan="8" class="teco-native-empty">Tidak ada penyesuaian pada periode ini.</td></tr>';
    }
    return rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.date)}</td>
        <td>${escapeHtml(row.cashier)}</td>
        <td class="teco-native-number">${row.cupDelta > 0 ? '+' : ''}${formatQuantity(row.cupDelta)}</td>
        <td class="teco-native-number">${row.revenueDelta > 0 ? '+' : ''}${formatMoney(row.revenueDelta)}</td>
        <td class="teco-native-number">${row.expenseDelta > 0 ? '+' : ''}${formatMoney(row.expenseDelta)}</td>
        <td>${escapeHtml(row.note || '-')}</td>
        ${editable ? `<td><button type="button" class="teco-native-mini" data-edit-adjustment="${escapeHtml(row.id)}">Edit</button></td>` : ''}
      </tr>
    `).join('');
  }

  function currentVariantSources() {
    const map = new Map();
    extractTransactions(getPrimaryRoot()).forEach((transaction) => {
      transaction.items.forEach((item) => {
        const name = canonical(item.name);
        if (name) map.set(keyText(name), name);
      });
    });
    Object.entries(runtimeConfig.variantOverrides || {}).forEach(([key, row]) => {
      map.set(key, canonical(row.sourceName || row.displayName || key));
    });
    return Array.from(map.entries())
      .map(([key, name]) => ({ key, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'id'));
  }

  function recipeOptions(selected) {
    const keys = Object.keys(runtimeRecipeData.recipes)
      .filter((key) => key !== 'KONSENTRAT')
      .sort((a, b) => a.localeCompare(b, 'id'));
    return ['<option value="">Otomatis</option>']
      .concat(keys.map((key) => `<option value="${escapeHtml(key)}" ${keyText(selected) === key ? 'selected' : ''}>${escapeHtml(key)}</option>`))
      .join('');
  }

  function variantEditorRows() {
    const rows = currentVariantSources();
    if (!rows.length) return '<tr><td colspan="5" class="teco-native-empty">Belum ada varian transaksi.</td></tr>';
    return rows.map((row) => {
      const override = runtimeConfig.variantOverrides[row.key] || {};
      return `
        <tr data-variant-key="${escapeHtml(row.key)}">
          <td>${escapeHtml(row.name)}</td>
          <td><input data-field="displayName" value="${escapeHtml(override.displayName || row.name)}"></td>
          <td><input data-field="cupMultiplier" type="number" min="0.01" step="0.01" value="${escapeHtml(override.cupMultiplier || 1)}"></td>
          <td><select data-field="recipeKey">${recipeOptions(override.recipeKey || '')}</select></td>
          <td><button type="button" class="teco-native-mini" data-save-variant="${escapeHtml(row.key)}">Simpan</button></td>
        </tr>`;
    }).join('');
  }

  function recipeEditorRows(recipeName) {
    const rows = runtimeRecipeData.recipes[keyText(recipeName)] || [];
    if (!rows.length) {
      return `<tr><td><input data-recipe-material placeholder="Nama bahan"></td><td><input data-recipe-qty type="number" min="0" step="0.01" placeholder="0"></td><td><input data-recipe-unit value="ml"></td><td><button type="button" class="teco-native-mini danger" data-remove-recipe-row>Hapus</button></td></tr>`;
    }
    return rows.map((row) => `
      <tr>
        <td><input data-recipe-material value="${escapeHtml(row.material)}"></td>
        <td><input data-recipe-qty type="number" min="0" step="0.01" value="${escapeHtml(row.qty)}"></td>
        <td><input data-recipe-unit value="${escapeHtml(row.unit)}"></td>
        <td><button type="button" class="teco-native-mini danger" data-remove-recipe-row>Hapus</button></td>
      </tr>`).join('');
  }

  function renderAdminModal() {
    if (!ensureAdmin()) return;
    refreshRuntimeConfig(getPrimaryRoot());
    const existing = document.getElementById('tecoNativeAdminModal');
    if (existing) existing.remove();

    const recipeNames = Object.keys(runtimeRecipeData.recipes)
      .filter((name) => name !== 'KONSENTRAT')
      .sort((a, b) => a.localeCompare(b, 'id'));
    if (!state.selectedRecipe || !runtimeRecipeData.recipes[keyText(state.selectedRecipe)]) {
      state.selectedRecipe = recipeNames[0] || '';
    }
    const editAdjustment = (runtimeConfig.adjustments || []).find(
      (row) => canonical(row.id) === canonical(state.adjustmentEditId)
    ) || null;
    const adjustmentDate = editAdjustment ? editAdjustment.date : (state.date || todayKey());
    const adjustmentCashier = editAdjustment ? editAdjustment.cashier : 'Semua';
    const adjustmentCup = editAdjustment ? editAdjustment.cupDelta : 0;
    const adjustmentRevenue = editAdjustment ? editAdjustment.revenueDelta : 0;
    const adjustmentExpense = editAdjustment ? editAdjustment.expenseDelta : 0;
    const adjustmentNote = editAdjustment ? editAdjustment.note : '';

    const modal = document.createElement('div');
    modal.id = 'tecoNativeAdminModal';
    modal.className = 'teco-native-modal active';
    modal.innerHTML = `
      <div class="teco-native-modal-card">
        <div class="teco-native-modal-head">
          <div><h3>Pengaturan Varian, Bahan, dan Penyesuaian</h3><p>Khusus Admin. Perubahan disimpan pada data utama POS.</p></div>
          <button type="button" data-close-native-admin>×</button>
        </div>
        <div class="teco-native-admin-tabs">
          <button type="button" data-admin-tab="variants" class="${state.editorTab === 'variants' ? 'active' : ''}">Varian</button>
          <button type="button" data-admin-tab="recipes" class="${state.editorTab === 'recipes' ? 'active' : ''}">Bahan & Resep</button>
          <button type="button" data-admin-tab="adjustments" class="${state.editorTab === 'adjustments' ? 'active' : ''}">Penyesuaian</button>
        </div>

        <section class="teco-native-admin-section ${state.editorTab === 'variants' ? '' : 'hidden'}" data-admin-section="variants">
          <p class="teco-native-help">Ubah nama varian pada laporan, faktor cup, dan mapping resep. Nama transaksi asli tidak dihapus.</p>
          <div class="teco-native-table-wrap"><table><thead><tr><th>Varian Transaksi</th><th>Nama di Laporan</th><th>Faktor Cup</th><th>Resep</th><th>Aksi</th></tr></thead><tbody>${variantEditorRows()}</tbody></table></div>
        </section>

        <section class="teco-native-admin-section ${state.editorTab === 'recipes' ? '' : 'hidden'}" data-admin-section="recipes">
          <div class="teco-native-editor-toolbar">
            <label>Resep<select id="tecoNativeRecipeSelect">${recipeNames.map((name) => `<option value="${escapeHtml(name)}" ${keyText(name) === keyText(state.selectedRecipe) ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')}</select></label>
            <button type="button" id="tecoNativeNewRecipe" class="secondary">+ Resep Baru</button>
            <label>Hasil Konsentrat per Batch (ml)<input id="tecoNativeConcentrateYield" type="number" min="1" value="${escapeHtml(runtimeRecipeData.concentrateYield || 1000)}"></label>
          </div>
          <div class="teco-native-table-wrap"><table><thead><tr><th>Bahan</th><th>Jumlah per Cup/Batch</th><th>Satuan</th><th>Aksi</th></tr></thead><tbody id="tecoNativeRecipeBody">${recipeEditorRows(state.selectedRecipe)}</tbody></table></div>
          <div class="teco-native-form-actions"><button type="button" id="tecoNativeAddRecipeRow" class="secondary">+ Tambah Bahan</button><button type="button" id="tecoNativeSaveRecipe">Simpan Resep</button></div>
        </section>

        <section class="teco-native-admin-section ${state.editorTab === 'adjustments' ? '' : 'hidden'}" data-admin-section="adjustments">
          <form id="tecoNativeAdjustmentForm" class="teco-native-adjustment-form">
            <input id="tecoNativeAdjustmentId" type="hidden" value="${escapeHtml(state.adjustmentEditId)}">
            <label>Tanggal<input id="tecoNativeAdjustmentDate" type="date" value="${escapeHtml(adjustmentDate)}" required></label>
            <label>Kasir<select id="tecoNativeAdjustmentCashier"><option value="Semua">Semua</option>${renderCashierOptions(extractTransactions(getPrimaryRoot())).replace('<option value="ALL">Semua Kasir</option>', '')}</select></label>
            <label>Penyesuaian Cup<input id="tecoNativeAdjustmentCup" type="number" step="0.01" value="${escapeHtml(adjustmentCup)}"></label>
            <label>Penyesuaian Omzet<input id="tecoNativeAdjustmentRevenue" type="number" step="100" value="${escapeHtml(adjustmentRevenue)}"></label>
            <label>Penyesuaian Pengeluaran<input id="tecoNativeAdjustmentExpense" type="number" step="100" value="${escapeHtml(adjustmentExpense)}"></label>
            <label class="wide">Catatan<textarea id="tecoNativeAdjustmentNote" rows="2" placeholder="Alasan penyesuaian">${escapeHtml(adjustmentNote)}</textarea></label>
            <div class="teco-native-form-actions wide"><button type="submit">Simpan Penyesuaian</button><button type="button" id="tecoNativeCancelAdjustment" class="secondary">Batal Edit</button></div>
          </form>
          <div class="teco-native-table-wrap"><table><thead><tr><th>Tanggal</th><th>Kasir</th><th>Cup</th><th>Omzet</th><th>Pengeluaran</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>${(runtimeConfig.adjustments || []).map((row) => `<tr><td>${escapeHtml(row.date)}</td><td>${escapeHtml(row.cashier)}</td><td>${formatQuantity(row.cupDelta)}</td><td>${formatMoney(row.revenueDelta)}</td><td>${formatMoney(row.expenseDelta)}</td><td>${escapeHtml(row.note || '-')}</td><td><button type="button" class="teco-native-mini" data-edit-adjustment="${escapeHtml(row.id)}">Edit</button> <button type="button" class="teco-native-mini danger" data-delete-adjustment="${escapeHtml(row.id)}">Hapus</button></td></tr>`).join('') || '<tr><td colspan="7" class="teco-native-empty">Belum ada penyesuaian.</td></tr>'}</tbody></table></div>
        </section>
      </div>`;
    document.body.appendChild(modal);
    const adjustmentCashierSelect = document.getElementById('tecoNativeAdjustmentCashier');
    if (adjustmentCashierSelect) adjustmentCashierSelect.value = adjustmentCashier;
    bindAdminModal();
  }

  function bindAdminModal() {
    const modal = document.getElementById('tecoNativeAdminModal');
    if (!modal) return;
    modal.querySelector('[data-close-native-admin]')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (event) => {
      if (event.target === modal) modal.remove();
    });
    modal.querySelectorAll('[data-admin-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        state.editorTab = button.dataset.adminTab;
        renderAdminModal();
      });
    });
    modal.querySelectorAll('[data-save-variant]').forEach((button) => {
      button.addEventListener('click', () => {
        const key = button.dataset.saveVariant;
        const row = button.closest('tr');
        const source = currentVariantSources().find((item) => item.key === key);
        runtimeConfig.variantOverrides[key] = {
          sourceName: source ? source.name : key,
          displayName: canonical(row.querySelector('[data-field="displayName"]').value),
          cupMultiplier: Math.max(0.01, toNumber(row.querySelector('[data-field="cupMultiplier"]').value) || 1),
          recipeKey: canonical(row.querySelector('[data-field="recipeKey"]').value)
        };
        if (saveNativeConfig(runtimeConfig)) {
          alert('Varian berhasil disimpan.');
          render();
        }
      });
    });
    const recipeSelect = document.getElementById('tecoNativeRecipeSelect');
    recipeSelect?.addEventListener('change', () => {
      state.selectedRecipe = recipeSelect.value;
      renderAdminModal();
    });
    document.getElementById('tecoNativeNewRecipe')?.addEventListener('click', () => {
      const name = canonical(window.prompt('Nama resep baru:'));
      if (!name) return;
      runtimeConfig.recipes[keyText(name)] = [{ material: 'Cup + Tutup', qty: 1, unit: 'pcs' }];
      state.selectedRecipe = keyText(name);
      saveNativeConfig(runtimeConfig);
      renderAdminModal();
    });
    document.getElementById('tecoNativeAddRecipeRow')?.addEventListener('click', () => {
      const body = document.getElementById('tecoNativeRecipeBody');
      body.insertAdjacentHTML('beforeend', '<tr><td><input data-recipe-material placeholder="Nama bahan"></td><td><input data-recipe-qty type="number" min="0" step="0.01" placeholder="0"></td><td><input data-recipe-unit value="ml"></td><td><button type="button" class="teco-native-mini danger" data-remove-recipe-row>Hapus</button></td></tr>');
      bindRecipeRemoveButtons();
    });
    bindRecipeRemoveButtons();
    document.getElementById('tecoNativeSaveRecipe')?.addEventListener('click', () => {
      const name = canonical(document.getElementById('tecoNativeRecipeSelect')?.value || state.selectedRecipe);
      if (!name) return alert('Pilih atau buat resep terlebih dahulu.');
      const rows = Array.from(document.querySelectorAll('#tecoNativeRecipeBody tr')).map((row) => ({
        material: canonical(row.querySelector('[data-recipe-material]')?.value),
        qty: toNumber(row.querySelector('[data-recipe-qty]')?.value),
        unit: canonical(row.querySelector('[data-recipe-unit]')?.value || 'unit')
      })).filter((row) => row.material && row.qty > 0);
      if (!rows.length) return alert('Resep minimal memiliki satu bahan dengan jumlah lebih dari 0.');
      runtimeConfig.recipes[keyText(name)] = rows;
      runtimeConfig.concentrateYield = Math.max(1, toNumber(document.getElementById('tecoNativeConcentrateYield')?.value) || 1000);
      if (saveNativeConfig(runtimeConfig)) {
        alert('Bahan dan resep berhasil disimpan.');
        render();
        renderAdminModal();
      }
    });
    document.getElementById('tecoNativeAdjustmentForm')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const id = canonical(document.getElementById('tecoNativeAdjustmentId').value) || `adj-${Date.now()}`;
      const record = {
        id,
        date: document.getElementById('tecoNativeAdjustmentDate').value,
        cashier: canonical(document.getElementById('tecoNativeAdjustmentCashier').value || 'Semua'),
        cupDelta: toNumber(document.getElementById('tecoNativeAdjustmentCup').value),
        revenueDelta: toNumber(document.getElementById('tecoNativeAdjustmentRevenue').value),
        expenseDelta: toNumber(document.getElementById('tecoNativeAdjustmentExpense').value),
        note: canonical(document.getElementById('tecoNativeAdjustmentNote').value),
        updatedBy: state.session.name || 'Admin',
        updatedAt: new Date().toISOString()
      };
      const index = runtimeConfig.adjustments.findIndex((row) => canonical(row.id) === id);
      if (index >= 0) runtimeConfig.adjustments[index] = record;
      else runtimeConfig.adjustments.unshift(record);
      state.adjustmentEditId = '';
      if (saveNativeConfig(runtimeConfig)) {
        render();
        renderAdminModal();
      }
    });
    document.getElementById('tecoNativeCancelAdjustment')?.addEventListener('click', () => {
      state.adjustmentEditId = '';
      renderAdminModal();
    });
    modal.querySelectorAll('[data-edit-adjustment]').forEach((button) => {
      button.addEventListener('click', () => {
        const row = runtimeConfig.adjustments.find((item) => canonical(item.id) === button.dataset.editAdjustment);
        if (!row) return;
        state.editorTab = 'adjustments';
        state.adjustmentEditId = row.id;
        renderAdminModal();
        document.getElementById('tecoNativeAdjustmentId').value = row.id;
        document.getElementById('tecoNativeAdjustmentDate').value = row.date;
        document.getElementById('tecoNativeAdjustmentCashier').value = row.cashier;
        document.getElementById('tecoNativeAdjustmentCup').value = row.cupDelta || 0;
        document.getElementById('tecoNativeAdjustmentRevenue').value = row.revenueDelta || 0;
        document.getElementById('tecoNativeAdjustmentExpense').value = row.expenseDelta || 0;
        document.getElementById('tecoNativeAdjustmentNote').value = row.note || '';
      });
    });
    modal.querySelectorAll('[data-delete-adjustment]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!confirm('Hapus penyesuaian ini?')) return;
        runtimeConfig.adjustments = runtimeConfig.adjustments.filter((row) => canonical(row.id) !== button.dataset.deleteAdjustment);
        saveNativeConfig(runtimeConfig);
        render();
        renderAdminModal();
      });
    });
  }

  function bindRecipeRemoveButtons() {
    document.querySelectorAll('[data-remove-recipe-row]').forEach((button) => {
      button.onclick = () => button.closest('tr')?.remove();
    });
  }
  function render() {
    if (!ensureMounted()) return;

    const root = document.getElementById('teco-native-report');
    const primaryRoot = getPrimaryRoot();
    const allTransactions = extractTransactions(primaryRoot);
    const session = detectSession(primaryRoot);
    refreshRuntimeConfig(primaryRoot);

    if (!state.date) state.date = latestTransactionDate(allTransactions);
    if (!state.weekDate) state.weekDate = latestTransactionDate(allTransactions);
    if (!state.month) state.month = latestTransactionMonth(allTransactions);

    if (!state.dateTouched && allTransactions.length) state.date = latestTransactionDate(allTransactions);
    if (!state.weekTouched && allTransactions.length) state.weekDate = latestTransactionDate(allTransactions);
    if (!state.monthTouched && allTransactions.length) state.month = latestTransactionMonth(allTransactions);

    if (session.role !== 'admin' && session.name) state.cashier = session.name;

    const report = activeReport();
    const filtered = report.transactions;
    const products = report.products;
    const materialResult = report.materials;
    const revenue = report.revenue;
    const expensesTotal = report.totalExpenses;
    const netBalance = report.netBalance;
    const cups = report.totalCups;
    const activePeriod = state.mode === 'daily' ? state.date : state.mode === 'weekly' ? state.weekDate : state.month;

    const latestInfo = allTransactions.length
      ? `Transaksi terbaru: ${escapeHtml(latestTransactionDate(allTransactions))}`
      : 'Belum ada transaksi pada data utama POS';

    root.innerHTML = `
      <div class="teco-native-head">
        <div>
          <h3>Analisis Penjualan & Bahan</h3>
          <p>Fitur utama v${VERSION}. Laporan WhatsApp, Excel, rekap varian, dan bahan memakai satu sumber data POS.</p>
        </div>
        <span class="teco-native-status">${allTransactions.length} transaksi terbaca</span>
      </div>

      <div class="teco-native-controls">
        <div class="teco-native-tabs">
          <button type="button" data-native-mode="daily" class="${state.mode === 'daily' ? 'active' : ''}">Harian</button>
          <button type="button" data-native-mode="weekly" class="${state.mode === 'weekly' ? 'active' : ''}">Mingguan</button>
          <button type="button" data-native-mode="monthly" class="${state.mode === 'monthly' ? 'active' : ''}">Bulanan</button>
        </div>

        <label class="${state.mode === 'daily' ? '' : 'hidden'}">
          Tanggal
          <input id="tecoNativeDate" type="date" value="${escapeHtml(state.date)}">
        </label>

        <label class="${state.mode === 'weekly' ? '' : 'hidden'}">
          Tanggal dalam minggu
          <input id="tecoNativeWeek" type="date" value="${escapeHtml(state.weekDate)}">
        </label>

        <label class="${state.mode === 'monthly' ? '' : 'hidden'}">
          Bulan
          <input id="tecoNativeMonth" type="month" value="${escapeHtml(state.month)}">
        </label>

        <label>
          Kasir
          <select id="tecoNativeCashier" ${session.role !== 'admin' ? 'disabled' : ''}>${renderCashierOptions(allTransactions)}</select>
        </label>

        <button type="button" id="tecoNativeRefresh" class="secondary">Muat Ulang</button>
        <button type="button" id="tecoNativeWhatsApp" class="whatsapp">WhatsApp</button>
        <button type="button" id="tecoNativeExportActive">Excel Aktif</button>
        <button type="button" id="tecoNativeExportDaily">Excel Harian</button>
        <button type="button" id="tecoNativeExportWeekly">Excel Mingguan</button>
        <button type="button" id="tecoNativeExportMonthly">Excel Bulanan</button>
        ${session.role === 'admin' ? '<button type="button" id="tecoNativeAdminEdit" class="admin-edit">Edit Varian & Bahan</button>' : ''}
      </div>

      <div class="teco-native-info">
        <span>${latestInfo}</span>
        <span>Periode aktif: ${escapeHtml(formatPeriodLabel(state.mode, activePeriod))}</span>
      </div>

      <div class="teco-native-cards">
        <article><span>Transaksi</span><strong>${filtered.length}</strong></article>
        <article><span>Rekap cup</span><strong>${formatQuantity(cups)}</strong></article>
        <article><span>Varian terjual</span><strong>${products.length}</strong></article>
        <article><span>Penyesuaian</span><strong>${report.adjustments.length}</strong></article>
        <article><span>Omzet</span><strong>${formatMoney(revenue)}</strong></article>
        <article><span>Pengeluaran</span><strong>${formatMoney(expensesTotal)}</strong></article>
        <article><span>Saldo bersih</span><strong>${formatMoney(netBalance)}</strong></article>
      </div>

      ${materialResult.unmapped.length ? `
        <div class="teco-native-warning">
          Resep belum dipetakan untuk: ${escapeHtml(materialResult.unmapped.join(', '))}.
          Cup dan tutup tetap dihitung.
        </div>
      ` : ''}

      <div class="teco-native-grid">
        <section class="teco-native-panel">
          <h4>Rekap Cup & Varian Terjual</h4>
          <div class="teco-native-table-wrap">
            <table>
              <thead><tr><th>No.</th><th>Varian</th><th>Cup</th><th>Omzet Item</th><th>Resep</th></tr></thead>
              <tbody>${productRows(products)}</tbody>
            </table>
          </div>
        </section>

        <section class="teco-native-panel">
          <h4>Kebutuhan Bahan</h4>
          <div class="teco-native-table-wrap">
            <table>
              <thead><tr><th>No.</th><th>Bahan</th><th>Jumlah</th><th>Satuan</th><th>Dipakai oleh</th></tr></thead>
              <tbody>${materialRows(materialResult.rows)}</tbody>
            </table>
          </div>
        </section>
      </div>

      <section class="teco-native-panel" style="margin-top:12px">
        <h4>Rekap Pengeluaran per Klasifikasi</h4>
        <div class="teco-native-table-wrap">
          <table>
            <thead><tr><th>No.</th><th>Kategori</th><th>Keterangan</th><th>Frekuensi</th><th>Total Nominal</th></tr></thead>
            <tbody>${expenseClassificationRows(report.expenseClassifications)}</tbody>
          </table>
        </div>
      </section>

      <section class="teco-native-panel teco-native-adjustments">
        <div class="teco-native-panel-title"><h4>Penyesuaian Laporan</h4>${session.role === 'admin' ? '<button type="button" id="tecoNativeAddAdjustment" class="teco-native-mini">+ Atur</button>' : ''}</div>
        <div class="teco-native-table-wrap">
          <table>
            <thead><tr><th>No.</th><th>Tanggal</th><th>Kasir</th><th>Cup</th><th>Omzet</th><th>Pengeluaran</th><th>Catatan</th>${session.role === 'admin' ? '<th>Aksi</th>' : ''}</tr></thead>
            <tbody>${adjustmentRows(report.adjustments, session.role === 'admin')}</tbody>
          </table>
        </div>
      </section>

      <section class="teco-native-panel teco-native-transactions">
        <h4>Detail Transaksi</h4>
        <div class="teco-native-table-wrap">
          <table>
            <thead><tr><th>No.</th><th>Waktu</th><th>Kasir</th><th>Produk</th><th>Total</th></tr></thead>
            <tbody>${transactionRows(filtered)}</tbody>
          </table>
        </div>
      </section>
    `;

    root.querySelectorAll('[data-native-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        state.mode = button.dataset.nativeMode;
        render();
      });
    });

    const dateInput = document.getElementById('tecoNativeDate');
    if (dateInput) dateInput.addEventListener('change', () => {
      state.date = dateInput.value;
      state.dateTouched = true;
      render();
    });

    const weekInput = document.getElementById('tecoNativeWeek');
    if (weekInput) weekInput.addEventListener('change', () => {
      state.weekDate = weekInput.value;
      state.weekTouched = true;
      render();
    });

    const monthInput = document.getElementById('tecoNativeMonth');
    if (monthInput) monthInput.addEventListener('change', () => {
      state.month = monthInput.value;
      state.monthTouched = true;
      render();
    });

    const cashierSelect = document.getElementById('tecoNativeCashier');
    if (cashierSelect) {
      cashierSelect.value = state.cashier;
      cashierSelect.addEventListener('change', () => {
        state.cashier = cashierSelect.value;
        render();
      });
    }

    document.getElementById('tecoNativeRefresh')?.addEventListener('click', refreshFromPrimaryStorage);
    document.getElementById('tecoNativeWhatsApp')?.addEventListener('click', () => sendWhatsAppReport());
    document.getElementById('tecoNativeExportActive')?.addEventListener('click', exportActiveSheets);
    document.getElementById('tecoNativeExportDaily')?.addEventListener('click', exportDailySheets);
    document.getElementById('tecoNativeExportWeekly')?.addEventListener('click', exportWeeklySheets);
    document.getElementById('tecoNativeExportMonthly')?.addEventListener('click', exportMonthlySheets);
    document.getElementById('tecoNativeAdminEdit')?.addEventListener('click', renderAdminModal);
    document.getElementById('tecoNativeAddAdjustment')?.addEventListener('click', () => { state.editorTab = 'adjustments'; renderAdminModal(); });
    root.querySelectorAll('[data-edit-adjustment]').forEach((button) => button.addEventListener('click', () => { state.editorTab = 'adjustments'; state.adjustmentEditId = button.dataset.editAdjustment; renderAdminModal(); }));
  }

  function scheduleRender(delay) {
    clearTimeout(state.renderTimer);
    state.renderTimer = setTimeout(render, delay || 80);
  }

  function refreshFromPrimaryStorage() {
    try {
      const raw = localStorage.getItem(PRIMARY_STORAGE_KEY);
      state.cachedRoot = raw ? JSON.parse(raw) : {};
    } catch (error) {
      console.warn('[Te.Co Native] Gagal menyegarkan data utama:', error);
    }
    render();
  }

  function installStorageHook() {
    if (window.__TECO_NATIVE_STORAGE_HOOK__) return;
    window.__TECO_NATIVE_STORAGE_HOOK__ = true;

    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.setItem = function (key, value) {
      const result = originalSetItem.apply(this, arguments);

      if (this === localStorage && key === PRIMARY_STORAGE_KEY) {
        try {
          state.cachedRoot = JSON.parse(value);
        } catch (_) {
          state.cachedRoot = null;
        }

        scheduleRender(30);
      }

      return result;
    };
  }

  function installEvents() {
    window.addEventListener('storage', (event) => {
      if (event.key === PRIMARY_STORAGE_KEY) {
        try {
          state.cachedRoot = event.newValue ? JSON.parse(event.newValue) : {};
        } catch (_) {
          state.cachedRoot = {};
        }
        scheduleRender(30);
      }
    });

    window.addEventListener('teco:data-changed', () => {
      refreshFromPrimaryStorage();
    });

    document.addEventListener('click', (event) => {
      const target = event.target?.closest?.('button, a, [role="button"]');
      if (!target) return;

      const label = canonical(
        target.textContent || target.getAttribute('aria-label') || ''
      ).toUpperCase();

      if (
        /KONFIRMASI BAYAR|TRANSAKSI BARU|SIMPAN PENGELUARAN|LAPORAN/.test(label)
      ) {
        setTimeout(refreshFromPrimaryStorage, 180);
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshFromPrimaryStorage();
    });
  }

  function installObserver() {
    if (state.observer) return;

    state.observer = new MutationObserver(() => {
      if (!document.getElementById('teco-native-report')) {
        ensureMounted();
        scheduleRender(20);
      }
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function initialize() {
    installStorageHook();
    installEvents();
    ensureMounted();
    installObserver();
    refreshFromPrimaryStorage();

    window.TecoNativeReports = {
      version: VERSION,
      refresh: refreshFromPrimaryStorage,
      getTransactions: () => extractTransactions(getPrimaryRoot()),
      getReport: (mode, period, cashier) => buildReportData(mode, period, cashier || 'ALL'),
      getWhatsAppText: () => buildWhatsAppText(activeReport()),
      getWhatsAppTextFor: (mode, period, cashier) => buildWhatsAppText(buildReportData(mode, period, cashier || 'ALL')),
      sendWhatsApp: sendWhatsAppReport,
      sendWhatsAppFor: (mode, period, cashier) => sendWhatsAppReport(buildReportData(mode, period, cashier || 'ALL')),
      exportSheets: exportActiveSheets,
      exportReport: (mode, period, cashier) => {
        const report = buildReportData(mode, period, cashier || 'ALL');
        const type = mode === 'daily' ? 'harian' : mode === 'weekly' ? 'mingguan' : 'bulanan';
        return exportReports([report], `Laporan_TeCo_${type}_${period}.xlsx`);
      },
      exportDailySheets,
      exportWeeklySheets,
      exportMonthlySheets,
      exportBothSheets,
      openAdminEditor: renderAdminModal,
      setMode: (mode, period, cashier) => {
        if (['daily', 'weekly', 'monthly'].includes(mode)) state.mode = mode;
        if (mode === 'daily' && period) { state.date = period; state.dateTouched = true; }
        if (mode === 'weekly' && period) { state.weekDate = period; state.weekTouched = true; }
        if (mode === 'monthly' && period) { state.month = period; state.monthTouched = true; }
        if (cashier) state.cashier = cashier;
        render();
      },
      getStatus: () => {
        const transactions = extractTransactions(getPrimaryRoot());
        return {
          version: VERSION,
          source: PRIMARY_STORAGE_KEY,
          transactions: transactions.length,
          latestDate: transactions.length ? latestTransactionDate(transactions) : null,
          mode: state.mode,
          selectedDate: state.date,
          selectedWeekDate: state.weekDate,
          selectedMonth: state.month,
          cashier: state.cashier,
          role: state.session.role,
          user: state.session.name,
          adjustments: runtimeConfig.adjustments.length
        };
      }
    };

    console.info(
      `[Te.Co Native ${VERSION}] Laporan dan analisis bahan menjadi fitur utama.`
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();