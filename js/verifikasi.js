// js/verifikasi.js - Verifikasi Antrean Setoran Lapangan
document.addEventListener("DOMContentLoaded", () => {
  if (!window.ElolaAuth.guard(["petugas", "admin"])) return;
  const { $, el, fmt, bulat1, notif, tglJam } = window.ElolaUtils;
  const { JENIS } = window.ElolaStore;
  const { api, poll } = window.ElolaAPI;

  const poinPer = Object.fromEntries(JENIS.map(j => [j.k, j.poin]));
  const ALASAN = ["Foto tidak sesuai dengan sampah yang disetor", "Sampah belum dipilah", "Jenis sampah tidak sesuai", "Lainnya"];

  const kartu = new Map();
  let pertama = true;

  function buatKartu(s) {
    const input = {};
    const totalEl = el("b", { text: "0 poin" }), kgEl = el("span", { text: "" });
    const hitung = () => {
      let tk = 0, tp = 0;
      Object.entries(input).forEach(([j, i]) => {
        const v = Math.max(0, Math.min(99, bulat1(parseFloat(i.value) || 0)));
        tk += v; tp += Math.round(v * poinPer[j]);
      });
      kgEl.textContent = "Total timbangan " + fmt(bulat1(tk)) + " kg, diklaim " + fmt(s.kg_klaim) + " kg. Poin: ";
      totalEl.textContent = tp.toLocaleString("id-ID");
      setuju.disabled = tk <= 0;
    };

    const baris = Object.entries(s.klaim).map(([j, v]) => {
      const i = el("input", { type: "number", min: "0", max: "99", step: "0.1", inputmode: "decimal", value: String(v), "aria-label": "Hasil timbang " + j + " (kg)" });
      input[j] = i;
      const ubah = (d) => () => { i.value = Math.max(0, Math.min(99, bulat1((parseFloat(i.value) || 0) + d))); hitung(); };
      i.addEventListener("input", hitung);
      return el("div", { class: "timbang-baris" },
        el("b", {}, j, el("small", { text: "diklaim " + fmt(v) + " kg" })),
        el("div", { class: "langkah" },
          el("button", { type: "button", "aria-label": "Kurangi " + j, text: "−", onclick: ubah(-0.1) }),
          i,
          el("button", { type: "button", "aria-label": "Tambah " + j, text: "+", onclick: ubah(0.1) }),
          el("em", { text: "kg" })));
    });

    const setuju = el("button", { type: "button", class: "tombol-kecil utama", text: "Setujui" });
    const tolak = el("button", { type: "button", class: "tombol-kecil bahaya", text: "Tolak" });
    const fotoBtn = s.foto
      ? el("button", { type: "button", class: "tombol-kecil", text: "Lihat Foto", onclick: () => bukaFoto(s) })
      : el("span", { class: "catatan-kecil", text: "Tanpa foto" });

    const pilih = el("select", { "aria-label": "Alasan penolakan" }, ALASAN.map(a => el("option", { text: a })));
    const catatan = el("input", { type: "text", maxlength: "200", placeholder: "Catatan tambahan (opsional)" });
    const kirimTolak = el("button", { type: "button", class: "tombol-kecil bahaya", text: "Kirim penolakan" });
    const batal = el("button", { type: "button", class: "tombol-kecil", text: "Batal" });
    const panel = el("div", { class: "alasan hidden" },
      el("label", { text: "Alasan penolakan", style: "margin-top:0" }), pilih, catatan,
      el("div", { class: "aksi", style: "margin-top:10px" }, kirimTolak, batal));

    const k = el("article", { class: "setoran-kartu" + (pertama ? "" : " baru"), "data-nomor": String(s.nomor) },
      el("div", { class: "sk-atas" },
        el("div", {}, el("b", { text: s.penyetor }),
          el("small", { text: (s.peran_penyetor === "asn" ? "ASN" : "Warga") + ", " + s.id + ", masuk " + tglJam(s.waktu) })),
        el("span", { class: "lokasi", text: s.rw + " / " + s.rt })),
      el("div", { class: "timbang" }, baris),
      el("div", { class: "sk-bawah" },
        el("div", { class: "total" }, kgEl, totalEl),
        el("div", { class: "aksi" }, fotoBtn, tolak, setuju)),
      panel);

    async function proses(aksi, extra) {
      k.dataset.sibuk = "1";
      [setuju, tolak, kirimTolak].forEach(b => b.disabled = true);
      try {
        const timbang = Object.fromEntries(Object.entries(input).map(([j, i]) => [j, bulat1(parseFloat(i.value) || 0)]));
        const h = await api("api/verifikasi.php", { json: { id: s.nomor, aksi, timbang, ...extra } });
        k.remove(); kartu.delete(s.nomor);
        selesai();
        notif("ok", aksi === "setujui"
          ? s.penyetor + ": " + fmt(h.kg) + " kg disetujui, +" + h.poin.toLocaleString("id-ID") + " poin masuk ke saldo. Klasemen " + s.rw + " / " + s.rt + " ikut diperbarui."
          : "Setoran " + s.id + " ditolak.");
        muat();
      } catch (e) {
        delete k.dataset.sibuk;
        [tolak, kirimTolak].forEach(b => b.disabled = false);
        hitung();
        if (e.data && e.data.kode === "sudah") { k.remove(); kartu.delete(s.nomor); selesai(); notif("info", e.message); }
        else notif("err", e.message);
      }
    }
    setuju.onclick = () => proses("setujui");
    tolak.onclick = () => { panel.classList.toggle("hidden"); };
    batal.onclick = () => panel.classList.add("hidden");
    kirimTolak.onclick = () => {
      const a = pilih.value === "Lainnya" ? catatan.value.trim() : pilih.value + (catatan.value.trim() ? ". " + catatan.value.trim() : "");
      if (a.length < 3) return notif("err", "Isi catatan alasan penolakan.");
      proses("tolak", { alasan: a });
    };
    hitung();
    return k;
  }

  function bukaFoto(s) {
    $("imgFoto").src = s.foto;
    $("ketFoto").textContent = s.penyetor + ", " + s.rw + " / " + s.rt;
    $("dlgFoto").showModal();
  }
  $("tutupFoto").onclick = () => $("dlgFoto").close();
  $("dlgFoto").addEventListener("click", (e) => { if (e.target === $("dlgFoto")) $("dlgFoto").close(); });

  function selesai() {
    $("kosong").classList.toggle("hidden", kartu.size > 0);
    $("jmlAntrean").textContent = kartu.size;
  }

  async function muat() {
    const h = await api("api/antrean.php");
    const ada = new Set(h.data.map(s => s.nomor));
    let diambilLain = 0;
    for (const [id, k] of kartu) {
      if (!ada.has(id) && !k.dataset.sibuk) { k.remove(); kartu.delete(id); diambilLain++; }
    }
    let baru = 0;
    h.data.forEach(s => {
      if (kartu.has(s.nomor)) return;
      const k = buatKartu(s);
      kartu.set(s.nomor, k); $("antrean").append(k); baru++;
    });
    if (!pertama && baru) notif("info", baru === 1 ? "1 setoran baru masuk ke antrean." : baru + " setoran baru masuk ke antrean.");
    else if (!pertama && diambilLain) notif("info", diambilLain + " setoran sudah diproses petugas lain.");
    pertama = false;
    selesai();
    $("jmlSelesai").textContent = h.selesai_hari_ini;
  }

  poll(muat, 4000);
});