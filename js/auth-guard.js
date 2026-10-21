window.AuthGuard = async (rolesBoleh = []) => {
  const sb = window.SupabaseDB ? window.SupabaseDB.getClient() : null;
  if (!sb) {
    location.replace("/index.html");
    return null;
  }

  // 1. Ambil session / user dari token Supabase yang sudah tersimpan
  const { data: { user }, error: errUser } = await sb.auth.getUser();

  if (errUser || !user) {
    location.replace("/index.html");
    return null;
  }

  // 2. Ambil data profil dari tabel profiles
  let profil = null;
  try {
    profil = await window.SupabaseDB.getProfile(user.id);
  } catch (e) {
    console.warn("Gagal membaca profiles:", e);
  }

  // Fallback jika baris di profiles belum ada
  if (!profil) {
    profil = {
      id: user.id,
      nama: (user.email || "").split("@")[0],
      peran: "warga",
      rw: "RW 01",
      rt: "RT 01"
    };
  }

  // 3. Validasi peran akses halaman
  if (rolesBoleh.length && !rolesBoleh.includes(profil.peran)) {
    if (profil.peran === "admin") location.replace("/admin/dashboard.html");
    else if (profil.peran === "petugas") location.replace("/petugas/verifikasi.html");
    else location.replace("/warga/setoran.html");
    return null;
  }

  // 4. Update teks salam di sidebar
  const salamEl = document.getElementById("salam");
  if (salamEl && profil.nama) salamEl.textContent = "Halo, " + profil.nama.split(" ")[0] + ".";
  const peranEl = document.getElementById("peranLabel");
  if (peranEl) peranEl.textContent = (profil.peran || "Warga").toUpperCase() + " – " + (profil.rt || "");

  return { ...user, ...profil };
};

async function keluarAkun() {
  if (window.SupabaseDB) {
    await window.SupabaseDB.getClient().auth.signOut();
  }
  location.replace("/index.html");
}
