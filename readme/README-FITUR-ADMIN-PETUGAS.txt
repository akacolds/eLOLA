eLOLA - Dashboard Admin, Monitoring ASN, dan Riwayat Aktivitas

FITUR YANG DITAMBAHKAN
- Monitoring kepatuhan ASN untuk periode bulan yang dipilih; target mengikuti Utils.KUOTA_ASN (default 2 kg).
- Status ASN: memenuhi target (>=2 kg), belum mencapai target (>0 dan <2 kg), dan belum menyetor (0 kg setoran disetujui).
- Rekap setoran ASN, pencarian, filter status, serta ekspor CSV per periode.
- Grafik tren total berat setoran disetujui selama 6 bulan.
- Direktori pengguna yang dapat dicari dan difilter berdasarkan peran.
- Ringkasan katalog hadiah, stok, dan jumlah transaksi penukaran poin.
- Riwayat aktivitas di dashboard admin.
- Riwayat aktivitas petugas di halaman verifikasi, termasuk persetujuan/penolakan setoran.
- Tetap menggunakan tabel dan koneksi Supabase yang sudah ada; konfigurasi RT/RW tidak diubah.

LANGKAH WAJIB UNTUK RIWAYAT AKTIVITAS
1. Buka Supabase Dashboard > SQL Editor.
2. Buka file setup-activity-log.sql pada folder eLOLA.
3. Salin seluruh isi file ke SQL Editor lalu jalankan.
4. Pastikan tabel profiles memiliki kolom id dan peran dengan nilai 'admin'/'petugas' yang sesuai.
5. Deploy folder eLOLA ke Vercel.

CATATAN
- Aktivitas baru dapat direkam setelah SQL dijalankan. Jika belum, bagian riwayat menampilkan petunjuk/error dan fitur verifikasi setoran tetap dapat berjalan.
- Riwayat mencatat pembukaan dashboard admin, ekspor rekap ASN, serta aksi persetujuan/penolakan setoran petugas.
- Target 2 kg tetap dikonfigurasi di js/utils.js melalui KUOTA_ASN.
- Direktori pengguna dan katalog hadiah pada dashboard adalah ringkasan baca-saja; fitur autentikasi, verifikasi, dompet, penukaran, dan halaman lain tetap memakai implementasi yang ada.
- Pastikan RLS profiles, setoran, hadiah, dan penukaran mengizinkan admin membaca data yang diperlukan.
- Data statistik bergantung pada skema dan izin Supabase aktual, jadi uji setelah deploy.
