(function () {
  'use strict';

  const VERSION = '2.2.0';
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

    return {
      id,
      date,
      total,
      cashier: canonical(cashier || 'Tidak diketahui'),
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

    function addMaterial(material, qty, unit, productName) {
      const name = canonical(material);
      const key = `${keyText(name)}::${keyText(unit)}`;

      if (!materials.has(key)) {
        materials.set(key, {
          material: name,
          qty: 0,
          unit: canonical(unit || 'unit'),
          products: new Set()
        });
      }

      const row = materials.get(key);
      row.qty += toNumber(qty);
      row.products.add(canonical(productName));
    }

    products.forEach((product) => {
      const recipe = findRecipe(product.name);

      if (!recipe) {
        unmapped.push(product.name);
        addMaterial('Cup + Tutup', product.qty, 'pcs', product.name);
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
          concentrateRecipe.forEach((component) => {
            addMaterial(
              component.material,
              (usedQty / concentrateYield) * component.qty,
              component.unit,
              product.name
            );
          });
        } else {
          addMaterial(row.material, usedQty, row.unit, product.name);
        }
      });

      if (!hasPackaging) {
        addMaterial('Cup + Tutup', product.qty, 'pcs', product.name);
      }
    });

    return {
      rows: Array.from(materials.values())
        .map((row) => ({
          material: row.material,
          qty: row.qty,
          unit: row.unit,
          products: Array.from(row.products).sort()
        }))
        .sort((a, b) => a.material.localeCompare(b.material, 'id')),
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
    const root = getPrimaryRoot();
    const allTransactions = extractTransactions(root);
    const filtered = filterTransactions(allTransactions);
    const products = aggregateProducts(filtered);
    const materialResult = aggregateMaterials(products);

    const rows = [
      ['Laporan Te.Co Pandawa', state.mode === 'daily' ? state.date : state.month],
      ['Kasir', state.cashier === 'ALL' ? 'Semua Kasir' : state.cashier],
      [],
      ['TRANSAKSI'],
      ['Tanggal', 'Kasir', 'Produk', 'Total']
    ];

    filtered.forEach((transaction) => {
      rows.push([
        transaction.date.toISOString(),
        transaction.cashier,
        transaction.items.map((item) => `${item.name} x${item.qty}`).join(', '),
        transaction.total
      ]);
    });

    rows.push([], ['PRODUK'], ['Produk', 'Cup', 'Omzet']);
    products.forEach((product) => {
      rows.push([product.name, product.qty, product.revenue]);
    });

    rows.push([], ['BAHAN'], ['Bahan', 'Jumlah', 'Satuan', 'Dipakai oleh']);
    materialResult.rows.forEach((material) => {
      rows.push([
        material.material,
        material.qty,
        material.unit,
        material.products.join(', ')
      ]);
    });

    downloadCsv(
      `teco-${state.mode}-${state.mode === 'daily' ? state.date : state.month}.csv`,
      rows
    );
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

    const revenue = filtered.reduce((sum, transaction) => sum + transaction.total, 0);
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
        <button type="button" id="tecoNativeExport">Export CSV</button>
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
        <article><span>Jenis bahan</span><strong>${materialResult.rows.length}</strong></article>
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

    document.getElementById('tecoNativeExport')?.addEventListener('click', exportCurrent);
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