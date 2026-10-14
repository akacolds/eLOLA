// js/supabase.js - Integrasi data store, internal mock/storage API eLOLA
window.ElolaStore = (() => {
  const { baca, tulis, bulat1, awalBulan } = window.ElolaUtils;

  const JENIS = [
    { k: "Plastik", poin: 150, ket: "Botol, gelas, kemasan" },
    { k: "Kertas",  poin: 100, ket: "Kardus, koran, HVS" },
    { k: "Logam",   poin: 250, ket: "Kaleng, besi, aluminium" },
    { k: "Kaca",    poin: 75,  ket: "Botol dan pecahan kaca" }
  ];
  const KUOTA_ASN = 2.0;
  const POIN_RUPIAH = 10;
  const SANDI_DEMO = "elola123";
  const RW = ["RW 01", "RW 02", "RW 03", "RW 04", "RW 05"];
  const RT = ["RT 01", "RT 02", "RT 03", "RT 04"];

  const poinJenis = Object.fromEntries(JENIS.map(j => [j.k, j.poin]));
  const hitung = (rinc) => {
    let kg = 0, poin = 0;
    for (const [j, v] of Object.entries(rinc)) { kg += v; poin += Math.round(v * (poinJenis[j] || 0)); }
    return { kg: bulat1(kg), poin };
  };

  function nomorBaru() { const n = baca("elola_nomor", 0) + 1; tulis("elola_nomor", n); return n; }
  const galat = (pesan, data = {}) => { const e = new Error(pesan); e.data = { ok: false, pesan, ...data }; throw e; };
  const pad = (n, p) => p + String(n).padStart(5, "0");
  const positif = (o) => Object.fromEntries(Object.entries(o || {}).filter(([, v]) => v > 0));
  const bentuk = (s) => ({
    id: pad(s.nomor, "S"), nomor: s.nomor, waktu: s.waktu, wilayah: "Kel. Lalolara, " + s.rw + ", " + s.rt, rw: s.rw, rt: s.rt,
    rincian: positif(s.rincian), klaim: positif(s.klaim), kg: s.kg, kg_klaim: s.kg_klaim, poin: s.poin,
    foto: s.foto || "", status: s.status, catatan: s.catatan || ""
  });
  const semuaSetoran = () => baca("elola_setoran", []);
  const urut = (arr) => arr.slice().sort((a, b) => b.waktu.localeCompare(a.waktu) || b.nomor - a.nomor);

  function ringkasPoin(id) {
    const sah = semuaSetoran().filter(s => s.akun === id && s.status === "disetujui");
    const terbit = sah.reduce((t, s) => t + s.poin, 0);
    const ditukar = baca("elola_tukar", []).filter(t => t.akun === id).reduce((t, x) => t + x.poin, 0);
    return { diterbitkan: terbit, ditukar, saldo: terbit - ditukar, kg_total: bulat1(sah.reduce((t, s) => t + s.kg, 0)) };
  }

  function seed() {
    if (!baca("elola_seed", null)) {
      const akun = baca("elola_akun", {});
      const staf = {
        "ADM-001": { nama: "Admin DLH", peran: "admin" },
        "PTG-001": { nama: "Petugas Lalolara", peran: "petugas" }
      };
      Object.entries(staf).forEach(([id, a]) => {
        if (!akun[id]) akun[id] = { sandi: SANDI_DEMO, isASN: false, nikNip: "", kelurahan: "", rw: "", rt: "", ...a };
      });
      tulis("elola_akun", akun);
      tulis("elola_hadiah", [
        { id: 1, kode: "kompos", nama: "Kompos 5 Kg", deskripsi: "Kompos olahan bank sampah untuk tanaman.", harga: 600, stok: 40 },
        { id: 2, kode: "pulsa", nama: "Pulsa Rp10.000", deskripsi: "Pulsa semua operator ke nomor yang terdaftar.", harga: 1300, stok: 50 },
        { id: 3, kode: "minyak", nama: "Minyak Goreng 1 Liter", deskripsi: "Minyak goreng kemasan, diambil di bank sampah.", harga: 1800, stok: 30 },
        { id: 4, kode: "token", nama: "Token Listrik Rp20.000", deskripsi: "Token PLN prabayar, dikirim lewat petugas kelurahan.", harga: 2500, stok: 20 }
      ]);
      tulis("elola_tukar", []);
      tulis("elola_setoran", []);
      tulis("elola_seed", 1);
    }
    if (!baca("elola_bersih_demo", null)) {
      const akun = baca("elola_akun", {});
      const lama = Object.keys(akun).filter(k => /\.demo@gmail\.com$/i.test(k));
      lama.forEach(k => delete akun[k]);
      if (akun["PTG-001"] && akun["PTG-001"].nama === "Petugas Demo") akun["PTG-001"].nama = "Petugas Lalolara";
      tulis("elola_akun", akun);
      tulis("elola_setoran", baca("elola_setoran", []).filter(x => !lama.includes(x.akun)));
      tulis("elola_tukar", baca("elola_tukar", []).filter(x => !lama.includes(x.akun)));
      tulis("elola_bersih_demo", 1);
    }
  }

  seed();

  return {
    JENIS, KUOTA_ASN, POIN_RUPIAH, SANDI_DEMO, RW, RT,
    hitung, nomorBaru, galat, pad, positif, bentuk,
    semuaSetoran, urut, ringkasPoin
  };
})();