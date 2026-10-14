document.addEventListener("DOMContentLoaded", () => {
  const { $, baca, tulis, notif } = window.Utils;
  let peranAktif = "warga";
  let modeMasuk = true;

  const pWarga = $("pWarga"), pAsn = $("pAsn"), pPetugas = $("pPetugas");
  const fMasuk = $("fMasuk"), fDaftar = $("fDaftar");
  const tMasuk = $("tMasuk"), tDaftar = $("tDaftar");
  const blokAsn = $("blokAsn");
  const idMasuk = $("idMasuk"), lblIdMasuk = $("lblIdMasuk");

  function setPeran(p) {
    peranAktif = p;
    [pWarga, pAsn, pPetugas].forEach(btn => btn.classList.remove("aktif"));
    if (p === "warga") pWarga.classList.add("aktif");
    if (p === "asn") pAsn.classList.add("aktif");
    if (p === "petugas") pPetugas.classList.add("aktif");

    if (p === "petugas") {
      lblIdMasuk.textContent = "ID Petugas / Admin";
      idMasuk.placeholder = "PTG-001 / ADM-001";
      tDaftar.classList.add("hidden");
      setMode(true);
    } else {
      lblIdMasuk.textContent = "Email (Gmail)";
      idMasuk.placeholder = "nama@gmail.com";
      tDaftar.classList.remove("hidden");
    }
    blokAsn.classList.toggle("hidden", p !== "asn");
  }

  function setMode(isMasuk) {
    modeMasuk = isMasuk;
    tMasuk.classList.toggle("aktif", isMasuk);
    tDaftar.classList.toggle("aktif", !isMasuk);
    fMasuk.classList.toggle("hidden", !isMasuk);
    fDaftar.classList.toggle("hidden", isMasuk);
  }

  pWarga.onclick = () => setPeran("warga");
  pAsn.onclick = () => setPeran("asn");
  pPetugas.onclick = () => setPeran("petugas");
  tMasuk.onclick = () => setMode(true);
  tDaftar.onclick = () => setMode(false);

  fMasuk.onsubmit = (e) => {
    e.preventDefault();
    const id = idMasuk.value.trim();
    const sandi = $("sMasuk").value;
    const akun = baca("elola_akun", {});

    const u = akun[id] || akun[id.toLowerCase()];
    if (!u || u.sandi !== sandi) {
      return notif("err", "ID/Email atau Kata Sandi salah.");
    }
    tulis("elola_sesi", { id: id, peran: u.peran, nama: u.nama });

    if (u.peran === "admin") location.href = "/admin/dashboard.html";
    else if (u.peran === "petugas") location.href = "/petugas/verifikasi.html";
    else location.href = "/warga/setoran.html";
  };

  fDaftar.onsubmit = (e) => {
    e.preventDefault();
    const nama = $("nama").value.trim();
    const email = $("emailDaftar").value.trim().toLowerCase();
    const sandi = $("sDaftar").value;
    const rt = $("rt").value;
    const nikNip = $("nikNip") ? $("nikNip").value.trim() : "";

    if (!nama || !email || sandi.length < 6 || !rt) {
      return notif("err", "Semua kolom wajib diisi dengan benar.");
    }

    const akun = baca("elola_akun", {});
    if (akun[email]) return notif("err", "Email sudah terdaftar.");

    akun[email] = {
      nama, sandi, peran: peranAktif, kelurahan: "Lalolara", rw: "RW 01", rt, nikNip
    };
    tulis("elola_akun", akun);
    tulis("elola_sesi", { id: email, peran: peranAktif, nama });
    location.href = "/warga/setoran.html";
  };
});
