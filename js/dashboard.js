document.addEventListener("DOMContentLoaded", () => {
  const { $, fmt, fmtInt, tglJam, KUOTA_ASN = 2 } = window.Utils;
  const TARGET_KG = Number(KUOTA_ASN) || 2;
  let asnRows = [], lastSetoran = [], lastProfiles = [], lastHadiah = [], currentUser = null;
  let selectedMonth = new Date().toISOString().slice(0, 7);
  let firstLoadLogged = false;

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const n = value => Number(value) || 0;
  const monthBounds = key => { const [y,m] = key.split("-").map(Number); return { start:new Date(y,m-1,1,0,0,0,0), end:new Date(y,m,1,0,0,0,0) }; };
  const monthLabel = key => { const {start}=monthBounds(key); return new Intl.DateTimeFormat("id-ID", {month:"long",year:"numeric"}).format(start); };
  const inMonth = (row,key) => { const d = new Date(row.created_at || row.waktu || row.tanggal || 0); const b=monthBounds(key); return !Number.isNaN(d.getTime()) && d>=b.start && d<b.end; };
  const statusASN = kg => kg >= TARGET_KG ? "patuh" : kg > 0 ? "parsial" : "nihil";
  const labelStatus = status => status === "patuh" ? "Memenuhi target" : status === "parsial" ? "Belum mencapai 2 kg" : "Belum menyetor";
  const formatDate = value => { try { return tglJam(value); } catch { return "—"; } };

  function buildAsnRows(profiles,setoran,key) {
    const people = profiles.filter(p => String(p.peran || "").toLowerCase()==="asn" || p.is_asn===true);
    const approved = setoran.filter(s => s.status === "disetujui" && inMonth(s,key));
    return people.map(p => {
      const mine=approved.filter(s=>s.user_id===p.id), kg=mine.reduce((sum,s)=>sum+n(s.kg),0), poin=mine.reduce((sum,s)=>sum+n(s.poin),0);
      return {id:p.id,nama:p.nama||p.full_name||"Tanpa nama",nip:p.nik_nip||p.nip||p.nik||"—",rw:p.rw||"—",rt:p.rt||"—",instansi:p.instansi||"—",kg,poin,jumlah:mine.length,status:statusASN(kg)};
    }).sort((a,b)=>a.nama.localeCompare(b.nama,"id"));
  }
  function renderAsnTable() {
    const q=($("cariAsn")?.value||"").trim().toLocaleLowerCase("id-ID"), filter=$("filterAsn")?.value||"semua";
    const rows=asnRows.filter(r=>(filter==="semua"||r.status===filter)&&`${r.nama} ${r.nip} ${r.rw} ${r.rt} ${r.instansi}`.toLocaleLowerCase("id-ID").includes(q));
    const body=$("tabelAsn"); if(!body)return;
    body.innerHTML=rows.length?rows.map(r=>{const progress=Math.min(100,r.kg/TARGET_KG*100), chip=r.status==="patuh"?"ok":r.status==="parsial"?"chip-partial":"tolak";return `<tr><td><strong>${escapeHTML(r.nama)}</strong><small class="cell-sub">${escapeHTML(r.instansi)} · ${r.jumlah} setoran</small></td><td>${escapeHTML(r.nip)}</td><td>${escapeHTML(r.rw)} / ${escapeHTML(r.rt)}</td><td><strong>${fmt(r.kg)} kg</strong></td><td><div class="asn-progress"><i class="${r.status}" style="width:${progress}%"></i></div><small class="cell-sub">${Math.round(progress)}% dari target</small></td><td><span class="chip ${chip}">${labelStatus(r.status)}</span></td></tr>`;}).join(""):`<tr><td colspan="6" class="empty-cell">${asnRows.length?"Tidak ada ASN yang cocok dengan filter.":"Belum ada profil ASN yang ditemukan."}</td></tr>`;
    $("asnTableSummary").textContent=`Menampilkan ${rows.length} dari ${asnRows.length} ASN · Periode ${monthLabel(selectedMonth)}.`;
  }
  function renderAsnStats() {
    const total=asnRows.length, compliant=asnRows.filter(r=>r.status==="patuh").length, partial=asnRows.filter(r=>r.status==="parsial").length, none=asnRows.filter(r=>r.status==="nihil").length, rate=total?Math.round(compliant/total*100):0;
    $("asnTotal").textContent=fmtInt(total); $("asnCompliant").textContent=fmtInt(compliant); $("asnPartial").textContent=fmtInt(partial); $("asnNone").textContent=fmtInt(none);
    $("asnCompliance").textContent=`${rate}%`; $("asnComplianceCaption").textContent=`${compliant} dari ${total} ASN memenuhi target`; $("asnComplianceBar").style.width=`${rate}%`;
    $("asnMonthLabel").textContent=monthLabel(selectedMonth); $("periodeLabel").textContent=monthLabel(selectedMonth);
  }
  function renderLog(setoran) {
    const body=$("tabelLog"); if(!body)return;
    if(!setoran.length){body.innerHTML='<tr><td colspan="6" class="empty-cell">Belum ada transaksi setoran.</td></tr>';return;}
    body.innerHTML=setoran.slice(0,30).map(s=>{const p=s.profiles||{},name=s.nama||p.nama||s.akun||"Pengguna",sc=s.status==="disetujui"?"ok":s.status==="ditolak"?"tolak":"";return `<tr><td>${escapeHTML(formatDate(s.created_at||s.waktu))}</td><td><strong>${escapeHTML(name)}</strong></td><td>${escapeHTML(s.rw||"—")} / ${escapeHTML(s.rt||"—")}</td><td>${fmt(n(s.kg))} kg</td><td>${fmtInt(n(s.poin))}</td><td><span class="chip ${sc}">${escapeHTML(s.status||"tidak diketahui")}</span></td></tr>`;}).join("");
  }
  function renderUsers() {
    const body=$("tabelPengguna"); if(!body)return;
    const q=($("cariPengguna")?.value||"").trim().toLocaleLowerCase("id-ID"), role=$("filterPeran")?.value||"semua";
    const rows=lastProfiles.filter(p=>{const r=String(p.peran|| (p.is_asn?"asn":"warga")).toLowerCase();return (role==="semua"||r===role)&&`${p.nama||p.full_name||""} ${p.nik_nip||p.nip||p.nik||""} ${p.rw||""} ${p.rt||""} ${p.instansi||""}`.toLocaleLowerCase("id-ID").includes(q);});
    body.innerHTML=rows.length?rows.map(p=>{const roleName=String(p.peran||(p.is_asn?"asn":"warga")).toLowerCase();const badge=roleName==="admin"?"ok":roleName==="petugas"?"chip-partial":"";return `<tr><td><strong>${escapeHTML(p.nama||p.full_name||"Tanpa nama")}</strong></td><td><span class="chip ${badge}">${escapeHTML(roleName.toUpperCase())}</span></td><td>${escapeHTML(p.nik_nip||p.nip||p.nik||"—")}</td><td>${escapeHTML(p.rw||"—")} / ${escapeHTML(p.rt||"—")}</td><td>${escapeHTML(p.instansi||"—")}</td></tr>`;}).join(""):'<tr><td colspan="5" class="empty-cell">Tidak ada pengguna yang cocok.</td></tr>';
    const summary=$("penggunaSummary");if(summary)summary.textContent=`Menampilkan ${rows.length} dari ${lastProfiles.length} profil pengguna.`;
  }
  function renderRewards() {
    const body=$("tabelHadiah");if(!body)return;
    body.innerHTML=lastHadiah.length?lastHadiah.map(h=>{const stock=n(h.stok),available=stock>0;return `<tr><td><strong>${escapeHTML(h.nama||h.nama_hadiah||"Hadiah")}</strong></td><td>${fmtInt(n(h.harga))} poin</td><td>${fmtInt(stock)}</td><td><span class="chip ${available?"ok":"tolak"}">${available?"Tersedia":"Stok habis"}</span></td></tr>`;}).join(""):'<tr><td colspan="4" class="empty-cell">Katalog hadiah kosong atau belum dapat dibaca.</td></tr>';
  }

  function renderTrend() {
    const months=[]; const now=monthBounds(selectedMonth).start;
    for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({key:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,label:new Intl.DateTimeFormat("id-ID",{month:"short"}).format(d),kg:0,patuh:0,total:0});}
    const asnIds=new Set(lastProfiles.filter(p=>String(p.peran||"").toLowerCase()==="asn"||p.is_asn===true).map(p=>p.id));
    for(const s of lastSetoran){if(s.status!=="disetujui")continue;const d=new Date(s.created_at||0);if(Number.isNaN(d.getTime()))continue;const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,m=months.find(x=>x.key===key);if(m)m.kg+=n(s.kg);}
    for(const m of months){const people=lastProfiles.filter(p=>asnIds.has(p.id));m.total=people.length;for(const p of people){const kg=lastSetoran.filter(s=>s.user_id===p.id&&s.status==="disetujui"&&inMonth(s,m.key)).reduce((a,s)=>a+n(s.kg),0);if(kg>=TARGET_KG)m.patuh++;}}
    const max=Math.max(1,...months.map(m=>m.kg));
    const chart=$("trendChart"); if(chart)chart.innerHTML=`<div class="trend-bars">${months.map(m=>`<div class="trend-col" title="${escapeHTML(m.label)}: ${fmt(m.kg)} kg"><div class="trend-bar-area"><i style="height:${Math.max(3,m.kg/max*100)}%"></i></div><b>${fmt(m.kg)}</b><span>${escapeHTML(m.label)}</span></div>`).join("")}</div>`;
    const summary=$("trendSummary"); if(summary){const a=months[months.length-1],b=months[months.length-2],delta=a.kg-b.kg;summary.textContent=`${a.label}: ${fmt(a.kg)} kg disetujui · ${delta>0?"naik":delta<0?"turun":"sama"} ${fmt(Math.abs(delta))} kg dibanding bulan sebelumnya.`;}
  }
  function renderActivities(rows) {
    const body=$("tabelAktivitas"); if(!body)return;
    if(!rows.length){body.innerHTML='<tr><td colspan="5" class="empty-cell">Belum ada riwayat aktivitas. Jalankan SQL setup aktivitas terlebih dahulu.</td></tr>';return;}
    body.innerHTML=rows.map(a=>`<tr><td>${escapeHTML(formatDate(a.created_at))}</td><td><strong>${escapeHTML(a.actor_name||"Pengguna")}</strong><small class="cell-sub">${escapeHTML(a.actor_role||"—")}</small></td><td>${escapeHTML(a.action_label||a.action||"Aktivitas")}</td><td>${escapeHTML(a.description||"—")}</td><td>${escapeHTML(a.target_id||"—")}</td></tr>`).join("");
  }
  async function loadActivities() {
    try { const rows=await window.SupabaseDB.getActivityLogs({limit:30});renderActivities(rows||[]); }
    catch(e){const b=$("tabelAktivitas");if(b)b.innerHTML=`<tr><td colspan="5" class="empty-cell">Riwayat belum tersedia. Jalankan setup-activity-log.sql. (${escapeHTML(e.message)})</td></tr>`;}
  }
  async function loadDashboard() {
    const err=$("dashboardError"), loading=$("dashboardLoading"); if(err){err.classList.add("hidden");err.textContent="";} if(loading){loading.classList.remove("hidden");loading.textContent="Mengambil data dari Supabase…";}
    try {
      if(!currentUser)currentUser=await window.AuthGuard(["admin"]); if(!currentUser)return;
      const [profiles,setoran,hadiahResult,penukaranResult]=await Promise.all([
        window.SupabaseDB.getProfiles(),window.SupabaseDB.getSetoran(),
        window.SupabaseDB.getHadiah().catch(e=>{console.warn("Katalog hadiah tidak dapat dimuat:",e);return []}),
        window.SupabaseDB.getRiwayatPenukaran().catch(e=>{console.warn("Riwayat penukaran tidak dapat dimuat:",e);return []})
      ]);
      lastProfiles=Array.isArray(profiles)?profiles:[];lastSetoran=Array.isArray(setoran)?setoran:[];lastHadiah=Array.isArray(hadiahResult)?hadiahResult:[];
      const approved=lastSetoran.filter(s=>s.status==="disetujui");$("stKg").textContent=`${fmt(approved.reduce((a,s)=>a+n(s.kg),0))} kg`;$("stPoin").textContent=fmtInt(approved.reduce((a,s)=>a+n(s.poin),0));$("stAkun").textContent=fmtInt(lastProfiles.length);$("stPending").textContent=fmtInt(lastSetoran.filter(s=>s.status==="menunggu").length);
      $("stHadiah").textContent=fmtInt(lastHadiah.length);$("stPenukaran").textContent=fmtInt(Array.isArray(penukaranResult)?penukaranResult.length:0);
      asnRows=buildAsnRows(lastProfiles,lastSetoran,selectedMonth);renderAsnStats();renderAsnTable();renderLog(lastSetoran);renderUsers();renderRewards();renderTrend();await loadActivities();
      if(!firstLoadLogged){firstLoadLogged=true;window.SupabaseDB.logActivity({action:"dashboard_view",actionLabel:"Membuka dashboard admin",description:`Dashboard admin dibuka untuk periode ${monthLabel(selectedMonth)}.`}).then(loadActivities).catch(()=>{});}
      if(loading)loading.classList.add("hidden");
    } catch(error){console.error("Dashboard gagal memuat data:",error);if(loading){loading.classList.remove("hidden");loading.textContent="Data belum berhasil dimuat.";}if(err){err.textContent=`Gagal mengambil data Supabase: ${error?.message||"kesalahan tidak diketahui"}. Periksa koneksi, nama tabel/kolom, dan kebijakan RLS.`;err.classList.remove("hidden");}$("tabelAsn").innerHTML='<tr><td colspan="6" class="empty-cell">Rekap tidak dapat dimuat. Periksa pesan error di atas.</td></tr>';$ ("tabelLog").innerHTML='<tr><td colspan="6" class="empty-cell">Data transaksi tidak dapat dimuat.</td></tr>';}
  }
  function exportCSV(){
    const header=["Nama ASN","NIP/NIK","Instansi","RW","RT","Periode","Berat disetujui (kg)","Jumlah setoran","Poin","Status kepatuhan"];
    const rows=asnRows.map(r=>[r.nama,r.nip,r.instansi,r.rw,r.rt,monthLabel(selectedMonth),r.kg,r.jumlah,r.poin,labelStatus(r.status)]);
    const csv=[header,...rows].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`rekap-kepatuhan-asn-${selectedMonth}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
    window.SupabaseDB.logActivity({action:"export_asn_recap",actionLabel:"Ekspor rekap ASN",description:`Mengekspor rekap kepatuhan ASN periode ${monthLabel(selectedMonth)} (${asnRows.length} ASN).`}).catch(()=>{});
  }
  $("cariAsn")?.addEventListener("input",renderAsnTable);$("filterAsn")?.addEventListener("change",renderAsnTable);$("exportAsn")?.addEventListener("click",exportCSV);$("refreshDashboard")?.addEventListener("click",loadDashboard);
  $("cariPengguna")?.addEventListener("input",renderUsers);$("filterPeran")?.addEventListener("change",renderUsers);
  const monthInput=$("filterBulan"); if(monthInput){monthInput.value=selectedMonth;monthInput.addEventListener("change",()=>{if(/^\d{4}-\d{2}$/.test(monthInput.value)){selectedMonth=monthInput.value;asnRows=buildAsnRows(lastProfiles,lastSetoran,selectedMonth);renderAsnStats();renderAsnTable();renderTrend();}});}
  $("refreshActivity")?.addEventListener("click",loadActivities);
  loadDashboard();
});
