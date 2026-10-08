import { protectPage, setupLogoutButton } from './auth-guard.js';
import { db } from './firebase-config.js';
import { 
  collection, query, where, orderBy, onSnapshot, getDocs,
  doc, runTransaction, serverTimestamp, increment 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast, formatTanggal, getBulanKey } from './utils.js';

let currentPetugas = null;
let petugasProfile = null;
let kategoriBobot = {};

protectPage(['petugas', 'admin']).then(async ({ user, profile }) => {
  currentPetugas = user;
  petugasProfile = profile;
  document.getElementById('petugasName').innerText = profile.nama;
  document.getElementById('petugasUnit').innerText = profile.unitBankSampah || 'Unit Pusat';
  setupLogoutButton();
  await loadCategories();
  listenAntrean();
});

async function loadCategories() {
  const snap = await getDocs(collection(db, "kategori_sampah"));
  snap.forEach(d => { kategoriBobot[d.id] = d.data().bobotPoinPerKg; });
}

function listenAntrean() {
  // Query status == 'menunggu'
  const q = query(
    collection(db, "transaksi_setoran"),
    where("status", "==", "menunggu"),
    orderBy("dibuatPada", "asc")
  );

  onSnapshot(q, (snapshot) => {
    const container = document.getElementById('antreanList');
    if (snapshot.empty) {
      container.innerHTML = '<p style="color:var(--muted)">Tidak ada antrean pending saat ini.</p>';
      return;
    }

    container.innerHTML = '';
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;
      const bobot = kategoriBobot[data.kategoriId] || 10;

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between;">
          <strong>${data.namaPenyetor} (${data.rt})</strong>
          <span class="badge ${data.isASN ? 'badge-terverifikasi' : 'badge-menunggu'}">
            ${data.isASN ? 'ASN' : 'Warga'}
          </span>
        </div>
        <p style="color:var(--muted); font-size:12px;">Waktu: ${formatTanggal(data.dibuatPada)}</p>
        <p>Kategori: <strong>${data.kategoriNama || data.kategoriId}</strong> · Estimasi: ${data.estimasiKg} kg</p>
        
        ${data.fotoUrl ? `<img src="${data.fotoUrl}" style="max-width:100%; border-radius:6px; margin:8px 0; max-height:220px; object-fit:cover;">` : ''}

        <div style="background:#f8fafc; padding:10px; border-radius:6px; margin-top:8px;">
          <label>Berat Aktual Timbangan (kg)</label>
          <input type="number" step="0.1" min="0.1" value="${data.estimasiKg}" id="berat_${id}">
          <p style="margin-top:6px;">Poin Terhitung: <strong id="poinCalc_${id}">${Math.round(data.estimasiKg * bobot)}</strong> poin</p>
        </div>

        <div style="display:flex; gap:8px; margin-top:12px;">
          <button class="btn-confirm" id="btnOk_${id}">Konfirmasi (5-Step Transaction)</button>
          <button class="btn-danger" style="width:30%;" id="btnReject_${id}">Tolak</button>
        </div>
      `;

      container.appendChild(card);

      const inputBerat = card.querySelector(`#berat_${id}`);
      const textPoin = card.querySelector(`#poinCalc_${id}`);
      inputBerat.addEventListener('input', () => {
        const b = parseFloat(inputBerat.value) || 0;
        textPoin.innerText = Math.round(b * bobot);
      });

      card.querySelector(`#btnOk_${id}`).addEventListener('click', () => {
        const finalKg = parseFloat(inputBerat.value);
        if (!finalKg || finalKg <= 0) return alert('Masukkan berat aktual yang valid!');
        const finalPoin = Math.round(finalKg * bobot);
        prosesVerifikasiAtomik(id, data, finalKg, finalPoin);
      });

      card.querySelector(`#btnReject_${id}`).addEventListener('click', () => {
        const alasan = prompt('Masukkan alasan penolakan setoran:');
        if (alasan) tolakSetoran(id, alasan);
      });
    });
  });
}

