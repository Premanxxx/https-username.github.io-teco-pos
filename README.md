# Te.Co Pandawa POS v3.2.0

Versi ini menambahkan analisa HPP yang terhubung otomatis ke **Laporan Rekap Cup & Bahan** untuk akun Admin. Laporan menampilkan omzet produk, total HPP, estimasi laba kotor, margin kotor, laba setelah pengeluaran, rata-rata HPP per cup, cakupan data HPP, serta biaya bahan berdasarkan resep.

Data HPP disimpan di `teco_pos_data` dan ikut digabungkan secara aman saat sinkronisasi Firebase. Perubahan resep menggunakan waktu pembaruan terbaru, sedangkan resep yang dihapus memakai tombstone agar tidak muncul kembali dari perangkat lain atau data cloud lama.

Fitur laba dan margin hanya dirender serta diekspor untuk pengguna Admin. Pengguna Kasir tetap melihat laporan operasional tanpa informasi keuntungan.

Buka `index.html` melalui GitHub Pages atau jalankan `server.js`. Konfigurasi keamanan dan aktivasi cloud terdapat di `FIREBASE_SETUP.md` serta `database.rules.json`.
