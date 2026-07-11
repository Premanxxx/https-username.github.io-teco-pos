# Aktivasi Firebase Te.Co POS

Aplikasi sudah diarahkan ke project `teman-coffee-pandawa` dan path utama `teco_pos/teco-pandawa-main`.

1. Buka Firebase Console dan pilih project tersebut.
2. Di **Authentication > Sign-in method**, aktifkan **Anonymous**.
3. Di **Realtime Database > Rules**, salin isi `database.rules.json`, lalu Publish.
4. Buka POS sebagai Admin, masuk ke **Sinkronisasi**, lalu tekan **Sinkron Sekarang**.
5. Pastikan status menjadi `Online · tersinkron`. Gunakan **Backup Cloud** untuk snapshot manual.

## Lokasi data

- Data aktif: `teco_pos/teco-pandawa-main`
- Backup harian: `teco_pos_backups/teco-pandawa-main/daily/YYYY-MM-DD`
- Backup manual: `teco_pos_backups/teco-pandawa-main/manual/<timestamp>`

## Catatan keamanan

Rules contoh mewajibkan sesi Firebase Authentication. Anonymous Auth mencegah akses tanpa sesi, tetapi untuk keamanan produksi yang lebih kuat sebaiknya aktifkan Firebase App Check dan batasi akses melalui backend/custom claims. PIN kasir di aplikasi bukan pengganti autentikasi server.
