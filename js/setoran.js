// js/setoran.js - Logika Setoran Sampah dan Riwayat Warga/ASN
document.addEventListener("DOMContentLoaded", () => {
  if (!window.ElolaAuth.guard(["warga", "asn"])) return;
  const { $, fmt, bulat1, notif, tutupNotif } = window.ElolaUtils;
  const { JENIS, KUOTA_ASN } = window.ElolaStore;
  const { api, poll } = window.ElolaAPI;
  const sesi = window.ElolaAuth.pengguna();

  let DATA = [];
  const kg = Object.fromEntries(JENIS.map(j => [j.k, 0]));
  let foto = null;
  let urlPratinjau = null;
  let sedangKirim = false;

  function mulai() {
    const asn = sesi.peran === "asn";
    $("kuota").classList.toggle("hidden", !asn);
    $("salam").textContent = "Halo, " + sesi.nama.split(" ")[0] + ".";
    $("subsalam").textContent = asn
      ? "Setor sampah dan penuhi kuota bulananmu."
      : "Isi berat tiap jenis sampah, poinmu terhitung otomatis.";
    $("infoSimpan").textContent = "Foto disimpan di server eLOLA dan dikompres otomatis.";

    const profil = sesi;
    if (profil.rw) $("rw").value = profil.rw;
    if (profil.rt && [...$("rt").options].some(o => o.value === profil.rt)) $("rt").value = profil.rt;

    const wadah = $("daftarJenis");
    wadah.replaceChildren();
    JENIS.forEach(j => {
      const r = document.createElement("div");
      r.className = "baris-jenis"; r.id = "r" + j.k;
      r.innerHTML =
        `<div><b>${j.k}</b><span class="sub">${j.ket}. ${j.poin} poin/kg</span></div>` +
        `<div class="langkah">` +
        `<button type="button" data-k="${j.k}" data-d="-1" aria-label="Kurangi ${j.k}">−</button>` +
        `<input type="number" id="kg${j.k}" min="0" max="99" step="0.1" inputmode="decimal" placeholder="0" aria-label="Berat ${j.k} dalam kg">` +
        `<button type="button" data-k="${j.k}" data-d="1" aria-label="Tambah ${j.k}">+</button>` +
        `<em>kg</em></div>`;
      wadah.append(r);
    });

    wadah.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-k]");
      if (!b) return;
      const k = b.dataset.k;
      kg[k] = Math.min(99, Math.max(0, bulat1(kg[k] + Number(b.dataset.d) * 0.5)));
      $("kg" + k).value = kg[k] || "";
      hitung();
    });

    JENIS.forEach(j => $("kg" + j.k).addEventListener("input", (e) => {
      const v = parseFloat(e.target.value);
      kg[j.k] = isFinite(v) ? Math.min(99, Math.max(0, bulat1(v))) : 0;
      hitung();
    }));

    ["rw", "rt"].forEach(id => $(id).addEventListener("change", () => { simpanWilayah(); hitung(); }));
    segarkanRingkasan();
    hitung();
  }

  function simpanWilayah() {
    const json = { rw: $("rw").value, rt: $("rt").value };
    api("api/auth.php?aksi=wilayah", { json }).catch(() => {});
  }

  const totalKg = () => bulat1(Object.values(kg).reduce((a, b) => a + b, 0));
  const totalPoin = () => Math.round(JENIS.reduce((s, j) => s + kg[j.k] * j.poin, 0));

  function errSetor() {
    if (!$("rw").value) return "pilih RW.";
    if (!$("rt").value) return "pilih RT.";
    if (totalKg() <= 0) return "isi berat minimal satu jenis sampah.";
    return "";
  }

  function hitung() {
    JENIS.forEach(j => {
      const elR = $("r" + j.k);
      if (elR) elR.classList.toggle("aktif", kg[j.k] > 0);
    });
    $("totKg").textContent = fmt(totalKg()) + " kg";
    $("totPoin").textContent = totalPoin().toLocaleString("id-ID");
    const err = errSetor();
    $("pSetor").textContent = err ? "Belum lengkap: " + err : "Semua data sudah terisi dengan benar ✓";
    $("pSetor").classList.toggle("ok", !err);
    $("bSetor").disabled = !!err;
  }

  function kecilkan(file, maks, mutu) {
    return new Promise((res, rej) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, maks / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u);
        c.toBlob(b => b ? res(b) : rej(new Error("gagal")), "image/jpeg", mutu);
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("bukan gambar")); };
      img.src = u;
    });
  }

  function bersihkanFoto() {
    foto = null;
    if (urlPratinjau) URL.revokeObjectURL(urlPratinjau);
    urlPratinjau = null;
    $("foto").value = "";
    $("pratinjau").classList.add("hidden");
    $("zonaUnggah").classList.remove("hidden");
  }

  $("foto").addEventListener("change", async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { bersihkanFoto(); return notif("err", "File harus berupa foto (JPG atau PNG)."); }
    if (f.size > 15 * 1024 * 1024) { bersihkanFoto(); return notif("err", "Ukuran foto maksimal 15 MB."); }
    try {
      foto = await kecilkan(f, 1280, 0.8);
      if (urlPratinjau) URL.revokeObjectURL(urlPratinjau);
      urlPratinjau = URL.createObjectURL(foto);
      $("imgPratinjau").src = urlPratinjau;
      $("infoFoto").textContent = f.name + " (" + Math.round(foto.size / 1024) + " KB setelah dikompres)";
      $("pratinjau").classList.remove("hidden");
      $("zonaUnggah").classList.add("hidden");
      tutupNotif();
    } catch {
      bersihkanFoto(); notif("err", "Foto tidak bisa dibaca. Coba pilih foto lain.");
    }
  });
  $("hapusFoto").onclick = bersihkanFoto;

  const setoranSaya = () => DATA.slice();

  function segarkanRingkasan() {
    const sah = setoranSaya().filter(x => x.status === "disetujui");
    const poin = sah.reduce((s, x) => s + x.poin, 0);
    $("totalPoin").textContent = poin.toLocaleString("id-ID");
    $("labelPoin").textContent = "poin dari " + sah.length + " setoran disetujui";
    if (sesi.peran !== "asn") return;
    const sekarang = new Date();
    const bulanIni = (s) => { const d = new Date(s.waktu); return d.getMonth() === sekarang.getMonth() && d.getFullYear() === sekarang.getFullYear(); };
    const kgBulan = bulat1(sah.filter(bulanIni).reduce((s, x) => s + x.kg, 0));
    const kgMenunggu = bulat1(setoranSaya().filter(x => x.status === "menunggu" && bulanIni(x)).reduce((s, x) => s + x.kg, 0));
    const target = KUOTA_ASN, persen = Math.min(100, (kgBulan / target) * 100), penuh = kgBulan >= target;
    $("kuotaAngka").textContent = fmt(kgBulan) + " / " + fmt(target).replace(/^(\d+)$/, "$1,0") + " kg";
    $("isiJalur").style.width = persen + "%";
    $("isiJalur").classList.toggle("penuh", penuh);
    $("jalur").setAttribute("aria-valuenow", Math.min(kgBulan, target));
    $("jalur").setAttribute("aria-valuemax", target);
    const tambah = kgMenunggu > 0 ? " Ada " + fmt(kgMenunggu) + " kg menunggu verifikasi." : "";
    $("kuotaKet").textContent = (penuh
      ? "Kuota bulan ini sudah terpenuhi ✓"
      : "Kurang " + fmt(bulat1(target - kgBulan)) + " kg lagi untuk memenuhi kuota minimal bulan ini.") + tambah;
  }

  const STATUS = { menunggu: ["Menunggu verifikasi", ""], disetujui: ["Disetujui", "ok"], ditolak: ["Ditolak", "tolak"] };
  const CATATAN = {
    menunggu: "Poin masih estimasi sampai petugas menimbang dan menyetujui setoranmu.",
    disetujui: "Setoran disetujui petugas dan poin sudah masuk ke saldomu.",
    ditolak: "Setoran ini tidak dihitung ke poin maupun kuota."
  };

  const bagian = (s, jenis) => {
    if (!jenis) return { kg: s.kg, poin: s.poin };
    const v = s.rincian[jenis] || 0;
    return { kg: v, poin: Math.round(v * JENIS.find(j => j.k === jenis).poin) };
  };

  function lolosPeriode(s, p) {
    if (p === "semua") return true;
    const d = new Date(s.waktu), n = new Date();
    const selisih = (n.getFullYear() * 12 + n.getMonth()) - (d.getFullYear() * 12 + d.getMonth());
    return p === "ini" ? selisih === 0 : selisih === 1;
  }

  function buatItem(s, jenis) {
    const [labelStatus, kelas] = STATUS[s.status] || STATUS.menunggu;
    const b = bagian(s, jenis);
    const el = document.createElement("div"); el.className = "item";

    const kepala = document.createElement("button");
    kepala.type = "button"; kepala.className = "item-kepala"; kepala.setAttribute("aria-expanded", "false");
    const isi = document.createElement("div"); isi.className = "isi";
    const judul = document.createElement("b");
    judul.textContent = Object.entries(s.rincian).map(([k, v]) => k + " " + fmt(v) + " kg").join(", ");
    const tgl = document.createElement("span");
    tgl.textContent = new Date(s.waktu).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
    const chip = document.createElement("span"); chip.className = "chip " + kelas; chip.textContent = labelStatus;
    isi.append(judul, tgl, chip);
    const poin = document.createElement("div"); poin.className = "poin";
    const pb = document.createElement("b"); pb.textContent = "+" + b.poin.toLocaleString("id-ID");
    if (s.status === "ditolak") pb.className = "dicoret";
    const ps = document.createElement("span"); ps.textContent = fmt(b.kg) + " kg";
    poin.append(pb, ps);
    const panah = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    panah.setAttribute("viewBox", "0 0 24 24"); panah.setAttribute("class", "panah"); panah.setAttribute("aria-hidden", "true");
    const garis = document.createElementNS("http://www.w3.org/2000/svg", "path"); garis.setAttribute("d", "M6 9l6 6 6-6");
    panah.append(garis);
    kepala.append(isi, poin, panah);

    const detail = document.createElement("div"); detail.className = "detail"; detail.hidden = true;
    Object.entries(s.rincian).forEach(([k, v]) => {
      const per = JENIS.find(j => j.k === k).poin;
      const r = document.createElement("div"); r.className = "rincian";
      const a = document.createElement("span"); a.textContent = k;
      const c = document.createElement("span"); c.textContent = fmt(v) + " kg × " + per + " = " + Math.round(v * per).toLocaleString("id-ID") + " poin";
      r.append(a, c); detail.append(r);
    });
    const tot = document.createElement("div"); tot.className = "rincian total";
    const ta = document.createElement("span"); ta.textContent = "Total";
    const tc = document.createElement("span"); tc.textContent = fmt(s.kg) + " kg, " + s.poin.toLocaleString("id-ID") + " poin";
    tot.append(ta, tc); detail.append(tot);
    if (s.status === "disetujui" && Math.abs(s.kg - s.kg_klaim) >= 0.05) {
      const kor = document.createElement("p"); kor.className = "meta";
      kor.textContent = "Disesuaikan petugas setelah ditimbang: dari " + fmt(s.kg_klaim) + " kg menjadi " + fmt(s.kg) + " kg.";
      detail.append(kor);
    }
    const meta = document.createElement("p"); meta.className = "meta";
    meta.textContent = s.wilayah + ", pukul " + new Date(s.waktu).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":") + ". Kode " + s.id + ".";
    detail.append(meta);
    if (s.foto) { const im = document.createElement("img"); im.src = s.foto; im.alt = "Bukti foto setoran"; detail.append(im); }
    const cat = document.createElement("p"); cat.className = "catatan " + kelas;
    cat.textContent = (s.status === "ditolak" && s.catatan ? "Alasan: " + s.catatan + " " : "") + (CATATAN[s.status] || CATATAN.menunggu);
    detail.append(cat);

    kepala.onclick = () => {
      const buka = detail.hidden;
      detail.hidden = !buka;
      el.classList.toggle("buka", buka);
      kepala.setAttribute("aria-expanded", buka);
    };
    el.append(kepala, detail);
    return el;
  }

  function gambarRiwayat() {
    const periode = $("fPeriode").value, jenis = $("fJenis").value;
    const semua = setoranSaya().sort((a, b) => b.waktu.localeCompare(a.waktu));
    const daftar = semua.filter(s => lolosPeriode(s, periode) && (!jenis || s.rincian[jenis]));

    let kgT = 0, poinT = 0, jumlah = 0;
    daftar.filter(s => s.status !== "ditolak").forEach(s => { const b = bagian(s, jenis); kgT += b.kg; poinT += b.poin; jumlah++; });
    $("rkSetoran").textContent = jumlah;
    $("rkKg").textContent = fmt(bulat1(kgT));
    $("rkPoin").textContent = poinT.toLocaleString("id-ID");

    const wadah = $("daftarRiwayat");
    wadah.replaceChildren();
    let bulanSekarang = "";
    daftar.forEach(s => {
      const nama = new Date(s.waktu).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
      if (nama !== bulanSekarang) {
        bulanSekarang = nama;
        const h = document.createElement("h3"); h.className = "bulan"; h.textContent = nama; wadah.append(h);
      }
      wadah.append(buatItem(s, jenis));
    });

    const kosong = daftar.length === 0, adaSetoran = semua.length > 0;
    $("kosong").classList.toggle("hidden", !kosong);
    $("kosongTeks").textContent = adaSetoran
      ? "Tidak ada setoran yang cocok dengan filter ini."
      : "Belum ada setoran. Kirim setoran pertamamu untuk mulai mengumpulkan poin.";
    $("keSetor").classList.toggle("hidden", adaSetoran);
  }

  $("fPeriode").addEventListener("change", gambarRiwayat);
  $("fJenis").addEventListener("change", gambarRiwayat);

  function tampil(setor) {
    $("tSetor").classList.toggle("aktif", setor);
    $("tRiwayat").classList.toggle("aktif", !setor);
    $("fSetor").classList.toggle("hidden", !setor);
    $("tampilRiwayat").classList.toggle("hidden", setor);
    if (!setor) gambarRiwayat();
    tutupNotif();
  }
  $("tSetor").onclick = () => tampil(true);
  $("tRiwayat").onclick = () => tampil(false);
  $("keSetor").onclick = () => tampil(true);

  $("fSetor").onsubmit = async (e) => {
    e.preventDefault();
    if (errSetor()) return;
    const tombol = $("bSetor");
    tombol.disabled = true; tombol.textContent = "Mengirim…"; sedangKirim = true;
    try {
      const fd = new FormData();
      fd.append("rw", $("rw").value);
      fd.append("rt", $("rt").value);
      JENIS.forEach(j => { if (kg[j.k] > 0) fd.append("kg[" + j.k + "]", kg[j.k]); });
      if (foto) fd.append("foto", foto, "bukti.jpg");
      const h = await api("api/setoran.php", { body: fd });
      DATA.unshift(h.data);
      JENIS.forEach(j => { kg[j.k] = 0; $("kg" + j.k).value = ""; });
      bersihkanFoto();
      segarkanRingkasan();
      notif("ok", "Setoran terkirim: " + fmt(h.data.kg) + " kg, estimasi " + h.data.poin.toLocaleString("id-ID") + " poin.", { label: "Lihat riwayat", klik: () => tampil(false) });
    } catch (err) {
      notif("err", err.message);
    } finally {
      tombol.textContent = "Kirim setoran →"; sedangKirim = false;
      hitung();
    }
  };

  mulai();

  poll(async () => {
    if (sedangKirim) return;
    const h = await api("api/setoran.php");
    if (JSON.stringify(h.data) === JSON.stringify(DATA)) return;
    DATA = h.data;
    segarkanRingkasan();
    if (!$("tampilRiwayat").classList.contains("hidden")) gambarRiwayat();
  }, 10000);
});