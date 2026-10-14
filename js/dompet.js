// js/dompet.js - Dompet Poin & Penukaran Hadiah
document.addEventListener("DOMContentLoaded", () => {
  if (!window.ElolaAuth.guard(["warga", "asn"])) return;
  const { $, el, fmt, fmtInt, rupiah, notif, tglJam } = window.ElolaUtils;
  const { POIN_RUPIAH } = window.ElolaStore;
  const { api, poll } = window.ElolaAPI;

  const STATUS = { menunggu: ["Menunggu", ""], disetujui: ["Disetujui", "disetujui"], ditolak: ["Ditolak", "tolak"] };
  const IKON = {
    token:  '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/>',
    pulsa:  '<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>',
    minyak: '<path d="M12 3c3 4 5 6.5 5 9.5a5 5 0 0 1-10 0C7 9.5 9 7 12 3z"/>',
    kompos: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-7 10-9"/>'
  };
  let dompet = null, setoran = [], kunciD = "", kunciS = "", pilihan = null, sibuk = false;

  function ikon(kode) {
    const w = el("div", { class: "ikon" });
    w.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (IKON[kode] || IKON.kompos) + "</svg>";
    return w;
  }

  function gambarKatalog() {
    $("saldo").textContent = fmtInt(dompet.saldo);
    $("rupiah").textContent = rupiah(dompet.rupiah);
    $("kgTotal").textContent = fmt(dompet.kg_total) + " kg";
    $("katalog").replaceChildren(...dompet.hadiah.map(h => {
      const habis = h.stok < 1, kurang = dompet.saldo < h.harga;
      const stok = el("div", { class: "stok" + (habis ? " habis" : h.stok <= 5 ? " tipis" : ""),
        text: habis ? "Stok habis" : "Sisa stok " + h.stok });
      const tombol = el("button", { type: "button", class: "tombol", onclick: () => konfirmasi(h),
        text: habis ? "Stok habis" : kurang ? "Kurang " + fmtInt(h.harga - dompet.saldo) + " poin" : "Tukar" });
      tombol.disabled = habis || kurang;
      return el("div", { class: "hadiah" }, ikon(h.kode), el("b", { text: h.nama }), el("p", { text: h.deskripsi }),
        el("div", { class: "harga" }, fmtInt(h.harga), el("small", { text: " poin (" + rupiah(h.harga * POIN_RUPIAH) + ")" })),
        stok, tombol);
    }));
    $("isiTukar").replaceChildren(...dompet.penukaran.map(t => el("tr", {},
      el("td", { text: tglJam(t.waktu) }), el("td", { text: t.nama }),
      el("td", { class: "angka", text: "-" + fmtInt(t.poin) }), el("td", { text: t.id }))));
    $("kosongTukar").classList.toggle("hidden", dompet.penukaran.length > 0);
  }

  function gambarSetoran() {
    $("isiSetoran").replaceChildren(...setoran.map(s => {
      const [label, kelas] = STATUS[s.status];
      return el("tr", {},
        el("td", {}, tglJam(s.waktu), el("small", { text: s.id })),
        el("td", { text: Object.entries(s.rincian).map(([j, v]) => j + " " + fmt(v)).join(", ") }),
        el("td", { class: "angka", text: fmt(s.kg) + " kg" }),
        el("td", { class: "angka", text: s.status === "ditolak" ? "0" : fmtInt(s.poin) }),
        el("td", {}, el("span", { class: "chip " + kelas, text: label, style: "margin-top:0" }),
          s.status === "ditolak" && s.catatan ? el("small", { text: s.catatan }) : null));
    }));
    $("kosongSetoran").classList.toggle("hidden", setoran.length > 0);
  }

  function konfirmasi(h) {
    pilihan = h;
    $("judulTukar").textContent = "Tukar " + h.nama + "?";
    $("ketTukar").textContent = fmtInt(h.harga) + " poin akan dipotong dari saldo. Saldo setelah penukaran: " + fmtInt(dompet.saldo - h.harga) + " poin.";
    $("dlgTukar").showModal();
  }
  $("batalTukar").onclick = () => $("dlgTukar").close();
  $("yaTukar").onclick = async () => {
    if (!pilihan || sibuk) return;
    sibuk = true; $("yaTukar").disabled = true;
    try {
      const h = await api("api/tukar.php", { json: { hadiah_id: pilihan.id } });
      $("dlgTukar").close();
      notif("ok", h.nama + " berhasil ditukar. Sisa saldo " + fmtInt(h.saldo) + " poin. Ambil di bank sampah kelurahan.");
    } catch (e) {
      $("dlgTukar").close();
      notif("err", e.message);
    } finally { sibuk = false; $("yaTukar").disabled = false; kunciD = ""; await muat(); }
  };

  async function muat() {
    const [d, s] = await Promise.all([api("api/dompet.php"), api("api/setoran.php")]);
    if (JSON.stringify(d) !== kunciD) { kunciD = JSON.stringify(d); dompet = d; gambarKatalog(); }
    if (JSON.stringify(s.data) !== kunciS) { kunciS = JSON.stringify(s.data); setoran = s.data; gambarSetoran(); }
  }

  const tab = { tHadiah: "pHadiah", tSetoran: "pSetoran", tTukar: "pTukar" };
  Object.entries(tab).forEach(([t, p]) => $(t).onclick = () => {
    Object.entries(tab).forEach(([t2, p2]) => { $(t2).classList.toggle("aktif", t2 === t); $(p2).classList.toggle("hidden", p2 !== p); });
    window.ElolaUtils.tutupNotif();
  });

  poll(muat, 8000);
});