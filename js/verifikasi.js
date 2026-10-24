document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.AuthGuard(["petugas"]);
  if (!user) return;

  const { $, notif, tglJam } = window.Utils;
  const wadah = $("antrean");

  // Modal foto dibuat oleh JS supaya tidak perlu mengubah HTML petugas.
  let modalFoto = document.getElementById("modalFotoSetoran");
  if (!modalFoto) {
    modalFoto = document.createElement("div");
    modalFoto.id = "modalFotoSetoran";
    modalFoto.style.cssText = "display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.78);padding:20px;align-items:center;justify-content:center;";
    modalFoto.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:14px;max-width:900px;width:100%;max-height:92vh;overflow:auto;position:relative">
        <button type="button" id="tutupFotoSetoran" aria-label="Tutup foto" style="float:right;border:0;border-radius:8px;padding:8px 12px;cursor:pointer;font-size:18px">✕</button>
        <h3 style="margin:8px 48px 14px 0">Bukti Foto Setoran</h3>
        <img id="gambarModalSetoran" alt="Foto bukti setoran" style="display:block;width:100%;max-height:72vh;object-fit:contain;border-radius:10px;background:#f2f4f2">
        <p style="margin:10px 0 0"><a id="bukaFotoTabBaru" target="_blank" rel="noopener noreferrer">Buka foto di tab baru ↗</a></p>
      </div>`;
    document.body.append(modalFoto);
    modalFoto.addEventListener("click", e => {
      if (e.target === modalFoto || e.target.id === "tutupFotoSetoran") modalFoto.style.display = "none";
    });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") modalFoto.style.display = "none";
    });
  }

  function aman(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function bukaFoto(url) {
    if (!url) {
      notif("err", "Setoran ini belum memiliki foto bukti.");
      return;
    }
    // Hanya izinkan URL HTTP/HTTPS agar URL tidak bisa menyisipkan skema berbahaya.
    let parsed;
    try { parsed = new URL(url, window.location.href); } catch (_) {
      notif("err", "Alamat foto tidak valid.");
      return;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      notif("err", "Alamat foto tidak aman.");
      return;
    }
    document.getElementById("gambarModalSetoran").src = parsed.href;
    document.getElementById("bukaFotoTabBaru").href = parsed.href;
    modalFoto.style.display = "flex";
  }
  window.bukaFotoSetoran = bukaFoto;

  async function muatAntrean() {
    try {
      const list = (await window.SupabaseDB.getSetoran()).filter(s => String(s.status || "").toLowerCase() === "menunggu");
      const badge = document.getElementById("badgeSetoran"); if (badge) badge.hidden = list.length === 0;
      wadah.innerHTML = "";
      if (!list.length) {
        wadah.innerHTML = "<p style='color:var(--abu)'>Tidak ada antrean setoran saat ini.</p>";
        return;
      }

      list.forEach(s => {
        const namaPenyetor = s.profiles?.nama || s.user_id || "Pengguna";
        const fotoUrl = typeof s.foto_url === "string" ? s.foto_url.trim() : "";
        const rincian = Object.entries(s.rincian || {}).map(([k, v]) => `${aman(k)}: ${aman(typeof v === "object" ? v.kg : v)} kg${typeof v === "object" && v.subtotal_rp != null ? ` (${window.Utils.rupiah(v.subtotal_rp)})` : ""}`).join(", ") || "Rincian belum tersedia";
        const el = document.createElement("article");
        el.className = "setoran-kartu";
        el.innerHTML = `
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <b>${aman(namaPenyetor)}</b>
            <span>${aman(s.rw || "RW -")} / ${aman(s.rt || "RT -")}</span>
          </div>
          <small>${aman(tglJam(s.created_at))}</small>
          <p style="margin:8px 0">${rincian}</p>
          <p style="margin:6px 0"><b>Estimasi berat:</b> ${aman(s.kg ?? s.kg_klaim ?? "-")} kg</p>
          <p style="margin:6px 0"><b>Estimasi nilai:</b> ${aman(window.Utils.rupiah(s.total_rp || 0))}</p>
          <div style="margin:12px 0;padding:12px;border:1px solid #dce8dd;border-radius:12px;background:#f7fbf7">
            ${fotoUrl ? `
              <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                <img src="${aman(fotoUrl)}" alt="Pratinjau bukti setoran" loading="lazy" style="width:96px;height:96px;object-fit:cover;border-radius:10px;background:#e8eee8" onerror="this.style.display='none';this.nextElementSibling.textContent='Pratinjau gagal dimuat. Tekan Lihat Foto untuk mencoba membuka foto.'">
                <div style="flex:1;min-width:150px"><b>Bukti foto tersedia</b><p style="margin:4px 0;color:#526354;font-size:.9rem">Periksa foto sebelum memverifikasi setoran.</p><button type="button" class="tombol-kecil utama js-lihat-foto">📷 Lihat Foto</button></div>
              </div>` : `<b>📷 Foto bukti tidak ditemukan</b><p style="margin:4px 0;color:#526354;font-size:.9rem">Setoran ini tidak memiliki URL foto tersimpan.</p>`}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="tombol-kecil utama js-setujui">Setujui</button>
            <button type="button" class="tombol-kecil bahaya js-tolak">Tolak</button>
          </div>`;

        if (fotoUrl) el.querySelector(".js-lihat-foto").addEventListener("click", () => bukaFoto(fotoUrl));
        el.querySelector(".js-setujui").addEventListener("click", () => window.verif(s.id, "setujui"));
        el.querySelector(".js-tolak").addEventListener("click", () => window.verif(s.id, "tolak"));
        wadah.append(el);
      });
    } catch (err) {
      console.error("Gagal memuat antrean setoran:", err);
      notif("err", `Gagal memuat antrean: ${err.message || "Periksa koneksi dan izin Supabase."}`);
    }
  }

  window.verif = async (id, aksi) => {
    try {
      const alasan = prompt(`Catatan petugas untuk ${aksi === "setujui" ? "persetujuan" : "penolakan"} setoran (wajib):`, "")?.trim();
      if (!alasan) { notif("err", "Catatan petugas wajib diisi sebelum verifikasi."); return; }
      await window.SupabaseDB.verifikasiSetoran(id, {
        aksi,
        namaPetugas: user.nama || user.email,
        alasan
      });
      notif("ok", `Setoran #${id} berhasil di-${aksi === "setujui" ? "setujui" : "tolak"}.`);
      try {
        const sb = window.SupabaseDB?.getClient?.();
        if (sb) {
          const { data: { user: authUser } = {} } = await sb.auth.getUser();
          const { error: logError } = await sb.from("activity_logs").insert({
            user_id: authUser?.id,
            nama: user.nama || user.email || "Petugas",
            aksi: aksi === "setujui" ? "Menyetujui setoran" : "Menolak setoran",
            keterangan: `Setoran #${id}`
          });
          if (logError) console.warn("Aktivitas tidak tercatat:", logError.message);
        }
      } catch (logErr) { console.warn("Gagal menulis log aktivitas:", logErr.message); }
      await muatAntrean();
    } catch (e) {
      console.error("Gagal memverifikasi setoran:", e);
      notif("err", e.message || "Setoran gagal diverifikasi.");
    }
  };

  const antreanTukarEl = document.getElementById("antreanPenukaran");
  const notifTukarEl = document.getElementById("notifTukar");
  function notifTukar(teks, tipe="info") { notifTukarEl.textContent=teks; notifTukarEl.className=`notif ${tipe}`; }
  async function muatAntreanPenukaran() {
    try {
      const list = await window.SupabaseDB.getAntreanPenukaran();
      const badge = document.getElementById("badgeHadiah"); if (badge) badge.hidden = list.length === 0;
      if (!list.length) { antreanTukarEl.innerHTML="<p style='color:var(--abu)'>Tidak ada permintaan penukaran poin yang menunggu.</p>"; return; }
      antreanTukarEl.innerHTML = list.map(t => `<article class="setoran-kartu" style="margin:12px 0;padding:16px;border:1px solid #dce8dd;border-radius:14px">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><b>${aman(t.nama_hadiah || "Hadiah")}</b><span>${Number(t.poin)||0} poin</span></div>
        <small>${aman(t.user_id || "Akun warga/ASN")} · ${aman(tglJam(t.created_at))}</small>
        <p><b>Nomor HP/WA:</b> ${aman(t.nomor_wa || "Tidak diisi")}</p>
        <p><b>Catatan pemohon:</b> ${aman(t.catatan_pengguna || "-")}</p>
        <p>Status: <b>proses</b> (menunggu konfirmasi petugas)</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="tombol-kecil utama js-tukar-setuju" type="button">Setujui & kurangi stok</button><button class="tombol-kecil bahaya js-tukar-tolak" type="button">Tolak</button></div>
      </article>`).join("");
      [...antreanTukarEl.querySelectorAll("article")].forEach((card,i)=>{
        card.querySelector(".js-tukar-setuju").addEventListener("click",()=>prosesAntreanTukar(list[i],"setujui"));
        card.querySelector(".js-tukar-tolak").addEventListener("click",()=>prosesAntreanTukar(list[i],"tolak"));
      });
    } catch(e) { antreanTukarEl.innerHTML=`<p class="notif err">Gagal memuat antrean penukaran: ${aman(e.message)}. Pastikan SQL setup penukaran sudah dijalankan.</p>`; }
  }
  async function prosesAntreanTukar(item, aksi) {
    const catatan = prompt(`Catatan petugas untuk ${aksi === "setujui" ? "persetujuan" : "penolakan"} penukaran (wajib):`, "")?.trim();
    if (!catatan) { notifTukar("Catatan petugas wajib diisi.", "err"); return; }
    if (!confirm(`${aksi === "setujui" ? "Setujui" : "Tolak"} penukaran ${item.nama_hadiah || "hadiah"}?`)) return;
    try {
      await window.SupabaseDB.prosesPenukaran(item.id, aksi, user.nama || user.email || "Petugas", catatan);
      try {
        const sb=window.SupabaseDB.getClient(); const {data:{user:au}={}}=await sb.auth.getUser();
        await sb.from("activity_logs").insert({user_id:au?.id,nama:user.nama||user.email||"Petugas",aksi:aksi==="setujui"?"Menyetujui penukaran poin":"Menolak penukaran poin",keterangan:`Penukaran #${item.id}: ${item.nama_hadiah||"hadiah"}`});
      } catch(logErr) { console.warn("Log penukaran tidak tercatat",logErr.message); }
      notifTukar(`Permintaan penukaran #${item.id} ${aksi === "setujui" ? "disetujui" : "ditolak"}.`, "ok");
      await muatAntreanPenukaran();
    } catch(e) { notifTukar("Gagal memproses penukaran: "+e.message,"err"); }
  }

  // Menu menampilkan satu antrean pada satu waktu agar tiga alur kerja tidak tercampur.
  const bagianMenu = {
    setoran: [document.getElementById("antrean"), document.getElementById("notif")],
    hadiah: [document.getElementById("antreanPenukaran"), document.getElementById("notifTukar")],
    dana: [document.getElementById("antreanDana"), document.getElementById("notifDana")]
  };
  document.querySelectorAll("[data-menu-antrean]").forEach(link => link.addEventListener("click", () => {
    const pilihan = link.dataset.menuAntrean;
    document.querySelectorAll("[data-menu-antrean]").forEach(a => a.classList.toggle("aktif", a === link));
    Object.entries(bagianMenu).forEach(([key, els]) => els.forEach(el => { if (el) el.style.display = key === pilihan ? "" : "none"; }));
    const judul = {setoran:"Antrean Verifikasi Setoran", hadiah:"Antrean Penukaran Poin", dana:"Antrean Penarikan Dana"};
    const h = document.querySelector(".kepala-halaman h1"); if (h) h.textContent = judul[pilihan];
  }));
  // Hitung antrean penarikan untuk titik merah. RLS tetap mengikuti kebijakan Supabase.
  async function muatBadgeDana() {
    try {
      const sb = window.SupabaseDB.getClient();
      const { data, error } = await sb.from("penarikan_dana").select("*").eq("status", "menunggu").order("created_at", { ascending: true });
      if (error) throw error;
      const daftar = data || [];
      const badge = document.getElementById("badgeDana"); if (badge) badge.hidden = daftar.length === 0;
      const area = document.getElementById("antreanDana");
      if (!area) return;
      if (!daftar.length) { area.innerHTML = '<p style="color:var(--abu)">Tidak ada permintaan penarikan dana yang menunggu.</p>'; return; }
      area.innerHTML = daftar.map(d => `<article class="setoran-kartu" style="margin:12px 0;padding:16px;border:1px solid #dce8dd;border-radius:14px">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap"><b>Permintaan #${aman(d.id)}</b><span class="badge-status">MENUNGGU</span></div>
        <small>${aman(tglJam(d.created_at))}</small>
        <p><b>Pemohon:</b> ${aman(d.user_id || "Pengguna")}</p>
        <p><b>Nominal:</b> ${aman(window.Utils.rupiah(d.nominal_rp || 0))} (${aman(d.poin_dipotong || 0)} poin)</p>
        <p><b>Metode:</b> ${aman(d.metode === "cash" ? "Tunai" : (d.provider || "E-wallet"))}</p>
        <p><b>Nomor tujuan:</b> ${aman(d.nomor_tujuan || "-")}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button type="button" class="tombol-kecil utama js-dana-setuju">Tandai sudah dicairkan</button><button type="button" class="tombol-kecil bahaya js-dana-tolak">Tolak</button></div>
      </article>`).join("");
      area.querySelectorAll("article").forEach((card, i) => {
        card.querySelector(".js-dana-setuju").addEventListener("click", () => prosesPenarikan(daftar[i], "setujui"));
        card.querySelector(".js-dana-tolak").addEventListener("click", () => prosesPenarikan(daftar[i], "tolak"));
      });
    } catch (e) {
      const area = document.getElementById("antreanDana"); if (area) area.innerHTML = `<p class="notif err">Gagal memuat antrean penarikan: ${aman(e.message)}</p>`;
    }
  }
  async function prosesPenarikan(item, aksi) {
    const catatan = prompt(`Catatan petugas untuk ${aksi === "setujui" ? "konfirmasi pencairan" : "penolakan"} (wajib):`, "")?.trim();
    if (!catatan) return;
    const label = aksi === "setujui" ? "menandai dana sudah dicairkan" : "menolak permintaan";
    if (!confirm(`Yakin ${label} #${item.id}? Untuk persetujuan, pastikan dana benar-benar sudah dikirim.`)) return;
    try {
      const sb = window.SupabaseDB.getClient();
      const { error } = await sb.rpc("elola_proses_penarikan", { p_id: item.id, p_aksi: aksi, p_catatan: catatan });
      if (error) throw error;
      const areaNotif = document.getElementById("notifDana");
      if (areaNotif) { areaNotif.textContent = `Permintaan #${item.id} berhasil ${aksi === "setujui" ? "ditandai sudah dicairkan" : "ditolak"}.`; areaNotif.className = "notif ok"; }
      await muatBadgeDana();
    } catch (e) {
      const areaNotif = document.getElementById("notifDana");
      if (areaNotif) { areaNotif.textContent = `Gagal memproses penarikan: ${e.message || e}`; areaNotif.className = "notif err"; }
    }
  }

  // Awal: tampilkan menu setoran saja.
  document.querySelectorAll("[data-menu-antrean]").forEach(a => { if (a.dataset.menuAntrean !== "setoran") a.click(); });
  document.querySelector('[data-menu-antrean="setoran"]')?.click();
  muatAntrean();
  muatAntreanPenukaran();
  muatBadgeDana();
  setInterval(() => { muatAntrean(); muatAntreanPenukaran(); muatBadgeDana(); }, 60000);
});
