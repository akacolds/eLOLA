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
    // Hanya tombol peran terpilih yang diberi warna hijau.
    [pWarga, pAsn, pPetugas].forEach(btn => {
      if (!btn) return;
      btn.classList.remove("aktif", "utama");
      btn.setAttribute("aria-pressed", "false");
    });
    const tombolTerpilih = p === "warga" ? pWarga : p === "asn" ? pAsn : pPetugas;
    if (tombolTerpilih) {
      tombolTerpilih.classList.add("aktif", "utama");
      tombolTerpilih.setAttribute("aria-pressed", "true");
    }

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

        // Peran utama dibaca dari tabel profiles, bukan dari tombol yang dipilih di form.
        let profil = await window.SupabaseDB.getProfile(data.user.id);
        const peranMetadata = data.user.app_metadata?.peran || data.user.app_metadata?.role || "";
        const normalisasiPeran = (nilai) => {
          const peran = String(nilai || "").trim().toLowerCase();
          if (["admin", "administrator", "admin dlh"].includes(peran)) return "admin";
          if (["petugas", "petugas bank sampah", "staff", "operator"].includes(peran)) return "petugas";
          if (["asn", "pns"].includes(peran)) return "asn";
          if (["warga", "user", "pengguna"].includes(peran)) return "warga";
          return "";
        };

        let peranAkun = normalisasiPeran(profil?.peran) || normalisasiPeran(peranMetadata);

        // Profil baru hanya dibuat untuk peran publik. Pilihan Petugas di UI tidak boleh
        // memberikan hak petugas/admin kepada akun yang belum punya peran resmi di database.
        if (!profil && !peranAkun) {
          if (peranAktif === "petugas") {
            throw new Error("Peran Petugas/Admin belum terdaftar pada profil akun ini. Minta admin mengatur peran di Supabase.");
          }
          const defaultNama = email.split("@")[0].replace(/[._\-\d]+/g, " ");
          const peranPublik = peranAktif === "asn" ? "asn" : "warga";
          const { data: profilBaru, error: errInsert } = await sb
            .from("profiles")
            .insert([{
              id: data.user.id,
              nama: defaultNama,
              peran: peranPublik,
              kelurahan: "Wundumbatu",
              rw: "RW 01",
              rt: "RT 01"
            }])
            .select()
            .maybeSingle();

          if (errInsert) throw errInsert;
          profil = profilBaru || { nama: defaultNama, peran: peranPublik };
          peranAkun = peranPublik;
        }

        // Jangan menebak peran istimewa. Jika data profil bermasalah, arahkan ke warga
        // hanya jika akun memang tidak memiliki peran admin/petugas yang sah.
        peranAkun = peranAkun || "warga";
        notif("ok", "Berhasil masuk! Mengalihkan...");

        setTimeout(() => {
          if (peranAkun === "admin") location.replace("/admin/dashboard.html");
          else if (peranAkun === "petugas") location.replace("/petugas/verifikasi.html");
          else location.replace("/warga/setoran.html");
        }, 350);

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
      const rw = $("rw").value;
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
            kelurahan: "Wundumbatu",
            rw: rw,
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
