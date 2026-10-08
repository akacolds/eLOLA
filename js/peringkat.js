import { sb } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const podiumName1 = document.getElementById('podiumName1');
  const podiumScore1 = document.getElementById('podiumScore1');
  const podiumName2 = document.getElementById('podiumName2');
  const podiumScore2 = document.getElementById('podiumScore2');
  const podiumName3 = document.getElementById('podiumName3');
  const podiumScore3 = document.getElementById('podiumScore3');
  const rankingTableBody = document.getElementById('rankingTableBody');

  async function muatPeringkat() {
    try {
      // 1. Ambil data master RT
      const { data: listRt, error: errRt } = await sb.from('rekap_rt').select('*');
      if (errRt) throw errRt;

      // 2. Ambil data pengguna warga/ASN untuk kalkulasi poin dan kg riil per RT
      const { data: listUser, error: errUser } = await sb.from('users').select('*');
      if (errUser) throw errUser;

      // 3. Petakan total poin dan total kg per RT
      // Key format: kelurahan_rt (contoh: kadia_rt 01)
      const dataMap = {};
      (listUser || []).forEach(u => {
        if (!u.kelurahan || !u.rt) return;
        const key = `${u.kelurahan.toLowerCase().trim()}_${u.rt.toLowerCase().trim()}`;
        if (!dataMap[key]) {
          dataMap[key] = { totalPoin: 0, totalKg: 0 };
        }
        dataMap[key].totalPoin += (Number(u.saldo_poin) || 0);
        dataMap[key].totalKg += (parseFloat(u.total_kg) || 0);
      });

      // 4. Hitung skor per RT = Total Poin / Jumlah KK
      const leaderboard = (listRt || []).map(rt => {
        const key = `${rt.kelurahan.toLowerCase().trim()}_${rt.rt.toLowerCase().trim()}`;
        const aggregate = dataMap[key] || { totalPoin: 0, totalKg: 0 };
        const kk = Number(rt.jumlah_kk) || 1;
        const skorPerKk = Math.round(aggregate.totalPoin / kk);

        return {
          id: rt.id,
          kelurahan: rt.kelurahan,
          rt: rt.rt,
          jumlahKk: kk,
          totalPoin: aggregate.totalPoin,
          totalKg: aggregate.totalKg,
          skor: skorPerKk
        };
      });

      // Urutkan dari skor tertinggi
      leaderboard.sort((a, b) => {
        if (b.skor !== a.skor) return b.skor - a.skor;
        return b.totalKg - a.totalKg;
      });

      // 5. Render Podium Top 3
      if (leaderboard.length >= 1) {
        if (podiumName1) podiumName1.textContent = `${leaderboard[0].rt} - ${leaderboard[0].kelurahan}`;
        if (podiumScore1) podiumScore1.textContent = `${leaderboard[0].skor.toLocaleString('id-ID')} pt/KK`;
      }
      if (leaderboard.length >= 2) {
        if (podiumName2) podiumName2.textContent = `${leaderboard[1].rt} - ${leaderboard[1].kelurahan}`;
        if (podiumScore2) podiumScore2.textContent = `${leaderboard[1].skor.toLocaleString('id-ID')} pt/KK`;
      }
      if (leaderboard.length >= 3) {
        if (podiumName3) podiumName3.textContent = `${leaderboard[2].rt} - ${leaderboard[2].kelurahan}`;
        if (podiumScore3) podiumScore3.textContent = `${leaderboard[2].skor.toLocaleString('id-ID')} pt/KK`;
      }

      // 6. Render Tabel Lengkap
      if (rankingTableBody) {
        if (leaderboard.length === 0) {
          rankingTableBody.innerHTML = '<tr><td colspan="4" class="text-center" style="color:var(--text-muted); padding:2rem;">Belum ada data wilayah RT.</td></tr>';
          return;
        }

        rankingTableBody.innerHTML = leaderboard.map((item, index) => {
          let rankBadge = `#${index + 1}`;
          if (index === 0) rankBadge = '🥇 #1';
          else if (index === 1) rankBadge = '🥈 #2';
          else if (index === 2) rankBadge = '🥉 #3';

          return `
            <tr>
              <td class="text-center font-bold" style="font-size:0.95rem;">${rankBadge}</td>
              <td>
                <strong>${item.rt}</strong> &bull; Kelurahan ${item.kelurahan}
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">
                  Populasi: ${item.jumlahKk} Kartu Keluarga (KK)
                </div>
              </td>
              <td class="text-right font-bold" style="color:var(--forest-900);">
                ${item.totalKg.toFixed(1)} kg
              </td>
              <td class="text-right font-bold score-highlight" style="font-size:1rem;">
                ${item.skor.toLocaleString('id-ID')} <span style="font-size:0.75rem; font-weight:normal; color:var(--text-muted);">pt/KK</span>
              </td>
            </tr>
          `;
        }).join('');
      }

    } catch (err) {
      console.error('Gagal memuat papan peringkat:', err);
      if (rankingTableBody) {
        rankingTableBody.innerHTML = `<tr><td colspan="4" class="text-center" style="color:var(--danger); padding:1.5rem;">Gagal memuat data: ${err.message}</td></tr>`;
      }
    }
  }

  muatPeringkat();

  // Dengarkan realtime changes jika channel didukung
  try {
    sb.channel('leaderboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => muatPeringkat())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_setoran' }, () => muatPeringkat())
      .subscribe();
  } catch (_) {}
});