// js/dashboard.js - Pusat Kendali Admin DLH
document.addEventListener("DOMContentLoaded", () => {
  if (!window.ElolaAuth.guard(["admin"])) return;
  const { $, el, fmt, fmtInt, tglJam } = window.ElolaUtils;
  const { api, poll } = window.ElolaAPI;

  const STATUS = { menunggu: ["Menunggu", ""], disetujui: ["Disetujui", "disetujui"], ditolak: ["Ditolak", "tolak"] };
  let filter = "", log = [], ada = null, terakhir = "";

  function statistik(s) {
    $("stKg").textContent = fmt(s.kg_total) + " kg";
    $("stKgBulan").textContent = "Bulan ini " + fmt(s.kg_bulan) + " kg";
    $("stAsn").textContent = s.asn_persen + "%";
    $("stAsnKet").textContent = s.asn_patuh + " dari " + s.asn_total + " ASN memenuhi kuota " + fmt(s.kuota) + " kg";
    $("stAsnBar").style.width = s.asn_persen + "%";
    $("stPoin").textContent = fmtInt(s.poin_beredar);
    $("stPoinKet").textContent = "Diterbitkan " + fmtInt(s.poin_terbit) + ", sudah ditukar " + fmtInt(s.poin_ditukar);
    $("stAkun").textContent = fmtInt(s.akun_total);
    $("stAkunKet").textContent = s.akun.warga + " warga, " + s.akun.asn + " ASN, " + s.akun.petugas + " petugas, " + s.akun.admin + " admin";
    $("kiriMenunggu").textContent = s.status.menunggu;
  }

  function tabel() {
    const baris = log.filter(x => !filter || x.status === filter);
    $("logKosong").classList.toggle("hidden", baris.length > 0);
    $("log").replaceChildren(...baris.map(x => {
      const [label, kelas] = STATUS[x.status];
      const baru = ada && !ada.has(x.nomor + x.status);
      return el("tr", { class: baru ? "baru" : "" },
        el("td", {}, tglJam(x.waktu), el("small", { text: x.id })),
        el("td", {}, x.penyetor, el("small", { text: x.peran_penyetor === "asn" ? "ASN" : "Warga" })),
        el("td", { text: x.rw + " / " + x.rt }),
        el("td", { text: Object.entries(x.rincian).map(([j, v]) => j + " " + fmt(v)).join(", ") }),
        el("td", { class: "angka", text: fmt(x.kg) + " kg" }),
        el("td", { class: "angka", text: fmtInt(x.poin) }),
        el("td", {}, el("span", { class: "chip " + kelas, text: label, style: "margin-top:0" }), x.status === "ditolak" && x.catatan ? el("small", { text: x.catatan }) : null),
        el("td", { text: x.petugas || "-" }));
    }));
  }

  async function muat() {
    const h = await api("api/admin.php");
    statistik(h.stat);
    const kunci = JSON.stringify(h.log);
    if (kunci === terakhir) return;
    terakhir = kunci;
    log = h.log;
    tabel();
    ada = new Set(log.map(x => x.nomor + x.status));
  }

  document.querySelectorAll("[data-f]").forEach(b => b.onclick = () => {
    filter = b.dataset.f;
    document.querySelectorAll("[data-f]").forEach(x => x.classList.toggle("aktif", x === b));
    const simpan = ada; ada = null; tabel(); ada = simpan;
  });

  poll(muat, 5000);
});