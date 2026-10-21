eLOLA - Dashboard Kepatuhan ASN

Fitur tambahan:
- Tingkat kepatuhan ASN bulan berjalan (target 2 kg).
- Kategori memenuhi target, setoran 0-<2 kg, dan belum menyetor.
- Rekap per ASN, pencarian, filter status, dan ekspor CSV.
- Statistik setoran dan aktivitas diambil dari Supabase.

Catatan teknis:
1. Identitas ASN dihitung dari profiles.peran = 'asn' (atau profiles.is_asn = true jika kolom itu tersedia).
2. Berat hanya menjumlahkan setoran berstatus 'disetujui' pada bulan berjalan. Setoran menunggu/ditolak tidak dihitung.
3. Agar statistik tampil, sesi admin harus punya izin SELECT yang sesuai pada tabel profiles dan setoran lewat RLS.
4. Jika proyek menggunakan tabel users untuk identitas ASN, bukan profiles, sesuaikan sumber profil di SupabaseDB.getProfiles() dengan skema aktual.
5. Ambang 2 kg memakai Utils.KUOTA_ASN (default 2.0).
6. RT/RW tidak diubah.
