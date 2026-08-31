# Perbaikan Pengaturan Menu v3.4.0

## Ruang lingkup

Pembaruan ini memperbaiki pengelolaan menu pada `index.html` dan lapisan persistensi `teco-reliability-v3.js`.

## Fitur yang tersedia

1. Edit nama menu.
2. Edit harga dasar menu.
3. Tambah, hapus, dan ubah nama varian.
4. Harga khusus per varian.
5. Tambah menu baru.
6. Hapus menu.
7. Upload dan hapus gambar ilustrasi menu.
8. Edit kategori, badge, dan deskripsi.
9. Varian menu otomatis digunakan pada layar pemesanan dan modul HPP.
10. Penghapusan menu aman terhadap merge Firebase melalui tombstone `deletedMenu`.

## Kompatibilitas data

Menu lama yang belum memiliki properti `variants` otomatis memperoleh varian `Dingin` dan `Hangat`. Harga varian kosong memakai `price` milik menu. Gambar bawaan tidak disimpan ulang ke local storage atau cloud. Gambar unggahan pengguna memiliki `customImage: true` dan tetap dipertahankan oleh reliability layer.

## Verifikasi

Pengujian Chromium headless mencakup edit harga, rename varian, harga per varian, upload gambar, tambah menu, hapus menu, sinkronisasi pilihan varian HPP, persistensi gambar kustom, dan pencegahan restore menu yang sudah dihapus saat merge lokal-cloud.
