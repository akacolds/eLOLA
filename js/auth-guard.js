window.AuthGuard = ((rolesBoleh = []) => {
  const sesi = window.Utils.baca("elola_sesi", null);
  const akun = window.Utils.baca("elola_akun", {});
  const path = location.pathname;

  if (!sesi || !akun[sesi.id]) {
    location.replace("/index.html");
    return null;
  }

  const u = { id: sesi.id, ...akun[sesi.id] };

  if (rolesBoleh.length && !rolesBoleh.includes(u.peran)) {
    if (u.peran === "admin") location.replace("/admin/dashboard.html");
    else if (u.peran === "petugas") location.replace("/petugas/verifikasi.html");
    else location.replace("/warga/setoran.html");
    return null;
  }

  // Tampilkan info sesi pada navigasi jika elemen ada
  const salamEl = document.getElementById("salam");
  if (salamEl) salamEl.textContent = "Halo, " + u.nama.split(" ")[0];
  const peranEl = document.getElementById("peranLabel");
  if (peranEl) peranEl.textContent = u.peran.toUpperCase() + " – " + u.id;

  return u;
});

function keluarAkun() {
  localStorage.removeItem("elola_sesi");
  location.replace("/index.html");
}
