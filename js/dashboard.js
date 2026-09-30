import { protectPage, setupLogoutButton } from './auth-guard.js';
import { db } from './firebase-config.js';
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getBulanKey } from './utils.js';

protectPage(['admin']).then(() => {
  setupLogoutButton();
  initDashboard();
});

function initDashboard() {
  const bulanKey = getBulanKey();

  // 1. Dengarkan rekap_rt untuk total volume, poin, dan grafik batang RT
  onSnapshot(collection(db, "rekap_rt"), (snap) => {
    let totKg = 0;
    let totPoin = 0;
    const rtData = [];

    snap.forEach(d => {
      const item = d.data();
      totKg += (item.totalKg || 0);
      totPoin += (item.totalPoin || 0);
      rtData.push({ label: `${item.kelurahan} ${item.rt}`.toUpperCase(), kg: item.totalKg || 0 });
    });

    document.getElementById('kpiVolumeKg').innerText = totKg.toFixed(1);
    document.getElementById('kpiPoin').innerText = totPoin.toLocaleString();

    // Gambar grafik batang horizontal dengan CSS murni
    const maxKg = Math.max(...rtData.map(r => r.kg), 1);
    document.getElementById('chartVolumeRt').innerHTML = rtData.map(r => `
      <div>
        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:2px;">
          <span>${r.label}</span>
          <span><strong>${r.kg.toFixed(1)} kg</strong></span>
        </div>
        <div style="background:#e2e8f0; height:12px; border-radius:6px; overflow:hidden;">
          <div style="background:var(--primary); width:${(r.kg / maxKg) * 100}%; height:100%;"></div>
        </div>
      </div>
    `).join('');
  });

  // 2. Dengarkan rekap_kepatuhan_asn bulan ini
  const qAsn = query(collection(db, "rekap_kepatuhan_asn"), where("bulan", "==", bulanKey));
  onSnapshot(qAsn, (snap) => {
    const instansiMap = {};
    let totalAsnAktif = 0;
    let totalPatuh = 0;

    snap.forEach(d => {
      const data = d.data();
      const instansi = data.instansi || 'Lainnya';
      if (!instansiMap[instansi]) instansiMap[instansi] = { total: 0, patuh: 0 };
      instansiMap[instansi].total += 1;
      totalAsnAktif += 1;
      if (data.patuh) {
        instansiMap[instansi].patuh += 1;
        totalPatuh += 1;
      }
    });

    document.getElementById('kpiTotalAsn').innerText = totalAsnAktif;
    const pct = totalAsnAktif > 0 ? ((totalPatuh / totalAsnAktif) * 100).toFixed(0) : 0;
    document.getElementById('kpiKepatuhan').innerText = `${pct}%`;

    const tbody = document.getElementById('asnTableBody');
    if (Object.keys(instansiMap).length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="color:var(--muted);">Belum ada setoran ASN bulan ini.</td></tr>';
      return;
    }

    tbody.innerHTML = Object.entries(instansiMap).map(([ins, val]) => {
      const p = ((val.patuh / val.total) * 100).toFixed(0);
      return `
        <tr>
          <td><strong>${ins}</strong></td>
          <td>${val.total}</td>
          <td>${val.patuh}</td>
          <td><span class="badge ${p >= 50 ? 'badge-terverifikasi' : 'badge-ditolak'}">${p}%</span></td>
        </tr>
      `;
    }).join('');
  });
}