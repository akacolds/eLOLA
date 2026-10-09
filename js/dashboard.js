import { sb } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const elTotalKg = document.getElementById('adminTotalKg');
  const elKepatuhanAsn = document.getElementById('adminKepatuhanAsn');
  const elTotalPoin = document.getElementById('adminTotalPoin');
  const elTotalUsers = document.getElementById('adminTotalUsers');
  const tableBody = document.getElementById('tableAdminBody');

  // 1. Cek sesi login
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) {
    window.location.href = '../index.html';
    return;
  }

  // 2. Ambil dan render data dashboard kota
  async function muatDashboardAdmin() {
    try {
      // Ambil seluruh data pengguna
      const { data: users, error: errUsers } = await sb
        .from('users')
        .select('*');

      if (errUsers) throw errUsers;

      // Ambil seluruh riwayat setoran
      const { data: setoranList, error: errSetoran } = await sb
        .from('transaksi_setoran')
        .select('*')
        .order('created_at', { ascending: false });

      if (errSetoran) throw errSetoran;

      // Pemetaan user berdasarkan ID agar tidak bergantung join database
      const userMap = {};
      (users || []).forEach(u => {
        userMap[u.id] = u;
      });

      // --- HITUNG STATISTIK KOTA ---
      // Total sampah dari seluruh setoran yang disetujui
      const totalKgKota = (setoranList || [])
        .filter(s => ['disetujui', 'approved', 'selesai'].includes((s.status || '').toLowerCase()))
        .reduce((sum, s) => sum + (Number(s.berat_kg) || 0), 0);

      // Kepatuhan ASN (Target wajib 2.0 kg/bulan)
      const listAsn = (users || []).filter(u => u.is_asn || u.peran === 'asn');
      const asnPatuh = listAsn.filter(u => Number(u.total_kg || 0) >= 2.0);
      const persentaseAsn = listAsn.length > 0 
        ? Math.round((asnPatuh.length / listAsn.length) * 100) 
        : 0;

      // Total saldo poin yang beredar di masyarakat
      const totalPoinBeredar = (users || []).reduce((sum, u) => sum + (Number(u.saldo_poin) || 0), 0);

      // Total seluruh akun terdaftar
      const totalPengguna = (users || []).length;

      // Tampilkan ke ringkasan widget
      if (elTotalKg) elTotalKg.textContent = `${totalKgKota.toFixed(1)} kg`;
      if (elKepatuhanAsn) elKepatuhanAsn.textContent = `${persentaseAsn}%`;
      if (elTotalPoin) elTotalPoin.textContent = totalPoinBeredar.toLocaleString('id-ID');
      if (elTotalUsers) elTotalUsers.textContent = totalPengguna.toLocaleString('id-ID');

      // --- RENDER TABEL TRANSAKSI KOTA ---
      if (!tableBody) return;

      if (!setoranList || setoranList.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; color: #94a3b8; padding: 28px 14px;">
              Belum ada aktivitas setoran sampah yang tercatat.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = setoranList.map(item => {
        const profil = userMap[item.user_id] || {};
        const namaUser = profil.nama || 'Warga';
        const peranUser = (profil.peran || 'warga').toUpperCase();

        const tgl = item.created_at
          ? new Date(item.created_at).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            })
          : '-';

        const kategori = (item.kategori || 'plastik').replace(/-/g, ' ').toUpperCase();
        const berat = Number(item.berat_kg || 0).toFixed(1);
        const poin = item.poin_diterima ?? item.estimasi_poin ?? 0;

        let badgeClass = 'badge-pending';
        let statusLabel = 'Menunggu';
        const st = (item.status || '').toLowerCase();

        if (st === 'disetujui' || st === 'approved' || st === 'selesai') {
          badgeClass = 'badge-approved';
          statusLabel = 'Disetujui';
        } else if (st === 'ditolak' || st === 'rejected') {
          badgeClass = 'badge-rejected';
          statusLabel = 'Ditolak';
        }

        return `
          <tr>
            <td style="color: #64748b; font-size: 0.85rem;">${tgl}</td>
            <td>
              <div style="font-weight: 700; color: #0f172a;">${namaUser}</div>
              <div style="font-size: 0.75rem; color: #64748b;">${profil.rt || 'RT -'} • ${profil.kelurahan || 'Lalolara'}</div>
            </td>
            <td>
              <span class="badge" style="background: #f1f5f9; color: #334155;">${peranUser}</span>
            </td>
            <td style="font-weight: 600;">${kategori}</td>
            <td>${berat} kg</td>
            <td style="font-weight: 700; color: #15803d;">+${poin}</td>
            <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      console.error('Gagal memuat dashboard admin:', err);
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; color: #dc2626; padding: 24px;">
              Gagal memuat rekapan: ${err.message}
            </td>
          </tr>
        `;
      }
    }
  }

  // 3. Supabase Realtime Listener
  sb.channel('realtime-dashboard-admin')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transaksi_setoran' },
      () => muatDashboardAdmin()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      () => muatDashboardAdmin()
    )
    .subscribe();

  // Muat data awal
  muatDashboardAdmin();
});
