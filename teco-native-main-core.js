(function () {
  'use strict';

  const VERSION = '2.3.0';
  const PRIMARY_STORAGE_KEY = 'teco_pos_data';
  const TIME_ZONE = 'Asia/Jakarta';
  const RECIPES_RAW = __TECO_RECIPE_JSON__;

  const state = {
    mode: 'daily',
    date: '',
    month: '',
    cashier: 'ALL',
    dateTouched: false,
    monthTouched: false,
    cachedRoot: null,
    renderTimer: null,
    observer: null
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

  const RECIPE_DATA = normalizeRecipes(RECIPES_RAW);

  function findRecipe(productName) {
    const key = keyText(productName);
    if (!key) return null;

    if (RECIPE_DATA.recipes[key]) {
      return { name: key, rows: RECIPE_DATA.recipes[key] };
    }

    const directKeys = Object.keys(RECIPE_DATA.recipes)
      .filter((recipeKey) => recipeKey !== 'KONSENTRAT')
      .sort((a, b) => b.length - a.length);

    for (const recipeKey of directKeys) {
      if (key.includes(recipeKey) || recipeKey.includes(key)) {
        return { name: recipeKey, rows: RECIPE_DATA.recipes[recipeKey] };
      }
    }

    if (
      /\bMILO\b/.test(key) &&
      /(BUTTERSCOTCH|CARAMEL|HAZELNUT)/.test(key)
    ) {
      const recipeKey = Object.keys(RECIPE_DATA.recipes)
        .find((candidate) => candidate.includes('MILO') && candidate.includes('BUTTERSCOTCH'));
      if (recipeKey) return { name: recipeKey, rows: RECIPE_DATA.recipes[recipeKey] };
    }

    if (
      /(BUTTERSCOTCH|CARAMEL|HAZELNUT)/.test(key) &&
      !/\bMILO\b/.test(key)
    ) {
      const recipeKey = Object.keys(RECIPE_DATA.recipes)
        .find((candidate) => candidate.includes('PREMIUM SERIES'));
      if (recipeKey) return { name: recipeKey, rows: RECIPE_DATA.recipes[recipeKey] };
    }

    if (
      /(MATCHA|CHOCO|TARO|RED ?VELVET)/.test(key) &&
      !/(MATCHAPRESSO|MATCHA AREN)/.test(key)
    ) {
      const recipeKey = Object.keys(RECIPE_DATA.recipes)
        .find((candidate) => candidate.includes('NON COFFEE SERIES'));
      if (recipeKey) return { name: recipeKey, rows: RECIPE_DATA.recipes[recipeKey] };
    }

    return null;
  }

  function aggregateProducts(transactions) {
    const map = new Map();

    transactions.forEach((transaction) => {
      transaction.items.forEach((item) => {
        const name = canonical(item.name);
        const key = keyText(name);

        if (!map.has(key)) {
          map.set(key, {
            name,
            qty: 0,
            revenue: 0
          });
        }

        const row = map.get(key);
        row.qty += toNumber(item.qty);
        row.revenue += toNumber(item.subtotal);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }

  function aggregateMaterials(products) {
    const materials = new Map();
    const unmapped = [];
    const concentrateRecipe = RECIPE_DATA.recipes.KONSENTRAT || [];
    const concentrateYield = RECIPE_DATA.concentrateYield || 1000;
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
      const recipe = findRecipe(product.name);

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

  function cashierKey(value) {
    return keyText(value).replace(/\s+/g, '');
  }

  function filterTransactions(transactions) {
    return transactions.filter((transaction) => {
      const periodMatch = state.mode === 'daily'
        ? dateKey(transaction.date) === state.date
        : monthKey(transaction.date) === state.month;

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
      return '<tr><td colspan="4" class="teco-native-empty">Belum ada produk terjual pada periode ini.</td></tr>';
    }

    return products.map((product, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(product.name)}</td>
        <td class="teco-native-number">${formatQuantity(product.qty)}</td>
        <td class="teco-native-number">${formatMoney(product.revenue)}</td>
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

  function filterExpenses(expenses, mode, period, cashier) {
    return expenses.filter((expense) => {
      const periodMatch = mode === 'daily'
        ? dateKey(expense.date) === period
        : monthKey(expense.date) === period;
      const cashierMatch = cashier === 'ALL'
        || cashierKey(expense.cashier) === cashierKey(cashier);
      return periodMatch && cashierMatch;
    });
  }

  function formatPeriodLabel(mode, period) {
    if (mode === 'daily') {
      const date = new Date(`${period}T12:00:00+07:00`);
      if (Number.isNaN(date.getTime())) return period;
      return new Intl.DateTimeFormat('id-ID', {
        timeZone: TIME_ZONE,
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(date);
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

  function buildReportData(mode, period, cashier) {
    const root = getPrimaryRoot();
    const allTransactions = extractTransactions(root);
    const allExpenses = extractExpenses(root);

    const transactions = allTransactions.filter((transaction) => {
      const periodMatch = mode === 'daily'
        ? dateKey(transaction.date) === period
        : monthKey(transaction.date) === period;
      const cashierMatch = cashier === 'ALL'
        || cashierKey(transaction.cashier) === cashierKey(cashier);
      return periodMatch && cashierMatch;
    });

    const expenses = filterExpenses(allExpenses, mode, period, cashier);
    const products = aggregateProducts(transactions);
    const materials = aggregateMaterials(products);
    const revenue = transactions.reduce((sum, transaction) => sum + toNumber(transaction.total), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
    const totalCups = products.reduce((sum, product) => sum + toNumber(product.qty), 0);
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
      products,
      materials,
      payments: aggregatePayments(transactions),
      notes,
      revenue,
      totalExpenses,
      netBalance: revenue - totalExpenses,
      totalCups,
      root
    };
  }

  function activeReport() {
    return buildReportData(
      state.mode,
      state.mode === 'daily' ? state.date : state.month,
      state.cashier
    );
  }

  function buildWhatsAppText(report) {
    const type = report.mode === 'daily' ? 'HARIAN' : 'BULANAN';
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

    lines.push('', '*LAPORAN PENGELUARAN*');
    if (report.expenses.length) {
      report.expenses.forEach((expense) => {
        lines.push(`• ${expense.category}: ${formatMoney(expense.amount)} — ${expense.note}`);
      });
    } else {
      lines.push('• Tidak ada pengeluaran pada periode ini');
    }

    lines.push('', '*CATATAN*');
    if (report.notes.length) report.notes.forEach((note) => lines.push(`• ${note}`));
    else lines.push('• Tidak ada catatan');

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

    lines.push('', `Dibuat otomatis oleh Te.Co POS v${VERSION}`);
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

  function sendWhatsAppReport() {
    const report = activeReport();
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
  }

  function recipeNameForProduct(productName) {
    const recipe = findRecipe(productName);
    return recipe ? recipe.name : 'BELUM DIPETAKAN';
  }

  function materialKind(material) {
    if (keyText(material.material).includes('CUP')) return 'Kemasan';
    return material.kind || 'Bahan baku';
  }

  function reportSheets(report) {
    const suffix = report.mode === 'daily' ? 'Harian' : 'Bulanan';
    const summary = [
      ['Keterangan', 'Nilai'],
      ['Jenis Laporan', suffix],
      ['Periode', report.periodLabel],
      ['Kasir', report.cashierLabel],
      ['Total Transaksi', report.transactions.length],
      ['Total Cup', report.totalCups],
      ['Jumlah Varian', report.products.length],
      ['Omzet', report.revenue],
      ['Total Pengeluaran', report.totalExpenses],
      ['Saldo Bersih', report.netBalance],
      ['Konsentrat Terpakai (ml)', report.materials.concentrateMl],
      ['Perkiraan Batch Konsentrat', report.materials.concentrateBatches],
      ['Asumsi Hasil 1 Batch (ml)', report.materials.concentrateYield],
      ['Varian Belum Terpetakan', report.materials.unmapped.length],
      ['Jumlah Catatan', report.notes.length]
    ];

    const variants = [['No', 'Varian', 'Total_Cup', 'Omzet_Item', 'Resep']];
    report.products.forEach((product, index) => variants.push([
      index + 1, product.name, product.qty, product.revenue,
      recipeNameForProduct(product.name)
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

    const payments = [['No', 'Tipe_Pembayaran', 'Jumlah_Transaksi', 'Nominal']];
    report.payments.forEach((payment, index) => payments.push([
      index + 1, payment.name, payment.count, payment.amount
    ]));

    return {
      [`Ringkasan ${suffix}`]: summary,
      [`Varian ${suffix}`]: variants,
      [`Bahan ${suffix}`]: materials,
      [`Transaksi ${suffix}`]: transactions,
      [`Pengeluaran ${suffix}`]: expenses,
      [`Pembayaran ${suffix}`]: payments
    };
  }

  function mappingSheet(reports) {
    const map = new Map();
    reports.forEach((report) => {
      report.products.forEach((product) => {
        map.set(keyText(product.name), [product.name, recipeNameForProduct(product.name)]);
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
    Object.entries(RECIPE_DATA.recipes).forEach(([recipeName, materials]) => {
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
    const type = report.mode === 'daily' ? 'harian' : 'bulanan';
    exportReports([report], `Laporan_TeCo_${type}_${report.period}.xlsx`);
  }

  function exportBothSheets() {
    const daily = buildReportData('daily', state.date, state.cashier);
    const monthly = buildReportData('monthly', state.month, state.cashier);
    exportReports(
      [daily, monthly],
      `Laporan_TeCo_both_${state.date}_${state.month}.xlsx`
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

  function render() {
    if (!ensureMounted()) return;

    const root = document.getElementById('teco-native-report');
    const primaryRoot = getPrimaryRoot();
    const allTransactions = extractTransactions(primaryRoot);

    if (!state.date) state.date = latestTransactionDate(allTransactions);
    if (!state.month) state.month = latestTransactionMonth(allTransactions);

    if (!state.dateTouched && allTransactions.length) {
      state.date = latestTransactionDate(allTransactions);
    }

    if (!state.monthTouched && allTransactions.length) {
      state.month = latestTransactionMonth(allTransactions);
    }

    const filtered = filterTransactions(allTransactions);
    const products = aggregateProducts(filtered);
    const materialResult = aggregateMaterials(products);
    const allExpenses = extractExpenses(primaryRoot);
    const filteredExpenses = filterExpenses(
      allExpenses,
      state.mode,
      state.mode === 'daily' ? state.date : state.month,
      state.cashier
    );

    const revenue = filtered.reduce((sum, transaction) => sum + transaction.total, 0);
    const expensesTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const netBalance = revenue - expensesTotal;
    const cups = products.reduce((sum, product) => sum + product.qty, 0);

    const latestInfo = allTransactions.length
      ? `Transaksi terbaru: ${escapeHtml(latestTransactionDate(allTransactions))}`
      : 'Belum ada transaksi pada data utama POS';

    root.innerHTML = `
      <div class="teco-native-head">
        <div>
          <h3>Analisis Penjualan & Bahan</h3>
          <p>Fitur utama v${VERSION}. Menggunakan satu sumber transaksi POS tanpa add-on dan tanpa pemuatan Firebase kedua.</p>
        </div>
        <span class="teco-native-status">${allTransactions.length} transaksi terbaca</span>
      </div>

      <div class="teco-native-controls">
        <div class="teco-native-tabs">
          <button type="button" data-native-mode="daily" class="${state.mode === 'daily' ? 'active' : ''}">Harian</button>
          <button type="button" data-native-mode="monthly" class="${state.mode === 'monthly' ? 'active' : ''}">Bulanan</button>
        </div>

        <label class="${state.mode === 'daily' ? '' : 'hidden'}">
          Tanggal
          <input id="tecoNativeDate" type="date" value="${escapeHtml(state.date)}">
        </label>

        <label class="${state.mode === 'monthly' ? '' : 'hidden'}">
          Bulan
          <input id="tecoNativeMonth" type="month" value="${escapeHtml(state.month)}">
        </label>

        <label>
          Kasir
          <select id="tecoNativeCashier">${renderCashierOptions(allTransactions)}</select>
        </label>

        <button type="button" id="tecoNativeRefresh" class="secondary">Muat Ulang</button>
        <button type="button" id="tecoNativeWhatsApp" class="whatsapp">WhatsApp</button>
        <button type="button" id="tecoNativeExport">Excel / Sheets</button>
        <button type="button" id="tecoNativeExportBoth" class="combined">Harian + Bulanan</button>
      </div>

      <div class="teco-native-info">
        <span>${latestInfo}</span>
        <span>Periode aktif: ${escapeHtml(state.mode === 'daily' ? state.date : state.month)}</span>
      </div>

      <div class="teco-native-cards">
        <article><span>Transaksi</span><strong>${filtered.length}</strong></article>
        <article><span>Total cup</span><strong>${formatQuantity(cups)}</strong></article>
        <article><span>Varian terjual</span><strong>${products.length}</strong></article>
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
          <h4>Rekap Varian Terjual</h4>
          <div class="teco-native-table-wrap">
            <table>
              <thead><tr><th>No.</th><th>Varian</th><th>Cup</th><th>Omzet Item</th></tr></thead>
              <tbody>${productRows(products)}</tbody>
            </table>
          </div>
        </section>

        <section class="teco-native-panel">
          <h4>Analisis Bahan Terpakai</h4>
          <div class="teco-native-table-wrap">
            <table>
              <thead><tr><th>No.</th><th>Bahan</th><th>Jumlah</th><th>Satuan</th><th>Dipakai oleh</th></tr></thead>
              <tbody>${materialRows(materialResult.rows)}</tbody>
            </table>
          </div>
        </section>
      </div>

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
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        state.date = dateInput.value;
        state.dateTouched = true;
        render();
      });
    }

    const monthInput = document.getElementById('tecoNativeMonth');
    if (monthInput) {
      monthInput.addEventListener('change', () => {
        state.month = monthInput.value;
        state.monthTouched = true;
        render();
      });
    }

    const cashierSelect = document.getElementById('tecoNativeCashier');
    if (cashierSelect) {
      cashierSelect.value = state.cashier;
      cashierSelect.addEventListener('change', () => {
        state.cashier = cashierSelect.value;
        render();
      });
    }

    document.getElementById('tecoNativeRefresh')?.addEventListener('click', () => {
      refreshFromPrimaryStorage();
    });

    document.getElementById('tecoNativeWhatsApp')?.addEventListener('click', sendWhatsAppReport);
    document.getElementById('tecoNativeExport')?.addEventListener('click', exportActiveSheets);
    document.getElementById('tecoNativeExportBoth')?.addEventListener('click', exportBothSheets);
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
      getWhatsAppText: () => buildWhatsAppText(activeReport()),
      sendWhatsApp: sendWhatsAppReport,
      exportSheets: exportActiveSheets,
      exportBothSheets,
      getStatus: () => {
        const transactions = extractTransactions(getPrimaryRoot());
        return {
          version: VERSION,
          source: PRIMARY_STORAGE_KEY,
          transactions: transactions.length,
          latestDate: transactions.length ? latestTransactionDate(transactions) : null,
          mode: state.mode,
          selectedDate: state.date,
          selectedMonth: state.month,
          cashier: state.cashier
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