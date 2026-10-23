document.addEventListener("DOMContentLoaded", async () => {
  const { $, fmtInt } = window.Utils;
  const wilayah = "Wundumbatu";
  const podium = $("podium");
  const daftar = $("daftarRank");

  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const norm = (v) => String(v ?? "").trim().replace(/\s+/g, " ");
  const keyOf = (rw, rt) => `${norm(rw).toUpperCase()}|${norm(rt).toUpperCase()}`;
  const valid = (v) => norm(v) && !/^(-|null|undefined)$/i.test(norm(v));

  if (podium) podium.innerHTML = "<p>Memuat klasemen dari database...</p>";
  if (daftar) daftar.innerHTML = "";

  try {
    const sb = window.SupabaseDB?.getClient();
    if (!sb) throw new Error("Supabase belum tersambung. Periksa koneksi internet lalu muat ulang halaman.");

    // RT/RW diambil dari profil yang benar-benar tersimpan di database,
    // bukan daftar RT/RW contoh yang ditulis tetap di JavaScript.
    const [{ data: profiles, error: profileError }, { data: setoran, error: setoranError }] = await Promise.all([
      sb.from("profiles").select("id, nama, kelurahan, rw, rt"),
      sb.from("setoran").select("id, user_id, rw, rt, poin, kg, status, created_at")
    ]);
    if (profileError) throw profileError;
    if (setoranError) throw setoranError;

    const profilWundumbatu = (profiles || []).filter(p =>
      norm(p.kelurahan).toLocaleLowerCase("id-ID") === wilayah.toLocaleLowerCase("id-ID") && valid(p.rw) && valid(p.rt)
    );

    const rekap = new Map();
    const profilById = new Map((profiles || []).map(p => [String(p.id), p]));

    // Tampilkan semua pasangan RT/RW yang ada pada profil Kelurahan Wundumbatu,
    // termasuk wilayah yang belum punya setoran.
    profilWundumbatu.forEach(p => {
      const k = keyOf(p.rw, p.rt);
      if (!rekap.has(k)) rekap.set(k, {
        rw: norm(p.rw), rt: norm(p.rt), poin: 0, kg: 0, jumlahSetoran: 0
      });
    });

    // Hanya setoran yang sudah disetujui masuk hitungan. Lokasi profil terkini
    // diprioritaskan agar rekap mengikuti RT/RW pengguna di database.
    (setoran || []).filter(s => String(s.status || "").toLowerCase() === "disetujui").forEach(s => {
      const p = profilById.get(String(s.user_id));
      if (p && norm(p.kelurahan).toLocaleLowerCase("id-ID") !== wilayah.toLocaleLowerCase("id-ID")) return;
      const rw = p && valid(p.rw) ? p.rw : s.rw;
      const rt = p && valid(p.rt) ? p.rt : s.rt;
      if (!valid(rw) || !valid(rt)) return;
      const k = keyOf(rw, rt);
      // Kalau profil wilayah belum dapat dibaca, setoran Wundumbatu tetap bisa
      // menambahkan pasangan wilayah yang tersimpan di baris setoran.
      if (!rekap.has(k)) rekap.set(k, { rw: norm(rw), rt: norm(rt), poin: 0, kg: 0, jumlahSetoran: 0 });
      const item = rekap.get(k);
      item.poin += Number(s.poin) || 0;
      item.kg += Number(s.kg) || 0;
      item.jumlahSetoran += 1;
    });

    const list = [...rekap.values()].sort((a, b) => b.poin - a.poin || a.rw.localeCompare(b.rw, "id") || a.rt.localeCompare(b.rt, "id"));
    if (!list.length) {
      if (podium) podium.innerHTML = `<p>Belum ada data RT/RW untuk Kelurahan ${wilayah}. Pastikan kolom kelurahan, rw, dan rt di tabel profiles sudah terisi.</p>`;
      if (daftar) daftar.innerHTML = "";
      return;
    }

    const juara = (item, rank, kelas) => item ? `
      <div class="juara ${kelas}">
        <div class="urut">${rank}</div>
        <b>${esc(item.rt)} / ${esc(item.rw)}</b>
        <small>${fmtInt(item.poin)} poin</small>
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
          <div><b>${esc(d.rt)} / ${esc(d.rw)}</b><small style="display:block;color:var(--abu)">${d.jumlahSetoran} setoran disetujui · ${Number(d.kg).toLocaleString("id-ID", { maximumFractionDigits: 1 })} kg</small></div>
          <div style="font-weight:700">${fmtInt(d.poin)} poin</div>
        </div>`).join("");
    }
  } catch (err) {
    console.error("Gagal memuat klasemen:", err);
    if (podium) podium.innerHTML = `<p>Gagal memuat klasemen dari database: ${esc(err.message || "Kesalahan tidak diketahui")}</p>`;
    if (daftar) daftar.innerHTML = "";
  }
});
