document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.AuthGuard(["admin"]);
  if (!user) return;
  const { $, fmt, fmtInt, tglJam } = window.Utils;
  const sb = window.SupabaseDB?.getClient();
  const statusEl = $("dashboardStatus");
  const escapeHTML = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const val = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== "") ?? "-";
  const toDate = (s) => new Date(s?.created_at || s?.waktu || s?.tanggal || 0);
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  const now = new Date();
  $("periodeASN").value = monthKey(now);
  let profiles = [], setoran = [], hadiah = [], penukaran = [], aktivitas = [];
  let asnRows = [];

  async function ambilTabel(nama, kolom = "*") {
    if (!sb) throw new Error("Koneksi Supabase tidak tersedia.");
    const { data, error } = await sb.from(nama).select(kolom);
    if (error) throw error;
    return data || [];
  }
  function notifStatus(text, tipe = "info") {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `notif ${tipe}`;
  }
  function renderLog() {
    const byId = new Map(profiles.map(p => [String(p.id), p]));
    const sah = setoran.filter(s => String(s.status).toLowerCase() === "disetujui");
    $("stKg").textContent = fmt(sah.reduce((sum,s) => sum + (Number(s.kg ?? s.kg_klaim) || 0), 0)) + " kg";
    $("stPoin").textContent = window.Utils.rupiah(sah.reduce((sum,s) => sum + (Number(s.total_rp) || 0), 0));
    $("stAkun").textContent = fmtInt(profiles.length);
    $("tabelLog").innerHTML = setoran.slice().sort((a,b)=>toDate(b)-toDate(a)).map(s => {
      const p = byId.get(String(s.user_id)) || {};
      const st = String(s.status || "menunggu").toLowerCase();
      return `<tr><td>${escapeHTML(tglJam(s.created_at || s.waktu))}</td><td>${escapeHTML(val(p.nama,s.user_id))}</td><td>${escapeHTML(val(s.rw,"RW -"))} / ${escapeHTML(val(s.rt,"RT -"))}</td><td>${escapeHTML(Number(s.kg ?? s.kg_klaim) || 0)} kg</td><td>${escapeHTML(window.Utils.rupiah(s.total_rp || 0))}</td><td><span class="chip ${st === "disetujui" ? "ok" : st === "ditolak" ? "tolak" : ""}">${escapeHTML(st)}</span></td></tr>`;
    }).join("") || '<tr><td colspan="6">Belum ada data setoran yang dapat dibaca.</td></tr>';
  }
  function renderASN() {
    const periode = $("periodeASN").value || monthKey(new Date());
    const list = profiles.filter(p => String(p.peran || "").toLowerCase() === "asn" || p.is_asn === true);
    const totals = new Map();
    for (const s of setoran) {
      if (String(s.status).toLowerCase() !== "disetujui") continue;
      const d = toDate(s);
      if (!Number.isFinite(d.getTime()) || monthKey(d) !== periode) continue;
      const id = String(s.user_id);
      totals.set(id, (totals.get(id) || 0) + (Number(s.kg ?? s.kg_klaim) || 0));
    }
    asnRows = list.map(p => {
      const kg = Math.round((totals.get(String(p.id)) || 0) * 10) / 10;
      const status = kg >= (window.Utils.KUOTA_ASN || 2) ? "patuh" : kg > 0 ? "belum" : "nihil";
      return { nama: p.nama || p.email || p.id, email: p.email || "", rw: p.rw || "-", rt: p.rt || "-", kg, status };
    });
    const patuh = asnRows.filter(x=>x.status === "patuh").length;
    const belum = asnRows.filter(x=>x.status === "belum").length;
    const nihil = asnRows.filter(x=>x.status === "nihil").length;
    $("asnPatuh").textContent = patuh; $("asnBelum").textContent = belum; $("asnNihil").textContent = nihil;
    const q = $("cariASN").value.trim().toLowerCase();
    const filter = $("filterStatusASN").value;
    const visible = asnRows.filter(x => (filter === "semua" || x.status === filter) && `${x.nama} ${x.email} ${x.rw} ${x.rt}`.toLowerCase().includes(q));
    $("tabelASN").innerHTML = visible.map(x => `<tr><td>${escapeHTML(x.nama)}</td><td>${escapeHTML(x.rw)} / ${escapeHTML(x.rt)}</td><td>${fmt(x.kg)} kg</td><td><span class="chip ${x.status === "patuh" ? "ok" : x.status === "nihil" ? "tolak" : ""}">${x.status === "patuh" ? "Memenuhi target" : x.status === "nihil" ? "Belum menyetor" : "Belum mencapai 2 kg"}</span></td></tr>`).join("") || '<tr><td colspan="4">Tidak ada ASN yang cocok.</td></tr>';
  }
  function renderTren() {
    const wadah = $("trenSetoran");
    const daftar = [];
    const awal = new Date(); awal.setDate(1); awal.setHours(0,0,0,0); awal.setMonth(awal.getMonth()-5);
    for (let i=0;i<6;i++) {
      const d = new Date(awal); d.setMonth(awal.getMonth()+i);
      const key = monthKey(d);
      const kg = setoran.reduce((sum,s) => {
        if (String(s.status).toLowerCase() !== "disetujui") return sum;
        const tanggal = toDate(s);
        return sum + (Number.isFinite(tanggal.getTime()) && monthKey(tanggal) === key ? Number(s.kg ?? s.kg_klaim) || 0 : 0);
      }, 0);
      daftar.push({ label: d.toLocaleDateString("id-ID", {month:"short", year:"2-digit"}), kg });
    }
    const maks = Math.max(1, ...daftar.map(x=>x.kg));
    wadah.innerHTML = daftar.map(x=>`<div class="tren-item"><div class="tren-label">${escapeHTML(x.label)}</div><div class="tren-track"><i style="width:${Math.max(0,Math.min(100,x.kg/maks*100))}%"></i></div><b>${fmt(x.kg)} kg</b></div>`).join("");
  }
  function renderPengguna() {
    const q = $("cariPengguna").value.trim().toLowerCase();
    const visible = profiles.filter(p => `${p.nama||""} ${p.email||""} ${p.peran||""} ${p.kelurahan||""} ${p.rw||""} ${p.rt||""}`.toLowerCase().includes(q));
    $("tabelPengguna").innerHTML = visible.map(p=>`<tr><td>${escapeHTML(val(p.nama,p.id))}</td><td>${escapeHTML(val(p.email))}</td><td>${escapeHTML(val(p.peran))}</td><td>${escapeHTML([p.kelurahan,p.rw,p.rt].filter(Boolean).join(" / ") || "-")}</td></tr>`).join("") || '<tr><td colspan="4">Tidak ada pengguna yang cocok atau data profil tidak tersedia.</td></tr>';
  }
  function renderHadiah() {
    $("jumlahHadiah").textContent = hadiah.length;
    $("stokHadiah").textContent = fmtInt(hadiah.reduce((n,h)=>n+(Number(h.stok)||0),0));
    $("jumlahTukar").textContent = penukaran.length;
    $("tabelHadiah").innerHTML = hadiah.map(h=>`<tr><td>${escapeHTML(val(h.nama,h.judul,h.name))}<small style="display:block">${escapeHTML(val(h.deskripsi,""))}</small></td><td>${fmtInt(h.harga ?? h.poin ?? 0)}</td><td>${fmtInt(h.stok ?? 0)}</td><td><button class="tombol-kecil utama" data-edit-hadiah="${escapeHTML(h.id)}" type="button">Edit</button> <button class="tombol-kecil" data-hapus-hadiah="${escapeHTML(h.id)}" type="button">Hapus</button></td></tr>`).join("") || '<tr><td colspan="4">Tabel hadiah kosong atau tidak tersedia.</td></tr>';
    $("statusHadiah").textContent = "Bisa mengedit, menambah, dan menghapus hadiah. Perubahan disimpan ke Supabase.";
    $("statusHadiah").className = "notif info";
  }
  function pesanHadiah(teks, tipe="info") { const el=$("pesanHadiahForm"); el.textContent=teks; el.className=`notif ${tipe}`; }
  function bukaFormHadiah(h=null) {
    $("formHadiah").reset(); $("hadiahId").value=h?.id ?? "";
    $("hadiahNama").value=h?.nama ?? ""; $("hadiahDeskripsi").value=h?.deskripsi ?? "";
    $("hadiahHarga").value=h?.harga ?? ""; $("hadiahStok").value=h?.stok ?? 0;
    $("judulModalHadiah").textContent=h ? "Edit Hadiah" : "Tambah Hadiah";
    $("pesanHadiahForm").className="notif hidden"; $("modalHadiah").classList.remove("hidden");
  }
  async function catatAktivitas(aksi, keterangan="") {
    if (!sb) return;
    const { data: { user: authUser } = {} } = await sb.auth.getUser();
    const profile = profiles.find(p=>String(p.id)===String(authUser?.id)) || {};
    const payload={user_id:authUser?.id, nama:profile.nama || authUser?.email || "Admin", aksi, keterangan};
    const {error}=await sb.from("activity_logs").insert(payload);
    if(error) console.warn("Log aktivitas gagal disimpan:",error.message);
  }
  async function muatAktivitas() {
    try { aktivitas=await ambilTabel("activity_logs"); $("statusAktivitas").textContent="Riwayat aktivitas dari Supabase."; $("statusAktivitas").className="notif ok"; }
    catch(e) { aktivitas=[]; $("statusAktivitas").textContent="Riwayat belum aktif: jalankan file setup-activity-log.sql di SQL Editor Supabase. " + e.message; $("statusAktivitas").className="notif info"; }
    renderAktivitas();
  }
  function renderRiwayatTukar() {
    const status = $("statusRiwayatTukar");
    const tbody = $("tabelRiwayatTukar");
    if (!penukaran.length) {
      tbody.innerHTML = '<tr><td colspan="9">Belum ada permintaan penukaran atau data tidak tersedia.</td></tr>';
      status.textContent = "Riwayat penukaran dibaca dari Supabase.";
      status.className = "notif info";
      return;
    }
    const byId = new Map(profiles.map(p => [String(p.id), p]));
    tbody.innerHTML = penukaran.slice().sort((a,b)=>toDate(b)-toDate(a)).map(t => {
      const p = byId.get(String(t.user_id)) || {};
      const st = String(t.status || "disetujui").toLowerCase();
      const labelStatus = st === "menunggu" ? "proses" : st;
      return `<tr><td>${escapeHTML(tglJam(t.created_at))}</td><td>${escapeHTML(val(p.nama,p.email,t.user_id))}</td><td>${escapeHTML(val(t.nama_hadiah))}</td><td>${fmtInt(t.poin||0)}</td><td><span class="chip ${st === "disetujui" ? "ok" : st === "ditolak" ? "tolak" : ""}">${escapeHTML(labelStatus)}</span></td><td>${escapeHTML(val(t.petugas))}</td><td>${escapeHTML(val(t.nomor_wa))}</td><td>${escapeHTML(val(t.catatan_pengguna))}</td><td>${escapeHTML(val(t.catatan))}</td></tr>`;
    }).join("");
    status.textContent = `Menampilkan ${penukaran.length} transaksi penukaran dari Supabase.`;
    status.className = "notif ok";
  }
  function renderAktivitas() {
    $("tabelAktivitas").innerHTML = aktivitas.slice().sort((a,b)=>toDate(b)-toDate(a)).slice(0,100).map(a=>`<tr><td>${escapeHTML(tglJam(a.created_at || a.waktu))}</td><td>${escapeHTML(val(a.nama,a.actor_name,a.user_id,a.aktor))}</td><td>${escapeHTML(val(a.aksi,a.action,a.aktivitas,a.event))}</td><td>${escapeHTML(val(a.keterangan,a.detail,a.deskripsi,a.target))}</td></tr>`).join("") || '<tr><td colspan="4">Belum ada aktivitas atau tabel log belum disiapkan.</td></tr>';
  }
  async function eksporCSV() {
    await catatAktivitas("Ekspor rekap ASN", `Periode ${$("periodeASN").value || monthKey(new Date())}`);
    const rows = [["Nama ASN","Email","RW","RT","Berat disetujui (kg)","Status"], ...asnRows.map(x=>[x.nama,x.email,x.rw,x.rt,x.kg,x.status])];
    const csv = rows.map(row=>row.map(v=>'"'+String(v ?? "").replace(/"/g,'""')+'"').join(",")).join("\r\n");
    const blob = new Blob(["\ufeff"+csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href=url; a.download=`rekap-asn-${$("periodeASN").value || monthKey(new Date())}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  $("periodeASN").addEventListener("change", renderASN);
  $("filterStatusASN").addEventListener("change", renderASN);
  $("cariASN").addEventListener("input", renderASN);
  $("cariPengguna").addEventListener("input", renderPengguna);
  $("eksporASN").addEventListener("click", eksporCSV);
  $("cetakASN").addEventListener("click", () => {
    renderASN();
    const periode = $("periodeASN").value || monthKey(new Date());
    const win = window.open("", "_blank");
    if (!win) { alert("Izinkan pop-up untuk membuat PDF."); return; }
    const rows = asnRows.map(x=>`<tr><td>${escapeHTML(x.nama)}</td><td>${escapeHTML(x.email)}</td><td>${escapeHTML(x.rw)} / ${escapeHTML(x.rt)}</td><td>${fmt(x.kg)} kg</td><td>${escapeHTML(x.status === "patuh" ? "Memenuhi target" : x.status === "nihil" ? "Belum menyetor" : "Belum mencapai 2 kg")}</td></tr>`).join("");
    win.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Rekap ASN ${escapeHTML(periode)}</title><style>body{font:12px Arial,sans-serif;padding:24px;color:#123}h1{font-size:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #bbb;padding:8px;text-align:left}th{background:#eaf5ed}@media print{button{display:none}}</style></head><body><h1>eLOLA - Rekap Setoran ASN</h1><p>Kelurahan Wundumbatu · Periode ${escapeHTML(periode)} · Target 2 kg</p><table><thead><tr><th>Nama</th><th>Email</th><th>Wilayah</th><th>Berat disetujui</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><p>Dicetak: ${new Date().toLocaleString("id-ID")}</p><script>window.onload=()=>window.print()<\/script></body></html>`);
    win.document.close();
  });

  try {
    // Baca sumber data langsung dari Supabase, bukan localStorage yang hanya tersimpan di browser.
    try { profiles = await ambilTabel("profiles"); }
    catch (e) {
      console.warn("Tabel profiles tidak dapat dibaca:", e.message);
      try { profiles = await ambilTabel("users"); } catch (e2) { throw new Error("Gagal membaca profiles/users: " + e2.message); }
    }
    try { setoran = await ambilTabel("setoran"); }
    catch (e) { throw new Error("Gagal membaca setoran: " + e.message); }
    renderLog(); renderASN(); renderTren(); renderPengguna();
    notifStatus(`Data Supabase berhasil dimuat. ${profiles.length} pengguna, ${setoran.length} setoran.`, "ok");
  } catch (e) {
    console.error("Dashboard admin gagal memuat data:", e);
    notifStatus("Dashboard belum dapat memuat data: " + (e.message || "periksa koneksi dan izin SELECT/RLS Supabase."), "err");
    $("tabelLog").innerHTML = `<tr><td colspan="6">${escapeHTML(e.message || "Data gagal dimuat")}</td></tr>`;
  }
  try {
    hadiah = await ambilTabel("hadiah");
    try { penukaran = await ambilTabel("penukaran"); } catch (e) { console.warn("Tabel penukaran belum bisa dibaca:", e.message); }
    renderHadiah(); renderRiwayatTukar();
  } catch (e) {
    $("statusHadiah").textContent = "Katalog tidak dapat dimuat: " + e.message;
    $("statusHadiah").className = "notif err";
  }
  await catatAktivitas("Membuka dashboard admin", "Dashboard dimuat");
  await muatAktivitas();
  $("tambahHadiah").addEventListener("click",()=>bukaFormHadiah());
  $("muatUlangHadiah").addEventListener("click",async()=>{try{hadiah=await ambilTabel("hadiah");renderHadiah();penukaran=await ambilTabel("penukaran");renderRiwayatTukar();}catch(e){$("statusHadiah").textContent=e.message;$("statusHadiah").className="notif err";}});
  $("tutupModalHadiah").addEventListener("click",()=>$("modalHadiah").classList.add("hidden"));
  $("tabelHadiah").addEventListener("click",async ev=>{
    const edit=ev.target.closest("[data-edit-hadiah]"); const hapus=ev.target.closest("[data-hapus-hadiah]");
    if(edit){const h=hadiah.find(x=>String(x.id)===edit.dataset.editHadiah);if(h)bukaFormHadiah(h);}
    if(hapus){const h=hadiah.find(x=>String(x.id)===hapus.dataset.hapusHadiah);if(!h)return;if(!confirm(`Hapus hadiah ${h.nama||h.judul||h.id}?`))return;
      try{const {error}=await sb.from("hadiah").delete().eq("id",h.id);if(error)throw error;await catatAktivitas("Menghapus hadiah",String(h.nama||h.judul||h.id));hadiah=await ambilTabel("hadiah");renderHadiah();await muatAktivitas();}
      catch(e){$("statusHadiah").textContent="Gagal menghapus: "+e.message;$("statusHadiah").className="notif err";}}
  });
  $("formHadiah").addEventListener("submit",async ev=>{
    ev.preventDefault(); const id=$("hadiahId").value;
    const payload={nama:$("hadiahNama").value.trim(),deskripsi:$("hadiahDeskripsi").value.trim(),harga:Number($("hadiahHarga").value),stok:Number($("hadiahStok").value)};
    if(!payload.nama||!Number.isInteger(payload.harga)||payload.harga<1||!Number.isInteger(payload.stok)||payload.stok<0){pesanHadiah("Nama, harga poin, dan stok harus valid.","err");return;}
    try{let q;if(id)q=await sb.from("hadiah").update(payload).eq("id",id);else q=await sb.from("hadiah").insert(payload);if(q.error)throw q.error;
      await catatAktivitas(id?"Mengedit hadiah":"Menambah hadiah",payload.nama); hadiah=await ambilTabel("hadiah");renderHadiah();penukaran=await ambilTabel("penukaran");renderRiwayatTukar();$("modalHadiah").classList.add("hidden");await muatAktivitas();
    }catch(e){pesanHadiah("Gagal menyimpan: "+e.message,"err");}
  });

  // --- Kelola jenis produk yang diterima ---
  let jenisProduk = [];
  const formatRp = n => "Rp " + Math.round(Number(n)||0).toLocaleString("id-ID");
  function pesanProduk(teks, tipe="info") { const el=$("pesanProdukForm"); el.textContent=teks; el.className="notif "+tipe; }
  function renderProduk() {
    $("tabelProduk").innerHTML = jenisProduk.map(p => `<tr><td>${escapeHTML(p.nama)}</td><td>${escapeHTML(formatRp(p.harga_per_kg))}</td><td><span class="chip ${p.aktif ? "ok" : "tolak"}">${p.aktif ? "Aktif" : "Nonaktif"}</span></td><td><button type="button" class="tombol-kecil" data-edit-produk="${escapeHTML(p.id)}">Edit</button> <button type="button" class="tombol-kecil" data-toggle-produk="${escapeHTML(p.id)}">${p.aktif ? "Nonaktifkan" : "Aktifkan"}</button></td></tr>`).join("") || '<tr><td colspan="4">Belum ada jenis produk.</td></tr>';
    $("statusProduk").textContent = `${jenisProduk.length} jenis produk terdaftar.`; $("statusProduk").className="notif info";
  }
  async function muatProduk() {
    try { jenisProduk = await ambilTabel("jenis_produk"); jenisProduk.sort((a,b)=>String(a.nama).localeCompare(String(b.nama),"id")); renderProduk(); }
    catch(e) { $("statusProduk").textContent="Katalog produk belum tersedia. Jalankan SETUP-JENIS-PRODUK.sql di Supabase. Detail: "+e.message; $("statusProduk").className="notif err"; }
  }
  function bukaFormProduk(p=null) {
    $("formProduk").reset(); $("produkId").value=p?.id||""; $("produkNama").value=p?.nama||""; $("produkHarga").value=p?.harga_per_kg??0; $("produkAktif").checked=p?.aktif!==false;
    $("judulModalProduk").textContent=p?"Edit Jenis Produk":"Tambah Jenis Produk"; $("pesanProdukForm").className="notif hidden"; $("modalProduk").classList.remove("hidden");
  }
  $("tambahProduk").addEventListener("click",()=>bukaFormProduk());
  $("muatUlangProduk").addEventListener("click",muatProduk);
  $("tutupModalProduk").addEventListener("click",()=>$("modalProduk").classList.add("hidden"));
  $("tabelProduk").addEventListener("click",async ev=>{
    const edit=ev.target.closest("[data-edit-produk]"),toggle=ev.target.closest("[data-toggle-produk]");
    if(edit){const p=jenisProduk.find(x=>String(x.id)===edit.dataset.editProduk);if(p)bukaFormProduk(p);}
    if(toggle){const p=jenisProduk.find(x=>String(x.id)===toggle.dataset.toggleProduk);if(!p)return;try{const {error}=await sb.from("jenis_produk").update({aktif:!p.aktif,updated_at:new Date().toISOString()}).eq("id",p.id);if(error)throw error;await catatAktivitas(p.aktif?"Menonaktifkan jenis produk":"Mengaktifkan jenis produk",p.nama);await muatProduk();}catch(e){$("statusProduk").textContent="Gagal mengubah status: "+e.message;$("statusProduk").className="notif err";}}
  });
  $("formProduk").addEventListener("submit",async ev=>{
    ev.preventDefault();const id=$("produkId").value;const payload={nama:$("produkNama").value.trim(),harga_per_kg:Number($("produkHarga").value),aktif:$("produkAktif").checked,updated_at:new Date().toISOString()};
    if(!payload.nama||!Number.isInteger(payload.harga_per_kg)||payload.harga_per_kg<0){pesanProduk("Nama dan harga harus valid.","err");return;}
    try{let q=id?await sb.from("jenis_produk").update(payload).eq("id",id):await sb.from("jenis_produk").insert(payload);if(q.error)throw q.error;await catatAktivitas(id?"Mengedit jenis produk":"Menambah jenis produk",payload.nama);await muatProduk();$("modalProduk").classList.add("hidden");}catch(e){pesanProduk("Gagal menyimpan produk: "+e.message,"err");}
  });
  await muatProduk();

  // Refresh ringan agar dashboard mengikuti setoran yang baru diverifikasi tanpa reload manual.
  window.addEventListener("focus", () => location.reload());
  setInterval(async () => {
    try { setoran = await ambilTabel("setoran"); renderLog(); renderASN(); renderTren(); penukaran = await ambilTabel("penukaran"); renderRiwayatTukar(); }
    catch (e) { console.warn("Penyegaran dashboard gagal:", e.message); }
  }, 60000);
});
