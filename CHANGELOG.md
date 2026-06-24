# Changelog

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
