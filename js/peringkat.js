import { sb } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('tablePeringkatBody');
  const podium1Nama = document.getElementById('podium1Nama');
  const podium1Kg = document.getElementById('podium1Kg');
  const podium2Nama = document.getElementById('podium2Nama');
  const podium2Kg = document.getElementById('podium2Kg');
  const podium3Nama = document.getElementById('podium3Nama');
  const podium3Kg = document.getElementById('podium3Kg');

  // Ambil data langsung dari tabel peringkat_rt
  async function muatPeringkat() {
    try {
      const { data, error } = await sb
        .from('peringkat_rt')
        .select('*')
        .order('total_kg', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        if (tableBody) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px;">
                Belum ada data peringkat.
              </td>
            </tr>`;
        }
        return;
      }

      renderPodium(data);
      renderTabel(data);

    } catch (err) {
      console.error('Gagal mengambil data peringkat:', err);
    }
  }

  function renderPodium(list) {
    if (podium1Nama && podium1Kg) {
      podium1Nama.textContent = list[0] ? `${list[0].rt} ${list[0].kelurahan}` : '-';
      podium1Kg.textContent = list[0] ? `${Number(list[0].total_kg).toFixed(1)} kg` : '0.0 kg';
    }
    if (podium2Nama && podium2Kg) {
      podium2Nama.textContent = list[1] ? `${list[1].rt} ${list[1].kelurahan}` : '-';
      podium2Kg.textContent = list[1] ? `${Number(list[1].total_kg).toFixed(1)} kg` : '0.0 kg';
    }
    if (podium3Nama && podium3Kg) {
      podium3Nama.textContent = list[2] ? `${list[2].rt} ${list[2].kelurahan}` : '-';
      podium3Kg.textContent = list[2] ? `${Number(list[2].total_kg).toFixed(1)} kg` : '0.0 kg';
    }
  }

  function renderTabel(list) {
    if (!tableBody) return;

    tableBody.innerHTML = list.map((item, idx) => {
      const rank = idx + 1;
      let badgeClass = 'rank-other';
      if (rank === 1) badgeClass = 'rank-1';
      else if (rank === 2) badgeClass = 'rank-2';
      else if (rank === 3) badgeClass = 'rank-3';

      return `
        <tr>
          <td style="text-align: center;">
            <span class="rank-badge ${badgeClass}">${rank}</span>
          </td>
          <td style="font-weight: 700;">${item.rt}</td>
          <td>${item.kelurahan}</td>
          <td>${item.partisipan} Partisipan</td>
          <td style="text-align: right; font-weight: 800; color: #15803d;">
            ${Number(item.total_kg).toFixed(1)} kg
          </td>
        </tr>
      `;
    }).join('');
  }

  // Listener Realtime khusus tabel peringkat_rt
  sb.channel('realtime-peringkat-channel')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'peringkat_rt' },
      () => {
        muatPeringkat();
      }
    )
    .subscribe();

  muatPeringkat();
});
