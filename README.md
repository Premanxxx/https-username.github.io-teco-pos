# Te.Co Pandawa POS v3.3.1

Pembaruan v3.3.1 memperbaiki tampilan tab **Laporan & Analisis**. Komponen laporan kini dipasang sebagai konten penuh halaman, bukan di dalam header flex. Stylesheet laporan juga ditautkan langsung pada seluruh halaman aplikasi sehingga kartu ringkasan, toolbar, tabel, status HPP, dan panel Admin tampil konsisten di desktop maupun ponsel.

Pada layar kecil, filter dan tombol aksi tersusun dua kolom, kartu ringkasan tetap terbaca, serta setiap tabel menampilkan petunjuk geser horizontal. Logika HPP, harga dasar bahan, margin, sinkronisasi Firebase, dan pembatasan akses Admin tetap sama seperti v3.3.0.

Versi ini menambahkan **Master Harga Dasar Bahan** khusus Admin. Harga beli dan isi kemasan bahan seperti Air, Es Batu, Cup, UHT, sirup, gula, krimer, bubuk, dan bahan lain diubah otomatis menjadi harga dasar per `ml`, `gr`, `pcs`, atau satuan lain.

Contoh: UHT Rp18.000 dengan isi 1.000 ml menghasilkan harga dasar Rp18/ml. Harga dasar tersebut menjadi patokan tunggal untuk:

- estimasi biaya seluruh komposisi bahan pada laporan;
- HPP per produk dan varian;
- total HPP periode;
- laba kotor, margin, dan laba setelah pengeluaran;
- laporan WhatsApp dan Excel Admin.

Laporan Admin menampilkan jumlah bahan terpakai, harga dasar per satuan, total biaya per bahan, kelengkapan harga, serta total estimasi biaya semua komposisi. Kasir hanya melihat jumlah kebutuhan bahan tanpa harga, HPP, laba, atau margin.

Data `materialPrices` disimpan dalam `hppData` versi 3 dan ikut disinkronkan melalui Firebase dengan merge berdasarkan `updatedAt`. Penghapusan harga memakai tombstone agar data lama dari perangkat lain tidak muncul kembali.

Buka `index.html` melalui GitHub Pages atau jalankan `server.js`. Petunjuk Firebase terdapat di `FIREBASE_SETUP.md`.
