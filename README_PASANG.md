# Te.Co POS — Analytics Add-on v1.2.0

Add-on ini menempatkan fitur **Analisis Penjualan & Bahan** di dalam tab **Laporan** aplikasi Te.Co POS. Fitur tidak muncul pada halaman login dan otomatis ditutup saat pengguna logout.

## Hak akses

| Fitur | Admin | Kasir |
|---|---:|---:|
| Laporan harian dan bulanan | Ya | Ya, akun sendiri |
| Total cup, varian, omzet, dan analisis bahan | Ya | Ya, akun sendiri |
| WhatsApp dan ekspor Excel | Ya | Ya, akun sendiri |
| Penyesuaian data laporan | Semua kasir | Hanya milik sendiri |
| Mapping produk ke resep | Ya | Tidak |
| Daftar/master resep | Ya | Tidak |
| Pengaturan analisis dan Firebase | Ya | Tidak |

Penyesuaian laporan tidak mengubah transaksi asli. Nilai koreksi disimpan sebagai catatan terpisah, lalu diperhitungkan pada rekap cup, omzet, varian, WhatsApp, Excel, dan analisis bahan.

## Fitur laporan

- Rekap total transaksi, total cup, varian, omzet, dan jumlah penyesuaian.
- Rekap harian dan bulanan.
- Akumulasi setiap varian yang terjual.
- Analisis pemakaian bahan berdasarkan resep per cup.
- Perhitungan konsentrat dan bahan pembentuk konsentrat.
- Pesan WhatsApp laporan harian atau bulanan.
- Ekspor Excel dengan sheet Ringkasan, Varian, Bahan, Transaksi, dan Penyesuaian.
- Khusus ekspor Admin: sheet Mapping Produk dan Master Resep.

## File

- `teco-analytics-addon.js` — add-on utama.
- `analytics.html` — halaman petunjuk/akses kembali ke aplikasi utama.
- `README_PASANG.md` — panduan ini.

## Cara pasang di GitHub

1. Buka repositori aplikasi Te.Co POS.
2. Unggah atau ganti file `teco-analytics-addon.js` dan `analytics.html` di folder yang sama dengan `index.html`.
3. Buka `index.html` dan pastikan baris berikut berada tepat sebelum `</body>`:

```html
<script src="./teco-analytics-addon.js?v=1.2.0"></script>
```

4. Hapus baris pemanggilan add-on versi lama bila ada, supaya file tidak dimuat dua kali.
5. Commit perubahan.
6. Setelah GitHub Pages diperbarui, lakukan hard refresh (`Ctrl + F5`) atau bersihkan cache aplikasi/PWA.

## Cara penggunaan

1. Login sebagai Admin atau Kasir.
2. Buka tab **Laporan**.
3. Pilih kartu **Analisis Penjualan & Bahan**.

### Admin

Admin memperoleh tab:

- Harian
- Bulanan
- Penyesuaian Laporan
- Mapping Resep
- Daftar Resep
- Pengaturan

Admin dapat membuat atau mengoreksi penyesuaian untuk semua kasir.

### Kasir

Kasir memperoleh tab:

- Harian
- Bulanan
- Penyesuaian Laporan

Pilihan kasir dikunci ke akun yang sedang login. Kasir tidak dapat membuka atau menjalankan fungsi Mapping Resep, Daftar Resep, dan Pengaturan.

## Penyesuaian laporan

Isi data berikut:

- Tanggal
- Kasir
- Varian
- Koreksi cup, misalnya `-1` atau `+2`
- Koreksi omzet, misalnya `-10000` atau `+15000`
- Catatan/alasan

Penyesuaian disimpan pada perangkat dan dicoba disinkronkan ke Firebase pada path `analyticsAdjustments`. Bila aturan Firebase menolak penulisan, data tetap tersimpan pada perangkat tersebut dan aplikasi menampilkan pemberitahuan kegagalan sinkron.

## Pengaturan awal Admin

Buka **Analisis Penjualan & Bahan → Pengaturan**, lalu periksa:

1. Nomor WhatsApp owner dengan format `628xxxxxxxxxx`.
2. Hasil satu batch konsentrat. Nilai awal `1000 ml` karena file resep tidak mencantumkan hasil akhir batch.
3. URL Firebase Realtime Database.
4. Mapping resep untuk produk yang belum dikenali otomatis.

## Catatan keamanan

Pembatasan peran diterapkan pada antarmuka dan fungsi add-on. Karena aplikasi berupa situs statis, keamanan tingkat server tetap bergantung pada Firebase Security Rules. Aturan Firebase sebaiknya membatasi perubahan pengaturan dan data admin bila aplikasi nantinya memakai autentikasi Firebase.

## Jika fitur belum muncul

- Pastikan pengguna sudah login.
- Pastikan kartu dibuka dari tab **Laporan**, bukan dari `analytics.html` secara langsung.
- Pastikan hanya ada satu pemanggilan `teco-analytics-addon.js`.
- Ubah query cache menjadi `v=1.2.0`.
- Lakukan `Ctrl + F5` atau hapus cache PWA/browser.
