import { db } from './firebase-config.js';
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function seedInitialData() {
  // 1. Kategori Sampah (Bobot: 10 / 20 / 35 poin/kg, 1 poin = Rp10)
  await setDoc(doc(db, "kategori_sampah", "organik"), {
    nama: "Sampah Organik",
    bobotPoinPerKg: 10,
    hargaJualPerKg: 1000,
    aktif: true
  });
  await setDoc(doc(db, "kategori_sampah", "anorganik"), {
    nama: "Sampah Anorganik (Plastik/Kertas)",
    bobotPoinPerKg: 20,
    hargaJualPerKg: 3000,
    aktif: true
  });
  await setDoc(doc(db, "kategori_sampah", "b3"), {
    nama: "Sampah B3 / Elektronik",
    bobotPoinPerKg: 35,
    hargaJualPerKg: 5000,
    aktif: true
  });

  // 2. Katalog Hadiah Sederhana
  await setDoc(doc(db, "poin_reward", "token_listrik_20k"), {
    nama: "Token Listrik Rp20.000",
    hargaPoin: 2000,
    stok: 15,
    aktif: true
  });
  await setDoc(doc(db, "poin_reward", "ewallet_10k"), {
    nama: "Saldo E-Wallet Rp10.000",
    hargaPoin: 1000,
    stok: 30,
    aktif: true
  });

  // 3. RT Percontohan Kelurahan Lalolara
  await setDoc(doc(db, "rekap_rt", "lalolara_rt01"), {
    kelurahan: "Lalolara", rt: "RT01", totalPoin: 0, totalKg: 0, jumlahKK: 45
  });
  await setDoc(doc(db, "rekap_rt", "lalolara_rt02"), {
    kelurahan: "Lalolara", rt: "RT02", totalPoin: 0, totalKg: 0, jumlahKK: 50
  });
  await setDoc(doc(db, "rekap_rt", "lalolara_rt03"), {
    kelurahan: "Lalolara", rt: "RT03", totalPoin: 0, totalKg: 0, jumlahKK: 40
  });

  console.log("Seeding data awal berhasil selesai!");
}