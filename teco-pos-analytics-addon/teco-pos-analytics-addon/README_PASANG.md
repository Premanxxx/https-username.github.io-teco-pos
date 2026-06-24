# Te.Co POS — Analytics Add-on v1.0.0

Modul ini menambahkan fitur berikut tanpa menghapus fungsi lama aplikasi:

- Pesan WhatsApp berisi **total transaksi, total cup, dan akumulasi setiap varian**.
- Rekap **harian dan bulanan**.
- Ekspor Excel dengan sheet:
  - Ringkasan Harian/Bulanan
  - Varian Harian/Bulanan
  - Bahan Harian/Bulanan
  - Transaksi Harian/Bulanan
  - Mapping Produk
  - Master Resep
- Analisis bahan terpakai berdasarkan resep dan jumlah cup terjual.
- Mapping otomatis dan manual antara nama menu pada transaksi dengan resep.
- Perhitungan kebutuhan konsentrat serta bahan baku pembentuk konsentrat.

## File yang dipakai

- `teco-analytics-addon.js` — modul utama.
- `analytics.html` — halaman laporan cadangan/mandiri.
- `resep-teco.json` — salinan resep yang sudah dirapikan.
- `pasang_addon.py` — pemasang otomatis untuk komputer/Codespaces.

## Cara pasang melalui GitHub Web

1. Buka repositori `Premanxxx/https-username.github.io-teco-pos`.
2. Pilih **Add file → Upload files**.
3. Unggah `teco-analytics-addon.js` dan `analytics.html` ke folder utama repositori.
4. Buka file `index.html`, tekan ikon pensil **Edit this file**.
5. Tepat sebelum tag `</body>`, tambahkan:

```html
<script src="./teco-analytics-addon.js?v=1.0.0"></script>
```

6. Tekan **Commit changes**.
7. Setelah GitHub Pages memperbarui situs, lakukan hard refresh (`Ctrl + F5`).

Tombol **Analisis Penjualan** akan muncul di kanan bawah. Tombol lama **Export Excel**, **Export Bulanan**, **Kirim WA Owner**, dan **Kirim Laporan ke Owner** juga diarahkan ke laporan baru.

## Cara pasang otomatis

Letakkan file berikut pada folder yang sama dengan `index.html`:

- `teco-analytics-addon.js`
- `analytics.html`
- `pasang_addon.py`

Kemudian jalankan:

```bash
python pasang_addon.py index.html
```

Program membuat backup `index.html.backup-sebelum-analytics` sebelum melakukan perubahan.

## Pengaturan awal

Masuk sebagai Admin, buka **Analisis Penjualan → Pengaturan**, lalu periksa:

1. Nomor WhatsApp owner. Gunakan format `628xxxxxxxxxx`.
2. Hasil satu batch konsentrat. Nilai awal `1000 ml` karena file resep tidak mencantumkan hasil akhir batch.
3. URL Firebase. Nilai awal sudah mengarah ke database aplikasi.
4. Mapping resep. Buka tab **Mapping Resep** untuk produk yang belum dikenali otomatis.

## Catatan resep

- `Fruktosaa` dirapikan menjadi `Fruktosa`.
- `Gula Arenn` dirapikan menjadi `Gula Aren`.
- `Cup + Tutup` dihitung otomatis satu set untuk setiap cup terjual, termasuk `KOPI MILO` yang tidak mencantumkan kemasan pada file sumber.
- Bahan `Konsentrat` dapat diuraikan menjadi Kental Manis, Krimer, Sirup Vanilla, Robusta, dan Air berdasarkan hasil batch yang ditetapkan.

## Jika data belum muncul

- Pastikan aplikasi dan `analytics.html` dibuka dari domain GitHub Pages yang sama.
- Pastikan Firebase mengizinkan pembacaan data oleh aplikasi.
- Tekan **Muat Ulang** pada panel laporan.
- Periksa tab **Mapping Resep** jika bahan belum terhitung.
