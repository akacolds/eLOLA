document.addEventListener("DOMContentLoaded", async () => {
  const { $, fmtInt } = window.Utils;
  const podium = $("podium");
  const daftar = $("daftarRank");

  const tampilkanPesan = (pesan) => {
    podium.innerHTML = `<p class="notif gagal" role="alert">${pesan}</p>`;
    daftar.innerHTML = "";
  };
  const aman = (nilai) => String(nilai ?? "-").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  if (!window.SupabaseDB || typeof window.SupabaseDB.getKlasemenRT !== "function") {
    tampilkanPesan("Fitur klasemen belum siap. Periksa file JavaScript eLOLA.");
    return;
  }

  try {
    // RPC hanya mengembalikan total per RT/RW untuk setoran yang disetujui.
    const data = await window.SupabaseDB.getKlasemenRT();
    const list = (Array.isArray(data) ? data : []).map((s) => ({
      rw: String(s.rw || "").trim(),
      rt: String(s.rt || "").trim(),
      poin: Number(s.poin) || 0,
      kg: Number(s.kg) || 0
    })).filter((s) => s.rw && s.rt)
      .sort((a, b) => b.poin - a.poin || b.kg - a.kg || a.rw.localeCompare(b.rw) || a.rt.localeCompare(b.rt));

    if (!list.length) {
      podium.innerHTML = '<p class="notif" role="status">Belum ada setoran yang disetujui untuk ditampilkan.</p>';
      daftar.innerHTML = "";
      return;
    }

    const kelas = { 0: "j1", 1: "j2", 2: "j3" };
    podium.innerHTML = [1, 0, 2].filter((idx) => list[idx]).map((idx) => {
      const d = list[idx];
      return `<div class="juara ${kelas[idx]}">
        <div class="urut">${idx + 1}</div>
        <b>${aman(d.rt)} / ${aman(d.rw)}</b>
        <small>${fmtInt(d.poin)} poin</small>
        <small>${d.kg.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg</small>
      </div>`;
    }).join("");

    daftar.innerHTML = list.slice(3).map((d, i) => `
      <div class="rank-baris">
        <div style="font-weight:700">#${i + 4}</div>
        <div><b>${aman(d.rt)} / ${aman(d.rw)}</b><small style="display:block">${d.kg.toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg</small></div>
        <div style="font-weight:700">${fmtInt(d.poin)} poin</div>
      </div>`).join("");
  } catch (error) {
    console.error("Gagal memuat klasemen Supabase:", error);
    tampilkanPesan("Klasemen belum dapat dimuat. Jalankan SQL setup-klasemen.sql di Supabase, lalu muat ulang halaman.");
  }
});
