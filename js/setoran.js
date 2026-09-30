import { protectPage, setupLogoutButton } from './auth-guard.js';
import { db } from './firebase-config.js';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast, formatTanggal, compressImageToBase64 } from './utils.js';

let currentUser = null;
let userProfile = null;
let kategoriMap = {};

protectPage(['warga']).then(({ user, profile }) => {
  currentUser = user;
  userProfile = profile;
  document.getElementById('userName').innerText = profile.nama;
  document.getElementById('userUnit').innerText = `${profile.kelurahan.toUpperCase()} (${profile.rt}) · ${profile.unitBankSampah}`;
  setupLogoutButton();
  loadCategories();
  listenUserSetoran();
});

async function loadCategories() {
  const container = document.getElementById('categoryChips');
  const snap = await getDocs(query(collection(db, "kategori_sampah"), where("aktif", "==", true)));
  container.innerHTML = '';
  snap.forEach(docSnap => {
    const k = docSnap.data();
    kategoriMap[docSnap.id] = k;
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerText = `${k.nama} (${k.bobotPoinPerKg} pt/kg)`;
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      document.getElementById('selectedCategory').value = docSnap.id;
      document.getElementById('selectedWeight').value = k.bobotPoinPerKg;
      recalcEstimate();
    });
    container.appendChild(chip);
  });
}

function recalcEstimate() {
  const kg = parseFloat(document.getElementById('estimasiKg').value) || 0;
  const bobot = parseFloat(document.getElementById('selectedWeight').value) || 0;
  document.getElementById('estPoin').innerText = Math.round(kg * bobot);
}

document.getElementById('estimasiKg').addEventListener('input', recalcEstimate);

document.getElementById('formSetor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const katId = document.getElementById('selectedCategory').value;
  const kg = parseFloat(document.getElementById('estimasiKg').value);
  const file = document.getElementById('fotoInput').files[0];
  if (!katId) return showToast("Pilih salah satu kategori!", "error");
  if (!file) return showToast("Sertakan foto bukti sampah!", "error");

  const btn = document.getElementById('btnKirim');
  btn.disabled = true;
  btn.innerText = "Memproses...";

  try {
    const fotoBase64 = await compressImageToBase64(file);
    await addDoc(collection(db, "transaksi_setoran"), {
      uid: currentUser.uid,
      namaPenyetor: userProfile.nama,
      rt: userProfile.rt,
      kelurahan: userProfile.kelurahan,
      isASN: userProfile.isASN || false,
      unitBankSampah: userProfile.unitBankSampah,
      kategoriId: katId,
      kategoriNama: kategoriMap[katId]?.nama || katId,
      estimasiKg: kg,
      beratAktualKg: 0,
      fotoUrl: fotoBase64,
      status: 'menunggu',
      alasanTolak: '',
      poin: 0,
      petugasUid: null,
      dibuatPada: serverTimestamp(),
      diverifikasiPada: null
    });
    showToast("Setoran berhasil dikirim!", "success");
    document.getElementById('formSetor').reset();
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    document.getElementById('estPoin').innerText = '0';
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerText = "Kirim Antrean Setoran";
  }
});

function listenUserSetoran() {
  const q = query(
    collection(db, "transaksi_setoran"),
    where("uid", "==", currentUser.uid),
    orderBy("dibuatPada", "desc"),
    limit(5)
  );

  onSnapshot(q, (snapshot) => {
    const list = document.getElementById('listSetoran');
    if (snapshot.empty) {
      list.innerHTML = '<p style="color:var(--muted)">Belum ada setoran.</p>';
      return;
    }
    list.innerHTML = snapshot.docs.map(docSnap => {
      const d = docSnap.data();
      return `
        <div class="card">
          <div style="display:flex; justify-content:space-between;">
            <strong>${d.kategoriNama}</strong>
            <span class="badge badge-${d.status}">${d.status}</span>
          </div>
          <div style="font-size:12px; color:var(--muted); margin:4px 0;">
            ${formatTanggal(d.dibuatPada)} · Est: ${d.estimasiKg} kg
          </div>
          ${d.status === 'terverifikasi' ? `<div>✅ <strong>${d.beratAktualKg} kg</strong> diakui (+${d.poin} poin)</div>` : ''}
          ${d.status === 'ditolak' ? `<div style="color:var(--danger)">Alasan tolak: ${d.alasanTolak || '-'}</div>` : ''}
        </div>
      `;
    }).join('');
  });
}