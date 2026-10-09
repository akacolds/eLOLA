import { sb } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('tablePeringkatBody');
  const podium1Nama = document.getElementById('podium1Nama');
  const podium1Kg = document.getElementById('podium1Kg');
  const podium2Nama = document.getElementById('podium2Nama');
  const podium2Kg = document.getElementById('podium2Kg');
  const podium3Nama = document.getElementById('podium3Nama');
  const podium3Kg = document.getElementById('podium3Kg');

  // 1. Fungsi Utama Mengambil dan Mengagregasi Data Peringkat RT
  async function muatPeringkat() {
    try {
      // Ambil data seluruh warga yang memiliki kontribusi setoran sampah
      const { data: users, error } = await sb
        .from('users')
        .select('rt, kelurahan, total_kg');

      if (error) throw error;

      if (!users || users.length === 0) {
        if (tableBody) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px;">
                Belum ada data setoran sampah.
              </td>
            </tr>`;
        }
        return;
      }

      // Agregasi / Rekapitulasi per Wilayah RT
      const rekap = {};
      users.forEach((item) => {
        const rt = item.rt || 'RT Belum Diatur';
        const kel = item.kelurahan || 'Kadia';
        const key = `${rt} - ${kel}`;

        if (!rekap[key]) {
          rekap[key] = {
            rt: rt,
            kelurahan: kel,
            totalKg: 0,
            partisipan: 0
          };
        }

        rekap[key].totalKg += Number(item.total_kg) || 0;
        rekap[key].partisipan += 1;
      });

      // Urutkan peringkat berdasarkan akumulasi kilogram sampah terbanyak
      const peringkatList = Object.values(rekap).sort((a, b) => b.totalKg - a.totalKg);

      // 2. Render Tampilan Podium 3 Besar
      renderPodium(peringkatList);

      // 3. Render Tabel Lengkap
      renderTabel(peringkatList);

    } catch (err) {
      console.error('Gagal memuat klasemen peringkat:', err);
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align: center; color: #dc2626; padding: 24px;">
              Gagal memuat peringkat: ${err.message}
            </td>
          </tr>`;
      }
    }
  }

  // Helper Render Podium
  function renderPodium(list) {
    // Juara 1
    if (podium1Nama && podium1Kg) {
      if (list[0]) {
        podium1Nama.textContent = `${list[0].rt} ${list[0].kelurahan}`;
        podium1Kg.textContent = `${list[0].totalKg.toFixed(1)} kg`;
      } else {
        podium1Nama.textContent = '-';
        podium1Kg.textContent = '0.0 kg';
      }
    }

    // Juara 2
    if (podium2Nama && podium2Kg) {
      if (list[1]) {
        podium2Nama.textContent = `${list[1].rt} ${list[1].kelurahan}`;
        podium2Kg.textContent = `${list[1].totalKg.toFixed(1)} kg`;
      } else {
        podium2Nama.textContent = '-';
        podium2Kg.textContent = '0.0 kg';
      }
    }

    // Juara 3
    if (podium3Nama && podium3Kg) {
      if (list[2]) {
        podium3Nama.textContent = `${list[2].rt} ${list[2].kelurahan}`;
        podium3Kg.textContent = `${list[2].totalKg.toFixed(1)} kg`;
      } else {
        podium3Nama.textContent = '-';
        podium3Kg.textContent = '0.0 kg';
      }
    }
  }

  // Helper Render Baris Tabel
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
          <td>${item.partisipan} Pengguna</td>
          <td style="text-align: right; font-weight: 800; color: #15803d;">
            ${item.totalKg.toFixed(1)} kg
          </td>
        </tr>
      `;
    }).join('');
  }

  // 4. Langganan Realtime Supabase (Listener Aktif)
  const channelPeringkat = sb
    .channel('realtime-peringkat')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'users' },
      () => {
        // Otomatis kalkulasi dan render ulang ketika data users berubah
        muatPeringkat();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Realtime listener peringkat aktif.');
      }
    });

  // Muat data awal saat halaman terbuka
  muatPeringkat();
});
