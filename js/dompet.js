import { sb } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const elSaldoPoin = document.getElementById('valSaldoPoin');
  const elSaldoRupiah = document.getElementById('valSaldoRupiah');
  const elTotalKg = document.getElementById('valTotalKg');
  const tableBody = document.getElementById('tableRiwayatBody');

  // Tombol Penukaran
  const btnListrik = document.getElementById('btnTukarListrik');
  const btnPulsa = document.getElementById('btnTukarPulsa');
  const btnEwallet = document.getElementById('btnTukarEwallet');

  // 1. Cek sesi login aktif
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) {
    window.location.href = '../index.html';
    return;
  }

  const userId = session.user.id;

  // 2. Fungsi Ambil Data Saldo & Profil Pengguna
  async function muatSaldoDompet() {
    try {
      const { data: user, error } = await sb
        .from('users')
        .select('saldo_poin, total_kg')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      const poin = user?.saldo_poin || 0;
      const kg = Number(user?.total_kg || 0);
      const rupiah = poin * 10; // 1 Poin = Rp10

      if (elSaldoPoin) elSaldoPoin.textContent = `${poin.toLocaleString('id-ID')} Poin`;
      if (elSaldoRupiah) elSaldoRupiah.textContent = `Rp${rupiah.toLocaleString('id-ID')}`;
      if (elTotalKg) elTotalKg.textContent = `${kg.toFixed(1)} kg`;
    } catch (err) {
      console.error('Gagal mengambil data saldo:', err);
    }
  }

  // 3. Fungsi Ambil Riwayat Setoran Pengguna
  async function muatRiwayatSetoran() {
    try {
      const { data: setoranList, error } = await sb
        .from('transaksi_setoran')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!tableBody) return;

      if (!setoranList || setoranList.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: #94a3b8; padding: 28px 16px;">
              Belum ada riwayat setoran sampah. Ayo mulai pilah dan setor!
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = setoranList.map((item) => {
        // Format Tanggal
        const tgl = item.created_at
          ? new Date(item.created_at).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : '-';

        // Badge Status
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

        const poinDidapat = item.poin_diterima ?? item.estimasi_poin ?? 0;
        const berat = Number(item.berat_kg || 0).toFixed(1);
        const kategori = (item.kategori || 'Sampah Anorganik').replace(/-/g, ' ').toUpperCase();

        return `
          <tr>
            <td style="color: #64748b; font-size: 0.85rem;">${tgl}</td>
            <td style="font-weight: 600;">${kategori}</td>
            <td>${berat} kg</td>
            <td style="font-weight: 700; color: #15803d;">+${poinDidapat} Poin</td>
            <td><span class="badge ${badgeClass}">${statusLabel}</span></td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      console.error('Gagal mengambil data riwayat:', err);
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: #dc2626; padding: 24px;">
              Gagal memuat riwayat: ${err.message}
            </td>
          </tr>
        `;
      }
    }
  }

  // 4. Interaksi Tombol Penukaran Poin
  function aksiTukar(reward) {
    alert(`Fitur penukaran ${reward} sedang diproses. Petugas unit akan mengonfirmasi penukaran saldo Anda.`);
  }

  btnListrik?.addEventListener('click', () => aksiTukar('Token Listrik PLN'));
  btnPulsa?.addEventListener('click', () => aksiTukar('Pulsa / Paket Data'));
  btnEwallet?.addEventListener('click', () => aksiTukar('Saldo E-Wallet'));

  // 5. Listener Realtime (Otomatis update jika admin/petugas memverifikasi)
  sb.channel('realtime-dompet-warga')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
      () => muatSaldoDompet()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transaksi_setoran', filter: `user_id=eq.${userId}` },
      () => {
        muatSaldoDompet();
        muatRiwayatSetoran();
      }
    )
    .subscribe();

  // Eksekusi awal
  await muatSaldoDompet();
  await muatRiwayatSetoran();
});