// 5 PERUBAHAN DALAM SATU TRANSAKSI ATOMIK
async function prosesVerifikasiAtomik(transaksiId, data, beratAktual, poin) {
  try {
    await runTransaction(db, async (t) => {
      const transRef = doc(db, "transaksi_setoran", transaksiId);
      const transDoc = await t.get(transRef);
      if (!transDoc.exists() || transDoc.data().status !== 'menunggu') {
        throw new Error("Setoran sudah diproses oleh petugas lain!");
      }

      const userRef = doc(db, "users", data.uid);
      const userDoc = await t.get(userRef);

      const kelurahanRtKey = `${data.kelurahan || 'lalolara'}_${data.rt || 'RT01'}`.toLowerCase();
      const rekapRtRef = doc(db, "rekap_rt", kelurahanRtKey);
      const rekapRtDoc = await t.get(rekapRtRef);

      const bulanKey = getBulanKey();
      const rekapAsnRef = data.isASN ? doc(db, "rekap_kepatuhan_asn", `${bulanKey}_${data.uid}`) : null;
      let rekapAsnDoc = null;
      if (rekapAsnRef) rekapAsnDoc = await t.get(rekapAsnRef);

      // 1. Update transaksi_setoran
      t.update(transRef, {
        status: 'terverifikasi',
        beratAktualKg: beratAktual,
        poin: poin,
        petugasUid: currentPetugas.uid,
        diverifikasiPada: serverTimestamp()
      });

      // 2. Update users/{uid}
      if (userDoc.exists()) {
        t.update(userRef, {
          saldoPoin: increment(poin),
          totalKg: increment(beratAktual)
        });
      }

      // 3. Tambah riwayat_poin (masuk)
      const riwayatRef = doc(collection(db, "riwayat_poin"));
      t.set(riwayatRef, {
        uid: data.uid,
        jenis: 'masuk',
        jumlah: poin,
        sumber: 'setoran',
        refId: transaksiId,
        waktu: serverTimestamp()
      });

      // 4. Update rekap_rt
      if (!rekapRtDoc.exists()) {
        t.set(rekapRtRef, {
          kelurahan: data.kelurahan || 'lalolara',
          rt: data.rt || 'RT01',
          totalPoin: poin,
          totalKg: beratAktual,
          jumlahKK: 50 // default nilai awal jika belum di-set
        });
      } else {
        t.update(rekapRtRef, {
          totalPoin: increment(poin),
          totalKg: increment(beratAktual)
        });
      }

      // 5. Update rekap_kepatuhan_asn (jika penyetor adalah ASN)
      if (data.isASN && rekapAsnRef) {
        if (!rekapAsnDoc.exists()) {
          t.set(rekapAsnRef, {
            uid: data.uid,
            instansi: userDoc.data()?.instansi || 'DLH',
            bulan: bulanKey,
            totalKg: beratAktual,
            patuh: beratAktual >= 2.0
          });
        } else {
          const currentKg = (rekapAsnDoc.data().totalKg || 0) + beratAktual;
          t.update(rekapAsnRef, {
            totalKg: increment(beratAktual),
            patuh: currentKg >= 2.0
          });
        }
      }
    });

    showToast("Verifikasi berhasil! 5 data diperbarui.", "success");
  } catch (e) {
    showToast(`Gagal verifikasi: ${e.message}`, "error");
  }
}

async function tolakSetoran(transaksiId, alasan) {
  try {
    await runTransaction(db, async (t) => {
      const ref = doc(db, "transaksi_setoran", transaksiId);
      const snap = await t.get(ref);
      if (!snap.exists() || snap.data().status !== 'menunggu') throw new Error("Status setoran sudah berubah.");
      t.update(ref, {
        status: 'ditolak',
        alasanTolak: alasan,
        petugasUid: currentPetugas.uid,
        diverifikasiPada: serverTimestamp()
      });
    });
    showToast("Setoran berhasil ditolak.", "info");
  } catch (err) {
    showToast(err.message, "error");
  }
}