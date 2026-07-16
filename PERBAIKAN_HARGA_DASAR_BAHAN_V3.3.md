# Master Harga Dasar Bahan dan Estimasi Biaya Komposisi

Tanggal: 2026-07-16  
Versi: 3.3.0

## Tujuan

Seluruh bahan pada komposisi laporan dapat diberi satu harga dasar sebagai patokan estimasi. Sistem menjumlahkan nilai pemakaian Air, Es, Cup, UHT, sirup, gula, krimer, bubuk, konsentrat, sedotan, dan bahan lain secara otomatis sesuai jumlah cup terjual.

## Cara Mengisi

Masuk sebagai **Admin**, lalu buka:

`Panel Admin → HPP & Harga Dasar Bahan`

Pada bagian **Master Harga Dasar Bahan**, isi:

1. Nama bahan.
2. Harga beli satu kemasan.
3. Isi kemasan.
4. Satuan dasar yang sama dengan komposisi resep, misalnya `ml`, `gr`, atau `pcs`.
5. Simpan Master Harga.

Rumus yang digunakan:

`Harga dasar per satuan = Harga beli ÷ Isi kemasan`

Contoh:

- UHT: Rp18.000 ÷ 1.000 ml = Rp18/ml.
- Cup + tutup: Rp25.000 ÷ 50 pcs = Rp500/pcs.
- Es Batu: Rp10.000 ÷ 10.000 gr = Rp1/gr.

## Perhitungan Laporan

Untuk setiap bahan:

`Total biaya bahan = Total jumlah terpakai × Harga dasar per satuan`

Total seluruh komposisi adalah penjumlahan biaya semua bahan yang dipakai pada periode laporan. Nilai ini ditampilkan bersama total HPP, laba kotor, margin, dan laba setelah pengeluaran.

## Informasi Khusus Admin

Admin dapat melihat:

- Harga dasar per ml/gr/pcs.
- Total biaya setiap bahan.
- Total estimasi biaya semua komposisi.
- Jumlah master harga aktif dan bahan yang belum memiliki harga.
- HPP, laba, dan margin per produk/varian.
- Sheet `Master Harga Bahan` dan kolom biaya pada Excel.
- Rincian biaya pada laporan WhatsApp.

Kasir hanya melihat jumlah bahan yang dibutuhkan. Harga dasar, total biaya, HPP, laba, margin, dan sheet master harga tidak ditampilkan.

## Sinkronisasi

Master harga disimpan pada:

- `hppData.materialPrices`
- `hppData.deletedMaterialPrices`

Data dari beberapa perangkat digabung berdasarkan waktu `updatedAt`. Harga terbaru dipertahankan. Harga yang dihapus menggunakan tombstone sehingga versi lama dari cloud tidak hidup kembali.

## Catatan Ketepatan

- Nama dan satuan bahan pada Master Harga harus sesuai dengan komposisi resep.
- Bahan tanpa harga tetap dihitung jumlah pemakaiannya, tetapi nilai biayanya ditandai belum lengkap.
- Harga master selalu diprioritaskan dibanding harga lama yang tersimpan pada baris resep HPP.
