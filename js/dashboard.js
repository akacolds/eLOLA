```javascript
document.addEventListener("DOMContentLoaded", async () => {
  const { $, fmt, fmtInt, tglJam } = window.Utils;
  const bulanInput = $("bulanRekapAsn");

  if (!bulanInput) return;

  const sekarang = new Date();
  bulanInput.value = `${sekarang.getFullYear()}-${String(
    sekarang.getMonth() + 1
  ).padStart(2, "0")}`;

  let profilAktif = null;
  let semuaProfil = [];
  let semuaSetoran = [];

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);

  const normal = (value) =>
    String(value ?? "").trim().toLowerCase();

  const isAsn = (p) =>
    p?.is_asn === true ||
    ["asn", "pns"].includes(normal(p?.peran));

  const angkaKg = (s) =>
    Number(s.kg ?? s.kg_klaim ?? s.berat_kg ?? 0) || 0;

  const angkaPoin = (s) =>
    Number(
      s.poin_diterima ??
      s.poin ??
      s.estimasi_poin ??
      0
    ) || 0;

  const waktu = (s) =>
    s.created_at || s.waktu || null;

  const tampilWaktu = (s) =>
    waktu(s) ? tglJam(waktu(s)) : "-";

  const statusNormal = (value) => {
    const s = normal(value);

    if (["disetujui", "approved", "selesai"].includes(s)) {
      return "disetujui";
    }

    if (["ditolak", "rejected"].includes(s)) {
      return "ditolak";
    }

    return "menunggu";
  };

  const statusLabel = (value) => {
    const s = statusNormal(value);

    if (s === "disetujui") return "Disetujui";
    if (s === "ditolak") return "Ditolak";
    return "Menunggu";
  };

  const statusClass = (value) => {
    const s = statusNormal(value);

    if (s === "disetujui") return "ok";
    if (s === "ditolak") return "tolak";
    return "tunggu";
  };

  const pemilikSetoran = (s) =>
    semuaProfil.find((p) => p.id === s.user_id) || null;

  const namaPenyetor = (s) => {
    const p = pemilikSetoran(s);

    return (
      p?.nama ||
      s.profiles?.nama ||
      s.users?.nama ||
      s.nama ||
      s.email ||
      "Pengguna"
    );
  };

  const wilayah = (s) => {
    const p = pemilikSetoran(s);

    return `${s.rw || p?.rw || "-"} / ${s.rt || p?.rt || "-"}`;
  };

  function beriNotif(teks, tipe = "info") {
    const el = $("notifAdmin");
    if (!el) return;

    el.className = `notif ${tipe}`;
    el.textContent = teks;
  }

  function renderPengguna() {
    const q = ($("cariPengguna")?.value || "")
      .trim()
      .toLowerCase();

    const data = semuaProfil.filter((p) =>
      [
        p.nama,
        p.peran,
        p.nik_nip,
        p.rw,
        p.rt,
        p.instansi,
        p.email
      ].some((v) => String(v ?? "").toLowerCase().includes(q))
    );

    $("tabelPengguna").innerHTML = data.length
      ? data.map((p) => `
        <tr>
          <td>${escapeHTML(p.nama || "-")}</td>
          <td>${escapeHTML(p.peran || "warga")}</td>
          <td>${escapeHTML(p.nik_nip || "-")}</td>
          <td>${escapeHTML(p.rw || "-")} / ${escapeHTML(p.rt || "-")}</td>
          <td>${escapeHTML(p.instansi || "-")}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="5">Tidak ada pengguna yang cocok.</td></tr>`;
  }

  function renderSetoran() {
    const filter = $("filterStatusSetoran")?.value || "semua";

    const data = semuaSetoran.filter((s) =>
      filter === "semua" || statusNormal(s.status) === filter
    );

    $("tabelSemuaSetoran").innerHTML = data.length
      ? data.map((s) => {
        const p = pemilikSetoran(s);

        return `
          <tr>
            <td>${escapeHTML(tampilWaktu(s))}</td>
            <td>${escapeHTML(namaPenyetor(s))}</td>
            <td>${escapeHTML(p?.peran || "-")}</td>
            <td>${escapeHTML(wilayah(s))}</td>
            <td>${fmt(angkaKg(s))} kg</td>
            <td>${fmtInt(angkaPoin(s))}</td>
            <td>
              <span class="admin-status ${statusClass(s.status)}">
                ${statusLabel(s.status)}
              </span>
            </td>
          </tr>
        `;
      }).join("")
      : `<tr><td colspan="7">Belum ada data setoran untuk filter ini.</td></tr>`;
  }

  function dataRekapAsn() {
    const bulan = bulanInput.value;

    const asn = semuaProfil.filter(isAsn);

    const setoranBulan = semuaSetoran.filter((s) => {
      const tanggal = waktu(s);
      const p = pemilikSetoran(s);

      return (
        tanggal &&
        tanggal.slice(0, 7) === bulan &&
        p &&
        isAsn(p)
      );
    });

    const disetujui = setoranBulan.filter(
      (s) => statusNormal(s.status) === "disetujui"
    );

    const kgPerUser = new Map();

    disetujui.forEach((s) => {
      const id = s.user_id;
      if (!id) return;

      kgPerUser.set(
        id,
        (kgPerUser.get(id) || 0) + angkaKg(s)
      );
    });

    const patuh = asn.filter(
      (p) => (kgPerUser.get(p.id) || 0) >= 2
    ).length;

    return {
      bulan,
      asn,
      setoranBulan,
      disetujui,
      kgPerUser,
      patuh,
      totalKg: disetujui.reduce(
        (sum, s) => sum + angkaKg(s),
        0
      )
    };
  }

  function renderRekapRingkas() {
    const r = dataRekapAsn();

    $("asnJumlah").textContent = fmtInt(r.asn.length);
    $("asnPatuh").textContent =
      `${fmtInt(r.patuh)} / ${fmtInt(r.asn.length)}`;
    $("asnKg").textContent = `${fmt(r.totalKg)} kg`;
  }

  function buatPDF() {
    if (!window.jspdf?.jsPDF) {
      beriNotif(
        "Library PDF belum termuat. Periksa koneksi lalu muat ulang halaman.",
        "error"
      );
      return;
    }

    const r = dataRekapAsn();
    const [tahun, bulan] = r.bulan.split("-");

    if (!tahun || !bulan) {
      beriNotif("Pilih bulan laporan terlebih dahulu.", "error");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    const namaBulan = new Date(
      Number(tahun),
      Number(bulan) - 1,
      1
    ).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric"
    });

    const kiri = 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("eLOLA - REKAPAN SETORAN ASN", kiri, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Periode: ${namaBulan}`, kiri, 22);
    doc.text(`Jumlah ASN: ${r.asn.length}`, kiri, 29);
    doc.text(`Memenuhi target 2 kg: ${r.patuh} dari ${r.asn.length}`, kiri, 35);
    doc.text(`Total berat disetujui: ${fmt(r.totalKg)} kg`, kiri, 41);

    const headX = [14, 23, 66, 95, 115, 135, 153, 198, 227];
    const headers = [
      "No",
      "Nama ASN",
      "NIK/NIP",
      "Instansi",
      "RW",
      "RT",
      "Total (kg)",
      "Target",
      "Status target"
    ];

    let y = 51;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(226, 242, 229);
    doc.rect(kiri, y - 5, 273, 8, "F");

    headers.forEach((h, i) => doc.text(h, headX[i], y));

    y += 6;
    doc.setFont("helvetica", "normal");

    const rows = r.asn.map((p, i) => {
      const kg = r.kgPerUser.get(p.id) || 0;

      return {
        no: i + 1,
        nama: p.nama || "-",
        nip: p.nik_nip || "-",
        instansi: p.instansi || "-",
        rw: p.rw || "-",
        rt: p.rt || "-",
        kg,
        patuh: kg >= 2
      };
    });

    rows.forEach((p) => {
      if (y > 185) {
        doc.addPage();
        y = 16;
      }

      const values = [
        String(p.no),
        p.nama,
        p.nip,
        p.instansi,
        p.rw,
        p.rt,
        fmt(p.kg),
        "2 kg",
        p.patuh ? "Memenuhi" : "Belum memenuhi"
      ];

      const widths = [6, 39, 26, 28, 14, 14, 35, 12, 34];

      values.forEach((value, j) => {
        doc.text(
          doc.splitTextToSize(String(value), widths[j]).slice(0, 2),
          headX[j],
          y
        );
      });

      y += 7;
      doc.setDrawColor(225, 232, 226);
      doc.line(kiri, y - 3, 285, y - 3);
    });

    if (!rows.length) {
      doc.setFont("helvetica", "italic");
      doc.text("Tidak ada akun dengan peran ASN.", kiri, y + 2);
      y += 8;
    }

    y += 3;

    if (y > 185) {
      doc.addPage();
      y = 16;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Rincian transaksi setoran ASN", kiri, y);
    y += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    doc.text(
      "Tanggal       Nama ASN                         Wilayah          Berat (kg)       Poin       Status",
      kiri,
      y
    );

    y += 5;

    const details = r.setoranBulan
      .slice()
      .sort((a, b) => new Date(waktu(a)) - new Date(waktu(b)));

    details.forEach((s) => {
      if (y > 195) {
        doc.addPage();
        y = 16;
      }

      const tanggal = new Date(waktu(s)).toLocaleDateString("id-ID");
      const nama = namaPenyetor(s).slice(0, 30);

      doc.text(
        `${tanggal}   ${nama}   ${wilayah(s)}   ${fmt(angkaKg(s))}   ${fmtInt(angkaPoin(s))}   ${statusLabel(s.status)}`,
        kiri,
        y
      );

      y += 5;
    });

    doc.setFontSize(8);
    doc.text(
      "Catatan: total kg dan kepatuhan dihitung dari setoran berstatus Disetujui.",
      kiri,
      202
    );

    doc.save(`Rekapan-Setoran-ASN-${tahun}-${bulan}.pdf`);
    beriNotif("PDF rekapan setoran ASN berhasil dibuat.", "ok");
  }

  $("cariPengguna")?.addEventListener("input", renderPengguna);
  $("filterStatusSetoran")?.addEventListener("change", renderSetoran);
  bulanInput.addEventListener("change", renderRekapRingkas);
  $("exportPdfAsn")?.addEventListener("click", buatPDF);

  try {
    profilAktif = await window.AuthGuard(["admin"]);
    if (!profilAktif) return;

    const sb = window.SupabaseDB.getClient();

    async function ambil(tabel) {
      const { data, error } = await sb.from(tabel).select("*");

      if (error) {
        console.error(`Gagal membaca ${tabel}:`, error.message);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    }

    const [usersRes, profilesRes, transaksiRes, setoranRes] =
      await Promise.all([
        ambil("users"),
        ambil("profiles"),
        ambil("transaksi_setoran"),
        ambil("setoran")
      ]);

    if (
      usersRes.error &&
      profilesRes.error
    ) {
      throw new Error(
        `Gagal membaca users dan profiles: ${
          usersRes.error.message
        }; ${profilesRes.error.message}`
      );
    }

    if (
      transaksiRes.error &&
      setoranRes.error
    ) {
      throw new Error(
        `Gagal membaca kedua tabel setoran: ${
          transaksiRes.error.message
        }; ${setoranRes.error.message}`
      );
    }

    /*
     * Gabungkan berdasarkan ID auth.
     * profiles menjadi sumber utama untuk data profil.
     * users melengkapi email, instansi, dan saldo.
     */
    const profilById = new Map();

    (profilesRes.data || []).forEach((p) => {
      profilById.set(p.id, { ...p });
    });

    (usersRes.data || []).forEach((u) => {
      const lama = profilById.get(u.id) || {};

      profilById.set(u.id, {
        ...u,
        ...lama,
        id: lama.id || u.id,
        nama: lama.nama || u.nama || "",
        peran: lama.peran || u.peran || "warga",
        nik_nip: lama.nik_nip || u.nik_nip || "",
        rw: lama.rw || u.rw || null,
        rt: lama.rt || u.rt || null,
        email: u.email || lama.email || "",
        instansi: u.instansi || lama.instansi || "",
        is_asn:
          lama.is_asn === true ||
          u.is_asn === true ||
          ["asn", "pns"].includes(normal(lama.peran)) ||
          ["asn", "pns"].includes(normal(u.peran))
      });
    });

    semuaProfil = Array.from(profilById.values());

    /*
     * Satukan dua tabel, tetapi jangan menggandakan setoran.
     * Jika kedua tabel punya transaksi dengan ID sama, utamakan setoran.
     */
    const setoranById = new Map();

    (transaksiRes.data || []).forEach((s) => {
      const berat = s.berat_kg ?? s.kg ?? 0;

      setoranById.set(s.id, {
        ...s,
        kg: berat,
        kg_klaim: berat,
        poin:
          s.poin_diterima ??
          s.poin ??
          s.estimasi_poin ??
          0,
        sumber_tabel: "transaksi_setoran"
      });
    });

    (setoranRes.data || []).forEach((s) => {
      const kunci = s.id ?? `setoran-${s.user_id}-${s.created_at}`;

      setoranById.set(kunci, {
        ...s,
        sumber_tabel: "setoran"
      });
    });

    semuaSetoran = Array.from(setoranById.values()).map((s) => {
      const p = profilById.get(s.user_id) || null;

      return {
        ...s,
        status: statusNormal(s.status),
        profiles: p,
        users: p
      };
    });

    const disetujui = semuaSetoran.filter(
      (s) => statusNormal(s.status) === "disetujui"
    );

    $("stKg").textContent = `${fmt(
      disetujui.reduce((sum, s) => sum + angkaKg(s), 0)
    )} kg`;

    $("stPoin").textContent = fmtInt(
      disetujui.reduce((sum, s) => sum + angkaPoin(s), 0)
    );

    $("stAkun").textContent = fmtInt(semuaProfil.length);

    renderPengguna();
    renderSetoran();
    renderRekapRingkas();

    beriNotif(
      `Data dimuat: ${semuaProfil.length} pengguna, ${semuaSetoran.length} setoran.`,
      "ok"
    );

    console.log("eLOLA dashboard:", {
      jumlahPengguna: semuaProfil.length,
      jumlahSetoran: semuaSetoran.length,
      setoranDisetujui: disetujui.length,
      errors: {
        users: usersRes.error?.message || null,
        profiles: profilesRes.error?.message || null,
        transaksi_setoran: transaksiRes.error?.message || null,
        setoran: setoranRes.error?.message || null
      }
    });
  } catch (error) {
    console.error("Dashboard admin gagal:", error);

    beriNotif(
      `${error.message || "Gagal memuat data admin."} Periksa sesi admin dan izin akses Supabase.`,
      "error"
    );

    if ($("tabelPengguna")) {
      $("tabelPengguna").innerHTML =
        `<tr><td colspan="5">Data pengguna gagal dimuat.</td></tr>`;
    }

    if ($("tabelSemuaSetoran")) {
      $("tabelSemuaSetoran").innerHTML =
        `<tr><td colspan="7">Data setoran gagal dimuat.</td></tr>`;
    }
  }
});
```
