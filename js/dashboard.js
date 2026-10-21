document.addEventListener("DOMContentLoaded", async () => {
  const { $, fmt, fmtInt, tglJam } = window.Utils;
  const bulanInput = $("bulanRekapAsn");
  const sekarang = new Date();
  bulanInput.value = `${sekarang.getFullYear()}-${String(sekarang.getMonth() + 1).padStart(2, "0")}`;

  let profilAktif = null;
  let semuaProfil = [];
  let semuaSetoran = [];

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#39;"}[c]));
  const role = (value) => String(value || "warga").trim().toLowerCase();
  const isAsn = (value) => value === true || ["asn", "pns"].includes(role(value));
  const statusLabel = (value) => {
    const s = role(value);
    return s === "disetujui" ? "Disetujui" : s === "ditolak" ? "Ditolak" : "Menunggu";
  };
  const statusClass = (value) => role(value) === "disetujui" ? "ok" : role(value) === "ditolak" ? "tolak" : "tunggu";
  const namaPenyetor = (s) => s.profiles?.nama || s.users?.nama || s.nama || s.email || "Pengguna";
  const wilayah = (s) => `${s.rw || s.profiles?.rw || s.users?.rw || "-"} / ${s.rt || s.profiles?.rt || s.users?.rt || "-"}`;
  const angkaKg = (s) => Number(s.kg ?? s.kg_klaim ?? s.berat_kg ?? 0) || 0;
  const angkaPoin = (s) => Number(s.poin_diterima ?? s.poin ?? s.estimasi_poin ?? 0) || 0;
  const waktu = (s) => s.created_at || s.waktu || null;
  const tampilWaktu = (s) => waktu(s) ? tglJam(waktu(s)) : "-";

  function beriNotif(teks, tipe = "info") {
    const el = $("notifAdmin");
    el.className = `notif ${tipe}`;
    el.textContent = teks;
  }

  function renderPengguna() {
    const q = $("cariPengguna").value.trim().toLowerCase();
    const data = semuaProfil.filter(p => [p.nama, p.peran, p.nik_nip, p.rw, p.rt, p.instansi, p.email].some(v => String(v || "").toLowerCase().includes(q)));
    $("tabelPengguna").innerHTML = data.length ? data.map(p => `
      <tr><td>${escapeHTML(p.nama || "-")}</td><td>${escapeHTML(p.peran || "warga")}</td><td>${escapeHTML(p.nik_nip || "-")}</td><td>${escapeHTML(p.rw || "-")} / ${escapeHTML(p.rt || "-")}</td><td>${escapeHTML(p.instansi || "-")}</td></tr>
    `).join("") : `<tr><td colspan="5">Tidak ada pengguna yang cocok.</td></tr>`;
  }

  function renderSetoran() {
    const filter = $("filterStatusSetoran").value;
    const data = semuaSetoran.filter(s => filter === "semua" || role(s.status) === filter);
    $("tabelSemuaSetoran").innerHTML = data.length ? data.map(s => `
      <tr><td>${escapeHTML(tampilWaktu(s))}</td><td>${escapeHTML(namaPenyetor(s))}</td><td>${escapeHTML(s.profiles?.peran || s.users?.peran || s.peran || "-")}</td><td>${escapeHTML(wilayah(s))}</td><td>${fmt(angkaKg(s))} kg</td><td>${fmtInt(angkaPoin(s))}</td><td><span class="admin-status ${statusClass(s.status)}">${statusLabel(s.status)}</span></td></tr>
    `).join("") : `<tr><td colspan="7">Belum ada data setoran untuk filter ini.</td></tr>`;
  }

  function dataRekapAsn() {
    const bulan = bulanInput.value;
    const asn = semuaProfil.filter(p => isAsn(p.is_asn) || isAsn(p.peran));
    const setoranBulan = semuaSetoran.filter(s => {
      const d = waktu(s);
      const pemilik = s.profiles || s.users || semuaProfil.find(p => p.id === s.user_id);
      return d && d.slice(0, 7) === bulan && pemilik && (isAsn(pemilik.is_asn) || isAsn(pemilik.peran));
    });
    const disetujui = setoranBulan.filter(s => role(s.status) === "disetujui");
    const kgPerUser = new Map();
    disetujui.forEach(s => kgPerUser.set(s.user_id, (kgPerUser.get(s.user_id) || 0) + angkaKg(s)));
    const patuh = asn.filter(p => (kgPerUser.get(p.id) || 0) >= 2).length;
    return { bulan, asn, setoranBulan, disetujui, kgPerUser, patuh, totalKg: disetujui.reduce((sum, s) => sum + angkaKg(s), 0) };
  }

  function renderRekapRingkas() {
    const r = dataRekapAsn();
    $("asnJumlah").textContent = fmtInt(r.asn.length);
    $("asnPatuh").textContent = `${fmtInt(r.patuh)} / ${fmtInt(r.asn.length)}`;
    $("asnKg").textContent = `${fmt(r.totalKg)} kg`;
  }

  function buatPDF() {
    if (!window.jspdf?.jsPDF) {
      beriNotif("Library PDF belum termuat. Periksa koneksi internet lalu muat ulang halaman.", "error");
      return;
    }
    const r = dataRekapAsn();
    const [tahun, bulan] = r.bulan.split("-");
    if (!tahun || !bulan) {
      beriNotif("Pilih bulan laporan terlebih dahulu.", "error");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const namaBulan = new Date(Number(tahun), Number(bulan) - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const left = 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("eLOLA - REKAPAN SETORAN ASN", left, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Periode: ${namaBulan}`, left, 22);
    doc.text(`Jumlah ASN terdaftar: ${r.asn.length}`, left, 29);
    doc.text(`ASN memenuhi target 2 kg: ${r.patuh} dari ${r.asn.length}`, left, 35);
    doc.text(`Total berat disetujui: ${fmt(r.totalKg)} kg`, left, 41);

    const cols = [12, 21, 64, 93, 113, 133, 151, 169, 196, 225];
    const headers = ["No", "Nama ASN", "NIK/NIP", "Instansi", "RW", "RT", "Total disetujui (kg)", "Target", "Status target"];
    let y = 51;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(226, 242, 229);
    doc.rect(left, y - 5, 273, 8, "F");
    const headX = [14, 23, 66, 95, 115, 135, 153, 198, 227];
    headers.forEach((h, i) => doc.text(h, headX[i], y));
    y += 6;
    doc.setFont("helvetica", "normal");
    const rows = r.asn.map((p, i) => ({
      no: i + 1,
      nama: p.nama || "-",
      nip: p.nik_nip || "-",
      instansi: p.instansi || "-",
      rw: p.rw || "-",
      rt: p.rt || "-",
      kg: r.kgPerUser.get(p.id) || 0,
      patuh: (r.kgPerUser.get(p.id) || 0) >= 2
    }));
    rows.forEach((p, i) => {
      if (y > 185) { doc.addPage(); y = 16; }
      const values = [String(p.no), p.nama, p.nip, p.instansi, p.rw, p.rt, fmt(p.kg), "2 kg", p.patuh ? "Memenuhi" : "Belum memenuhi"];
      const maxWidths = [6, 39, 26, 28, 14, 14, 35, 12, 34];
      values.forEach((value, j) => {
        const textLines = doc.splitTextToSize(String(value), maxWidths[j]);
        doc.text(textLines.slice(0, 2), headX[j], y);
      });
      y += 7;
      doc.setDrawColor(225, 232, 226);
      doc.line(left, y - 3, 285, y - 3);
    });
    if (!rows.length) {
      doc.setFont("helvetica", "italic");
      doc.text("Tidak ada akun dengan peran ASN pada profil pengguna.", left, y + 2);
      y += 8;
    }
    y += 3;
    if (y > 185) { doc.addPage(); y = 16; }
    doc.setFont("helvetica", "bold");
    doc.text("Rincian transaksi setoran ASN", left, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    const detailHeader = "Tanggal       Nama ASN                         Wilayah          Berat (kg)       Poin       Status";
    doc.setFontSize(8);
    doc.text(detailHeader, left, y);
    y += 5;
    const details = r.setoranBulan.slice().sort((a, b) => new Date(waktu(a)) - new Date(waktu(b)));
    details.forEach(s => {
      if (y > 195) { doc.addPage(); y = 16; }
      const name = namaPenyetor(s).slice(0, 30);
      const date = new Date(waktu(s)).toLocaleDateString("id-ID");
      const line = `${date.padEnd(13)} ${name.padEnd(32)} ${wilayah(s).padEnd(16)} ${fmt(angkaKg(s)).padEnd(15)} ${fmtInt(angkaPoin(s)).padEnd(10)} ${statusLabel(s.status)}`;
      doc.text(line, left, y);
      y += 5;
    });
    doc.setFontSize(8);
    doc.text("Catatan: total kg dan kepatuhan target dihitung hanya dari setoran berstatus Disetujui.", left, 202);
    doc.save(`Rekapan-Setoran-ASN-${tahun}-${bulan}.pdf`);
    beriNotif("PDF rekapan setoran ASN berhasil dibuat.", "ok");
  }

  $("cariPengguna").addEventListener("input", renderPengguna);
  $("filterStatusSetoran").addEventListener("change", renderSetoran);
  bulanInput.addEventListener("change", renderRekapRingkas);
  $("exportPdfAsn").addEventListener("click", buatPDF);

  try {
    profilAktif = await window.AuthGuard(["admin"]);
    if (!profilAktif) return;
    const sb = window.SupabaseDB.getClient();
    // Schema proyek memiliki dua kelompok tabel: users/transaksi_setoran
    // dan profiles/setoran. Baca semuanya secara terpisah agar salah satu
    // tabel yang tidak dipakai atau tidak diizinkan tidak mematikan dashboard.
    const ambil = async (tabel) => {
      const hasil = await sb.from(tabel).select("*");
      if (hasil.error) {
        console.warn(`Tabel ${tabel} tidak dapat dibaca:`, hasil.error.message);
        return { data: [], error: hasil.error };
      }
      return { data: hasil.data || [], error: null };
    };
    const [usersRes, profilesRes, transaksiRes, setoranRes] = await Promise.all([
      ambil("users"), ambil("profiles"), ambil("transaksi_setoran"), ambil("setoran")
    ]);
    const adaPengguna = usersRes.data.length || profilesRes.data.length;
    const adaSetoran = transaksiRes.data.length || setoranRes.data.length;
    if (!adaPengguna && usersRes.error && profilesRes.error) {
      throw new Error(`Tidak dapat membaca tabel users maupun profiles. users: ${usersRes.error.message}; profiles: ${profilesRes.error.message}`);
    }
    if (!adaSetoran && transaksiRes.error && setoranRes.error) {
      throw new Error(`Tidak dapat membaca tabel transaksi_setoran maupun setoran. transaksi_setoran: ${transaksiRes.error.message}; setoran: ${setoranRes.error.message}`);
    }

    // Gabungkan profil dengan prioritas data users untuk email, instansi,
    // is_asn, saldo, dan total; profiles tetap menyediakan RT/RW/foto.
    const profilById = new Map();
    (profilesRes.data || []).forEach(p => profilById.set(p.id, { ...p }));
    (usersRes.data || []).forEach(u => profilById.set(u.id, { ...(profilById.get(u.id) || {}), ...u,
      peran: u.peran || profilById.get(u.id)?.peran || "warga",
      rw: u.rw || profilById.get(u.id)?.rw || null,
      rt: u.rt || profilById.get(u.id)?.rt || null,
      email: u.email || profilById.get(u.id)?.email || null,
      instansi: u.instansi || profilById.get(u.id)?.instansi || null,
      is_asn: u.is_asn === true || role(u.peran) === "asn" || role(profilById.get(u.id)?.peran) === "asn"
    }));
    semuaProfil = Array.from(profilById.values());

    const daftarSetoran = [
      ...(setoranRes.data || []).map(s => ({ ...s, sumber_tabel: "setoran" })),
      ...(transaksiRes.data || []).map(s => ({
        ...s,
        kg: s.berat_kg ?? s.kg ?? 0,
        kg_klaim: s.berat_kg ?? s.kg_klaim ?? 0,
        poin: s.poin_diterima ?? s.poin ?? s.estimasi_poin ?? 0,
        sumber_tabel: "transaksi_setoran"
      }))
    ];
    semuaSetoran = daftarSetoran.map(s => {
      const pemilik = profilById.get(s.user_id) || null;
      let status = role(s.status);
      if (["approved", "selesai"].includes(status)) status = "disetujui";
      if (status === "rejected") status = "ditolak";
      if (["pending"].includes(status)) status = "menunggu";
      return { ...s, status, profiles: s.profiles || (s.sumber_tabel === "setoran" ? pemilik : null), users: s.users || pemilik };
    });
    const disetujui = semuaSetoran.filter(s => role(s.status) === "disetujui");
    $("stKg").textContent = `${fmt(disetujui.reduce((sum, s) => sum + angkaKg(s), 0))} kg`;
    $("stPoin").textContent = fmtInt(disetujui.reduce((sum, s) => sum + angkaPoin(s), 0));
    $("stAkun").textContent = fmtInt(semuaProfil.length);
    renderPengguna();
    renderSetoran();
    renderRekapRingkas();
  } catch (error) {
    console.error(error);
    beriNotif(`${error.message || "Gagal memuat data admin."} Pastikan sesi admin valid dan kebijakan RLS mengizinkan pembacaan tabel pengguna/setoran.`, "error");
    $("tabelPengguna").innerHTML = `<tr><td colspan="5">Data pengguna gagal dimuat.</td></tr>`;
    $("tabelSemuaSetoran").innerHTML = `<tr><td colspan="7">Data setoran gagal dimuat.</td></tr>`;
  }
});
