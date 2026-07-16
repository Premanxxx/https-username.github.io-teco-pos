# Hasil Validasi Te.Co Pandawa POS v3.2.0

Tanggal: 2026-07-16

## Pemeriksaan Sintaks

- `teco-native-main-core.js`: lolos `node --check`.
- `teco-reliability-v3.js`: lolos `node --check`.
- `server.js`: lolos `node --check`.
- Seluruh skrip inline pada `index.html`: valid.
- Seluruh skrip inline pada `index (2).html`: valid.
- Seluruh skrip inline pada `pos_app_pwa.html`: valid.

## Uji Perhitungan HPP

Skenario admin dengan 2 cup, omzet produk Rp20.000, dan HPP Rp1.100 per cup menghasilkan:

- Total HPP: Rp2.200.
- Estimasi laba kotor: Rp17.800.
- Margin kotor: 89%.
- Pengeluaran: Rp2.000.
- Estimasi laba setelah pengeluaran: Rp15.800.
- Cakupan HPP: 100%.

Skenario pengguna Kasir menghasilkan `profitAnalysis = null`, sehingga data HPP dan margin tidak tersedia pada laporan Kasir.

## Uji Merge Sinkronisasi HPP

- Resep lokal yang lebih baru mengalahkan resep cloud lama.
- Resep berbeda dari cloud tetap dipertahankan.
- Tombstone penghapusan yang lebih baru menghapus resep cloud lama.
- Resep baru yang waktunya lebih baru daripada tombstone dapat disimpan kembali.

## Uji Server Lokal

`server.js` diuji pada port alternatif melalui variabel lingkungan `PORT`. Permintaan ke `/` mengembalikan `index.html` dengan status HTTP 200 dan memuat laporan native serta teks Analisa HPP.

## Batas Validasi

Validasi ini mencakup sintaks, logika perhitungan, kontrol peran, merge data HPP, dan penyajian server lokal. Uji koneksi langsung ke proyek Firebase produksi tidak dilakukan karena kredensial dan sesi pengguna produksi tidak tersedia di lingkungan pengujian.
