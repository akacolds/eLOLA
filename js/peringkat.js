document.addEventListener("DOMContentLoaded", async () => {
  const { $, fmtInt } = window.Utils;
  const wilayah = "Wundumbatu";
  const podium = $("podium");
  const daftar = $("daftarRank");

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const norm = (v) => String(v ?? "").trim().replace(/\\s+/g, " ");
  const valid = (v) => norm(v) && !/^(-|null|undefined)$/i.test(norm(v));
  const rwKey = (v) => norm(v).toUpperCase().replace(/^RW\\s*/, "");
  const formatRW = (n) => `RW ${String(n).padStart(2, "0")}`;

  if (podium) podium.innerHTML = "<p>Memuat klasemen RW...</p>";
  if (daftar) daftar.innerHTML = "";

  try {
    const sb = window.SupabaseDB?.getClient();
    if (!sb) throw new Error("Supabase belum tersambung. Periksa koneksi internet lalu muat ulang halaman.");

    const [{ data: profiles, error: profileError }, { data: setoran, error: setoranError }] = await Promise.all([
      sb.from("profiles").select("id, nama, kelurahan, rw, rt"),
      sb.from("setoran").select("id, user_id, rw, rt, poin, kg, status, created_at")
    ]);
    if (profileError) throw profileError;
    if (setoranError) throw setoranError;

    const profilesById = new Map((profiles || []).map(p => [String(p.id), p]));
    const rekap = new Map();
    for (let i = 1; i <= 7; i++) {
      const rw = formatRW(i);
      rekap.set(rwKey(rw), { rw, poin: 0, kg: 0, jumlahSetoran: 0, partisipan: new Set() });
    }

    (setoran || []).filter(s => String(s.status || "").toLowerCase() === "disetujui").forEach(s => {
      const profile = profilesById.get(String(s.user_id));
      if (profile && norm(profile.kelurahan).toLocaleLowerCase("id-ID") !== wilayah.toLocaleLowerCase("id-ID")) return;
      const rwValue = profile && valid(profile.rw) ? profile.rw : s.rw;
      if (!valid(rwValue)) return;
      const key = rwKey(rwValue);
      const item = rekap.get(key);
      if (!item) return;
      item.poin += Number(s.poin) || 0;
      item.kg += Number(s.kg) || 0;
      item.jumlahSetoran += 1;
      item.partisipan.add(String(s.user_id));
    });

    const list = [...rekap.values()].sort((a, b) =>
      b.poin - a.poin || a.rw.localeCompare(b.rw, "id")
    );

    const juara = (item, rank, kelas) => item ? `
      <div class="juara ${kelas}">
        <div class="urut">${rank}</div>
        <b>${esc(item.rw)}</b>
        <small>${fmtInt(Math.round(item.poin))} poin</small>
        <small>${Number(item.kg).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg</small>
      </div>` : "";

    if (podium) {
      podium.innerHTML = list.length >= 3
        ? juara(list[1], 2, "j2") + juara(list[0], 1, "j1") + juara(list[2], 3, "j3")
        : list.map((item, i) => juara(item, i + 1, i === 0 ? "j1" : i === 1 ? "j2" : "j3")).join("");
    }
    if (daftar) {
      daftar.innerHTML = list.map((d, i) => `
        <div class="rank-baris">
          <div style="font-weight:700">#${i + 1}</div>
          <div><b>${esc(d.rw)}</b><small style="display:block;color:var(--abu)">${d.jumlahSetoran} setoran disetujui · ${Number(d.kg).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg · ${d.partisipan.size} pengguna</small></div>
          <div style="font-weight:700">${fmtInt(Math.round(d.poin))} poin</div>
        </div>`).join("");
    }
  } catch (err) {
    console.error("Gagal memuat klasemen:", err);
    if (podium) podium.innerHTML = `<p>Gagal memuat klasemen dari database: ${esc(err.message || "Kesalahan tidak diketahui")}</p>`;
    if (daftar) daftar.innerHTML = "";
  }
});
