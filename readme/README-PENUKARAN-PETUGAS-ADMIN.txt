eLOLA - alur penukaran poin

Yang berubah:
- Warga/ASN menekan Tukar di dompet. Transaksi disimpan sebagai status menunggu.
- Poin menunggu dan disetujui mengurangi saldo yang tersedia; penukaran ditolak tidak mengurangi saldo.
- Stok hadiah baru dikurangi saat petugas menyetujui penukaran.
- Petugas dapat menyetujui/menolak permintaan dari bagian Antrean Penukaran Poin.
- Dashboard admin menampilkan riwayat semua permintaan, status, petugas, dan catatan.

Pemasangan:
1. Backup project/database.
2. Supabase SQL Editor: jalankan SETUP-PENUKARAN-PETUGAS-ADMIN.sql.
3. Deploy isi folder eLOLA-main ke GitHub/Vercel.
4. Uji akun warga/ASN mengirim penukaran, akun petugas memprosesnya, dan admin melihat riwayat.

Catatan:
- Migrasi menganggap transaksi lama yang belum punya status sebagai disetujui agar tidak masuk antrean baru.
- Browser memakai Supabase anon/publishable key dan RLS; jangan pernah menaruh service_role key di frontend.
- Pengurangan stok dan perubahan status merupakan dua operasi browser; untuk sistem produksi dengan banyak petugas serentak, sebaiknya dipindah ke fungsi database RPC transaksional agar stok tidak mengalami race condition.


PEMBARUAN: Catatan pemohon dan nomor HP/WhatsApp wajib diisi saat mengajukan penukaran. Petugas wajib mengisi catatan saat memproses penukaran maupun memverifikasi setoran. Jalankan ulang SETUP-PENUKARAN-PETUGAS-ADMIN.sql di Supabase setelah backup.
