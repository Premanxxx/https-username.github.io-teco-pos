/*
Te.Co Pandawa POS - Pemulihan Data Penjualan Sebelum 2 Juli 2026
Data terverifikasi dari Laporan_TeCo_both_2026-07-02_2026-07.xlsx:
- 1 transaksi
- 1 Juli 2026, 19:36:01 WIB
- 18 cup
- Subtotal Rp198.000
- PPN Rp19.800
- Total Rp217.800

Cara pakai:
1. Buka aplikasi Te.Co pada browser/perangkat yang sama.
2. Login Admin.
3. Tekan F12 > Console.
4. Copy seluruh isi file ini, paste, lalu Enter.
5. Pilih kasir pada prompt. Default: kasir1.
*/
(async function restoreTeCoSalesBefore2July2026() {
  'use strict';

  const RECOVERY_VERSION = '1.0.0';
  const STORAGE_KEY = 'teco_pos_data';
  const RECOVERY_ID = 'TX561933';

  const rawItems = [{"id":"REC-TX561933-01","productId":"recovered-01","name":"Renjana - Dingin","nama":"Renjana - Dingin","productName":"Renjana - Dingin","baseName":"Renjana","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":10000,"harga":10000,"unitPrice":10000,"subtotal":10000,"lineTotal":10000},{"id":"REC-TX561933-02","productId":"recovered-02","name":"Kahwa - Dingin","nama":"Kahwa - Dingin","productName":"Kahwa - Dingin","baseName":"Kahwa","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":10000,"harga":10000,"unitPrice":10000,"subtotal":10000,"lineTotal":10000},{"id":"REC-TX561933-03","productId":"recovered-03","name":"Sakala - Dingin","nama":"Sakala - Dingin","productName":"Sakala - Dingin","baseName":"Sakala","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":10000,"harga":10000,"unitPrice":10000,"subtotal":10000,"lineTotal":10000},{"id":"REC-TX561933-04","productId":"recovered-04","name":"Caramel - Dingin","nama":"Caramel - Dingin","productName":"Caramel - Dingin","baseName":"Caramel","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":12000,"harga":12000,"unitPrice":12000,"subtotal":12000,"lineTotal":12000},{"id":"REC-TX561933-05","productId":"recovered-05","name":"Hazelnut - Dingin","nama":"Hazelnut - Dingin","productName":"Hazelnut - Dingin","baseName":"Hazelnut","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":12000,"harga":12000,"unitPrice":12000,"subtotal":12000,"lineTotal":12000},{"id":"REC-TX561933-06","productId":"recovered-06","name":"Butterscotch - Dingin","nama":"Butterscotch - Dingin","productName":"Butterscotch - Dingin","baseName":"Butterscotch","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":12000,"harga":12000,"unitPrice":12000,"subtotal":12000,"lineTotal":12000},{"id":"REC-TX561933-07","productId":"recovered-07","name":"Matcha - Dingin","nama":"Matcha - Dingin","productName":"Matcha - Dingin","baseName":"Matcha","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":10000,"harga":10000,"unitPrice":10000,"subtotal":10000,"lineTotal":10000},{"id":"REC-TX561933-08","productId":"recovered-08","name":"Redvelvet - Dingin","nama":"Redvelvet - Dingin","productName":"Redvelvet - Dingin","baseName":"Redvelvet","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":10000,"harga":10000,"unitPrice":10000,"subtotal":10000,"lineTotal":10000},{"id":"REC-TX561933-09","productId":"recovered-09","name":"Taro - Dingin","nama":"Taro - Dingin","productName":"Taro - Dingin","baseName":"Taro","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":10000,"harga":10000,"unitPrice":10000,"subtotal":10000,"lineTotal":10000},{"id":"REC-TX561933-10","productId":"recovered-10","name":"Choco - Dingin","nama":"Choco - Dingin","productName":"Choco - Dingin","baseName":"Choco","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":10000,"harga":10000,"unitPrice":10000,"subtotal":10000,"lineTotal":10000},{"id":"REC-TX561933-11","productId":"recovered-11","name":"Matcha Aren - Dingin","nama":"Matcha Aren - Dingin","productName":"Matcha Aren - Dingin","baseName":"Matcha Aren","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":12000,"harga":12000,"unitPrice":12000,"subtotal":12000,"lineTotal":12000},{"id":"REC-TX561933-12","productId":"recovered-12","name":"Matchapresso - Dingin","nama":"Matchapresso - Dingin","productName":"Matchapresso - Dingin","baseName":"Matchapresso","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":12000,"harga":12000,"unitPrice":12000,"subtotal":12000,"lineTotal":12000},{"id":"REC-TX561933-13","productId":"recovered-13","name":"Milo Malaysia - Dingin","nama":"Milo Malaysia - Dingin","productName":"Milo Malaysia - Dingin","baseName":"Milo Malaysia","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":12000,"harga":12000,"unitPrice":12000,"subtotal":12000,"lineTotal":12000},{"id":"REC-TX561933-14","productId":"recovered-14","name":"Coffee Milo - Dingin","nama":"Coffee Milo - Dingin","productName":"Coffee Milo - Dingin","baseName":"Coffee Milo","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":12000,"harga":12000,"unitPrice":12000,"subtotal":12000,"lineTotal":12000},{"id":"REC-TX561933-15","productId":"recovered-15","name":"Milo Butterscotch - Dingin","nama":"Milo Butterscotch - Dingin","productName":"Milo Butterscotch - Dingin","baseName":"Milo Butterscotch","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":12000,"harga":12000,"unitPrice":12000,"subtotal":12000,"lineTotal":12000},{"id":"REC-TX561933-16","productId":"recovered-16","name":"Milo Hazelnut - Dingin","nama":"Milo Hazelnut - Dingin","productName":"Milo Hazelnut - Dingin","baseName":"Milo Hazelnut","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":12000,"harga":12000,"unitPrice":12000,"subtotal":12000,"lineTotal":12000},{"id":"REC-TX561933-17","productId":"recovered-17","name":"Milo Caramel - Dingin","nama":"Milo Caramel - Dingin","productName":"Milo Caramel - Dingin","baseName":"Milo Caramel","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":12000,"harga":12000,"unitPrice":12000,"subtotal":12000,"lineTotal":12000},{"id":"REC-TX561933-18","productId":"recovered-18","name":"Americano - Dingin","nama":"Americano - Dingin","productName":"Americano - Dingin","baseName":"Americano","variant":"Dingin","variantName":"Dingin","qty":1,"quantity":1,"jumlah":1,"price":8000,"harga":8000,"unitPrice":8000,"subtotal":8000,"lineTotal":8000}];

  const defaultCashier = 'kasir1';
  const cashierInput = window.prompt(
    'Kasir untuk transaksi 1 Juli 2026. Gunakan kasir1, kasir2, kasir3, atau admin:',
    defaultCashier
  );

  if (cashierInput === null) {
    console.warn('[Te.Co Recovery] Pemulihan dibatalkan.');
    return;
  }

  const cashier = String(cashierInput || defaultCashier)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  const allowedCashiers = ['kasir1', 'kasir2', 'kasir3', 'admin'];
  if (!allowedCashiers.includes(cashier)) {
    alert('Kasir tidak valid. Gunakan kasir1, kasir2, kasir3, atau admin.');
    return;
  }

  function safeParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return fallback;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function downloadJson(filename, value) {
    const blob = new Blob(
      [JSON.stringify(value, null, 2)],
      { type: 'application/json;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function snapshotLocalStorage() {
    const snapshot = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      snapshot[key] = localStorage.getItem(key);
    }
    return snapshot;
  }

  function transactionIdentity(tx) {
    if (!tx || typeof tx !== 'object') return '';
    const id =
      tx.id ||
      tx.transactionId ||
      tx.trxId ||
      tx.receiptNo ||
      tx.noStruk ||
      '';
    return String(id);
  }

  function isSameTransaction(tx) {
    if (!tx || typeof tx !== 'object') return false;

    if (transactionIdentity(tx) === RECOVERY_ID) return true;

    const date = String(
      tx.date ||
      tx.tanggal ||
      tx.createdAt ||
      tx.timestamp ||
      ''
    );

    const total = Number(
      tx.grandTotal ||
      tx.totalBayar ||
      tx.total ||
      tx.amount ||
      0
    );

    return date.includes('2026-07-01') && total === 217800;
  }

  function mergeTransaction(array, transaction) {
    const rows = Array.isArray(array) ? array.slice() : [];
    const existingIndex = rows.findIndex(isSameTransaction);

    if (existingIndex >= 0) {
      rows[existingIndex] = {
        ...rows[existingIndex],
        ...clone(transaction),
        items: clone(transaction.items),
        cart: clone(transaction.cart)
      };
      return { rows, action: 'updated' };
    }

    rows.push(clone(transaction));
    return { rows, action: 'inserted' };
  }

  const subtotal = rawItems.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0
  );
  const tax = Math.round(subtotal * 0.10);
  const grandTotal = subtotal + tax;

  const transaction = {
    id: RECOVERY_ID,
    transactionId: RECOVERY_ID,
    trxId: RECOVERY_ID,
    receiptNo: RECOVERY_ID,
    noStruk: RECOVERY_ID,

    date: '2026-07-01T19:36:01+07:00',
    tanggal: '2026-07-01T19:36:01+07:00',
    createdAt: '2026-07-01T19:36:01+07:00',
    timestamp: '2026-07-01T19:36:01+07:00',
    time: '19:36:01',
    waktu: '19:36:01',

    cashier,
    kasir: cashier,
    cashierName: cashier,
    createdBy: cashier,

    paymentMethod: 'cash',
    metodePembayaran: 'cash',
    payment: 'cash',
    metode: 'cash',

    subtotal,
    tax,
    ppn: tax,
    taxRate: 10,
    grandTotal,
    total: grandTotal,
    totalBayar: grandTotal,
    amount: grandTotal,

    items: clone(rawItems),
    cart: clone(rawItems),
    products: clone(rawItems),

    status: 'completed',
    completed: true,
    recovered: true,
    recoveryVersion: RECOVERY_VERSION,
    recoverySource: 'Laporan_TeCo_both_2026-07-02_2026-07.xlsx'
  };

  const beforeSnapshot = snapshotLocalStorage();

  let root = safeParse(localStorage.getItem(STORAGE_KEY), {});
  if (!root || typeof root !== 'object' || Array.isArray(root)) {
    root = {};
  }

  const candidatePaths = [
    ['transactions'],
    ['transaksi'],
    ['sales'],
    ['orders'],
    ['transactionHistory'],
    ['riwayatTransaksi'],
    ['data', 'transactions'],
    ['data', 'transaksi']
  ];

  const updatedPaths = [];
  let primaryAction = '';

  function getPath(object, path) {
    let current = object;
    for (const key of path) {
      if (!current || typeof current !== 'object') return undefined;
      current = current[key];
    }
    return current;
  }

  function setPath(object, path, value) {
    let current = object;
    for (let index = 0; index < path.length - 1; index += 1) {
      const key = path[index];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    current[path[path.length - 1]] = value;
  }

  candidatePaths.forEach((path) => {
    const existing = getPath(root, path);

    if (Array.isArray(existing)) {
      const merged = mergeTransaction(existing, transaction);
      setPath(root, path, merged.rows);
      updatedPaths.push(path.join('.'));
      if (!primaryAction) primaryAction = merged.action;
    }
  });

  if (!updatedPaths.length) {
    const merged = mergeTransaction(root.transactions, transaction);
    root.transactions = merged.rows;
    updatedPaths.push('transactions');
    primaryAction = merged.action;
  }

  /*
   * Selalu sediakan transactions sebagai sumber standar.
   * Ini tidak menghapus struktur lama.
   */
  const standardMerge = mergeTransaction(root.transactions, transaction);
  root.transactions = standardMerge.rows;

  root.lastRecovery = {
    id: RECOVERY_ID,
    version: RECOVERY_VERSION,
    recoveredAt: new Date().toISOString(),
    cutoff: '2026-07-02',
    source: 'Laporan_TeCo_both_2026-07-02_2026-07.xlsx',
    updatedPaths
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(root));

  /*
   * Cache pemulihan untuk modul laporan lama.
   */
  const recoveryCacheKey = 'teco_analytics_recovered_transactions_v1';
  const recoveryCache = safeParse(
    localStorage.getItem(recoveryCacheKey),
    {}
  );

  const cachedRows = Array.isArray(recoveryCache.transactions)
    ? recoveryCache.transactions
    : [];

  recoveryCache.transactions = mergeTransaction(
    cachedRows,
    transaction
  ).rows;
  recoveryCache.recoveredAt = new Date().toISOString();
  recoveryCache.source = 'verified-xlsx-before-2-july-2026';

  localStorage.setItem(
    recoveryCacheKey,
    JSON.stringify(recoveryCache)
  );

  /*
   * Perbarui state memori agar laporan bisa membaca sebelum reload.
   */
  const live = window.__TECO_ANALYTICS_LIVE_STATE__ || {};
  live.transactions = mergeTransaction(
    Array.isArray(live.transactions) ? live.transactions : [],
    transaction
  ).rows;
  live.txs = live.transactions;
  live.sales = live.transactions;
  live.ready = true;
  live.updatedAt = new Date().toISOString();
  window.__TECO_ANALYTICS_LIVE_STATE__ = live;

  window.transactions = live.transactions;
  window.transactionData = live.transactions;
  window.sales = live.transactions;
  window.allTransactions = live.transactions;

  window.dispatchEvent(new CustomEvent('teco:data-changed', {
    detail: {
      reason: 'restore-sales-before-2-july-2026',
      transactionId: RECOVERY_ID
    }
  }));

  const afterSnapshot = snapshotLocalStorage();

  downloadJson(
    `teco-recovery-receipt-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.json`,
    {
      recoveryVersion: RECOVERY_VERSION,
      transaction,
      action: primaryAction || standardMerge.action,
      updatedPaths,
      beforeLocalStorage: beforeSnapshot,
      afterLocalStorage: afterSnapshot
    }
  );

  console.table([{
    ID: transaction.id,
    Tanggal: transaction.tanggal,
    Kasir: transaction.kasir,
    Cup: transaction.items.reduce(
      (sum, item) => sum + Number(item.qty || 0),
      0
    ),
    Subtotal: transaction.subtotal,
    PPN: transaction.ppn,
    Total: transaction.total,
    Aksi: primaryAction || standardMerge.action
  }]);

  alert(
    'Pemulihan berhasil.\n\n' +
    'Tanggal: 1 Juli 2026\n' +
    'Transaksi: TX561933\n' +
    'Cup: 18\n' +
    'Subtotal: Rp198.000\n' +
    'PPN: Rp19.800\n' +
    'Total: Rp217.800\n' +
    'Kasir: ' + cashier + '\n\n' +
    'Halaman akan dimuat ulang.'
  );

  setTimeout(() => window.location.reload(), 900);
})();
