# Hasil Validasi Te.Co Pandawa POS v3.3.0

Tanggal: 2026-07-16

## Pemeriksaan Sintaks

- `teco-native-main-core.js`: lolos `node --check`.
- `teco-reliability-v3.js`: lolos `node --check`.
- `server.js`: lolos `node --check`.
- Seluruh skrip inline pada `index.html`, `index (2).html`, `pos_app_pwa.html`, dan `analytics.html`: valid.

## Uji Harga Dasar dan Biaya Komposisi

- UHT Rp18.000 / 1.000 ml menghasilkan Rp18/ml.
- Harga Master menggantikan harga lama pada resep HPP.
- Jumlah pemakaian bahan dihitung dari komposisi resep dikali cup terjual.
- Biaya setiap bahan dihitung dari jumlah terpakai dikali harga dasar.
- Total biaya semua komposisi sama dengan penjumlahan biaya seluruh bahan.
- Total HPP, laba kotor, margin, dan laba setelah pengeluaran dihitung konsisten.

## Uji Akses Admin dan Kasir

Pengujian Chromium berbasis injeksi dokumen berhasil memverifikasi:

- Admin melihat Master Harga, biaya semua komposisi, HPP, laba, margin, dan kolom harga bahan.
- Kasir tetap melihat rekap jumlah kebutuhan bahan.
- Kasir tidak melihat harga dasar, total biaya, HPP, laba, atau margin.

## Uji Merge Sinkronisasi

- Harga terbaru berdasarkan `updatedAt` dipertahankan.
- Harga lokal dan cloud untuk bahan berbeda tetap digabung.
- Tombstone penghapusan yang lebih baru menekan harga cloud lama.
- Resep HPP dan Master Harga dapat digabung tanpa saling menimpa.

## Uji Server Lokal

`server.js` diuji pada port alternatif. Permintaan ke `/` mengembalikan `index.html` dengan status HTTP 200.

## Batas Validasi

Uji koneksi langsung ke Firebase produksi tidak dilakukan karena kredensial dan sesi produksi tidak tersedia. Navigasi HTTP/file langsung dari Chromium diblokir oleh kebijakan sandbox pengujian; validasi UI dilakukan dengan injeksi HTML dan seluruh pemeriksaan role lulus.
