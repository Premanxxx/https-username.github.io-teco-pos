/*
 * Te.Co Pandawa POS - Final Transaction Analytics Sync Fix v2.1.2
 *
 * Fungsi:
 * 1. Mengambil transaksi langsung dari TecoDataBridge.
 * 2. Menormalisasi transaksi mentah menjadi format analisis.
 * 3. Menyamakan Sakata menjadi Sakala.
 * 4. Menyegarkan Analisis Penjualan & Bahan saat transaksi berubah.
 * 5. Tidak mengambil ulang Firebase dan tidak memindai localStorage.
 */
(function () {
  'use strict';

  const VERSION = '2.1.2';
  const ITEM_KEYS = [
    'items', 'cart', 'products', 'details', 'detail', 'orderItems',
    'order_items', 'menu', 'pesanan', 'itemList', 'lineItems',
    'cartItems', 'cart_items', 'transactionItems', 'transaction_items',
    'saleItems', 'sale_items', 'orderDetails', 'order_details',
    'produk', 'daftarProduk', 'keranjang'
  ];
  const NESTED_KEYS = [
    'data', 'transaction', 'transaksi', 'order', 'sale', 'payload',
    'checkout', 'receipt', 'struk'
  ];

  let timer = null;
  let syncing = false;
  let lastSignature = '';
  let intervalId = null;

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

  function canonical(value) {
    return String(value == null ? '' : value)
      .replace(/\bSakata\b/gi, 'Sakala')
      .trim();
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

  function parseDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return new Date(value.getTime());
    }

    if (value && typeof value === 'object') {
      if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
      if (typeof value._seconds === 'number') return new Date(value._seconds * 1000);
      if (typeof value.toDate === 'function') {
        try {
          const date = value.toDate();
          if (date instanceof Date && !Number.isNaN(date.getTime())) return date;
        } catch (_) {
          // Abaikan timestamp yang tidak valid.
        }
      }
    }

    if (typeof value === 'number') {
      const milliseconds = value < 100000000000 ? value * 1000 : value;
      const date = new Date(milliseconds);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof value === 'string') {
      const text = value.trim();

      if (/^\d{10,13}$/.test(text)) {
        const number = Number(text);
        const date = new Date(text.length === 10 ? number * 1000 : number);
        return Number.isNaN(date.getTime()) ? null : date;
      }

      let match = text.match(
        /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?/
      );
      if (match) {
        const date = new Date(
          Number(match[3]),
          Number(match[2]) - 1,
          Number(match[1]),
          Number(match[4] || 0),
          Number(match[5] || 0),
          Number(match[6] || 0)
        );
        return Number.isNaN(date.getTime()) ? null : date;
      }

      match = text.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T,]+(\d{1,2})[:.](\d{2})(?:[:.](\d{2}))?)?/
      );
      if (match) {
        const date = new Date(
          Number(match[1]),
          Number(match[2]) - 1,
          Number(match[3]),
          Number(match[4] || 0),
          Number(match[5] || 0),
          Number(match[6] || 0)
        );
        return Number.isNaN(date.getTime()) ? null : date;
      }

      const date = new Date(text);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  function objectValues(value) {
    value = parseMaybeJson(value);
    if (Array.isArray(value)) return value;
    if (!value || typeof value !== 'object') return [];

    const values = Object.values(value);
    if (!values.length) return [];

    return values.filter((entry) => entry !== undefined && entry !== null);
  }

  function findItems(object, depth, seen) {
    object = parseMaybeJson(object);
    depth = depth || 0;
    seen = seen || new WeakSet();

    if (!object || typeof object !== 'object' || depth > 6) return [];
    if (seen.has(object)) return [];
    seen.add(object);

    for (const key of ITEM_KEYS) {
      const value = first(object, [key]);
      const entries = objectValues(value);
      if (entries.length) return entries;
    }

    const ownName = first(object, [
      'name', 'nama', 'productName', 'product_name', 'itemName',
      'item_name', 'menuName', 'title', 'label', 'namaProduk'
    ]);
    const ownQty = first(object, [
      'qty', 'quantity', 'jumlah', 'count', 'cup', 'cups', 'jumlahCup'
    ]);
    if (ownName !== undefined && ownQty !== undefined) return [object];

    for (const key of NESTED_KEYS) {
      const nested = first(object, [key]);
      const result = findItems(nested, depth + 1, seen);
      if (result.length) return result;
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
      (baseName === undefined || typeof baseName === 'object') &&
      productNode &&
      typeof productNode === 'object'
    ) {
      baseName = first(productNode, [
        'name', 'nama', 'productName', 'product_name',
        'title', 'label', 'namaProduk'
      ]);
    }

    if (typeof baseName === 'object') {
      baseName = first(baseName, ['name', 'nama', 'title', 'label']);
    }

    baseName = canonical(baseName);
    if (!baseName) return null;

    let variant = first(raw, [
      'variant', 'variantName', 'variant_name', 'flavor', 'rasa',
      'size', 'ukuran', 'option', 'pilihan'
    ]);

    const options = first(raw, ['options', 'optionValues', 'selectedOptions']);
    if (!variant && options && typeof options === 'object') {
      variant = Object.values(options)
        .filter((value) => typeof value === 'string' || typeof value === 'number')
        .join(' / ');
    }

    variant = canonical(variant);
    const name =
      variant && !baseName.toLowerCase().includes(variant.toLowerCase())
        ? `${baseName} - ${variant}`
        : baseName;

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

    return {
      name,
      baseName,
      variant,
      qty,
      price,
      subtotal
    };
  }

  function normalizeTransaction(raw, index) {
    raw = parseMaybeJson(raw);
    if (!raw || typeof raw !== 'object') return null;

    const items = findItems(raw)
      .map(normalizeItem)
      .filter(Boolean);

    if (!items.length) return null;

    const date = parseDate(first(raw, [
      'date', 'tanggal', 'createdAt', 'created_at', 'timestamp',
      'time', 'datetime', 'waktu', 'paidAt', 'paid_at',
      'checkoutAt', 'transactionDate'
    ]));

    if (!date) return null;

    let total = toNumber(first(raw, [
      'total', 'grandTotal', 'grand_total', 'totalAmount',
      'total_amount', 'amount', 'omzet', 'subtotal',
      'finalTotal', 'final_total', 'netTotal', 'totalBayar',
      'totalAkhir', 'totalPembayaran'
    ]));

    if (!total) {
      total = items.reduce((sum, item) => sum + toNumber(item.subtotal), 0);
    }

    let cashier = first(raw, [
      'cashier', 'cashierName', 'cashier_name', 'cashierId',
      'cashier_id', 'kasir', 'namaKasir', 'nama_kasir',
      'user', 'operator', 'createdBy', 'staff', 'username'
    ]);

    if (cashier && typeof cashier === 'object') {
      cashier = first(cashier, ['name', 'username', 'displayName', 'id']);
    }

    let payment = first(raw, [
      'paymentMethod', 'payment_method', 'payment', 'method',
      'metode', 'metodePembayaran', 'caraBayar'
    ]);

    if (payment && typeof payment === 'object') {
      payment = first(payment, ['name', 'label', 'type', 'method', 'metode']);
    }

    const explicitId = first(raw, [
      'id', 'transactionId', 'transaction_id', 'trxId',
      'orderId', 'invoice', 'receiptNo', 'noStruk',
      'kodeTransaksi'
    ]);

    const id = String(
      explicitId ||
      `${date.getTime()}-${index}-${total}-${items.length}`
    );

    return {
      id,
      date,
      tanggal: date,
      total,
      grandTotal: total,
      cashier: canonical(cashier || 'Tidak diketahui'),
      kasir: canonical(cashier || 'Tidak diketahui'),
      payment: canonical(payment || 'Tidak diketahui'),
      items,
      raw
    };
  }

  function fingerprint(transaction) {
    const itemKey = transaction.items
      .map((item) => [
        canonical(item.name).toLowerCase(),
        toNumber(item.qty),
        toNumber(item.subtotal)
      ].join(':'))
      .sort()
      .join('|');

    return [
      transaction.id,
      transaction.date.getTime(),
      canonical(transaction.cashier).toLowerCase().replace(/\s+/g, ''),
      Math.round(transaction.total),
      itemKey
    ].join('::');
  }

  function normalizeTransactions(rows) {
    const map = new Map();

    (Array.isArray(rows) ? rows : []).forEach((row, index) => {
      const transaction = normalizeTransaction(row, index);
      if (!transaction) return;

      const key = fingerprint(transaction);
      if (!map.has(key)) map.set(key, transaction);
    });

    return Array.from(map.values()).sort((a, b) => b.date - a.date);
  }

  function snapshotSignature(rows) {
    return rows
      .map((transaction) => [
        transaction.id,
        transaction.date.getTime(),
        transaction.total,
        transaction.items.length
      ].join(':'))
      .join('|');
  }

  async function synchronize(reason) {
    if (syncing) return;

    if (
      !window.TecoDataBridge ||
      typeof window.TecoDataBridge.getSnapshot !== 'function'
    ) {
      return;
    }

    syncing = true;

    try {
      const snapshot = window.TecoDataBridge.getSnapshot();
      const normalized = normalizeTransactions(snapshot.txs);
      const signature = snapshotSignature(normalized);

      const live = window.__TECO_ANALYTICS_LIVE_STATE__ || {};
      live.version = VERSION;
      live.txs = normalized;
      live.transactions = normalized;
      live.ready = true;
      live.updatedAt = new Date().toISOString();
      live.normalizedBy = 'teco-sync-final-fix';
      window.__TECO_ANALYTICS_LIVE_STATE__ = live;

      window.transactions = normalized;
      window.transactionData = normalized;
      window.transactionsData = normalized;
      window.transactionHistory = normalized;
      window.riwayatTransaksi = normalized;
      window.sales = normalized;
      window.salesData = normalized;
      window.orders = normalized;
      window.ordersData = normalized;
      window.allTransactions = normalized;

      const changed = signature !== lastSignature;
      lastSignature = signature;

      if (
        window.TeCoAnalytics &&
        typeof window.TeCoAnalytics.reload === 'function'
      ) {
        await window.TeCoAnalytics.reload();
      }

      console.info(
        `[Te.Co Sync ${VERSION}] ${normalized.length}/${snapshot.txs.length} transaksi valid tersinkron.`,
        reason || 'sinkronisasi'
      );

      if (changed) {
        window.dispatchEvent(new CustomEvent('teco:analytics-synced', {
          detail: {
            version: VERSION,
            validTransactions: normalized.length,
            sourceTransactions: snapshot.txs.length,
            reason: reason || 'sinkronisasi'
          }
        }));
      }
    } catch (error) {
      console.error(`[Te.Co Sync ${VERSION}] Sinkronisasi gagal:`, error);
    } finally {
      syncing = false;
    }
  }

  function schedule(reason, delay) {
    clearTimeout(timer);
    timer = setTimeout(() => synchronize(reason), delay || 120);
  }

  function install() {
    window.addEventListener('teco:data-changed', () => {
      schedule('data transaksi berubah', 80);
    });

    window.addEventListener('teco:data-ready', () => {
      schedule('data transaksi siap', 80);
    });

    window.addEventListener('storage', () => {
      schedule('perubahan antartab', 120);
    });

    document.addEventListener('click', (event) => {
      const target = event.target && event.target.closest
        ? event.target.closest('button, a, [role="button"]')
        : null;

      if (!target) return;

      const label = canonical(
        target.textContent || target.getAttribute('aria-label') || ''
      ).toUpperCase();

      if (
        /KONFIRMASI BAYAR|BAYAR SEKARANG|TRANSAKSI BARU|SIMPAN PENGELUARAN|MUAT ULANG/.test(label)
      ) {
        schedule(`aksi: ${label.slice(0, 40)}`, 250);
      }
    });

    intervalId = window.setInterval(() => {
      synchronize('pemeriksaan otomatis');
    }, 1500);

    schedule('inisialisasi', 250);
  }

  window.TecoSyncFix = {
    version: VERSION,
    sync: () => synchronize('manual'),
    status: () => {
      const live = window.__TECO_ANALYTICS_LIVE_STATE__ || {};
      return {
        version: VERSION,
        transactions: Array.isArray(live.txs) ? live.txs.length : 0,
        ready: Boolean(live.ready),
        updatedAt: live.updatedAt || null,
        lastSignature
      };
    },
    stop: () => {
      clearTimeout(timer);
      if (intervalId) window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
