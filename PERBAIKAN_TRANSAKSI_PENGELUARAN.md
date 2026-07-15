# Perbaikan Transaksi dan Pengeluaran

Perubahan yang diterapkan:

1. Hak akses transaksi
   - Akun kasir hanya dapat melihat transaksi miliknya sendiri.
   - Filter kasir pada halaman transaksi otomatis terkunci untuk akun kasir.
   - Akun admin tetap dapat melihat semua transaksi atau memilih kasir tertentu dari menu filter.

2. Jumlah pesanan per varian
   - Modal detail produk sekarang memiliki input jumlah pesanan untuk varian yang dipilih.
   - Jumlah tersebut langsung ditambahkan ke keranjang sesuai varian, misalnya Dingin x3 atau Hangat x2.
   - Riwayat transaksi, laporan CSV, laporan WhatsApp, dan analisis produk menampilkan rekap jumlah pesanan per varian.

3. Filter pengeluaran sesuai tanggal
   - Modal pengeluaran sekarang memiliki filter tanggal untuk melihat pengeluaran pada tanggal tertentu.
   - Admin dapat memfilter pengeluaran semua kasir atau kasir tertentu.
   - Kasir hanya dapat melihat dan mengelola pengeluaran miliknya sendiri.

4. Validasi
   - File JavaScript utama sudah dicek dengan `node --check` untuk memastikan tidak ada error sintaks.
