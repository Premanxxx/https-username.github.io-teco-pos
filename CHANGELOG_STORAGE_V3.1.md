# Te.Co POS v3.1.0 - Perbaikan Penyimpanan Penuh

## Penyebab utama yang diperbaiki

Versi sebelumnya menyalin properti gambar `data:image/...` dari menu ke setiap item transaksi. Karena gambar base64 berukuran besar, satu gambar dapat tersalin berkali-kali dan membuat `localStorage` browser cepat mencapai batas.

## Perbaikan

- Menghapus gambar base64 dan blob dari item transaksi sebelum transaksi disimpan.
- Membersihkan gambar yang sudah terlanjur tersimpan pada transaksi lama ketika aplikasi dibuka.
- Menghapus cache dan backup lokal lama yang bersifat duplikat ketika kuota terdeteksi penuh.
- Mencoba ulang penyimpanan setelah pembersihan otomatis.
- Tetap membuat backup terakhir di IndexedDB.
- Menambahkan tombol **Bersihkan Penyimpanan** pada menu Sinkronisasi.
- Menampilkan perkiraan ukuran data utama lokal.

## Cara pemasangan

Ganti seluruh file situs dengan isi paket v3.1.0. Cara tercepat untuk instalasi sebelumnya adalah mengganti:

1. `teco-reliability-v3.js`
2. `index.html`

Lakukan hard refresh setelah upload.
