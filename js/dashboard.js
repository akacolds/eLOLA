document.addEventListener("DOMContentLoaded", async function () {
  const utils = window.Utils;

  if (!utils || !window.SupabaseDB) {
    console.error("Utils atau SupabaseDB belum dimuat.");
    return;
  }

  const $ = utils.$;
  const fmt = utils.fmt;
  const fmtInt = utils.fmtInt;
  const tglJam = utils.tglJam;

  const bulanInput = $("bulanRekapAsn");

  if (!bulanInput) {
    console.error("Elemen bulanRekapAsn tidak ditemukan.");
    return;
  }

  const sekarang = new Date();

  bulanInput.value =
    sekarang.getFullYear() +
    "-" +
    String(sekarang.getMonth() + 1).padStart(2, "0");

  let semuaProfil = [];
  let semuaSetoran = [];

  function normal(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase();
  }

  function escapeHTML(value) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return String(value == null ? "" : value).replace(
      /[&<>"']/g,
      function (c) {
        return map[c];
      }
    );
  }

  function angkaKg(s) {
    return Number(
      s.kg != null
        ? s.kg
        : s.kg_klaim != null
          ? s.kg_klaim
          : s.berat_kg != null
            ? s.berat_kg
            : 0
    ) || 0;
  }

  function angkaPoin(s) {
    return Number(
      s.poin_diterima != null
        ? s.poin_diterima
        : s.poin != null
          ? s.poin
          : s.estimasi_poin != null
            ? s.estimasi_poin
            : 0
    ) || 0;
  }

  function waktu(s) {
    return s.created_at || s.waktu || null;
  }

  function tampilWaktu(s) {
    const t = waktu(s);
    return t ? tglJam(t) : "-";
  }

  function statusNormal(value) {
    const s = normal(value);

    if (["disetujui", "approved", "selesai"].includes(s)) {
      return "disetujui";
    }

    if (["ditolak", "rejected"].includes(s)) {
      return "ditolak";
    }

    return "menunggu";
  }

  function statusLabel(value) {
    const s = statusNormal(value);

    if (s === "disetujui") return "Disetujui";
    if (s === "ditolak") return "Ditolak";

    return "Menunggu";
  }

  function statusClass(value) {
    const s = statusNormal(value);

    if (s === "disetujui") return "ok";
    if (s === "ditolak") return "tolak";

    return "tunggu";
  }

  function isAsn(p) {
    return (
      p.is_asn === true ||
      ["asn", "pns"].includes(normal(p.peran))
    );
  }

  function cariProfil(userId) {
    return semuaProfil.find(function (p) {
      return String(p.id) === String(userId);
    }) || null;
  }

  function namaPenyetor(s) {
    const p = cariProfil(s.user_id);

    return (
      p?.nama ||
      s.profiles?.nama ||
      s.users?.nama ||
      s.nama ||
      s.email ||
      "Pengguna"
    );
  }

  function wilayah(s) {
    const p = cariProfil(s.user_id);

    return (
      (s.rw || p?.rw || "-") +
      " / " +
      (s.rt || p?.rt || "-")
    );
  }

  function beriNotif(teks, tipe) {
    const el = $("notifAdmin");
    if (!el) return;

    el.className = "notif " + (tipe || "info");
    el.textContent = teks;
  }

  function renderPengguna() {
    const input = $("cariPengguna");
    const q = input ? input.value.trim().toLowerCase() : "";

    const data = semuaProfil.filter(function (p) {
      return [
        p.nama,
        p.peran,
        p.nik_nip,
        p.rw,
        p.rt,
        p.instansi,
        p.email
      ].some(function (v) {
        return String(v || "").toLowerCase().includes(q);
      });
    });

    const tabel = $("tabelPengguna");
    if (!tabel) return;

    if (!data.length) {
      tabel.innerHTML =
        '<tr><td colspan="5">Tidak ada pengguna yang cocok.</td></tr>';
      return;
    }

    tabel.innerHTML = data.map(function (p) {
      return (
        "<tr>" +
        "<td>" + escapeHTML(p.nama || "-") + "</td>" +
        "<td>" + escapeHTML(p.peran || "warga") + "</td>" +
        "<td>" + escapeHTML(p.nik_nip || "-") + "</td>" +
        "<td>" + escapeHTML(p.rw || "-") + " / " +
        escapeHTML(p.rt || "-") + "</td>" +
        "<td>" + escapeHTML(p.instansi || "-") + "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function renderSetoran() {
    const select = $("filterStatusSetoran");
    const filter = select ? select.value : "semua";
    const tabel = $("tabelSemuaSetoran");

    if (!tabel) return;

    const data = semuaSetoran.filter(function (s) {
      return (
        filter === "semua" ||
        statusNormal(s.status) === filter
      );
    });

    if (!data.length) {
      tabel.innerHTML =
        '<tr><td colspan="7">Belum ada data setoran untuk filter ini.</td></tr>';
      return;
    }

    tabel.innerHTML = data.map(function (s) {
      const p = cariProfil(s.user_id);

      return (
        "<tr>" +
        "<td>" + escapeHTML(tampilWaktu(s)) + "</td>" +
        "<td>" + escapeHTML(namaPenyetor(s)) + "</td>" +
        "<td>" + escapeHTML(p?.peran || "-") + "</td>" +
        "<td>" + escapeHTML(wilayah(s)) + "</td>" +
        "<td>" + fmt(angkaKg(s)) + " kg</td>" +
        "<td>" + fmtInt(angkaPoin(s)) + "</td>" +
        '<td><span class="admin-status ' +
        statusClass(s.status) + '">' +
        statusLabel(s.status) +
        "</span></td>" +
        "</tr>"
      );
    }).join("");
  }

  function dataRekapAsn() {
    const bulan = bulanInput.value;

    const asn = semuaProfil.filter(isAsn);

    const setoranBulan = semuaSetoran.filter(function (s) {
      const t = waktu(s);
      const p = cariProfil(s.user_id);

      return (
        t &&
        t.slice(0, 7) === bulan &&
        p &&
        isAsn(p)
      );
    });

    const disetujui = setoranBulan.filter(function (s) {
      return statusNormal(s.status) === "disetujui";
    });

    const kgPerUser = new Map();

    disetujui.forEach(function (s) {
      if (s.user_id == null) return;

      const id = String(s.user_id);

      kgPerUser.set(
        id,
        (kgPerUser.get(id) || 0) + angkaKg(s)
      );
    });

    const patuh = asn.filter(function (p) {
      return (kgPerUser.get(String(p.id)) || 0) >= 2;
    }).length;

    const totalKg = disetujui.reduce(function (sum, s) {
      return sum + angkaKg(s);
    }, 0);

    return {
      bulan: bulan,
      asn: asn,
      setoranBulan: setoranBulan,
      disetujui: disetujui,
      kgPerUser: kgPerUser,
      patuh: patuh,
      totalKg: totalKg
    };
  }

  function renderRekapRingkas() {
    const r = dataRekapAsn();

    $("asnJumlah").textContent = fmtInt(r.asn.length);
    $("asnPatuh").textContent =
      fmtInt(r.patuh) + " / " + fmtInt(r.asn.length);
    $("asnKg").textContent = fmt(r.totalKg) + " kg";
  }

  function buatPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      beriNotif(
        "Library PDF belum termuat. Periksa koneksi internet.",
        "error"
      );
      return;
    }

    const r = dataRekapAsn();
    const bagianBulan = r.bulan.split("-");
    const tahun = bagianBulan[0];
    const bulan = bagianBulan[1];

    if (!tahun || !bulan) {
      beriNotif("Pilih bulan laporan terlebih dahulu.", "error");
      return;
    }

    const jsPDF = window.jspdf.jsPDF;
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
    doc.text("Periode: " + namaBulan, kiri, 22);
    doc.text("Jumlah ASN: " + r.asn.length, kiri, 29);
    doc.text(
      "Memenuhi target 2 kg: " + r.patuh + " dari " + r.asn.length,
      kiri,
      35
    );
    doc.text("Total berat disetujui: " + fmt(r.totalKg) + " kg", kiri, 41);

    const x = [14, 23, 66, 95, 115, 135, 153, 198, 227];
    const headers = [
      "No", "Nama ASN", "NIK/NIP", "Instansi", "RW",
      "RT", "Total (kg)", "Target", "Status target"
    ];

    let y = 51;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setFillColor(226, 242, 229);
    doc.rect(kiri, y - 5, 273, 8, "F");

    headers.forEach(function (h, i) {
      doc.text(h, x[i], y);
    });

    y += 6;
    doc.setFont("helvetica", "normal");

    const rows = r.asn.map(function (p, i) {
      const kg = r.kgPerUser.get(String(p.id)) || 0;

      return {
        no: String(i + 1),
        nama: p.nama || "-",
        nip: p.nik_nip || "-",
        instansi: p.instansi || "-",
        rw: p.rw || "-",
        rt: p.rt || "-",
        kg: kg,
        patuh: kg >= 2
      };
    });

    rows.forEach(function (p) {
      if (y > 185) {
        doc.addPage();
        y = 16;
      }

      const values = [
        p.no, p.nama, p.nip, p.instansi, p.rw,
        p.rt, fmt(p.kg), "2 kg",
        p.patuh ? "Memenuhi" : "Belum memenuhi"
      ];

      const widths = [6, 39, 26, 28, 14, 14, 35, 12, 34];

      values.forEach(function (value, j) {
        const lines = doc.splitTextToSize(
          String(value),
          widths[j]
        );

        doc.text(lines.slice(0, 2), x[j], y);
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
    doc.text(
      "Tanggal | Nama ASN | Wilayah | Berat (kg) | Poin | Status",
      kiri,
      y
    );

    y += 6;

    r.setoranBulan.forEach(function (s) {
      if (y > 195) {
        doc.addPage();
        y = 16;
      }

      const tanggal = waktu(s)
        ? new Date(waktu(s)).toLocaleDateString("id-ID")
        : "-";

      const baris = [
        tanggal,
        namaPenyetor(s).slice(0, 25),
        wilayah(s),
        fmt(angkaKg(s)) + " kg",
        fmtInt(angkaPoin(s)),
        statusLabel(s.status)
      ].join(" | ");

      doc.text(baris, kiri, y);
      y += 5;
    });

    doc.save("Rekapan-Setoran-ASN-" + tahun + "-" + bulan + ".pdf");
    beriNotif("PDF rekapan berhasil dibuat.", "ok");
  }

  $("cariPengguna")?.addEventListener("input", renderPengguna);
  $("filterStatusSetoran")?.addEventListener("change", renderSetoran);
  bulanInput.addEventListener("change", renderRekapRingkas);
  $("exportPdfAsn")?.addEventListener("click", buatPDF);

  try {
    const profilAktif = await window.AuthGuard(["admin"]);

    if (!profilAktif) return;

    const sb = window.SupabaseDB.getClient();

    async function ambil(tabel) {
      const hasil = await sb.from(tabel).select("*");

      if (hasil.error) {
        console.error(
          "Gagal membaca tabel " + tabel + ":",
          hasil.error.message
        );

        return {
          data: [],
          error: hasil.error
        };
      }

      return {
        data: hasil.data || [],
        error: null
      };
    }

    const hasil = await Promise.all([
      ambil("users"),
      ambil("profiles"),
      ambil("transaksi_setoran"),
      ambil("setoran")
    ]);

    const usersRes = hasil[0];
    const profilesRes = hasil[1];
    const transaksiRes = hasil[2];
    const setoranRes = hasil[3];

    if (usersRes.error && profilesRes.error) {
      throw new Error("Tidak dapat membaca users maupun profiles.");
    }

    if (transaksiRes.error && setoranRes.error) {
      throw new Error("Tidak dapat membaca tabel setoran.");
    }

    const profilById = new Map();

    (profilesRes.data || []).forEach(function (p) {
      profilById.set(String(p.id), Object.assign({}, p));
    });

    (usersRes.data || []).forEach(function (u) {
      const id = String(u.id);
      const lama = profilById.get(id) || {};

      profilById.set(id, Object.assign({}, u, lama, {
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
      }));
    });

    semuaProfil = Array.from(profilById.values());

    const setoranById = new Map();

    (transaksiRes.data || []).forEach(function (s, i) {
      const id = s.id != null
        ? String(s.id)
        : "transaksi-" + i;

      const berat = s.berat_kg ?? s.kg ?? 0;

      setoranById.set(id, Object.assign({}, s, {
        kg: berat,
        kg_klaim: berat,
        poin:
          s.poin_diterima ??
          s.poin ??
          s.estimasi_poin ??
          0,
        sumber_tabel: "transaksi_setoran"
      }));
    });

    (setoranRes.data || []).forEach(function (s, i) {
      const id = s.id != null
        ? String(s.id)
        : "setoran-" + i;

      setoranById.set(id, Object.assign({}, s, {
        sumber_tabel: "setoran"
      }));
    });

    semuaSetoran = Array.from(setoranById.values()).map(function (s) {
      const p = profilById.get(String(s.user_id)) || null;

      return Object.assign({}, s, {
        status: statusNormal(s.status),
        profiles: p,
        users: p
      });
    });

    const disetujui = semuaSetoran.filter(function (s) {
      return statusNormal(s.status) === "disetujui";
    });

    $("stKg").textContent =
      fmt(disetujui.reduce(function (sum, s) {
        return sum + angkaKg(s);
      }, 0)) + " kg";

    $("stPoin").textContent = fmtInt(
      disetujui.reduce(function (sum, s) {
        return sum + angkaPoin(s);
      }, 0)
    );

    $("stAkun").textContent = fmtInt(semuaProfil.length);

    renderPengguna();
    renderSetoran();
    renderRekapRingkas();

    beriNotif(
      "Data dimuat: " + semuaProfil.length +
      " pengguna dan " + semuaSetoran.length + " setoran.",
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
      (error.message || "Gagal memuat data admin.") +
      " Periksa sesi admin dan izin akses Supabase.",
      "error"
    );

    if ($("tabelPengguna")) {
      $("tabelPengguna").innerHTML =
        '<tr><td colspan="5">Data pengguna gagal dimuat.</td></tr>';
    }

    if ($("tabelSemuaSetoran")) {
      $("tabelSemuaSetoran").innerHTML =
        '<tr><td colspan="7">Data setoran gagal dimuat.</td></tr>';
    }
  }
});
```
