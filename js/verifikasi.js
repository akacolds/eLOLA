import { sb } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('tableAntreanBody');
  const elTotalPending = document.getElementById('valTotalPending');
  const elTotalVerified = document.getElementById('valTotalVerified');
  const elTotalKg = document.getElementById('valTotalKgPetugas');
  const btnRefresh = document.getElementById('btnRefreshAntrean');

  const TARIF_POIN = {
    'plastik': 100,
    'kertas-karton': 80,
    'logam': 250,
    'kaca': 50
  };

  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) {
    window.location.href = '../index.html';
    return;
  }

  async function muatAntrean() {
    try {
      const { data: listSetoran, error } = await sb
        .from('transaksi_setoran')
        .select(`
          *,
          users:user_id (nama, peran, is_asn, saldo_poin, total_kg, rt, kelurahan)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const antreanPending = listSetoran.filter(s => (s.status || '').toLowerCase() === 'menunggu');
      const disetujuiHariIni = listSetoran.filter(s => {
        const isApproved = ['disetujui', 'approved', 'selesai'].includes((s.status || '').toLowerCase());
        const tglSetor = new Date(s.created_at).toDateString();
        const tglHariIni = new Date().toDateString();
        return isApproved && tglSetor === tglHariIni;
      });

      const totalKgHariIni = disetujuiHariIni.reduce((acc, curr) => acc + (Number(curr.berat_kg) || 0), 0);

      if (elTotalPending) elTotalPending.textContent = antreanPending.length;
      if (elTotalVerified) elTotalVerified.textContent = disetujuiHariIni.length;
      if (elTotalKg) elTotalKg.textContent = `${totalKgHariIni.toFixed(1)} kg`;

      if (!tableBody) return;

      if (antreanPending.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; color: #94a3b8; padding: 28px 14px;">
              🎉 Tidak ada antrean setoran yang menunggu verifikasi saat ini.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = antreanPending.map((item) => {
        const tgl = item.created_at
          ? new Date(item.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          : '-';

        const namaUser = item.users?.nama || 'Warga';
        const isAsn = item.users?.is_asn || item.users?.peran === 'asn';
        const tipeAkun = isAsn ? '🏛️ ASN Balai Kota' : '🏡 Warga Umum';
        const kategori = (item.kategori || 'plastik').replace(/-/g, ' ').toUpperCase();
        const estBerat = Number(item.berat_kg || 0).toFixed(1);

        const fotoBtn = item.foto_url 
          ? `<a href="${item.foto_url}" target="_blank" style="font-size: 0.75rem; color: #0284c7; text-decoration: underline; display: block; margin-top: 2px;">Lihat Foto</a>`
          : `<span style="font-size: 0.72rem; color: #94a3b8; display: block; margin-top: 2px;">Tanpa Foto</span>`;

        return `
          <tr data-id="${item.id}">
            <td style="color: #64748b; font-size: 0.85rem;">${tgl}</td>
            <td>
              <div style="font-weight: 700; color: #0f172a;">${namaUser}</div>
              <div style="font-size: 0.75rem; color: #64748b;">${item.users?.rt || '-'} / ${item.users?.kelurahan || '-'}</div>
            </td>
            <td><span class="badge" style="background: #f1f5f9; color: #334155;">${tipeAkun}</span></td>
            <td>
              <div style="font-weight: 600;">${kategori}</div>
              ${fotoBtn}
            </td>
            <td style="color: #64748b;">${estBerat} kg</td>
            <td>
              <input type="number" step="0.1" min="0.1" value="${estBerat}" 
                     class="input-berat-riil" 
                     id="inputBerat_${item.id}"
                     style="width: 80px; padding: 6px 8px; font-size: 0.85rem; border: 1px solid #cbd5e1; border-radius: 6px;">
            </td>
            <td style="white-space: nowrap;">
              <button type="button" class="btn-action btn-approve" data-id="${item.id}">Setujui</button>
              <button type="button" class="btn-action btn-reject" data-id="${item.id}">Tolak</button>
            </td>
          </tr>
        `;
      }).join('');

      pasangAksiTombol(antreanPending);

    } catch (err) {
      console.error('Gagal memuat antrean:', err);
    }
  }

  function pasangAksiTombol(dataList) {
    document.querySelectorAll('.btn-approve').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const item = dataList.find(d => d.id === id);
        if (!item) return;

        const inputEl = document.getElementById(`inputBerat_${id}`);
        const beratRiil = parseFloat(inputEl?.value) || Number(item.berat_kg);

        if (beratRiil <= 0) {
          alert('Masukkan angka timbangan yang valid.');
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Menyimpan...';

        try {
          const rate = TARIF_POIN[item.kategori] || 100;
          const poinFinal = Math.round(beratRiil * rate);

          // 1. Update status transaksi setoran
          const { error: trxErr } = await sb
            .from('transaksi_setoran')
            .update({
              status: 'disetujui',
              berat_kg: beratRiil,
              poin_diterima: poinFinal
            })
            .eq('id', id);

          if (trxErr) throw trxErr;

          // 2. Tambah saldo poin & akumulasi kg ke akun warga
          if (item.user_id && item.users) {
            const saldoBaru = (Number(item.users.saldo_poin) || 0) + poinFinal;
            const totalKgBaru = (Number(item.users.total_kg) || 0) + beratRiil;

            await sb
              .from('users')
              .update({
                saldo_poin: saldoBaru,
                total_kg: totalKgBaru
              })
              .eq('id', item.user_id);
          }

          // 3. UPDATE OTOMATIS KE TABEL PERINGKAT_RT
          const rtUser = item.users?.rt || 'RT 01';
          const kelUser = item.users?.kelurahan || 'Kadia';

          const { data: rtRow } = await sb
            .from('peringkat_rt')
            .select('*')
            .eq('rt', rtUser)
            .eq('kelurahan', kelUser)
            .maybeSingle();

          if (rtRow) {
            await sb
              .from('peringkat_rt')
              .update({
                total_kg: (Number(rtRow.total_kg) || 0) + beratRiil,
                updated_at: new Date()
              })
              .eq('id', rtRow.id);
          } else {
            await sb
              .from('peringkat_rt')
              .insert({
                rt: rtUser,
                kelurahan: kelUser,
                total_kg: beratRiil,
                partisipan: 1
              });
          }

        } catch (err) {
          alert(`Gagal menyetujui setoran: ${err.message}`);
          btn.disabled = false;
          btn.textContent = 'Setujui';
        }
      });
    });

    document.querySelectorAll('.btn-reject').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('Yakin ingin menolak setoran ini?')) return;

        btn.disabled = true;
        btn.textContent = 'Menolak...';

        try {
          const { error } = await sb
            .from('transaksi_setoran')
            .update({ status: 'ditolak' })
            .eq('id', id);

          if (error) throw error;
        } catch (err) {
          alert(`Gagal menolak setoran: ${err.message}`);
          btn.disabled = false;
          btn.textContent = 'Tolak';
        }
      });
    });
  }

  sb.channel('realtime-antrean-petugas')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transaksi_setoran' },
      () => muatAntrean()
    )
    .subscribe();

  btnRefresh?.addEventListener('click', muatAntrean);

  muatAntrean();
});
