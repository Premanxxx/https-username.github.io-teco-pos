# Hasil Validasi Te.Co Pandawa POS v3.3.1

Tanggal: 2026-07-16

## Pemeriksaan Sintaks

- `teco-native-main-core.js`: lolos `node --check`.
- `teco-reliability-v3.js`: lolos `node --check`.
- `server.js`: lolos `node --check`.
- Seluruh skrip inline pada `index.html`, `index (2).html`, `pos_app_pwa.html`, dan `analytics.html`: valid.


## Uji Tampilan Tab Laporan

- `#teco-native-report` terpasang langsung di dalam halaman laporan, bukan sebagai anak `.page-header`.
- Stylesheet laporan aktif pada seluruh entry point HTML.
- Lebar laporan desktop mengikuti lebar konten halaman dan tidak lagi terjepit di sisi kanan.
- Tampilan ponsel memakai dua kolom untuk kartu dan kontrol, bukan tiga kolom sempit.
- Tabel lebar tetap dapat digeser horizontal dan menampilkan petunjuk geser.
- Pengujian Chromium desktop 1440 px dan ponsel 390 px lulus.

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

`server.js` diuji pada port alternatif. Permintaan ke `/` dan `teco-native-main-style.css?v=3.3.1` sama-sama mengembalikan status HTTP 200.

## Batas Validasi

Uji koneksi langsung ke Firebase produksi tidak dilakukan karena kredensial dan sesi produksi tidak tersedia. Navigasi HTTP/file langsung dari Chromium diblokir oleh kebijakan sandbox pengujian; validasi UI dilakukan dengan injeksi HTML dan seluruh pemeriksaan role lulus.
