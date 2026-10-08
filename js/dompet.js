import { protectPage, setupLogoutButton } from './auth-guard.js';
import { db } from './firebase-config.js';
import { 
  doc, onSnapshot, collection, query, where, orderBy, getDocs,
  runTransaction, serverTimestamp, increment 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { formatRupiah, formatTanggal, showToast } from './utils.js';

let currentUser = null;
let currentBalance = 0;

protectPage(['warga']).then(({ user }) => {
  currentUser = user;
  setupLogoutButton();
  listenUserBalance();
  loadRewards();
  setupRiwayatListener('semua');
});

function listenUserBalance() {
  onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
    if (!docSnap.exists()) return;
    const d = docSnap.data();
    currentBalance = d.saldoPoin || 0;
    document.getElementById('saldoPoin').innerText = currentBalance.toLocaleString();
    document.getElementById('nilaiRupiah').innerText = formatRupiah(currentBalance * 10);
  });
}

async function loadRewards() {
  const container = document.getElementById('rewardList');
  const snap = await getDocs(query(collection(db, "poin_reward"), where("aktif", "==", true)));
  container.innerHTML = '';
  snap.forEach((docSnap) => {
    const r = docSnap.data();
    const id = docSnap.id;
    const box = document.createElement('div');
    box.className = 'card';
    box.innerHTML = `
      <strong>${r.nama}</strong>
      <p style="color:var(--primary); font-weight:700;">${r.hargaPoin} Poin</p>
      <p style="font-size:11px; color:var(--muted);">Stok: ${r.stok}</p>
      <button style="margin-top:8px;" id="btnTukar_${id}">Tukar</button>
    `;
    container.appendChild(box);

    box.querySelector(`#btnTukar_${id}`).addEventListener('click', () => tukarPoin(id, r));
  });
}

async function tukarPoin(rewardId, reward) {
  if (currentBalance < reward.hargaPoin) return showToast("Saldo poin tidak cukup!", "error");
  if (!confirm(`Konfirmasi penukaran ${reward.nama} seharga ${reward.hargaPoin} poin?`)) return;

  try {
    await runTransaction(db, async (t) => {
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await t.get(userRef);
      if (userSnap.data().saldoPoin < reward.hargaPoin) throw new Error("Saldo tidak mencukupi saat proses.");

      const rewardRef = doc(db, "poin_reward", rewardId);
      const rewardSnap = await t.get(rewardRef);
      if (rewardSnap.data().stok <= 0) throw new Error("Stok hadiah habis!");

      // 1. Kurangi saldo
      t.update(userRef, { saldoPoin: increment(-reward.hargaPoin) });
      // 2. Kurangi stok hadiah
      t.update(rewardRef, { stok: increment(-1) });
      // 3. Catat riwayat_poin jenis keluar
      const rRef = doc(collection(db, "riwayat_poin"));
      t.set(rRef, {
        uid: currentUser.uid,
        jenis: 'keluar',
        jumlah: reward.hargaPoin,
        sumber: 'penukaran',
        refId: rewardId,
        waktu: serverTimestamp()
      });
      // 4. Catat penukaran_poin
      const pRef = doc(collection(db, "penukaran_poin"));
      t.set(pRef, {
        uid: currentUser.uid,
        rewardId: rewardId,
        rewardNama: reward.nama,
        poin: reward.hargaPoin,
        status: 'diajukan',
        waktu: serverTimestamp()
      });
    });
    showToast("Penukaran berhasil diajukan!", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

let unsubscribeRiwayat = null;
function setupRiwayatListener(filter) {
  if (unsubscribeRiwayat) unsubscribeRiwayat();

  let q = query(
    collection(db, "riwayat_poin"),
    where("uid", "==", currentUser.uid),
    orderBy("waktu", "desc")
  );
  if (filter !== 'semua') {
    q = query(
      collection(db, "riwayat_poin"),
      where("uid", "==", currentUser.uid),
      where("jenis", "==", filter),
      orderBy("waktu", "desc")
    );
  }

  unsubscribeRiwayat = onSnapshot(q, (snapshot) => {
    const list = document.getElementById('riwayatList');
    if (snapshot.empty) {
      list.innerHTML = '<p style="color:var(--muted)">Belum ada riwayat poin.</p>';
      return;
    }
    list.innerHTML = snapshot.docs.map(d => {
      const item = d.data();
      const isMasuk = item.jenis === 'masuk';
      return `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong>${item.sumber.toUpperCase()}</strong>
            <p style="font-size:11px; color:var(--muted);">${formatTanggal(item.waktu)}</p>
          </div>
          <div style="font-weight:700; color:${isMasuk ? 'var(--primary)' : 'var(--danger)'}">
            ${isMasuk ? '+' : '-'}${item.jumlah} Poin
          </div>
        </div>
      `;
    }).join('');
  });
}

document.getElementById('filterRiwayat').addEventListener('change', (e) => {
  setupRiwayatListener(e.target.value);
});