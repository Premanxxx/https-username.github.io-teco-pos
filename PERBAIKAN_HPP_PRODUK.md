# Perbaikan Fitur Analisa HPP Produk

Tanggal: 2026-07-15

## Fitur Baru

1. Panel admin baru: **Analisa HPP Produk**.
2. Fitur hanya dapat dibuka dan disimpan oleh akun admin.
3. Admin dapat memilih produk dan varian:
   - Dingin
   - Hangat
   - Tanpa varian
4. Setiap varian memiliki daftar bahan sendiri.
5. Setiap bahan memiliki input:
   - Nama bahan
   - Pemakaian per cup
   - Satuan
   - Harga per satuan
   - Estimasi total pemakaian sesuai cup terjual
   - Biaya bahan per cup
6. Item tetap per cup sudah disiapkan secara default:
   - Es Batu
   - Plastik Cup
   - Sedotan
7. Admin dapat menambahkan item bahan lain yang mengikat untuk setiap cup terjual.
8. Sistem menghitung otomatis:
   - Harga jual per cup
   - HPP per cup
   - Margin per cup
   - Persentase margin
   - Cup terjual sesuai tanggal analisa
   - Omzet produk periode
   - Total HPP periode
   - Estimasi margin periode
9. Data HPP tersimpan di `teco_pos_data` bersama data POS lain dan ikut tersinkron melalui Firebase pada `index.html`.
10. Data HPP dapat diekspor ke CSV.

## File yang Diubah

- `index.html`
- `index (2).html`
- `pos_app_pwa.html`

## Catatan Penggunaan

Masuk sebagai admin, buka menu Admin, lalu pilih **Analisa HPP Produk**. Isi harga bahan per satuan sesuai harga aktual pembelian, lalu simpan per produk dan varian.
