# Perbaikan Pengeluaran Bahan v3.3.2

## Struktur input baru

Setiap transaksi pengeluaran menyimpan satu item bahan secara terpisah:

- tanggal;
- klasifikasi item;
- nama item/bahan;
- isi atau volume per item;
- satuan isi: ml, liter, gram, kg, atau pcs;
- jumlah item/kemasan;
- satuan jumlah: pcs, pack, botol, dus, atau karung;
- total volume otomatis;
- total harga;
- catatan tambahan.

Contoh:

- Susu UHT, 950 ml per item, 10 pcs, total 9.500 ml (9,5 liter), Rp190.000.
- Es Batu, 100 kg per item, 1 pcs, total 100 kg, Rp120.000.

## Laporan

Laporan native pada tab Laporan & Analisis mengikuti pilihan Harian, Mingguan, dan Bulanan. Laporan menampilkan ringkasan per klasifikasi dan tabel detail yang memisahkan setiap nama bahan. Export Excel menghasilkan sheet tambahan `Rekap Klasifikasi` dan `Rekap Item Bahan`.
