
document.addEventListener("DOMContentLoaded", async () => {
  const $ = (id) => document.getElementById(id);

  const fmt = (angka) =>
    Number(angka || 0).toLocaleString("id-ID", {
      maximumFractionDigits: 2
    });

  const fmtInt = (angka) =>
    Number(angka || 0).toLocaleString("id-ID");

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);

  const role = (value) =>
    String(value || "warga").trim().toLowerCase();

  const isAsn = (p) =>
    p?.is_asn === true ||
    ["asn", "pns"].includes(role(p?.peran));

  const statusNormal = (value) => {
    const s = role(value);

    if (["approved", "selesai", "disetujui"].includes(s)) {
      return "disetujui";
    }

    if (["rejected", "ditolak"].includes(s)) {
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

  const angkaKg = (s) =>
    Number(s.berat_kg ?? s.kg ?? s.kg_klaim ?? 0) || 0;

  const angkaPoin = (s) =>
    Number(
      s.poin_diterima ??
      s.poin ??
      s.estimasi_poin ??
      0
    ) || 0;

  const waktu = (s) =>
    s.created_at || s.waktu || s.tanggal || null;

  const namaPenyetor = (s) =>
    s.profiles?.nama ||
    s.users?.nama ||
    s.nama ||
    s.email ||
    "Pengguna";

  const wilayah = (s) =>
    `${s.rw || s.profiles?.rw || s.users?.rw || "-"} / ${
      s.rt || s.profiles?.rt || s.users?.rt || "-"
    }`;

  const bulanInput = $("bulanRekapAsn");

  if (bulanInput && !bulanInput.value) {
    const sekarang = new Date();

    bulanInput.value =
      `${sekarang.getFullYear()}-${String(
        sekarang.getMonth() + 1
      ).padStart(2, "0")}`;
  }

  let semuaProfil = [];
  let semuaSetoran = [];

  function beriNotif(teks, tipe = "info") {
    const el = $("notifAdmin");

    if (!el) return;

    el.className = `notif ${tipe}`;
    el.textContent = teks;
  }

  function renderPengguna() {
    const tabel = $("tabelPengguna");
    if (!tabel) return;

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
      ].some((v) =>
        String(v || "").toLowerCase().includes(q)
      )
    );

    tabel.innerHTML = data.length
      ? data.map((p) => `
        <tr>
          <td>${escapeHTML(p.nama || "-")}</td>
          <td>${escapeHTML(p.peran || "warga")}</td>
          <td>${escapeHTML(p.nik_nip || "-")}</td>
          <td>${escapeHTML(p.rw || "-")} / ${escapeHTML(p.rt || "-")}</td>
          <td>${escapeHTML(p.instansi || "-")}</td>
        </tr>
      `).join("")
      : `<tr><td colspan="5">Tidak ada pengguna.</td></tr>`;
  }

  function renderSetoran() {
    const tabel = $("tabelLog");
    if (!tabel) return;

    const filter = $("filterStatusSetoran")?.value || "semua";

    const data = semuaSetoran.filter((s) =>
      filter === "semua" ||
      statusNormal(s.status) === filter
    );

    tabel.innerHTML = data.length
      ? data.map((s) => {
          const tanggal = waktu(s)
            ? new Date(waktu(s)).toLocaleString("id-ID")
            : "-";

          return `
            <tr>
              <td>${escapeHTML(tanggal)}</td>
              <td>${escapeHTML(namaPenyetor(s))}</td>
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
      : `<tr><td colspan="6">Belum ada data setoran.</td></tr>`;
  }

  function dataRekapAsn() {
    const bulan = bulanInput?.value || "";

    const asn = semuaProfil.filter(isAsn);

    const setoranBulan = semuaSetoran.filter((s) => {
      const tanggal = waktu(s);
      const pemilik = semuaProfil.find(
        (p) => p.id === s.user_id
      );

      return (
        tanggal &&
        tanggal.slice(0, 7) === bulan &&
        pemilik &&
        isAsn(pemilik)
      );
    });

    const disetujui = setoranBulan.filter(
      (s) => statusNormal(s.status) === "disetujui"
    );

    const kgPerUser = new Map();

    disetujui.forEach((s) => {
      const id = s.user_id;
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
      kgPerUser,
      patuh,
      totalKg: disetujui.reduce(
        (total, s) => total + angkaKg(s),
        0
      )
    };
  }

  function renderRekapAsn() {
    const r = dataRekapAsn();

    if ($("asnJumlah")) {
      $("asnJumlah").textContent = fmtInt(r.asn.length);
    }

    if ($("asnPatuh")) {
      $("asnPatuh").textContent =
        `${fmtInt(r.patuh)} / ${fmtInt(r.asn.length)}`;
    }

    if ($("asnKg")) {
      $("asnKg").textContent = `${fmt(r.totalKg)} kg`;
    }
  }

  function buatPDF() {
    if (!window.jspdf?.jsPDF) {
      beriNotif("Library PDF belum termuat.", "error");
      return;
    }

    const r = dataRekapAsn();

    if (!r.bulan || !r.bulan.includes("-")) {
      beriNotif("Pilih bulan laporan terlebih dahulu.", "error");
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF("l", "mm", "a4");

    const namaBulan = new Date(
      Number(r.bulan.slice(0, 4)),
      Number(r.bulan.slice(5, 7)) - 1,
      1
    ).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric"
    });

    doc.setFontSize(16);
    doc.text("eLOLA - REKAPAN SETORAN ASN", 12, 15);

    doc.setFontSize(10);
    doc.text(`Periode: ${namaBulan}`, 12, 23);
    doc.text(`Jumlah ASN: ${r.asn.length}`, 12, 30);
    doc.text(`ASN memenuhi target 2 kg: ${r.patuh}`, 12, 36);
    doc.text(`Total setoran disetujui: ${fmt(r.totalKg)} kg`, 12, 42);

    let y = 52;

    const headers = [
      "No", "Nama", "NIK/NIP", "Instansi",
      "RW", "RT", "Berat (kg)", "Target"
    ];

    const xs = [12, 22, 75, 112, 158, 178, 198, 235];

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    headers.forEach((h, i) => {
      doc.text(h, xs[i], y);
    });

    y += 7;
    doc.setFont("helvetica", "normal");

    r.asn.forEach((p, i) => {
      if (y > 190) {
        doc.addPage();
        y = 15;
      }

      const kg = r.kgPerUser.get(p.id) || 0;

      const values = [
        String(i + 1),
        p.nama || "-",
        p.nik_nip || "-",
        p.instansi || "-",
        String(p.rw || "-"),
        String(p.rt || "-"),
        fmt(kg),
        kg >= 2 ? "Memenuhi" : "Belum"
      ];

      values.forEach((v, j) => {
        doc.text(
          doc.splitTextToSize(String(v), j === 1 ? 48 : 30)[0] || "-",
          xs[j],
          y
        );
      });

      y += 7;
    });

    doc.save(`Rekapan-ASN-${r.bulan}.pdf`);
    beriNotif("PDF berhasil dibuat.", "ok");
  }

  $("cariPengguna")?.addEventListener("input", renderPengguna);
  $("filterStatusSetoran")?.addEventListener("change", renderSetoran);
  bulanInput?.addEventListener("change", renderRekapAsn);
  $("exportPdfAsn")?.addEventListener("click", buatPDF);

  try {
    if (!window.SupabaseDB?.getClient) {
      throw new Error("SupabaseDB belum tersedia. Periksa js/supabase.js.");
    }

    if (!window.AuthGuard) {
      throw new Error("AuthGuard belum tersedia. Periksa js/auth-guard.js.");
    }

    const profilAktif = await window.AuthGuard(["admin"]);
    if (!profilAktif) return;

    const sb = window.SupabaseDB.getClient();

    async function ambil(tabel) {
      const { data, error } = await sb
        .from(tabel)
        .select("*");

      if (error) {
        console.warn(`Gagal membaca ${tabel}:`, error.message);
        return [];
      }

      return data || [];
    }

    const [users, profiles, transaksi, setoran] =
      await Promise.all([
        ambil("users"),
        ambil("profiles"),
        ambil("transaksi_setoran"),
        ambil("setoran")
      ]);

    if (!users.length && !profiles.length) {
      throw new Error(
        "Data pengguna kosong atau tidak bisa dibaca. Periksa tabel dan kebijakan RLS Supabase."
      );
    }

    const profilMap = new Map();

    profiles.forEach((p) => {
      profilMap.set(p.id, { ...p });
    });

    users.forEach((u) => {
      const lama = profilMap.get(u.id) || {};

      profilMap.set(u.id, {
        ...lama,
        ...u,
        peran: u.peran || lama.peran || "warga",
        nama: u.nama || lama.nama || "-",
        email: u.email || lama.email || "",
        rw: u.rw || lama.rw || null,
        rt: u.rt || lama.rt || null,
        instansi: u.instansi || lama.instansi || "-",
        is_asn:
          u.is_asn === true ||
          role(u.peran) === "asn" ||
          role(lama.peran) === "asn"
      });
    });

    semuaProfil = [...profilMap.values()];

    // Utamakan tabel setoran agar transaksi yang sama
    // tidak dihitung dua kali jika ada di kedua tabel.
    const setoranMap = new Map();

    setoran.forEach((s) => {
      setoranMap.set(s.id, { ...s });
    });

    transaksi.forEach((s) => {
      if (!setoranMap.has(s.id)) {
        setoranMap.set(s.id, { ...s });
      }
    });

    semuaSetoran = [...setoranMap.values()].map((s) => {
      const pemilik = profilMap.get(s.user_id) || {};

      return {
        ...s,
        status: statusNormal(s.status),
        profiles: s.profiles || pemilik,
        users: s.users || pemilik
      };
    });

    const disetujui = semuaSetoran.filter(
      (s) => statusNormal(s.status) === "disetujui"
    );

    if ($("stKg")) {
      $("stKg").textContent =
        `${fmt(disetujui.reduce((total, s) => total + angkaKg(s), 0))} kg`;
    }

    if ($("stPoin")) {
      $("stPoin").textContent = fmtInt(
        disetujui.reduce((total, s) => total + angkaPoin(s), 0)
      );
    }

    if ($("stAkun")) {
      $("stAkun").textContent = fmtInt(semuaProfil.length);
    }

    renderPengguna();
    renderSetoran();
    renderRekapAsn();

    beriNotif("Data dashboard berhasil dimuat.", "ok");

    console.log("Dashboard eLOLA berhasil dimuat.", {
      jumlahPengguna: semuaProfil.length,
      jumlahSetoran: semuaSetoran.length
    });

  } catch (error) {
    console.error("Dashboard eLOLA:", error);

    beriNotif(
      `Gagal memuat dashboard: ${error.message}`,
      "error"
    );
  }
});
