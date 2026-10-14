// js/seed-init.js - Router request API lokal & polling
window.ElolaAPI = (() => {
  const { pengguna } = window.ElolaAuth;
  const { baca, tulis, bulat1, kompres } = window.ElolaUtils;
  const { JENIS, KUOTA_ASN, POIN_RUPIAH, RW, RT, hitung, nomorBaru, galat, bentuk, semuaSetoran, urut, ringkasPoin } = window.ElolaStore;

  const butuh = (u, peran) => { if (!peran.includes(u.peran)) galat("Kamu tidak punya akses ke fitur ini."); };

  async function setoranPost(u, fd) {
    butuh(u, ["warga", "asn"]);
    const rw = fd.get("rw"), rt = fd.get("rt");
    if (!RW.includes(rw)) galat("Pilih RW.");
    if (!RT.includes(rt)) galat("Pilih RT.");
    const rinc = {};
    for (const j of JENIS) {
      const v = fd.get("kg[" + j.k + "]");
      if (v === null || v === "") continue;
      const n = Number(v);
      if (!isFinite(n)) galat("Berat " + j.k + " tidak valid.");
      const kg = bulat1(n);
      if (kg < 0 || kg > 99) galat("Berat " + j.k + " harus antara 0 dan 99 kg.");
      if (kg > 0) rinc[j.k] = kg;
    }
    if (!Object.keys(rinc).length) galat("Isi berat minimal satu jenis sampah.");
    let foto = "";
    const f = fd.get("foto");
    if (f && f.size) {
      if (f.size > 5 * 1024 * 1024) galat("Ukuran foto maksimal 5 MB.");
      foto = await kompres(f);
    }
    const h = hitung(rinc), semua = semuaSetoran();
    const rec = { nomor: nomorBaru(), akun: u.id, waktu: new Date().toISOString(), rw, rt, rincian: { ...rinc }, klaim: { ...rinc },
      kg: h.kg, kg_klaim: h.kg, poin: h.poin, foto, status: "menunggu", catatan: "", oleh: "", pada: "" };
    semua.push(rec);
    if (!tulis("elola_setoran", semua)) galat("Penyimpanan peramban penuh. Coba kirim tanpa foto atau hapus data lama.");
    const akun = baca("elola_akun", {});
    if (akun[u.id]) { Object.assign(akun[u.id], { kelurahan: "Lalolara", rw, rt }); tulis("elola_akun", akun); }
    return { ok: true, data: bentuk(rec) };
  }

  function verifikasi(u, j) {
    butuh(u, ["petugas", "admin"]);
    const semua = semuaSetoran(), s = semua.find(x => x.nomor === Number(j.id));
    if (!s) galat("Setoran tidak ditemukan.");
    if (s.status !== "menunggu") galat("Setoran ini sudah diproses petugas lain.", { kode: "sudah" });
    const sekarang = new Date().toISOString();
    if (j.aksi === "tolak") {
      const alasan = String(j.alasan || "").trim();
      if (alasan.length < 3 || alasan.length > 250) galat("Isi alasan penolakan (3 sampai 250 huruf).");
      Object.assign(s, { status: "ditolak", catatan: alasan, oleh: u.nama, pada: sekarang });
      tulis("elola_setoran", semua);
      return { ok: true, status: "ditolak" };
    }
    if (j.aksi !== "setujui") galat("Permintaan tidak valid.");
    const timbang = j.timbang || {}, akhir = {};
    for (const jenis of Object.keys(s.klaim)) {
      const v = timbang[jenis] !== undefined ? Number(timbang[jenis]) : s.klaim[jenis];
      if (!isFinite(v)) galat("Berat " + jenis + " tidak valid.");
      const kg = bulat1(v);
      if (kg < 0 || kg > 99) galat("Berat " + jenis + " harus antara 0 dan 99 kg.");
      akhir[jenis] = kg;
    }
    const h = hitung(akhir);
    if (h.kg <= 0) galat("Hasil timbang tidak boleh nol semua. Pilih Tolak jika sampah tidak sesuai.");
    Object.assign(s, { rincian: akhir, kg: h.kg, poin: h.poin, status: "disetujui", catatan: "", oleh: u.nama, pada: sekarang });
    if (!tulis("elola_setoran", semua)) galat("Penyimpanan peramban penuh.");
    return { ok: true, status: "disetujui", kg: h.kg, poin: h.poin };
  }

  function klasemen(u, periode) {
    const batas = periode === "bulan" ? window.ElolaUtils.awalBulan() : 0;
    const ada = {};
    semuaSetoran().filter(s => s.status === "disetujui" && new Date(s.waktu).getTime() >= batas).forEach(s => {
      const k = s.rw + "|" + s.rt, d = ada[k] || (ada[k] = { poin: 0, kg: 0, setoran: 0, warga: new Set() });
      d.poin += s.poin; d.kg += s.kg; d.setoran++; d.warga.add(s.akun);
    });
    const daftar = [];
    RW.forEach(rw => RT.forEach(rt => {
      const d = ada[rw + "|" + rt];
      daftar.push({ rw, rt, poin: d ? d.poin : 0, kg: d ? bulat1(d.kg) : 0, setoran: d ? d.setoran : 0, warga: d ? d.warga.size : 0, saya: u.rw === rw && u.rt === rt });
    }));
    daftar.sort((a, b) => b.poin - a.poin || b.kg - a.kg || a.rw.localeCompare(b.rw) || a.rt.localeCompare(b.rt));
    daftar.forEach((d, i) => { d.peringkat = i + 1; });
    return { ok: true, periode, data: daftar };
  }

  function admin(u) {
    butuh(u, ["admin"]);
    const semua = semuaSetoran(), akun = baca("elola_akun", {}), sah = semua.filter(s => s.status === "disetujui");
    const bulan = sah.filter(s => new Date(s.waktu).getTime() >= window.ElolaUtils.awalBulan());
    const daftarAsn = Object.keys(akun).filter(k => akun[k].peran === "asn");
    const patuh = daftarAsn.filter(id => bulan.filter(s => s.akun === id).reduce((t, s) => t + s.kg, 0) >= KUOTA_ASN - 1e-9).length;
    const terbit = sah.reduce((t, s) => t + s.poin, 0), ditukar = baca("elola_tukar", []).reduce((t, x) => t + x.poin, 0);
    const hitungAkun = { warga: 0, asn: 0, petugas: 0, admin: 0 };
    Object.values(akun).forEach(a => { hitungAkun[a.peran] = (hitungAkun[a.peran] || 0) + 1; });
    const status = { menunggu: 0, disetujui: 0, ditolak: 0 };
    semua.forEach(s => { status[s.status]++; });
    return { ok: true, stat: {
      kg_total: bulat1(sah.reduce((t, s) => t + s.kg, 0)), kg_bulan: bulat1(bulan.reduce((t, s) => t + s.kg, 0)),
      asn_total: daftarAsn.length, asn_patuh: patuh, asn_persen: daftarAsn.length ? Math.round(patuh / daftarAsn.length * 100) : 0, kuota: KUOTA_ASN,
      poin_terbit: terbit, poin_ditukar: ditukar, poin_beredar: terbit - ditukar,
      akun: hitungAkun, akun_total: Object.keys(akun).length, status
    }, log: urut(semua).slice(0, 100).map(s => ({ ...bentuk(s), penyetor: (akun[s.akun] || {}).nama || s.akun,
        peran_penyetor: (akun[s.akun] || {}).peran || "warga", petugas: s.oleh || "" })) };
  }

  function tukar(u, j) {
    butuh(u, ["warga", "asn"]);
    const hadiah = baca("elola_hadiah", []), h = hadiah.find(x => x.id === Number(j.hadiah_id));
    if (!h) galat("Hadiah tidak ditemukan.");
    if (h.stok < 1) galat("Maaf, stok " + h.nama + " sudah habis.");
    const p = ringkasPoin(u.id);
    if (p.saldo < h.harga) galat("Poin kurang " + window.ElolaUtils.fmtInt(h.harga - p.saldo) + " untuk menukar " + h.nama + ".");
    h.stok--;
    const riwayat = baca("elola_tukar", []);
    riwayat.push({ nomor: nomorBaru(), akun: u.id, hadiah: h.id, nama: h.nama, poin: h.harga, waktu: new Date().toISOString() });
    if (!tulis("elola_hadiah", hadiah) || !tulis("elola_tukar", riwayat)) galat("Penyimpanan peramban penuh.");
    return { ok: true, nama: h.nama, poin: h.harga, saldo: p.saldo - h.harga, stok: h.stok };
  }

  async function api(url, { json, body } = {}) {
    await Promise.resolve();
    const u = pengguna();
    if (!u) { location.replace("/index.html"); throw new Error("Sesi berakhir."); }
    const [path, qs] = url.split("?"), q = new URLSearchParams(qs || "");
    switch (path) {
      case "api/setoran.php":
        if (body) return await setoranPost(u, body);
        butuh(u, ["warga", "asn"]);
        return { ok: true, data: urut(semuaSetoran().filter(s => s.akun === u.id)).map(bentuk) };
      case "api/antrean.php": {
        butuh(u, ["petugas", "admin"]);
        const akun = baca("elola_akun", {}), semua = semuaSetoran();
        const hari = new Date(); hari.setHours(0, 0, 0, 0);
        return { ok: true,
          data: semua.filter(s => s.status === "menunggu").sort((a, b) => a.waktu.localeCompare(b.waktu) || a.nomor - b.nomor)
            .map(s => ({ ...bentuk(s), penyetor: (akun[s.akun] || {}).nama || s.akun, peran_penyetor: (akun[s.akun] || {}).peran || "warga" })),
          selesai_hari_ini: semua.filter(s => s.status !== "menunggu" && s.pada && new Date(s.pada) >= hari).length };
      }
      case "api/verifikasi.php": return verifikasi(u, json || {});
      case "api/klasemen.php": return klasemen(u, q.get("periode") === "bulan" ? "bulan" : "semua");
      case "api/admin.php": return admin(u);
      case "api/dompet.php": {
        butuh(u, ["warga", "asn"]);
        const p = ringkasPoin(u.id);
        return { ok: true, saldo: p.saldo, rupiah: p.saldo * POIN_RUPIAH, kg_total: p.kg_total, diterbitkan: p.diterbitkan, ditukar: p.ditukar,
          hadiah: baca("elola_hadiah", []).slice().sort((a, b) => a.harga - b.harga).map(h => ({ id: h.id, kode: h.kode, nama: h.nama, deskripsi: h.deskripsi, harga: h.harga, stok: h.stok })),
          penukaran: urut(baca("elola_tukar", []).filter(t => t.akun === u.id)).slice(0, 50).map(t => ({ id: window.ElolaStore.pad(t.nomor, "T"), nama: t.nama, poin: t.poin, waktu: t.waktu })) };
      }
      case "api/tukar.php": return tukar(u, json || {});
      case "api/auth.php": {
        const aksi = q.get("aksi");
        if (aksi === "keluar") { try { localStorage.removeItem("elola_sesi"); } catch {} return { ok: true }; }
        if (aksi === "wilayah") {
          const akun = baca("elola_akun", {});
          if (akun[u.id]) {
            akun[u.id].kelurahan = "Lalolara";
            if (RW.includes(json.rw)) akun[u.id].rw = json.rw;
            if (RT.includes(json.rt)) akun[u.id].rt = json.rt;
            tulis("elola_akun", akun);
          }
          return { ok: true };
        }
      }
    }
    galat("Aksi tidak dikenal.");
  }

  const penutup = [];
  function poll(fn, ms = 4000) {
    const ind = document.getElementById("langsung");
    let jalan = false;
    const tandai = (ok) => {
      if (!ind) return;
      ind.classList.toggle("gagal", !ok);
      ind.lastElementChild.textContent = ok
        ? "Langsung, " + new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).replace(/\./g, ":")
        : "Terputus, mencoba lagi";
    };
    async function tik() {
      if (jalan || document.hidden) return;
      jalan = true;
      try { await fn(); tandai(true); } catch { tandai(false); } finally { jalan = false; }
    }
    const onStorage = (e) => { if (!e.key || e.key.startsWith("elola_")) tik(); };
    const onVisible = () => { if (!document.hidden) tik(); };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(tik, ms);
    penutup.push(() => { clearInterval(timer); window.removeEventListener("storage", onStorage); document.removeEventListener("visibilitychange", onVisible); });
    tik();
  }

  return { api, poll, lepas: () => { while (penutup.length) penutup.pop()(); } };
})();

// Jembatan kompatibilitas window.Elola
window.Elola = {
  ...window.ElolaUtils,
  ...window.ElolaStore,
  ...window.ElolaAuth,
  ...window.ElolaAPI,
  APP: {
    jenis: window.ElolaStore.JENIS,
    kuota: window.ElolaStore.KUOTA_ASN,
    poinRupiah: window.ElolaStore.POIN_RUPIAH,
    get user() { return window.ElolaAuth.pengguna(); }
  }
};