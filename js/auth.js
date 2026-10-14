document.addEventListener("DOMContentLoaded", () => {
  const { $, notif } = window.Utils;
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
      lblIdMasuk.textContent = "Email Petugas / Admin";
      idMasuk.placeholder = "petugas@kendari.go.id";
      tDaftar.classList.add("hidden");
      setMode(true);
    } else {
      lblIdMasuk.textContent = "Email";
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

  // LOGIN SUPABASE
  fMasuk.onsubmit = async (e) => {
    e.preventDefault();
    const email = idMasuk.value.trim();
    const password = $("sMasuk").value;
    const btn = fMasuk.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Memverifikasi...";

    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Ambil profile peran
      const profil = await window.SupabaseDB.getProfile(data.user.id);
      notif("ok", "Berhasil masuk!");

      if (profil.peran === "admin") location.href = "/admin/dashboard.html";
      else if (profil.peran === "petugas") location.href = "/petugas/verifikasi.html";
      else location.href = "/warga/setoran.html";
    } catch (err) {
      notif("err", err.message || "Email atau kata sandi tidak sesuai.");
      btn.disabled = false; btn.textContent = "Masuk ke eLOLA →";
    }
  };

  // DAFTAR SUPABASE
  fDaftar.onsubmit = async (e) => {
    e.preventDefault();
    const nama = $("nama").value.trim();
    const email = $("emailDaftar").value.trim().toLowerCase();
    const password = $("sDaftar").value;
    const rt = $("rt").value;
    const nikNip = $("nikNip") ? $("nikNip").value.trim() : "";
    const btn = fDaftar.querySelector("button[type=submit]");

    btn.disabled = true; btn.textContent = "Mendaftarkan...";

    try {
      // 1. Auth SignUp
      const { data, error } = await window.supabaseClient.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        // 2. Tambah data ke tabel profiles (sesuai ERD profiles)
        await window.supabaseClient.from("profiles").insert([{
          id: data.user.id,
          nama: nama,
          peran: peranAktif,
          nik_nip: nikNip,
          kelurahan: "Lalolara",
          rw: "RW 01",
          rt: rt,
          foto: ""
        }]);

        notif("ok", "Pendaftaran berhasil! Mengalihkan...");
        setTimeout(() => { location.href = "/warga/setoran.html"; }, 1000);
      }
    } catch (err) {
      notif("err", err.message);
      btn.disabled = false; btn.textContent = "Buat Akun eLOLA →";
    }
  };
});
