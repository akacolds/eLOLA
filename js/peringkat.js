// js/peringkat.js - Papan Klasemen RT/RW Kelurahan
document.addEventListener("DOMContentLoaded", () => {
  if (!window.ElolaAuth.guard(["warga", "asn", "petugas", "admin"])) return;
  const { $, el, fmt, fmtInt } = window.ElolaUtils;
  const { api, poll } = window.ElolaAPI;
  let periode = "semua", sebelumnya = {}, terakhir = "";

  const nama = (d) => d.rt + " / " + d.rw;
  const skor = (d) => fmtInt(d.poin) + " poin, " + fmt(d.kg) + " kg";

  function podium(data) {
    const urut = [[1, "j2"], [0, "j1"], [2, "j3"]];
    const gelar = ["Juara 1", "Juara 2", "Juara 3"];
    $("podium").replaceChildren(...urut.map(([i, kelas]) => {
      const d = data[i];
      const ada = d && d.poin > 0;
      return el("div", { class: "juara " + kelas + (ada ? "" : " kosong-juara") },
        el("div", { class: "urut", text: String(i + 1) }),
        el("div", { class: "gelar", text: gelar[i] }),
        el("div", { class: "nama-rt", text: ada ? nama(d) : "Belum ada" }),
        el("div", { class: "skor", text: ada ? skor(d) : "Menunggu setoran pertama" }));
    }));
  }

  function daftar(data) {
    const atas = Math.max(1, data[0] ? data[0].poin : 1);
    $("daftar").replaceChildren(...data.slice(3).map(d => {
      const naik = sebelumnya[nama(d)] !== undefined && sebelumnya[nama(d)] > d.peringkat;
      return el("div", { class: "rank-baris" + (d.saya ? " saya" : "") + (naik ? " naik" : "") },
        el("div", { class: "no", text: String(d.peringkat) }),
        el("div", {}, el("b", { text: nama(d) + (d.saya ? " (RT kamu)" : "") }),
          el("small", { text: d.setoran + " setoran dari " + d.warga + " warga" })),
        el("div", { class: "skor" }, fmtInt(d.poin), el("small", { text: " poin" })),
        el("div", { class: "rank-bar", "aria-hidden": "true" }, el("i", { style: "width:" + Math.round(d.poin / atas * 100) + "%" })));
    }));
  }

  function rankSaya(data) {
    const d = data.find(x => x.saya);
    if (!d) { $("rankSaya").textContent = "-"; $("labelRank").textContent = "isi RW dan RT di Setor Sampah untuk melihat peringkat RT-mu"; return; }
    $("rankSaya").textContent = "#" + d.peringkat;
    $("labelRank").textContent = "peringkat " + nama(d) + ", " + fmtInt(d.poin) + " poin";
  }

  async function muat() {
    const h = await api("api/klasemen.php?periode=" + periode);
    const kunci = JSON.stringify(h.data);
    if (kunci === terakhir) return;
    terakhir = kunci;
    podium(h.data); daftar(h.data); rankSaya(h.data);
    sebelumnya = Object.fromEntries(h.data.map(d => [nama(d), d.peringkat]));
  }

  const pilih = (p) => () => {
    periode = p; terakhir = ""; sebelumnya = {};
    $("pSemua").classList.toggle("aktif", p === "semua");
    $("pBulan").classList.toggle("aktif", p === "bulan");
    muat().catch(() => {});
  };
  $("pSemua").onclick = pilih("semua");
  $("pBulan").onclick = pilih("bulan");

  poll(muat, 5000);
});