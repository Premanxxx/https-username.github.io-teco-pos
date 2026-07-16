# Te.Co Pandawa POS v3.3.0

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
