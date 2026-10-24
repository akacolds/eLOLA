window.Utils = (() => {
  const JENIS = [
    { k: 'Plastik', harga: 700, ket: "Harga per kg" },
    { k: 'Kardus', harga: 800, ket: "Harga per kg" },
    { k: 'Kertas HVS', harga: 1000, ket: "Harga per kg" },
    { k: 'Kertas Buram / koran', harga: 500, ket: "Harga per kg" },
    { k: 'Kertas warna', harga: 150, ket: "Harga per kg" },
    { k: 'Kertas campur', harga: 700, ket: "Harga per kg" },
    { k: 'Besi campur', harga: 2500, ket: "Harga per kg" },
    { k: 'Rancak', harga: 10000, ket: "Harga per kg" },
    { k: 'Besi tebal', harga: 3000, ket: "Harga per kg" },
    { k: 'Besi tipis', harga: 1800, ket: "Harga per kg" },
    { k: 'Alma panci', harga: 17000, ket: "Harga per kg" },
    { k: 'Kuningan', harga: 40000, ket: "Harga per kg" },
    { k: 'Alma kaleng sprite', harga: 11000, ket: "Harga per kg" },
    { k: 'Kaleng biskuit / susu', harga: 1000, ket: "Harga per kg" },
    { k: 'Alma wajan', harga: 11000, ket: "Harga per kg" },
    { k: 'Jergen (Jerigen)', harga: 1000, ket: "Harga per kg" },
    { k: 'Besi Siku', harga: 13000, ket: "Harga per kg" },
    { k: 'Minyak jelantah', harga: 1000, ket: "Harga per kg" },
    { k: 'TBG (Tembaga)', harga: 115000, ket: "Harga per kg" },
    { k: 'Seng', harga: 600, ket: "Harga per kg" },
    { k: 'Aqua gelas', harga: 1400, ket: "Harga per kg" },
    { k: 'Tutup botol warna', harga: 1200, ket: "Harga per kg" },
    { k: 'Pot putih', harga: 3000, ket: "Harga per kg" },
    { k: 'Tutup botol campur', harga: 1000, ket: "Harga per kg" },
    { k: 'Pot warna (Biru Muda)', harga: 400, ket: "Harga per kg" },
    { k: 'Pot Biru Muda botol', harga: 2000, ket: "Harga per kg" },
    { k: 'Pot warna gelas', harga: 400, ket: "Harga per kg" },
    { k: 'Infus', harga: 1000, ket: "Harga per kg" }
  ];
  const KUOTA_ASN = 2.0;
  const POIN_RUPIAH = 100; // 100 poin = Rp10.000
  const RW = ["RW 01", "RW 02", "RW 03", "RW 04", "RW 05"];
  const RT = ["RT 01", "RT 02", "RT 03", "RT 04"];

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
