# Changelog

## v1.2.2

- Menyinkronkan laporan langsung dengan sumber transaksi internal aplikasi POS.
- Menambahkan pembacaan Firebase melalui SDK aplikasi sebelum memakai REST.
- Menambahkan refresh otomatis setelah pembayaran, saat aplikasi aktif kembali, dan secara berkala.
- Menyamakan identitas kasir seperti `kasir1`, `Kasir 1`, dan `Cashier 1`.
- Menambahkan dukungan `cartItems`, `transactionItems`, item bertingkat, dan JSON string.
- Menambahkan format tanggal Indonesia bertanda koma atau titik pada jam.
- Menambahkan fallback pembacaan beberapa koleksi Firebase bila akses root ditolak.


## v1.2.1

- Mengembalikan rincian pengeluaran ke pesan WhatsApp harian dan bulanan.
- Menambahkan total pengeluaran dan saldo bersih pada ringkasan WhatsApp.
- Mengembalikan rekap tipe pembayaran beserta jumlah transaksi dan nominalnya.
- Mengembalikan bagian Catatan dari transaksi, pengeluaran, dan penyesuaian laporan.
- Menambahkan pembacaan data pengeluaran dari localStorage, variabel aplikasi, dan Firebase.
- Menambahkan kolom Catatan transaksi pada sheet transaksi Excel.

## v1.2.0

- Memindahkan akses analisis ke kartu di dalam tab Laporan.
- Menyembunyikan fitur sebelum login dan menghapus UI saat logout.
- Menambahkan deteksi peran Admin dan Kasir.
- Membatasi Mapping Resep, Daftar Resep, dan Pengaturan hanya untuk Admin.
- Mengunci filter kasir ke akun yang sedang login untuk pengguna Kasir.
- Menambahkan tab Penyesuaian Laporan.
- Kasir hanya dapat mengubah penyesuaian miliknya sendiri.
- Admin dapat mengelola penyesuaian semua kasir.
- Penyesuaian ikut dihitung pada rekap cup, omzet, bahan, WhatsApp, dan Excel.
- Penyesuaian disimpan lokal dan dicoba disinkronkan ke Firebase.
- Ekspor Kasir tidak menyertakan sheet Mapping Produk dan Master Resep.
