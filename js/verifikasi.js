document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.AuthGuard(["petugas", "admin"]);
  if (!user) return;

  const { $, notif, tglJam } = window.Utils;

  async function muatAntrean() {
    try {
      const list = (await window.SupabaseDB.getSetoran()).filter(s => s.status === "menunggu");
      const wadah = $("antrean");
      wadah.innerHTML = list.length ? "" : "<p style='color:var(--abu)'>Tidak ada antrean setoran saat ini.</p>";

      list.forEach(s => {
        const namaPenyetor = s.profiles ? s.profiles.nama : s.user_id;
        const el = document.createElement("div");
        el.className = "setoran-kartu";
        el.innerHTML = `
          <div style="display:flex;justify-content:space-between">
            <b>${namaPenyetor}</b>
            <span>${s.rw} / ${s.rt}</span>
          </div>
          <small>${tglJam(s.created_at)}</small>
          <p style="margin:8px 0">${Object.entries(s.rincian || {}).map(([k, v]) => `${k}:${v}kg`).join(", ")}</p>
          <div style="display:flex;gap:8px">
            <button class="tombol-kecil utama" onclick="verif(${s.id}, 'setujui')">Setujui</button>
            <button class="tombol-kecil bahaya" onclick="verif(${s.id}, 'tolak')">Tolak</button>
          </div>
        `;
        wadah.append(el);
      });
    } catch (err) {
      notif("err", err.message);
    }
  }

  window.verif = async (id, aksi) => {
    try {
      const hasil = await window.SupabaseDB.verifikasiSetoran(id, {
        aksi,
        namaPetugas: user.nama || user.email,
        alasan: aksi === "tolak" ? "Tidak memenuhi kriteria pilah sampah." : ""
      });
      try {
        await window.SupabaseDB.logActivity({
          action: aksi === "setujui" ? "approve_deposit" : "reject_deposit",
          actionLabel: aksi === "setujui" ? "Menyetujui setoran" : "Menolak setoran",
          description: `Petugas ${user.nama || user.email} ${aksi === "setujui" ? "menyetujui" : "menolak"} setoran #${id} (${Number(hasil?.kg || 0).toLocaleString("id-ID")} kg).`,
          targetId: id,
          metadata: { status: hasil?.status || (aksi === "setujui" ? "disetujui" : "ditolak"), kg: hasil?.kg || 0 }
        });
      } catch (logError) { console.warn("Setoran diproses, tetapi riwayat aktivitas gagal dicatat:", logError); }
      notif("ok", `Setoran #${id} berhasil di-${aksi}`);
      muatAntrean();
      muatRiwayatAktivitas();
    } catch (e) {
      notif("err", e.message);
    }
  };

  async function muatRiwayatAktivitas() {
    const body = $("tabelAktivitasPetugas");
    if (!body) return;
    try {
      const rows = await window.SupabaseDB.getActivityLogs({ limit: 20, role: "petugas" });
      body.innerHTML = rows.length ? rows.map(a => `<tr><td>${String(tglJam(a.created_at)).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}</td><td>${String(a.action_label || a.action || "Aktivitas").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}</td><td>${String(a.description || "—").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}</td><td>${String(a.target_id || "—").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}</td></tr>`).join("") : '<tr><td colspan="4" class="empty-cell">Belum ada aktivitas petugas.</td></tr>';
    } catch (e) { body.innerHTML = `<tr><td colspan="4" class="empty-cell">Riwayat belum tersedia. Jalankan setup-activity-log.sql. (${String(e.message).replace(/[&<>"']/g, "")})</td></tr>`; }
  }
  $("refreshActivityPetugas")?.addEventListener("click", muatRiwayatAktivitas);
  muatAntrean();
  muatRiwayatAktivitas();
});
