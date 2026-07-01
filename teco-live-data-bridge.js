/*
 * Te.Co Pandawa POS Live Data Bridge v2.1.0
 * Tujuan:
 * - memulihkan data lama secara diam-diam saat aplikasi mulai
 * - menyatukan transaksi lama dan baru di memori
 * - mengubah Sakata menjadi Sakala tanpa menghapus kompatibilitas data lama
 * - analitik membaca state memori, bukan scan localStorage/Firebase setiap dibuka
 */
(function () {
  'use strict';

  const VERSION = '2.1.0';
  const SNAPSHOT_KEY = 'teco_live_bridge_snapshot_v2';
  const FIREBASE_BASE = 'https://teman-coffee-pandawa-default-rtdb.asia-southeast1.firebasedatabase.app';
  const FETCH_TIMEOUT_MS = 8000;
  const FIREBASE_PATHS = [
    '/transactions.json',
    '/transaksi.json',
    '/sales.json',
    '/penjualan.json',
    '/expenses.json',
    '/pengeluaran.json',
    '/data.json'
  ];

  const bridge = window.__TECO_ANALYTICS_LIVE_STATE__ || {};
  bridge.version = VERSION;
  bridge.txs = Array.isArray(bridge.txs) ? bridge.txs : [];
  bridge.expenses = Array.isArray(bridge.expenses) ? bridge.expenses : [];
  bridge.sources = Array.isArray(bridge.sources) ? bridge.sources : [];
  bridge.ready = false;
  bridge.updatedAt = null;
  window.__TECO_ANALYTICS_LIVE_STATE__ = bridge;

  const sourceCount = new Map();
  let refreshTimer = null;

  function safeParse(raw, fallback = null) {
    if (raw == null || raw === '') return fallback;
    if (typeof raw !== 'string') return raw;
    try { return JSON.parse(raw); } catch (_) { return fallback; }
  }

  function canonicalText(value) {
    return String(value == null ? '' : value)
      .replace(/\bSakata\b/gi, 'Sakala')
      .replace(/\bSAKATA\b/g, 'SAKALA');
  }

  function canonicalize(value, seen) {
    if (value == null) return value;
    if (typeof value === 'string') return canonicalText(value);
    if (typeof value !== 'object') return value;
    seen = seen || new WeakSet();
    if (seen.has(value)) return value;
    seen.add(value);
    if (Array.isArray(value)) return value.map((item) => canonicalize(item, seen));
    const out = {};
    Object.keys(value).forEach((key) => {
      out[canonicalText(key)] = canonicalize(value[key], seen);
    });
    return out;
  }

  function numberValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (value == null) return 0;
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function first(obj, keys) {
    for (const key of keys) {
      if (obj && Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== '' && obj[key] != null) {
        return obj[key];
      }
    }
    return null;
  }

  function dateValue(obj) {
    return first(obj, [
      'tanggal', 'date', 'createdAt', 'created_at', 'timestamp', 'time',
      'paidAt', 'paid_at', 'waktu', 'datetime'
    ]);
  }

  function amountValue(obj) {
    const raw = first(obj, [
      'grandTotal', 'totalAkhir', 'totalBayar', 'totalPembayaran', 'total',
      'amount', 'nominal', 'subtotal', 'netTotal', 'omzet', 'revenue'
    ]);
    return numberValue(raw);
  }

  function looksLikeTransaction(obj, path) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj).join(' ').toLowerCase();
    const context = String(path || '').toLowerCase();
    const hasDate = dateValue(obj) != null;
    const hasAmount = amountValue(obj) > 0;
    const signal = /(transaksi|transaction|sale|sales|order|penjualan|items|cart|kasir|cashier|payment|bayar|struk|receipt)/i.test(keys + ' ' + context);
    const expenseSignal = /(expense|pengeluaran|biaya|gaji|modal|operasional)/i.test(keys + ' ' + context);
    return hasDate && hasAmount && signal && !expenseSignal;
  }

  function looksLikeExpense(obj, path) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const keys = Object.keys(obj).join(' ').toLowerCase();
    const context = String(path || '').toLowerCase();
    return dateValue(obj) != null && amountValue(obj) > 0 && /(expense|pengeluaran|biaya|gaji|modal|operasional)/i.test(keys + ' ' + context);
  }

  function stableId(obj, prefix) {
    const explicit = first(obj, ['id', 'transactionId', 'trxId', 'orderId', 'receiptNo', 'noStruk', 'expenseId']);
    if (explicit != null) return prefix + ':' + String(explicit);
    const raw = JSON.stringify(obj).slice(0, 1000);
    let hash = 2166136261;
    for (let i = 0; i < raw.length; i += 1) {
      hash ^= raw.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return prefix + ':' + (hash >>> 0).toString(36);
  }

  function mergeUnique(target, incoming, prefix) {
    const map = new Map(target.map((row) => [stableId(row, prefix), row]));
    incoming.forEach((row) => {
      const normalized = canonicalize(row);
      map.set(stableId(normalized, prefix), normalized);
    });
    return Array.from(map.values());
  }

  function walk(value, path, result, depth, seen) {
    if (depth > 10 || value == null) return;
    if (typeof value !== 'object') return;
    seen = seen || new WeakSet();
    if (seen.has(value)) return;
    seen.add(value);

    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, path + '[' + index + ']', result, depth + 1, seen));
      return;
    }

    if (looksLikeTransaction(value, path)) result.txs.push(value);
    else if (looksLikeExpense(value, path)) result.expenses.push(value);

    Object.keys(value).forEach((key) => walk(value[key], path + '.' + key, result, depth + 1, seen));
  }

  function collect(payload, sourceName) {
    if (!payload || typeof payload !== 'object') return { txs: 0, expenses: 0 };
    const result = { txs: [], expenses: [] };
    walk(payload, sourceName, result, 0, new WeakSet());
    bridge.txs = mergeUnique(bridge.txs, result.txs, 'tx');
    bridge.expenses = mergeUnique(bridge.expenses, result.expenses, 'exp');
    sourceCount.set(sourceName, (sourceCount.get(sourceName) || 0) + result.txs.length + result.expenses.length);
    return { txs: result.txs.length, expenses: result.expenses.length };
  }

  function updateSources() {
    bridge.sources = Array.from(sourceCount.entries()).map(([name, count]) => ({ name, count }));
    bridge.updatedAt = new Date().toISOString();
  }

  function dispatchChanged(reason) {
    updateSources();
    window.dispatchEvent(new CustomEvent('teco:data-changed', {
      detail: {
        reason: reason || 'bridge-update',
        transactions: bridge.txs.length,
        expenses: bridge.expenses.length,
        updatedAt: bridge.updatedAt
      }
    }));
  }

  function scheduleChanged(reason) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => dispatchChanged(reason), 60);
  }

  function saveSnapshot() {
    try {
      localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
        version: VERSION,
        txs: bridge.txs,
        expenses: bridge.expenses,
        savedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.warn('[Te.Co Bridge] Snapshot tidak dapat disimpan:', error);
    }
  }

  function loadSnapshot() {
    const snapshot = safeParse(localStorage.getItem(SNAPSHOT_KEY));
    if (snapshot && typeof snapshot === 'object') collect(snapshot, 'Snapshot pemulihan');
  }

  function scanLocalStorageOnce() {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || key === SNAPSHOT_KEY) continue;
      const parsed = safeParse(localStorage.getItem(key));
      if (parsed && typeof parsed === 'object') collect(parsed, 'Data lokal lama: ' + key);
    }
  }

  async function fetchWithTimeout(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  async function recoverFirebaseOnce() {
    const jobs = FIREBASE_PATHS.map(async (path) => {
      try {
        const data = await fetchWithTimeout(FIREBASE_BASE + path);
        if (data && typeof data === 'object') collect(data, 'Firebase lama: ' + path);
      } catch (_) {
        // Pemulihan bersifat best effort. Tidak menampilkan loading atau error ke kasir.
      }
    });
    await Promise.allSettled(jobs);
  }

  function installStorageBridge() {
    if (window.__tecoStorageBridgeInstalled) return;
    window.__tecoStorageBridgeInstalled = true;

    const originalSetItem = Storage.prototype.setItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;

    Storage.prototype.setItem = function (key, value) {
      const result = originalSetItem.apply(this, arguments);
      if (String(key) !== SNAPSHOT_KEY) {
        const parsed = safeParse(value);
        if (parsed && typeof parsed === 'object') collect(parsed, 'Perubahan aktif: ' + key);
        scheduleChanged('storage-set:' + key);
      }
      return result;
    };

    Storage.prototype.removeItem = function (key) {
      const result = originalRemoveItem.apply(this, arguments);
      scheduleChanged('storage-remove:' + key);
      return result;
    };

    Storage.prototype.clear = function () {
      const result = originalClear.apply(this, arguments);
      scheduleChanged('storage-clear');
      return result;
    };

    window.addEventListener('storage', (event) => {
      if (event.key && event.key !== SNAPSHOT_KEY && event.newValue) {
        const parsed = safeParse(event.newValue);
        if (parsed && typeof parsed === 'object') collect(parsed, 'Perubahan antartab: ' + event.key);
      }
      scheduleChanged('storage-event');
    });
  }

  function renameVisibleSakata(root) {
    const walker = document.createTreeWalker(root || document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (/Sakata/i.test(node.nodeValue || '')) node.nodeValue = canonicalText(node.nodeValue);
    }
  }

  function installDomRename() {
    if (!document.body) return;
    renameVisibleSakata(document.body);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE && /Sakata/i.test(node.nodeValue || '')) {
            node.nodeValue = canonicalText(node.nodeValue);
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            renameVisibleSakata(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function downloadBackup() {
    const payload = {
      app: 'Te.Co Pandawa POS',
      bridgeVersion: VERSION,
      exportedAt: new Date().toISOString(),
      transactions: bridge.txs,
      expenses: bridge.expenses,
      sources: bridge.sources
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'teco-data-pulih-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  window.TecoDataBridge = {
    version: VERSION,
    getSnapshot: () => ({
      txs: bridge.txs.slice(),
      expenses: bridge.expenses.slice(),
      sources: bridge.sources.slice(),
      ready: bridge.ready,
      updatedAt: bridge.updatedAt
    }),
    downloadBackup,
    canonicalText
  };

  async function initialize() {
    installStorageBridge();
    loadSnapshot();
    scanLocalStorageOnce();
    await recoverFirebaseOnce();
    bridge.ready = true;
    updateSources();
    saveSnapshot();
    dispatchChanged('initial-recovery-complete');
    console.info('[Te.Co Bridge] Siap:', bridge.txs.length, 'transaksi,', bridge.expenses.length, 'pengeluaran');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installDomRename, { once: true });
  } else {
    installDomRename();
  }

  initialize().catch((error) => {
    bridge.ready = true;
    updateSources();
    dispatchChanged('initial-recovery-partial');
    console.warn('[Te.Co Bridge] Pemulihan parsial:', error);
  });
})();
