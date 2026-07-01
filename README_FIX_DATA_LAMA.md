# Perbaikan Te.Co Pandawa POS v2.1.0

## Penyebab perubahan lama tidak muncul

Repository memiliki dua file berbeda:

- `index.html` adalah file aktif yang dibuka GitHub Pages.
- `index.HTML` adalah file lain dan tidak menjadi halaman utama.

File aktif `index.html` belum memanggil `teco-analytics-addon.js`. Mengunggah file Python saja juga tidak menjalankan patch. Karena itu nama Sakala, analisis, dan sinkronisasi belum berubah.

## Perbaikan dalam paket

- Mengubah tampilan dan data baru dari `Sakata` menjadi `Sakala`.
- Transaksi lama bernama `Sakata` tetap digabung sebagai `Sakala`.
- Menambahkan `teco-live-data-bridge.js`.
- Bridge memeriksa data lama satu kali saat aplikasi mulai.
- Analisis selanjutnya membaca data dari memori.
- Modal analisis tidak lagi menampilkan proses loading localStorage atau Firebase.
- Memastikan `index.html` memanggil bridge dan analytics add-on.
- Membuat backup file sebelum perubahan.

## Cara termudah melalui GitHub Actions

1. Ekstrak ZIP.
2. Upload file berikut ke root repository:
   - `apply_teco_v2_sakala_recovery.py`
   - `teco-live-data-bridge.js`
   - folder `.github/workflows/apply-teco-fix.yml`
3. Commit upload.
4. Buka tab `Actions` di repository.
5. Pilih `Apply Te.Co Sakala Recovery Fix`.
6. Klik `Run workflow`.
7. Setelah workflow selesai, buka GitHub Pages dan tekan `Ctrl + F5`.

## Cara melalui terminal

Letakkan file berikut di root repository:

- `apply_teco_v2_sakala_recovery.py`
- `teco-live-data-bridge.js`

Jalankan:

```bash
python apply_teco_v2_sakala_recovery.py
```

Lalu commit:

```bash
git add index.html teco-analytics-addon.js teco-live-data-bridge.js resep-teco.json analytics.html pos_app_pwa.html
git commit -m "Fix Sakala analytics and recover legacy data"
git push origin main
```

## Pemeriksaan setelah deploy

1. Footer menampilkan `v2.1.0 Sakala`.
2. `Sakata` tidak terlihat pada menu.
3. Buka analisis. Tidak ada teks loading local/Firebase.
4. Transaksi lama Sakata masuk ke Sakala.
5. Analisis bahan memakai resep Sakala.
6. Buka Console browser dan jalankan:

```js
TecoDataBridge.getSnapshot()
```

Untuk mengunduh backup hasil pemulihan:

```js
TecoDataBridge.downloadBackup()
```

## Batas pemulihan data lama

Data lama bisa dipulihkan ketika masih tersimpan pada salah satu sumber berikut:

- localStorage pada browser/perangkat lama yang sama.
- Firebase Realtime Database lama.
- file backup atau hasil export sebelumnya.

Data tidak dapat dipulihkan dari kode website jika data sudah dihapus dari browser dan tidak pernah tersimpan di Firebase atau file backup.
