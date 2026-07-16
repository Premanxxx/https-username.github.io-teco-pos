# Perbaikan Rekap Pengeluaran Duplikat

Perubahan versi ini:

1. Setiap pengeluaran baru memakai ID unik berbasis timestamp penuh dan UUID/random.
2. Sinkronisasi cloud mempertahankan dua pengeluaran berbeda walaupun data lama kebetulan memiliki ID yang sama.
3. Analisis tidak lagi menghapus transaksi hanya karena kategori, keterangan, dan nominalnya sama.
4. Laporan menambahkan **Rekap Pengeluaran per Klasifikasi** berisi kategori, keterangan, frekuensi transaksi, dan total nominal.
5. Contoh dua pembelian `Susu UHT 6` masing-masing Rp100.000 pada tanggal berbeda akan tampil sebagai `2 transaksi` dengan total `Rp200.000`.
6. Excel dan laporan WhatsApp juga memuat rekap klasifikasi tersebut.
