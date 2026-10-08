import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const podiumEl = document.getElementById('podiumContainer');
const tableBody = document.getElementById('leaderboardBody');

onSnapshot(collection(db, "rekap_rt"), (snapshot) => {
  const items = [];
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    const kk = d.jumlahKK || 1;
    const skor = (d.totalPoin || 0) / kk;
    items.push({
      nama: `${d.kelurahan} (${d.rt})`.toUpperCase(),
      kg: (d.totalKg || 0).toFixed(1),
      poin: d.totalPoin || 0,
      skor: Math.round(skor)
    });
  });

  // Urutkan skor tertinggi ke terendah
  items.sort((a, b) => b.skor - a.skor);

  // Render Podium 3 Teratas
  if (items.length >= 3) {
    podiumEl.innerHTML = `
      <div class="podium-slot podium-2">
        <div style="font-size:18px;">🥈</div>
        <strong>${items[1].nama}</strong>
        <div>${items[1].skor} pt</div>
      </div>
      <div class="podium-slot podium-1">
        <div style="font-size:24px;">👑</div>
        <strong>${items[0].nama}</strong>
        <div>${items[0].skor} pt</div>
      </div>
      <div class="podium-slot podium-3">
        <div style="font-size:18px;">🥉</div>
        <strong>${items[2].nama}</strong>
        <div>${items[2].skor} pt</div>
      </div>
    `;
  } else {
    podiumEl.innerHTML = '';
  }

  // Render Tabel
  if (items.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4" style="color:var(--muted)">Belum ada data RT.</td></tr>';
    return;
  }

  tableBody.innerHTML = items.map((it, idx) => `
    <tr>
      <td><strong>#${idx + 1}</strong></td>
      <td>${it.nama}</td>
      <td>${it.kg} kg</td>
      <td><strong>${it.skor}</strong></td>
    </tr>
  `).join('');
});