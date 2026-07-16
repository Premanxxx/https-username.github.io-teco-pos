# Analisa HPP pada Laporan Rekap Cup & Bahan

Tanggal: 2026-07-16

## Ruang Lingkup

Analisa HPP kini dihitung langsung dari cup terjual pada periode laporan dan resep HPP yang disimpan Admin. Informasi keuntungan hanya tersedia untuk sesi pengguna dengan peran Admin.

## Informasi yang Ditampilkan

- Omzet produk yang menjadi dasar analisa HPP.
- Total HPP untuk seluruh cup dengan resep yang cocok.
- Estimasi laba kotor dan persentase margin kotor.
- Estimasi laba setelah dikurangi pengeluaran periode.
- Rata-rata HPP per cup.
- Persentase cakupan cup yang sudah mempunyai resep HPP.
- HPP per cup, total HPP, laba, dan margin per produk/varian.
- Rekap biaya setiap bahan berdasarkan jumlah cup terjual.
- Daftar produk yang belum mempunyai resep HPP.
- Daftar resep dengan harga bahan yang belum lengkap.

## Aturan Akses

- Admin: melihat analisa pada layar, WhatsApp, dan Excel.
- Kasir: tidak menerima objek analisa keuntungan dan tidak melihat kolom/sheet HPP.

## Sinkronisasi

`hppData` menjadi bagian data utama `teco_pos_data`. Saat data lokal dan cloud digabung:

1. Resep dengan `updatedAt` paling baru dipertahankan.
2. Resep berbeda dari perangkat lain tetap digabung.
3. Penghapusan resep disimpan di `deletedRecipes`.
4. Tombstone yang lebih baru daripada resep akan menghapus resep lama saat merge.

## File Utama yang Diubah

- `index.html`
- `index (2).html`
- `pos_app_pwa.html`
- `teco-native-main-core.js`
- `teco-native-main-style.css`
- `teco-reliability-v3.js`
- `server.js`
