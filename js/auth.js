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
    [pWarga, pAsn, pPetugas].forEach(btn => btn && btn.classList.remove("aktif"));
    if (p === "warga" && pWarga) pWarga.classList.add("aktif");
    if (p === "asn" && pAsn) pAsn.classList.add("aktif");
    if (p === "petugas" && pPetugas) pPetugas.classList.add("aktif");

    if (p === "petugas") {
      if (lblIdMasuk) lblIdMasuk.textContent = "Email Petugas / Admin";
      if (idMasuk) idMasuk.placeholder = "petugas@gmail.com";
      if (tDaftar) tDaftar.classList.add("hidden");
      setMode(true);
    } else {
      if (lblIdMasuk) lblIdMasuk.textContent = "Email (Gmail)";
      if (idMasuk) idMasuk.placeholder = "nama@gmail.com";
      if (tDaftar) tDaftar.classList.remove("hidden");
    }
    if (blokAsn) blokAsn.classList.toggle("hidden", p !== "asn");
  }

  function setMode(isMasuk) {
    modeMasuk = isMasuk;
    if (tMasuk) tMasuk.classList.toggle("aktif", isMasuk);
    if (tDaftar) tDaftar.classList.toggle("aktif", !isMasuk);
    if (fMasuk) fMasuk.classList.toggle("hidden", !isMasuk);
    if (fDaftar) fDaftar.classList.toggle("hidden", isMasuk);
  }

  if (pWarga) pWarga.onclick = () => setPeran("warga");
  if (pAsn) pAsn.onclick = () => setPeran("asn");
  if (pPetugas) pPetugas.onclick = () => setPeran("petugas");
  if (tMasuk) tMasuk.onclick = () => setMode(true);
  if (tDaftar) tDaftar.onclick = () => setMode(false);

  // LOGIN
  if (fMasuk) {
    fMasuk.onsubmit = async (e) => {
      e.preventDefault();
      const email = idMasuk.value.trim();
      const password = $("sMasuk").value;
      const btn = fMasuk.querySelector("button[type=submit]");
      
      btn.disabled = true;
      btn.textContent = "Memverifikasi...";

      try {
        const sb = window.SupabaseDB.getClient();
        if (!sb) {
          throw new Error("Koneksi Supabase belum terpasang. Periksa script CDN di file index.html.");
        }

        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Ambil data profil
        let profil = await window.SupabaseDB.getProfile(data.user.id);

        if (!profil) {
          const defaultNama = email.split("@")[0].replace(/[._\-\d]+/g, " ");
          const { data: profilBaru, error: errInsert } = await sb
            .from("profiles")
            .insert([{
              id: data.user.id,
              nama: defaultNama,
              peran: peranAktif,
              kelurahan: "Lalolara",
              rw: "RW 01",
              rt: "RT 01"
            }])
            .select()
            .maybeSingle();

          profil = (!errInsert && profilBaru) ? profilBaru : { peran: peranAktif };
        }

        notif("ok", "Berhasil masuk! Mengalihkan...");

        setTimeout(() => {
          if (profil.peran === "admin") location.href = "/admin/dashboard.html";
          else if (profil.peran === "petugas") location.href = "/petugas/verifikasi.html";
          else location.href = "/warga/setoran.html";
        }, 500);

      } catch (err) {
        console.error("Login error:", err);
        notif("err", err.message || "Gagal masuk. Periksa kembali email dan kata sandi.");
        btn.disabled = false;
        btn.textContent = "Masuk ke eLOLA →";
      }
    };
  }

  // DAFTAR
  if (fDaftar) {
    fDaftar.onsubmit = async (e) => {
      e.preventDefault();
      const nama = $("nama").value.trim();
      const email = $("emailDaftar").value.trim().toLowerCase();
      const password = $("sDaftar").value;
      const rt = $("rt").value;
      const nikNip = $("nikNip") ? $("nikNip").value.trim() : "";
      const btn = fDaftar.querySelector("button[type=submit]");

      btn.disabled = true;
      btn.textContent = "Mendaftarkan...";

      try {
        const sb = window.SupabaseDB.getClient();
        if (!sb) {
          throw new Error("Koneksi Supabase belum terpasang.");
        }

        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user) {
          await sb.from("profiles").insert([{
            id: data.user.id,
            nama: nama,
            peran: peranAktif,
            nik_nip: nikNip,
            kelurahan: "Lalolara",
            rw: "RW 01",
            rt: rt,
            foto: ""
          }]);

          notif("ok", "Akun berhasil dibuat! Silakan masuk.");
          setMode(true);
          idMasuk.value = email;
          $("sMasuk").value = password;
        }
      } catch (err) {
        console.error("Daftar error:", err);
        notif("err", err.message || "Gagal mendaftar.");
      } finally {
        btn.disabled = false;
        btn.textContent = "Buat Akun eLOLA →";
      }
    };
  }
});
