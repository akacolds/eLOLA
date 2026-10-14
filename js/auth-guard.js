// js/auth-guard.js - Navigasi, sesi, proteksi rute, dan menu
window.ElolaAuth = (() => {
  const { $, el, baca } = window.ElolaUtils;
  const AWAL = {
    warga: "/warga/setoran.html",
    asn: "/warga/setoran.html",
    petugas: "/petugas/verifikasi.html",
    admin: "/admin/dashboard.html"
  };
  const NAMA_PERAN = { warga: "Warga", asn: "ASN", petugas: "Petugas", admin: "Admin DLH" };
  const IKON = {
    setor: '<path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8z"/><path d="M3.5 8h17M9 8V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V8"/>',
    dompet: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/>',
    rank: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>',
    cek: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 9h6M9 13h2M9 17h3M13.5 15.5l1.5 1.5 3-3"/>',
    kota: '<path d="M4 20V9l8-5 8 5v11M9 20v-6h6v6"/>'
  };

  const MENU = {
    setor: ["/warga/setoran.html", "Setor Sampah", "setor"],
    dompet: ["/warga/dompet.html", "Dompet & Hadiah", "dompet"],
    admin: ["/admin/dashboard.html", "Pusat Kendali", "kota"],
    verif: ["/petugas/verifikasi.html", "Verifikasi Antrean", "cek"],
    rank: ["/peringkat.html", "Klasemen", "rank"]
  };

  function pengguna() {
    const s = baca("elola_sesi", null);
    if (!s) return null;
    const a = baca("elola_akun", {})[s.id];
    return a ? { id: s.id, nama: a.nama, peran: a.peran, rw: a.rw || "", rt: a.rt || "", kelurahan: a.kelurahan || "", foto: a.foto || "", email: a.email || "" } : null;
  }

  function keluar() {
    try { localStorage.removeItem("elola_sesi"); } catch {}
    location.href = "/index.html";
  }

  const inisial = (nama) => (String(nama || "?").trim().split(/\s+/).slice(0, 2).map(k => k[0]).join("") || "?").toUpperCase();

  function avatar(u, besar) {
    const a = el("span", { class: "avatar" + (besar ? " besar" : ""), "aria-hidden": "true" });
    if (u.foto) a.append(el("img", { src: u.foto, alt: "" })); else a.textContent = inisial(u.nama);
    return a;
  }

  function tombolProfil(u) {
    const kanan = document.querySelector(".kiri");
    if (!kanan) return;
    const t = el("a", { href: "#", class: "profil-btn", "aria-label": "Profil saya: " + u.nama, onclick: (e) => { e.preventDefault(); alert("Profil akun: " + u.nama + " (" + u.id + ")"); } },
      avatar(u), el("span", { class: "profil-nama", text: u.nama.split(" ")[0] }));
    kanan.prepend(el("div", { class: "bar-atas" }, t));
  }

  function guard(boleh) {
    const u = pengguna();
    if (!u) { location.replace("/index.html"); return false; }
    if (!boleh.includes(u.peran)) { location.replace(AWAL[u.peran]); return false; }
    
    if ($("salam")) $("salam").textContent = "Halo, " + u.nama.split(" ")[0] + ".";
    if ($("peranLabel")) $("peranLabel").textContent = NAMA_PERAN[u.peran] + ", " + u.id;
    
    const daftar = (u.peran === "warga" || u.peran === "asn") 
      ? ["setor", "dompet", "rank"] 
      : (u.peran === "admin" ? ["admin", "verif", "rank"] : ["verif", "rank"]);
    
    const menuEl = $("menu");
    if (menuEl) {
      const pathSekarang = window.location.pathname;
      menuEl.replaceChildren(...daftar.map(k => {
        const [href, label, ikon] = MENU[k];
        const aktif = pathSekarang.endsWith(href.replace(/^\//, ""));
        const a = el("a", { href, class: aktif ? "aktif" : false, "aria-current": aktif ? "page" : false });
        a.insertAdjacentHTML("afterbegin", '<svg viewBox="0 0 24 24" aria-hidden="true">' + IKON[ikon] + "</svg>");
        a.append(document.createTextNode(label));
        return a;
      }));
    }
    tombolProfil(u);
    return true;
  }

  return { pengguna, keluar, guard, AWAL, NAMA_PERAN, IKON, avatar };
})();