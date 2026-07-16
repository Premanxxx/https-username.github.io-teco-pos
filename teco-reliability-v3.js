/* Te.Co Pandawa POS - Reliability & Firebase Cloud Backup v3.1.0 */
(function () {
  'use strict';

  const VERSION = '3.1.1';
  const PRIMARY_KEY = 'teco_pos_data';
  const EMERGENCY_KEY = 'teco_pos_emergency_backup_v3';
  const DEVICE_KEY = 'teco_pos_device_id_v3';
  const DB_NAME = 'teco_pos_backup_db';
  const STORE_NAME = 'snapshots';
  const CLOUD_BACKUP_PATH = 'teco_pos_backups/teco-pandawa-main';
  const KNOWN_KEYS = new Set([
    'schemaVersion', 'transactions', 'expenses', 'stockNotes', 'menu', 'users',
    'settings', 'syncMeta', 'updatedAt', 'updatedBy', 'deviceId'
  ]);

  let paymentLocked = false;
  let pushTimer = null;
  let indexedDbPromise = null;

  function clone(value) {
    if (value == null) return value;
    try { return structuredClone(value); } catch (_) { return JSON.parse(JSON.stringify(value)); }
  }

  function nowIso() { return new Date().toISOString(); }

  function getDeviceId() {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
      try { localStorage.setItem(DEVICE_KEY, id); } catch (_) {}
    }
    return id;
  }

  function hashText(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function generateRecordId(prefix) {
    return [
      prefix,
      Date.now().toString(36),
      getDeviceId().slice(-7),
      Math.random().toString(36).slice(2, 8)
    ].join('-').toUpperCase().replace(/[^A-Z0-9-]/g, '');
  }

  function asList(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
    return [];
  }

  function parsePayload(raw) {
    if (!raw) return null;
    try {
      const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return value && typeof value === 'object' ? value : null;
    } catch (_) { return null; }
  }

  function isEmbeddedData(value) {
    return typeof value === 'string' && /^(data:image\/|blob:)/i.test(value);
  }

  function sanitizeTransactionItem(source) {
    const item = clone(source) || {};
    // Gambar base64 pada menu tidak boleh disalin ke setiap transaksi.
    ['img', 'image', 'imageUrl', 'photo', 'thumbnail'].forEach((key) => {
      if (isEmbeddedData(item[key])) delete item[key];
    });
    return item;
  }

  function sanitizeTransaction(source) {
    const tx = clone(source) || {};
    tx.items = asList(tx.items).map(sanitizeTransactionItem);
    ['img', 'image', 'photo', 'thumbnail'].forEach((key) => {
      if (isEmbeddedData(tx[key])) delete tx[key];
    });
    return tx;
  }

  function sanitizeTransactions(rows) {
    return asList(rows).map(sanitizeTransaction);
  }

  function transactionFingerprint(tx) {
    const items = asList(tx && tx.items).map((item) => [
      String(item.name || item.nama || '').trim().toLowerCase(),
      Number(item.qty || item.quantity || 1),
      Number(item.subtotal || (Number(item.price || 0) * Number(item.qty || 1)))
    ].join(':')).sort().join('|');
    return [
      String(tx && (tx.date || tx.createdAt || tx.timestamp) || ''),
      String(tx && (tx.cashier || tx.cashierName) || '').toLowerCase(),
      Number(tx && (tx.total || tx.grandTotal) || 0),
      items
    ].join('::');
  }

  function ensureRecordIds(rows, prefix, kind) {
    const used = new Set();
    return asList(rows).map((source, index) => {
      const row = kind === 'transaction' ? sanitizeTransaction(source) : (clone(source) || {});
      let id = String(row.id || '').replace(/[.#$\[\]\/]/g, '-');
      if (!id) {
        const basis = kind === 'transaction'
          ? transactionFingerprint(row)
          : JSON.stringify([row.date, row.createdAt, row.cashier, row.amount, row.category, row.itemName, index]);
        id = `${prefix}-LEGACY-${hashText(basis).toUpperCase()}`;
      }
      if (used.has(id)) id = `${id}-${index}-${hashText(JSON.stringify(row)).slice(0, 5)}`;
      used.add(id);
      row.id = id;
      return row;
    });
  }

  function recordTime(row) {
    const candidates = [row && row.updatedAt, row && row.createdAt, row && row.date, row && row.timestamp];
    for (const value of candidates) {
      const time = Date.parse(value);
      if (Number.isFinite(time)) return time;
    }
    return 0;
  }

  function preferRecord(a, b) {
    if (!a) return b;
    if (!b) return a;
    const ta = recordTime(a), tb = recordTime(b);
    if (ta !== tb) return tb > ta ? b : a;
    return JSON.stringify(b).length >= JSON.stringify(a).length ? b : a;
  }

  function dateOnly(value) {
    const text = String(value || '');
    const match = text.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : text;
  }

  function expenseFingerprint(row) {
    return [
      dateOnly(row && row.date),
      String(row && (row.cashier || row.cashierName) || '').trim().toLowerCase(),
      Number(row && row.amount || 0),
      String(row && row.category || '').trim().toLowerCase(),
      String(row && row.note || '').trim().toLowerCase(),
      String(row && row.createdAt || '')
    ].join('::');
  }

  function isExpenseIdCollision(a, b) {
    if (!a || !b || expenseFingerprint(a) === expenseFingerprint(b)) return false;
    const createdA = String(a.createdAt || '');
    const createdB = String(b.createdAt || '');
    if (createdA && createdB && createdA !== createdB) return true;
    const dateA = dateOnly(a.date);
    const dateB = dateOnly(b.date);
    return Boolean(dateA && dateB && dateA !== dateB);
  }

  function uniqueCollisionId(baseId, row, map) {
    const suffix = hashText(expenseFingerprint(row)).toUpperCase();
    let id = `${baseId}-DUP-${suffix}`;
    let counter = 2;
    while (map.has(id) && expenseFingerprint(map.get(id)) !== expenseFingerprint(row)) {
      id = `${baseId}-DUP-${suffix}-${counter++}`;
    }
    return id;
  }

  function mergeTombstones(a, b) {
    return { ...(a || {}), ...(b || {}) };
  }

  function mergeRecords(localRows, remoteRows, prefix, kind, tombstones) {
    const map = new Map();
    const mergeOne = (row) => {
      const existing = map.get(row.id);
      if (!existing) {
        map.set(row.id, row);
        return;
      }
      if (kind === 'expense' && isExpenseIdCollision(existing, row)) {
        const repaired = { ...row, id: uniqueCollisionId(row.id, row, map), recoveredFromIdCollision: true };
        map.set(repaired.id, repaired);
        return;
      }
      map.set(row.id, preferRecord(existing, row));
    };
    ensureRecordIds(remoteRows, prefix, kind).forEach(mergeOne);
    ensureRecordIds(localRows, prefix, kind).forEach(mergeOne);

    const tomb = tombstones || {};
    for (const id of Object.keys(tomb)) map.delete(id);

    let rows = Array.from(map.values());
    if (kind === 'transaction') {
      const fingerprints = new Map();
      rows.forEach((row) => {
        const fp = transactionFingerprint(row);
        fingerprints.set(fp, preferRecord(fingerprints.get(fp), row));
      });
      rows = Array.from(fingerprints.values());
    }

    return rows.sort((a, b) => recordTime(b) - recordTime(a));
  }

  function mergeMenu(localMenu, remoteMenu) {
    const map = new Map();
    asList(remoteMenu).forEach((item, i) => map.set(String(item.id || `remote-${i}`), clone(item)));
    asList(localMenu).forEach((item, i) => {
      const id = String(item.id || `local-${i}`);
      map.set(id, { ...(map.get(id) || {}), ...clone(item) });
    });
    return Array.from(map.values());
  }

  function extraFields(payload) {
    const extra = {};
    if (!payload || typeof payload !== 'object') return extra;
    Object.entries(payload).forEach(([key, value]) => {
      if (!KNOWN_KEYS.has(key)) extra[key] = clone(value);
    });
    return extra;
  }

  function mergePayloads(localPayload, remotePayload) {
    const local = parsePayload(localPayload) || {};
    const remote = parsePayload(remotePayload) || {};
    const localMeta = local.syncMeta || {};
    const remoteMeta = remote.syncMeta || {};
    const syncMeta = {
      deletedTransactions: mergeTombstones(remoteMeta.deletedTransactions, localMeta.deletedTransactions),
      deletedExpenses: mergeTombstones(remoteMeta.deletedExpenses, localMeta.deletedExpenses),
      deletedStockNotes: mergeTombstones(remoteMeta.deletedStockNotes, localMeta.deletedStockNotes),
      lastMergedAt: nowIso()
    };

    const localNewer = Date.parse(local.updatedAt || 0) >= Date.parse(remote.updatedAt || 0);
    const preferred = localNewer ? local : remote;
    const fallback = localNewer ? remote : local;

    return {
      ...extraFields(remote),
      ...extraFields(local),
      schemaVersion: 3,
      transactions: mergeRecords(local.transactions, remote.transactions, 'TX', 'transaction', syncMeta.deletedTransactions),
      expenses: mergeRecords(local.expenses, remote.expenses, 'EXP', 'expense', syncMeta.deletedExpenses),
      stockNotes: mergeRecords(local.stockNotes, remote.stockNotes, 'STK', 'stock', syncMeta.deletedStockNotes),
      menu: mergeMenu(local.menu, remote.menu),
      users: { ...(fallback.users || {}), ...(preferred.users || {}) },
      settings: { ...(fallback.settings || {}), ...(preferred.settings || {}) },
      syncMeta,
      updatedAt: [local.updatedAt, remote.updatedAt].filter(Boolean).sort().pop() || nowIso(),
      updatedBy: preferred.updatedBy || fallback.updatedBy || 'system',
      deviceId: preferred.deviceId || fallback.deviceId || getDeviceId()
    };
  }

  function sanitizeMenu(menu) {
    return asList(menu).map((item) => {
      const out = { ...item };
      if (typeof out.img === 'string' && out.img.startsWith('data:image/')) delete out.img;
      return out;
    });
  }

  function readPrimary() {
    return parsePayload(localStorage.getItem(PRIMARY_KEY));
  }

  function buildDataPayloadV3() {
    const existing = readPrimary() || {};
    const extra = { ...extraFields(existing), ...(state.extraData || {}) };
    return {
      ...extra,
      schemaVersion: 3,
      transactions: ensureRecordIds(sanitizeTransactions(state.transactions || []), 'TX', 'transaction'),
      expenses: ensureRecordIds(state.expenses || [], 'EXP', 'expense'),
      stockNotes: ensureRecordIds(state.stockNotes || [], 'STK', 'stock'),
      menu: sanitizeMenu(state.menu || []),
      users: state.users || {},
      settings: state.settings || {},
      syncMeta: state.syncMeta || existing.syncMeta || {
        deletedTransactions: {}, deletedExpenses: {}, deletedStockNotes: {}
      },
      updatedAt: nowIso(),
      updatedBy: state.currentUser ? state.currentUser.id : 'system',
      deviceId: getDeviceId()
    };
  }

  function applyDataPayloadV3(data, refreshUI) {
    const payload = parsePayload(data);
    if (!payload) return false;
    state.transactions = ensureRecordIds(payload.transactions, 'TX', 'transaction');
    state.expenses = ensureRecordIds(payload.expenses, 'EXP', 'expense');
    state.stockNotes = ensureRecordIds(payload.stockNotes, 'STK', 'stock');
    state.menu = asList(payload.menu);
    state.users = payload.users && typeof payload.users === 'object' ? payload.users : {};
    state.settings = { ...state.settings, ...(payload.settings || {}) };
    state.syncMeta = payload.syncMeta || { deletedTransactions: {}, deletedExpenses: {}, deletedStockNotes: {} };
    state.extraData = extraFields(payload);
    if (typeof ensureMenuImages === 'function') ensureMenuImages();
    if (refreshUI && typeof refreshAfterDataUpdate === 'function') refreshAfterDataUpdate();
    return true;
  }

  function openBackupDb() {
    if (indexedDbPromise) return indexedDbPromise;
    indexedDbPromise = new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('IndexedDB tidak tersedia'));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB gagal dibuka'));
    });
    return indexedDbPromise;
  }

  async function saveIndexedBackup(payload) {
    try {
      const db = await openBackupDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(payload, 'last-good');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) { console.warn('[Te.Co v3] Backup IndexedDB gagal:', error); }
  }

  async function restoreIndexedBackup() {
    try {
      const db = await openBackupDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get('last-good');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (_) { return null; }
  }

  function writeEmergencyBackup(payload) {
    try {
      const compact = {
        schemaVersion: 3,
        transactions: sanitizeTransactions(payload.transactions).slice(0, 150),
        expenses: asList(payload.expenses).slice(0, 100),
        stockNotes: asList(payload.stockNotes).slice(0, 50),
        users: payload.users,
        settings: payload.settings,
        syncMeta: payload.syncMeta,
        updatedAt: payload.updatedAt,
        deviceId: payload.deviceId,
        nativeReportConfig: payload.nativeReportConfig
      };
      const text = JSON.stringify(compact);
      if (text.length < 900000) localStorage.setItem(EMERGENCY_KEY, text);
    } catch (_) {}
  }

  function cleanupAuxiliaryStorage() {
    const removableExact = new Set([
      EMERGENCY_KEY,
      'teco_analytics_adjustments_v2',
      'teco_analytics_cache',
      'teco_report_cache',
      'teco_pos_backup',
      'teco_pos_data_backup'
    ]);
    const removablePatterns = [
      /^teco_.*(?:backup|cache|snapshot|legacy)/i,
      /^firebase:previous_websocket_failure/i
    ];
    const removed = [];
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (!key || key === PRIMARY_KEY || key === DEVICE_KEY) continue;
      if (removableExact.has(key) || removablePatterns.some((pattern) => pattern.test(key))) {
        try { localStorage.removeItem(key); removed.push(key); } catch (_) {}
      }
    }
    return removed;
  }

  function persistLocal(payload) {
    const clean = mergePayloads(payload, {});
    clean.transactions = sanitizeTransactions(clean.transactions);
    clean.updatedAt = payload.updatedAt || nowIso();
    clean.updatedBy = payload.updatedBy || 'system';
    clean.deviceId = payload.deviceId || getDeviceId();
    const text = JSON.stringify(clean);

    const commit = () => {
      localStorage.setItem(PRIMARY_KEY, text);
      writeEmergencyBackup(clean);
      saveIndexedBackup(clean);
      window.__TECO_NATIVE_DATA__ = clean;
      return clean;
    };

    try {
      return commit();
    } catch (firstError) {
      console.warn('[Te.Co v3.1] Kuota lokal terdeteksi; membersihkan cache lama dan mencoba kembali.', firstError);
      cleanupAuxiliaryStorage();
      try {
        const saved = commit();
        if (typeof showToast === 'function') showToast('Penyimpanan berhasil dibersihkan dan data tetap tersimpan.');
        return saved;
      } catch (error) {
        console.error('[Te.Co v3.1] Penyimpanan lokal gagal:', error);
        // Simpan salinan besar di IndexedDB walaupun localStorage sudah penuh.
        saveIndexedBackup(clean);
        if (typeof showToast === 'function') showToast('Penyimpanan browser penuh. Sinkronkan/backup lalu bersihkan data situs.');
        return null;
      }
    }
  }

  function loadDataV3() {
    const primary = readPrimary();
    const emergency = parsePayload(localStorage.getItem(EMERGENCY_KEY));
    const merged = mergePayloads(primary || {}, emergency || {});
    if (primary || emergency) {
      applyDataPayloadV3(merged, false);
      persistLocal(merged);
    }

    restoreIndexedBackup().then((backup) => {
      if (!backup) return;
      const current = readPrimary() || {};
      const recovered = mergePayloads(current, backup);
      if (asList(recovered.transactions).length > asList(current.transactions).length || !primary) {
        const saved = persistLocal(recovered);
        if (saved) {
          applyDataPayloadV3(saved, true);
          if (typeof showToast === 'function') showToast('Backup lokal berhasil dipulihkan.');
          scheduleCloudPush(300);
        }
      }
    });
  }

  function saveDataV3() {
    try {
      const payload = buildDataPayloadV3();
      const saved = persistLocal(payload);
      if (!saved) return false;
      applyDataPayloadV3(saved, false);
      window.dispatchEvent(new CustomEvent('teco:data-changed', {
        detail: { reason: 'save', version: VERSION }
      }));
      scheduleCloudPush(350);
      return true;
    } catch (error) {
      console.error('[Te.Co v3] Save error:', error);
      if (typeof showToast === 'function') showToast('Data gagal disimpan. Coba kosongkan penyimpanan browser.');
      return false;
    }
  }

  function toCloudPayload(payload) {
    const result = { ...payload };
    const mapCollection = (rows) => {
      const map = {};
      asList(rows).forEach((row) => { map[String(row.id)] = row; });
      return map;
    };
    result.transactions = mapCollection(payload.transactions);
    result.expenses = mapCollection(payload.expenses);
    result.stockNotes = mapCollection(payload.stockNotes);
    result.menu = sanitizeMenu(payload.menu);
    result.cloudUpdatedAt = nowIso();
    return result;
  }

  function updateCloudStats(remote) {
    const el = document.getElementById('syncCloudStats');
    if (!el) return;
    const local = readPrimary() || {};
    el.textContent = `Lokal: ${asList(local.transactions).length} transaksi · Cloud: ${asList(remote && remote.transactions).length} transaksi`;
  }

  function isConfigured() {
    try {
      return !!(FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes('ISI_') && FIREBASE_CONFIG.databaseURL);
    } catch (_) { return false; }
  }

  function startDatabaseSyncV3() {
    if (syncController && syncController.v3Ready) return true;
    syncController.ref = firebase.database().ref(FIREBASE_DB_PATH);
    syncController.backupRef = firebase.database().ref(CLOUD_BACKUP_PATH);
    syncController.enabled = true;
    syncController.v3Ready = true;
    syncController.applyingRemote = false;
    syncController.pending = true;
    updateSyncStatus('Menyambungkan...', 'local');

    firebase.database().ref('.info/connected').on('value', (snapshot) => {
      syncController.connected = snapshot.val() === true;
      updateSyncStatus(
        syncController.connected ? 'Online' : 'Offline — tersimpan lokal',
        syncController.connected ? 'online' : 'local'
      );
      if (syncController.connected) scheduleCloudPush(100);
    });

    syncController.ref.on('value', (snapshot) => {
      const remote = snapshot.val();
      updateCloudStats(remote);
      if (!remote) {
        syncController.pending = true;
        scheduleCloudPush(50);
        return;
      }
      const local = readPrimary() || buildDataPayloadV3();
      const merged = mergePayloads(local, remote);
      syncController.applyingRemote = true;
      const saved = persistLocal(merged);
      if (saved) applyDataPayloadV3(saved, true);
      syncController.applyingRemote = false;

      const localCount = asList(local.transactions).length + asList(local.expenses).length;
      const remoteCount = asList(remote.transactions).length + asList(remote.expenses).length;
      if (localCount > remoteCount) {
        syncController.pending = true;
        scheduleCloudPush(250);
      }
      updateSyncStatus('Online', 'online');
    }, (error) => {
      console.error('[Te.Co v3] Firebase listener:', error);
      updateSyncStatus('Cloud gagal — data tetap lokal', 'error');
    });
    return true;
  }

  function initSyncV3() {
    if (!isConfigured()) {
      updateSyncStatus('Local (Firebase belum dikonfigurasi)', 'local');
      return Promise.resolve(false);
    }
    if (typeof firebase === 'undefined') {
      updateSyncStatus('Firebase gagal dimuat', 'error');
      return Promise.resolve(false);
    }
    if (syncController && syncController.v3Ready) return Promise.resolve(true);
    if (syncController && syncController.authPromise) return syncController.authPromise;

    try {
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      const start = () => startDatabaseSyncV3();

      if (typeof firebase.auth !== 'function') return Promise.resolve(start());
      const auth = firebase.auth();
      if (auth.currentUser) return Promise.resolve(start());

      updateSyncStatus('Autentikasi cloud...', 'local');
      syncController.authPromise = auth.signInAnonymously()
        .then(() => start())
        .catch((error) => {
          console.warn('[Te.Co v3] Anonymous Auth tidak aktif; mencoba rules database saat ini:', error);
          return start();
        })
        .finally(() => { syncController.authPromise = null; });
      return syncController.authPromise;
    } catch (error) {
      console.error('[Te.Co v3] Firebase init:', error);
      updateSyncStatus('Cloud gagal — data tetap lokal', 'error');
      return Promise.resolve(false);
    }
  }

  function maybeDailyBackup(payload) {
    if (!syncController || !syncController.backupRef || !syncController.connected) return;
    const key = new Date().toISOString().slice(0, 10);
    syncController.backupRef.child('daily').child(key).transaction((current) => current || toCloudPayload(payload));
  }

  function pushRemoteDataV3(payload) {
    if (!syncController || !syncController.ref || !syncController.enabled) return Promise.resolve(false);
    const localPayload = parsePayload(payload) || readPrimary() || buildDataPayloadV3();
    syncController.pending = true;
    updateSyncStatus('Menyinkronkan...', 'local');

    return new Promise((resolve) => {
      syncController.ref.transaction((remote) => {
        const merged = mergePayloads(localPayload, remote || {});
        merged.updatedAt = nowIso();
        merged.updatedBy = localPayload.updatedBy || 'system';
        return toCloudPayload(merged);
      }, (error, committed, snapshot) => {
        if (error || !committed) {
          console.error('[Te.Co v3] Push cloud gagal:', error);
          syncController.pending = true;
          updateSyncStatus('Cloud tertunda — data aman lokal', 'error');
          resolve(false);
          return;
        }
        syncController.pending = false;
        const remote = snapshot && snapshot.val();
        const merged = mergePayloads(readPrimary() || {}, remote || {});
        syncController.applyingRemote = true;
        const saved = persistLocal(merged);
        if (saved) applyDataPayloadV3(saved, true);
        syncController.applyingRemote = false;
        updateCloudStats(remote);
        updateSyncStatus('Online · tersinkron', 'online');
        maybeDailyBackup(merged);
        resolve(true);
      }, false);
    });
  }

  function scheduleCloudPush(delay) {
    if (!syncController || !syncController.enabled || syncController.applyingRemote) return;
    syncController.pending = true;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushRemoteDataV3(readPrimary() || buildDataPayloadV3()), delay || 350);
  }

  function addTombstone(kind, ids) {
    state.syncMeta = state.syncMeta || {};
    const key = kind === 'transaction' ? 'deletedTransactions' : kind === 'expense' ? 'deletedExpenses' : 'deletedStockNotes';
    state.syncMeta[key] = state.syncMeta[key] || {};
    asList(ids).forEach((id) => { state.syncMeta[key][String(id)] = nowIso(); });
  }

  function processPaymentV3() {
    if (paymentLocked) return;
    if (!state.currentUser || !state.cart.length) {
      showToast('Keranjang kosong atau sesi login tidak valid.');
      return;
    }

    const subtotal = state.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
    const tax = Math.round(subtotal * Number(state.settings.taxRate || 0) / 100);
    const service = Math.round(subtotal * Number(state.settings.serviceRate || 0) / 100);
    const total = subtotal + tax + service;
    const received = state.selectedPayment === 'cash'
      ? (parseInt(document.getElementById('cashReceived').value, 10) || 0)
      : total;

    if (state.selectedPayment === 'cash' && received < total) {
      showToast('Uang tidak cukup!');
      return;
    }

    paymentLocked = true;
    const button = document.getElementById('confirmPayBtn');
    if (button) { button.disabled = true; button.textContent = 'Menyimpan...'; }

    const tx = {
      id: generateRecordId('TX'),
      date: nowIso(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      deviceId: getDeviceId(),
      items: asList(state.cart).map(sanitizeTransactionItem),
      subtotal,
      tax,
      service,
      total,
      payment: state.selectedPayment,
      cashier: state.currentUser.id,
      cashierName: state.currentUser.name,
      status: 'success',
      syncStatus: 'pending',
      received,
      change: state.selectedPayment === 'cash' ? received - total : 0
    };

    state.transactions.unshift(tx);
    if (!saveDataV3()) {
      state.transactions = state.transactions.filter((row) => row.id !== tx.id);
      paymentLocked = false;
      if (button) { button.disabled = false; button.textContent = '✓ Konfirmasi Bayar'; }
      return;
    }

    state.currentReceipt = tx;
    renderReceipt(tx);
    closeModal('paymentModal');
    openModal('receiptModal');
    playSound('success');
    showToast('Transaksi berhasil tersimpan: Rp ' + formatNumber(total));
    if (state.settings.autoPrint) setTimeout(() => printReceipt(), 500);

    paymentLocked = false;
    if (button) { button.disabled = false; button.textContent = '✓ Konfirmasi Bayar'; }
  }

  function resetAllDataV3() {
    const pass = document.getElementById('resetConfirmPass').value;
    if (pass !== state.users.admin.pin) return showToast('Password admin salah!');
    if (!confirm('Yakin ingin menghapus SEMUA data transaksi dan pengeluaran? Data cloud juga akan ditandai terhapus.')) return;
    addTombstone('transaction', state.transactions.map((row) => row.id));
    addTombstone('expense', state.expenses.map((row) => row.id));
    state.transactions = [];
    state.expenses = [];
    saveDataV3();
    closeModal('modalReset');
    showToast('Semua data berhasil direset dan disinkronkan.');
    updateStats();
  }

  function deleteExpenseV3(expenseId) {
    const expense = state.expenses.find((row) => row.id === expenseId);
    if (!expense) return;
    if (!canManageExpense(expense)) return showToast('Kasir hanya bisa menghapus catatan miliknya');
    if (!confirm('Hapus catatan pengeluaran ini?')) return;
    addTombstone('expense', [expenseId]);
    state.expenses = state.expenses.filter((row) => row.id !== expenseId);
    saveDataV3();
    renderExpenseList();
    updateStats();
    showToast('Pengeluaran dihapus');
  }

  function deleteStockNoteV3(id) {
    const note = state.stockNotes.find((row) => row.id === id);
    if (!note) return;
    if (!canManageStock(note)) return showToast('Kasir hanya bisa menghapus catatan miliknya');
    if (!confirm('Hapus catatan stok ini?')) return;
    addTombstone('stock', [id]);
    state.stockNotes = state.stockNotes.filter((row) => row.id !== id);
    saveDataV3();
    renderStockList();
    showToast('Catatan stok dihapus');
  }

  function deleteCashierDataV3() {
    if (!ensureAdmin()) return;
    const pass = document.getElementById('deleteAdminPass').value;
    if (pass !== state.users.admin.pin) return showToast('Password admin salah!');
    const { cashier, period, key, includeExpenses } = getDeleteTarget();
    if (!key) return showToast('Pilih periode dahulu');
    const targetTransactions = state.transactions.filter((row) => row.cashier === cashier && row.date.startsWith(key));
    const targetExpenses = includeExpenses
      ? state.expenses.filter((row) => row.cashier === cashier && row.date && row.date.startsWith(key))
      : [];
    if (!targetTransactions.length && !targetExpenses.length) return showToast('Tidak ada data yang cocok');
    const cashierName = state.users[cashier]?.name || cashier;
    const label = period === 'daily' ? 'tanggal ' + key : 'bulan ' + key;
    if (!confirm(`Hapus ${targetTransactions.length} transaksi${includeExpenses ? ' dan ' + targetExpenses.length + ' pengeluaran' : ''} milik ${cashierName} pada ${label}?`)) return;
    addTombstone('transaction', targetTransactions.map((row) => row.id));
    addTombstone('expense', targetExpenses.map((row) => row.id));
    const txIds = new Set(targetTransactions.map((row) => row.id));
    const expIds = new Set(targetExpenses.map((row) => row.id));
    state.transactions = state.transactions.filter((row) => !txIds.has(row.id));
    state.expenses = state.expenses.filter((row) => !expIds.has(row.id));
    saveDataV3();
    closeModal('modalDeleteCashier');
    loadTransactions();
    updateStats();
    showToast('Data kasir berhasil dihapus');
  }

  function selectedReportPeriod(type) {
    const today = new Date().toISOString().slice(0, 10);
    if (type === 'monthly') return document.getElementById('exportMonth')?.value || today.slice(0, 7);
    if (type === 'weekly') return document.getElementById('filterDate')?.value || today;
    return document.getElementById('filterDate')?.value || today;
  }

  function selectedCashier() {
    return document.getElementById('filterUser')?.value || 'ALL';
  }

  function buildWhatsappReportV3(type) {
    const mode = type === 'monthly' ? 'monthly' : type === 'weekly' ? 'weekly' : 'daily';
    const period = selectedReportPeriod(mode);
    if (window.TecoNativeReports?.getWhatsAppTextFor) {
      return window.TecoNativeReports.getWhatsAppTextFor(mode, period, selectedCashier());
    }
    return 'Laporan belum siap. Muat ulang halaman.';
  }

  function sendReportToWhatsAppV3(type) {
    const mode = type === 'monthly' ? 'monthly' : type === 'weekly' ? 'weekly' : 'daily';
    const period = selectedReportPeriod(mode);
    if (window.TecoNativeReports?.sendWhatsAppFor) {
      return window.TecoNativeReports.sendWhatsAppFor(mode, period, selectedCashier());
    }
    const text = buildWhatsappReportV3(mode);
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  }

  function exportExcelMonthlyV3() {
    const month = document.getElementById('exportMonth')?.value || new Date().toISOString().slice(0, 7);
    if (window.TecoNativeReports?.exportReport) {
      window.TecoNativeReports.exportReport('monthly', month, selectedCashier());
      showToast('Laporan bulan ' + month + ' sedang diekspor.');
      return;
    }
    const txs = state.transactions.filter((row) => row.date && row.date.startsWith(month));
    const expenses = state.expenses.filter((row) => row.date && row.date.startsWith(month));
    if (!txs.length && !expenses.length) return showToast('Tidak ada data pada bulan yang dipilih');
    downloadCsv(buildCsvReport(txs, expenses, 'LAPORAN BULANAN TRANSAKSI'), 'Laporan_Bulanan_TeCo_' + month + '.csv');
  }

  async function cleanupStorageNow() {
    if (!ensureAdmin()) return;
    const beforeText = localStorage.getItem(PRIMARY_KEY) || '';
    const beforeBytes = beforeText.length * 2;
    const current = readPrimary() || buildDataPayloadV3();
    const removed = cleanupAuxiliaryStorage();
    const saved = persistLocal(current);
    if (!saved) {
      showToast('Pembersihan belum cukup. Pastikan cloud tersinkron lalu hapus data situs browser.');
      return false;
    }
    applyDataPayloadV3(saved, true);
    const afterBytes = (localStorage.getItem(PRIMARY_KEY) || '').length * 2;
    const freedKb = Math.max(0, Math.round((beforeBytes - afterBytes) / 1024));
    const info = document.getElementById('syncStorageStats');
    if (info) info.textContent = `Penyimpanan lokal: ${Math.round(afterBytes / 1024)} KB`;
    showToast(`Penyimpanan dibersihkan${freedKb ? ` · hemat ${freedKb} KB` : ''}.`);
    scheduleCloudPush(100);
    console.info('[Te.Co v3.1] Storage cleanup', { removed, beforeBytes, afterBytes });
    return true;
  }

  async function syncNow() {
    if (!ensureAdmin()) return;
    if (!syncController || !syncController.enabled) await initSyncV3();
    const ok = await pushRemoteDataV3(readPrimary() || buildDataPayloadV3());
    showToast(ok ? 'Sinkronisasi cloud selesai.' : 'Sinkronisasi tertunda; data tetap aman di perangkat.');
  }

  async function backupCloudNow() {
    if (!ensureAdmin()) return;
    if (!syncController || !syncController.backupRef) await initSyncV3();
    if (!syncController.backupRef) return showToast('Firebase belum tersambung.');
    const key = nowIso().replace(/[.:]/g, '-');
    try {
      await syncController.backupRef.child('manual').child(key).set(toCloudPayload(readPrimary() || buildDataPayloadV3()));
      showToast('Backup cloud manual berhasil dibuat.');
    } catch (error) {
      console.error(error);
      showToast('Backup cloud gagal. Periksa koneksi/rules Firebase.');
    }
  }

  function exportJsonBackup() {
    if (!ensureAdmin()) return;
    const payload = readPrimary() || buildDataPayloadV3();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'teco-pos-backup-' + nowIso().slice(0, 10) + '.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function enhanceUi() {
    const month = document.getElementById('exportMonth');
    if (month && !month.value) month.value = new Date().toISOString().slice(0, 7);
    const version = document.querySelector('.version-tag');
    if (version) version.textContent = 'v3.1.1 · Expense-safe · Cloud-safe';
    const storageInfo = document.getElementById('syncStorageStats');
    if (storageInfo) {
      const bytes = (localStorage.getItem(PRIMARY_KEY) || '').length * 2;
      storageInfo.textContent = `Penyimpanan lokal: ${Math.round(bytes / 1024)} KB`;
    }
  }

  // Replace global operations used by the existing UI.
  window.loadData = loadDataV3;
  window.buildDataPayload = buildDataPayloadV3;
  window.applyDataPayload = applyDataPayloadV3;
  window.saveData = saveDataV3;
  window.initSync = initSyncV3;
  window.pushRemoteData = pushRemoteDataV3;
  window.processPayment = processPaymentV3;
  window.resetAllData = resetAllDataV3;
  window.deleteExpense = deleteExpenseV3;
  window.deleteStockNote = deleteStockNoteV3;
  window.deleteCashierData = deleteCashierDataV3;
  window.buildWhatsappReport = buildWhatsappReportV3;
  window.sendReportToWhatsApp = sendReportToWhatsAppV3;
  window.exportExcelMonthly = exportExcelMonthlyV3;
  window.syncNow = syncNow;
  window.cleanupStorageNow = cleanupStorageNow;
  window.backupCloudNow = backupCloudNow;
  window.exportJsonBackup = exportJsonBackup;
  window.TecoReliability = {
    version: VERSION,
    sync: syncNow,
    cleanupStorage: cleanupStorageNow,
    backupCloud: backupCloudNow,
    exportBackup: exportJsonBackup,
    mergePayloads,
    cleanupStorage: () => {
      const removed = cleanupAuxiliaryStorage();
      const current = readPrimary();
      if (current) persistLocal(current);
      return removed;
    },
    storageStatus: async () => {
      const estimate = navigator.storage && navigator.storage.estimate
        ? await navigator.storage.estimate()
        : {};
      return {
        primaryBytes: (localStorage.getItem(PRIMARY_KEY) || '').length * 2,
        usage: estimate.usage || null,
        quota: estimate.quota || null
      };
    },
    status: () => ({
      deviceId: getDeviceId(),
      localTransactions: asList(readPrimary()?.transactions).length,
      cloudEnabled: Boolean(syncController && syncController.enabled),
      cloudConnected: Boolean(syncController && syncController.connected),
      pending: Boolean(syncController && syncController.pending)
    })
  };

  window.addEventListener('online', () => scheduleCloudPush(100));
  window.addEventListener('storage', (event) => {
    if (event.key === PRIMARY_KEY && event.newValue) {
      const merged = mergePayloads(readPrimary() || {}, parsePayload(event.newValue) || {});
      const saved = persistLocal(merged);
      if (saved) applyDataPayloadV3(saved, true);
      scheduleCloudPush(300);
    }
  });
  window.addEventListener('teco:data-changed', (event) => {
    if (event.detail && event.detail.reason === 'save') return;
    const root = readPrimary();
    if (root) {
      applyDataPayloadV3(root, false);
      scheduleCloudPush(400);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && syncController && syncController.pending) scheduleCloudPush(100);
  });
  document.addEventListener('DOMContentLoaded', enhanceUi, { once: true });
  setInterval(() => {
    if (syncController && syncController.enabled && syncController.pending && navigator.onLine) scheduleCloudPush(100);
  }, 30000);
})();
