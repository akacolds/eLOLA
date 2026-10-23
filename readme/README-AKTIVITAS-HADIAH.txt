eLOLA - Riwayat Aktivitas dan Pengelolaan Hadiah

FITUR
- Dashboard admin dapat menambah, mengedit, dan menghapus hadiah di tabel public.hadiah.
- Riwayat aktivitas mencatat admin membuka dashboard, ekspor rekap ASN, tambah/edit/hapus hadiah, serta petugas menyetujui/menolak setoran.
- Riwayat tersimpan di Supabase, bukan localStorage.

CARA PASANG
1. Commit/push folder proyek ini ke GitHub dan tunggu Vercel selesai deploy.
2. Di Supabase Dashboard > SQL Editor, jalankan setup-activity-log.sql.
3. Pastikan tabel public.profiles memiliki id yang sama dengan auth.users.id dan kolom peran bernilai 'admin' atau 'petugas'.
4. Pastikan tabel public.hadiah memiliki kolom id, nama, deskripsi, harga, dan stok. Kode dashboard menggunakan kolom-kolom tersebut.
5. Login sebagai admin dan uji tambah/edit hadiah. Jika ditolak, periksa pesan error dan struktur tabel.

CATATAN
- SQL ini menambahkan tabel activity_logs jika belum ada dan kebijakan admin untuk mengelola hadiah. Tidak menghapus data hadiah.
- Pembacaan riwayat hanya diberikan kepada admin. Admin dan petugas dapat menulis log miliknya sendiri.
- Bila tabel profiles tidak memiliki kolom peran atau format perannya berbeda, sesuaikan kebijakan sebelum dijalankan.
