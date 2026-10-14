window.AuthGuard = async (rolesBoleh = []) => {
  const sb = window.supabaseClient;
  if (!sb) {
    console.error("Supabase Client belum terhubung.");
    return null;
  }

  // Cek user yang login via Supabase Auth
  const { data: { user } } = await sb.auth.getUser();

  if (!user) {
    location.replace("/index.html");
    return null;
  }

  // Ambil profil data dari tabel profiles
  try {
    const profil = await window.SupabaseDB.getProfile(user.id);
    if (!profil) {
      location.replace("/index.html");
      return null;
    }

    if (rolesBoleh.length && !rolesBoleh.includes(profil.peran)) {
      if (profil.peran === "admin") location.replace("/admin/dashboard.html");
      else if (profil.peran === "petugas") location.replace("/petugas/verifikasi.html");
      else location.replace("/warga/setoran.html");
      return null;
    }

    const salamEl = document.getElementById("salam");
    if (salamEl && profil.nama) salamEl.textContent = "Halo, " + profil.nama.split(" ")[0] + ".";
    const peranEl = document.getElementById("peranLabel");
    if (peranEl) peranEl.textContent = (profil.peran || "Warga").toUpperCase() + " – " + (profil.nik_nip || profil.rt || "");

    return { ...user, ...profil };
  } catch (err) {
    console.error(err);
    location.replace("/index.html");
    return null;
  }
};

async function keluarAkun() {
  if (window.supabaseClient) {
    await window.supabaseClient.auth.signOut();
  }
  localStorage.removeItem("elola_sesi");
  location.replace("/index.html");
}
