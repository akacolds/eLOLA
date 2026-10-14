document.addEventListener("DOMContentLoaded", () => {
  window.AuthGuard(["petugas", "admin"]);
  const { $, baca, notif, tglJam } = window.Utils;

  async function muat() {
    const list = (baca("elola_setoran", [])).filter(s => s.status === "menunggu");
    const wadah = $("antrean");
    wadah.innerHTML = list.length ? "" : "<p style='color:var(--abu)'>Tidak ada antrean setoran saat ini.</p>";

    list.forEach(s => {
      const el = document.createElement("div");
      el.className = "setoran-kartu";
      el.innerHTML = `
        <div style="display:flex;justify-content:space-between">
          <b>${s.akun}</b>
          <span>${s.rw} / ${s.rt}</span>
        </div>
        <small>${tglJam(s.waktu)}</small>
        <p style="margin:8px 0">${Object.entries(s.rincian).map(([k, v]) => `${k}:${v}kg`).join(", ")}</p>
        <div style="display:flex;gap:8px">
          <button class="tombol-kecil utama" onclick="prosesVerif(${s.nomor}, 'setujui')">Setujui</button>
          <button class="tombol-kecil bahaya" onclick="prosesVerif(${s.nomor}, 'tolak')">Tolak</button>
        </div>
      `;
      wadah.append(el);
    });
  }

  window.prosesVerif = async (nomor, aksi) => {
    try {
      await window.SupabaseDB.verifikasiSetoran(nomor, aksi, null, aksi === "tolak" ? "Ditolak petugas" : "");
      notif("ok", `Setoran S${String(nomor).padStart(5, '0')} berhasil di-${aksi}`);
      muat();
    } catch (e) {
      notif("err", e.message);
    }
  };

  muat();
});
