document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.AuthGuard(["admin"]);
  if (!user) return;
  const { $, fmt, fmtInt, tglJam, notif } = window.Utils;

  try {
    const [setoran, profiles] = await Promise.all([
      window.SupabaseDB.getSetoran(),
      window.SupabaseDB.getClient().from("profiles").select("id", { count: "exact", head: true })
    ]);
    const sah = setoran.filter(s => s.status === "disetujui");
    const totKg = sah.reduce((sum, item) => sum + (Number(item.kg) || 0), 0);
    const totPoin = sah.reduce((sum, item) => sum + (Number(item.poin) || 0), 0);
    $("stKg").textContent = fmt(totKg) + " kg";
    $("stPoin").textContent = fmtInt(totPoin);
    $("stAkun").textContent = profiles.error ? "—" : String(profiles.count ?? 0);

    $("tabelLog").innerHTML = setoran.map(s => `
      <tr>
        <td>${tglJam(s.created_at)}</td>
        <td>${s.profiles?.nama || "Pengguna"}</td>
        <td>${s.rw || "—"} / ${s.rt || "—"}</td>
        <td>${fmt(Number(s.kg) || 0)} kg</td>
        <td>${fmtInt(Number(s.poin) || 0)}</td>
        <td>${s.foto_url ? `<a href="${s.foto_url}" target="_blank" rel="noopener noreferrer" class="tautan-foto-setoran"><img src="${s.foto_url}" alt="Foto setoran" class="foto-tabel-admin" loading="lazy"><span>Lihat foto</span></a>` : `<span class="foto-belum-ada">Tidak ada</span>`}</td>
        <td><span class="chip ${s.status === "disetujui" ? "ok" : s.status === "ditolak" ? "tolak" : ""}">${s.status || "menunggu"}</span></td>
      </tr>
    `).join("");
  } catch (err) {
    notif("err", "Gagal memuat data Supabase: " + (err.message || "kesalahan tidak diketahui"));
  }
});
