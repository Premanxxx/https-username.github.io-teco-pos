# v3.3.0 — 16 Juli 2026

- Menambahkan Master Harga Dasar Bahan khusus Admin.
- Menghitung harga dasar otomatis dari harga beli dibagi isi kemasan.
- Menyediakan bahan awal seperti Air, Es Batu, Cup + Tutup, Plastik Cup, Sedotan, UHT, gula, krimer, kopi, konsentrat, bubuk, dan sirup.
- Menjadikan harga master sebagai patokan HPP produk dan seluruh komposisi laporan.
- Menambahkan total estimasi biaya semua bahan pada laporan Rekap Cup & Bahan.
- Menambahkan harga dasar, total biaya, dan status kelengkapan untuk setiap bahan pada laporan Admin.
- Menambahkan master harga dan rincian biaya bahan ke laporan WhatsApp serta Excel Admin.
- Menyembunyikan seluruh harga bahan, HPP, laba, margin, dan sheet biaya dari pengguna Kasir.
- Menambahkan sinkronisasi `materialPrices` berbasis `updatedAt` dan tombstone `deletedMaterialPrices`.
- Memigrasikan harga bahan dari resep HPP lama ke Master Harga tanpa menghilangkan resep.
- Memperbaiki pembukaan halaman laporan native agar tidak memanggil elemen laporan lama yang sudah tidak digunakan.

# v3.2.0 — 16 Juli 2026

- Menghubungkan data resep HPP secara otomatis ke laporan Rekap Cup & Bahan.
- Menambahkan ringkasan admin: omzet produk, total HPP, laba kotor, margin kotor, laba setelah pengeluaran, rata-rata HPP per cup, dan cakupan HPP.
- Menambahkan HPP per cup, total HPP, laba, dan margin pada rekap produk/varian khusus Admin.
- Menambahkan tabel biaya bahan berdasarkan HPP periode laporan.
- Menambahkan peringatan resep HPP belum tersedia dan harga bahan belum lengkap.
- Menambahkan analisa HPP ke laporan WhatsApp dan sheet Excel khusus Admin.
- Memperbaiki sinkronisasi `hppData` agar resep dari beberapa perangkat digabung berdasarkan `updatedAt`.
- Menambahkan tombstone penghapusan resep agar data HPP lama dari cloud tidak muncul kembali.
- Mengarahkan server lokal ke `index.html` agar memakai jalur aplikasi utama yang mendukung sinkronisasi cloud.

# v3.1.0

- Memperbaiki notifikasi penyimpanan penuh akibat gambar base64 tersalin ke setiap item transaksi.
- Memigrasikan transaksi lama ke format tanpa gambar.
- Menambahkan pembersihan cache otomatis dan tombol Bersihkan Penyimpanan.
- Menambahkan statistik ukuran penyimpanan lokal.

# v3.0.0 — 12 Juli 2026

- Menambahkan laporan WhatsApp dan Excel harian, mingguan, dan bulanan dengan satu mesin analisis.
- Menambahkan pemilih bulan untuk export laporan.
- Mengganti resep KOPI MILO menjadi COFFEE MILO.
- Menambahkan resep MILO MALAYSIA tanpa sirup rasa.
- Memperbaiki transaksi gagal tersimpan/hilang melalui ID unik, local-first save, IndexedDB emergency recovery, dan merge Firebase.
- Mengganti sinkronisasi `set()` yang menimpa data menjadi transaksi merge-safe dengan tombstone penghapusan.
- Menambahkan backup Firebase harian, backup manual, dan export JSON.
- Menambahkan Firebase Anonymous Authentication dan rules contoh agar database tidak perlu dibuka untuk publik.

# Changelog

## v1.2.3

- Menambahkan pilihan sumber/penyimpanan data: Otomatis, Firebase dengan cadangan lokal, dan Lokal saja.
- Mode Lokal saja melewati seluruh permintaan baca/tulis Firebase.
- Mode Firebase otomatis memakai data lokal jika cloud gagal atau tidak memiliki data laporan.
- Menambahkan tombol Uji Firebase pada Pengaturan Admin.
- Menambahkan status koneksi Firebase beserta waktu pemeriksaan terakhir.
- Penyesuaian laporan tetap disimpan lokal sebelum sinkronisasi cloud dilakukan.
- Listener Firebase realtime dilepas saat pengguna memilih mode Lokal saja.

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
