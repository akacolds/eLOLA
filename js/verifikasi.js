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
      await window.SupabaseDB.verifikasiSetoran(id, {
        aksi,
        namaPetugas: user.nama || user.email,
        alasan: aksi === "tolak" ? "Tidak memenuhi kriteria pilah sampah." : ""
      });
      notif("ok", `Setoran #${id} berhasil di-${aksi}`);
      muatAntrean();
    } catch (e) {
      notif("err", e.message);
    }
  };

  muatAntrean();
});
