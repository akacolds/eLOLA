window.Utils = (() => {
  const JENIS = [
    { k: "Plastik", poin: 150, ket: "Botol, gelas, kemasan" },
    { k: "Kertas",  poin: 100, ket: "Kardus, koran, HVS" },
    { k: "Logam",   poin: 250, ket: "Kaleng, besi, aluminium" },
    { k: "Kaca",    poin: 75,  ket: "Botol dan pecahan kaca" }
  ];
  const KUOTA_ASN = 2.0;
  const POIN_RUPIAH = 10;
  const RW = ["RW 01", "RW 02", "RW 03", "RW 04", "RW 05"];
  const RT = ["RT 01", "RT 02", "RT 03", "RT 04"];

  // Satu sumber konfigurasi wilayah untuk seluruh formulir.
  // Sesuaikan RW/RT di sini berdasarkan data resmi kelurahan.
  function isiPilihanWilayah() {
    const isi = (id, daftar, placeholder = "") => {
      const el = document.getElementById(id);
      if (!el) return;
      const lama = el.value;
      el.replaceChildren();
      if (placeholder) {
        const opsi = document.createElement("option");
        opsi.value = "";
        opsi.textContent = placeholder;
        el.appendChild(opsi);
      }
      daftar.forEach((nilai) => {
        const opsi = document.createElement("option");
        opsi.value = nilai;
        opsi.textContent = nilai;
        el.appendChild(opsi);
      });
      if (daftar.includes(lama)) el.value = lama;
    };
    isi("rw", RW);
    isi("rt", RT, document.querySelector('#fDaftar #rt') ? "Pilih RT" : "");
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", isiPilihanWilayah, { once: true });
  } else {
    isiPilihanWilayah();
  }

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const fmtInt = (n) => Math.round(Number(n)).toLocaleString("id-ID");
  const rupiah = (n) => "Rp " + fmtInt(n);
  const bulat1 = (n) => Math.round(n * 10) / 10;

  const baca = (k, d) => {
    try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }
    catch { return d; }
  };
  const tulis = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch { return false; }
  };

  const nomorBaru = () => {
    const n = baca("elola_nomor", 0) + 1;
    tulis("elola_nomor", n);
    return n;
  };

  function notif(tipe, teks, wadahId = "notif") {
    const n = $(wadahId);
    if (!n) return;
    n.className = "notif " + tipe;
    n.textContent = teks;
  }

  const tglJam = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + ", " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  };

  return { JENIS, KUOTA_ASN, POIN_RUPIAH, RW, RT, $, fmt, fmtInt, rupiah, bulat1, baca, tulis, nomorBaru, notif, tglJam };
})();
