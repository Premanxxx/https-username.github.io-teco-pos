# Te.Co POS — Analytics Add-on v1.2.3

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

- Rekap total transaksi, total cup, varian, omzet kotor, pengeluaran, saldo bersih, dan jumlah penyesuaian.
- Rekap harian dan bulanan.
- Akumulasi setiap varian yang terjual.
- Analisis pemakaian bahan berdasarkan resep per cup.
- Perhitungan konsentrat dan bahan pembentuk konsentrat.
- Pesan WhatsApp laporan harian atau bulanan yang tetap memuat tipe pembayaran, rincian pengeluaran, saldo bersih, dan catatan.
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
<script src="./teco-analytics-addon.js?v=1.2.3"></script>
```

4. Hapus baris pemanggilan add-on versi lama bila ada, supaya file tidak dimuat dua kali.
5. Commit perubahan.
6. Setelah GitHub Pages diperbarui, lakukan hard refresh (`Ctrl + F5`) atau bersihkan cache aplikasi/PWA.

## Sinkronisasi dengan penjualan

Versi 1.2.3 membaca data dari beberapa jalur sekaligus agar laporan mengikuti transaksi POS:

- variabel transaksi internal aplikasi, termasuk variabel global `let` yang tidak tampil pada `window`;
- localStorage/sessionStorage aplikasi;
- Firebase SDK yang sudah digunakan aplikasi;
- Firebase REST sebagai cadangan;
- struktur transaksi bertingkat seperti `cartItems`, `transactionItems`, dan data item berbentuk JSON string.

Setelah tombol **Konfirmasi Bayar** ditekan, laporan dijadwalkan memuat ulang otomatis. Sinkronisasi juga dijalankan saat aplikasi kembali aktif dan secara berkala selama pengguna masih login. Nama akun seperti `kasir1`, `Kasir 1`, dan `Cashier 1` diperlakukan sebagai kasir yang sama.

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

Penyesuaian selalu disimpan sebagai cadangan pada perangkat. Pada mode **Otomatis** dan **Firebase**, add-on juga mencoba menyinkronkannya ke path `analyticsAdjustments`. Pada mode **Lokal saja**, sinkronisasi cloud dilewati. Bila aturan Firebase menolak penulisan, data tetap tersedia pada perangkat tersebut.

## Pengaturan awal Admin

Buka **Analisis Penjualan & Bahan → Pengaturan**, lalu periksa:

1. Nomor WhatsApp owner dengan format `628xxxxxxxxxx`.
2. Hasil satu batch konsentrat. Nilai awal `1000 ml` karena file resep tidak mencantumkan hasil akhir batch.
3. Pilihan **Sumber/Penyimpanan Data**:
   - **Otomatis** — menggabungkan data aplikasi/lokal dan Firebase.
   - **Firebase** — memakai cloud sebagai sumber utama dan otomatis beralih ke cadangan lokal bila gagal.
   - **Lokal saja** — tidak melakukan permintaan Firebase; laporan dan penyesuaian hanya memakai perangkat aktif.
4. URL Firebase Realtime Database bila mode Otomatis atau Firebase digunakan.
5. Tekan **Uji Firebase** untuk melihat status koneksi dan jumlah transaksi yang ditemukan.
6. Mapping resep untuk produk yang belum dikenali otomatis.

Bila muncul pesan Firebase gagal dimuat, pilih **Lokal saja**, tekan **Simpan Pengaturan**, lalu muat ulang laporan. Penjualan yang tersedia di aplikasi, `localStorage`, dan sesi browser tetap dapat dibaca.

## Catatan keamanan

Pembatasan peran diterapkan pada antarmuka dan fungsi add-on. Karena aplikasi berupa situs statis, keamanan tingkat server tetap bergantung pada Firebase Security Rules. Aturan Firebase sebaiknya membatasi perubahan pengaturan dan data admin bila aplikasi nantinya memakai autentikasi Firebase.

## Jika fitur belum muncul

- Pastikan pengguna sudah login.
- Pastikan kartu dibuka dari tab **Laporan**, bukan dari `analytics.html` secara langsung.
- Pastikan hanya ada satu pemanggilan `teco-analytics-addon.js`.
- Ubah query cache menjadi `v=1.2.3`.
- Lakukan `Ctrl + F5` atau hapus cache PWA/browser.
