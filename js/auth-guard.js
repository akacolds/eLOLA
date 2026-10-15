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

  // Normalisasi peran agar nilai seperti "Admin" tetap dikenali.
  const normRole = (value) => {
    const role = String(value || "").trim().toLowerCase();
    if (["admin", "administrator", "admin dlh"].includes(role)) return "admin";
    if (["petugas", "petugas bank sampah", "staff", "operator"].includes(role)) return "petugas";
    if (["asn", "pns"].includes(role)) return "asn";
    if (["warga", "user", "pengguna"].includes(role)) return "warga";
    return "";
  };

  // Gunakan profil database terlebih dahulu, lalu app_metadata yang dikelola server.
  const roleMetadata = user.app_metadata?.peran || user.app_metadata?.role || "";
  const roleAktif = normRole(profil?.peran) || normRole(roleMetadata) || "warga";
  profil = {
    id: user.id,
    nama: profil?.nama || (user.email || "").split("@")[0],
    rw: profil?.rw || "RW 01",
    rt: profil?.rt || "RT 01",
    ...profil,
    peran: roleAktif
  };

  // 3. Validasi peran akses halaman
  const daftarRole = rolesBoleh.map(normRole);
  if (daftarRole.length && !daftarRole.includes(roleAktif)) {
    if (roleAktif === "admin") location.replace("/admin/dashboard.html");
    else if (roleAktif === "petugas") location.replace("/petugas/verifikasi.html");
    else location.replace("/warga/setoran.html");
    return null;
  }

  // 4. Update teks salam di sidebar
  const salamEl = document.getElementById("salam");
  if (salamEl && profil.nama) salamEl.textContent = "Halo, " + profil.nama.split(" ")[0] + ".";
  const peranEl = document.getElementById("peranLabel");
  if (peranEl) peranEl.textContent = (profil.peran || "Warga").toUpperCase() + " – " + (profil.rt || "");

  // Isi chip profil pada topbar jika halaman memilikinya.
  const profilNamaEl = document.getElementById("profilNama");
  const profilPeranEl = document.getElementById("profilPeran");
  const profilAvatarEl = document.getElementById("profilAvatar");
  if (profilNamaEl) profilNamaEl.textContent = profil.nama || (user.email || "Pengguna").split("@")[0];
  if (profilPeranEl) profilPeranEl.textContent = (profil.peran || "warga") + (profil.rt ? " · " + profil.rt : "");
  if (profilAvatarEl) profilAvatarEl.textContent = (profil.nama || user.email || "U").trim().charAt(0).toUpperCase();

  return { ...user, ...profil };
};

async function keluarAkun() {
  if (window.SupabaseDB) {
    await window.SupabaseDB.getClient().auth.signOut();
  }
  location.replace("/index.html");
}
