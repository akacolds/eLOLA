document.addEventListener("DOMContentLoaded", () => {
  const tombolPDF = document.getElementById("exportPdfAsn");

  if (!tombolPDF) {
    console.warn("Tombol exportPdfAsn tidak ditemukan di HTML.");
    return;
  }

  tombolPDF.addEventListener("click", () => {
    const bulanInput = document.getElementById("bulanRekapAsn");

    const jumlahASN =
      document.getElementById("asnJumlah")?.textContent?.trim() || "0";

    const asnPatuh =
      document.getElementById("asnPatuh")?.textContent?.trim() || "0";

    const totalKg =
      document.getElementById("asnKg")?.textContent?.trim() || "0";

    const tabel =
      document.getElementById("tabelAsn") ||
      document.getElementById("tabelLog");

    const bulan = bulanInput?.value
      ? new Date(bulanInput.value + "-01").toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric"
        })
      : new Date().toLocaleDateString("id-ID", {
          month: "long",
          year: "numeric"
        });

    const tanggalCetak = new Date().toLocaleString("id-ID", {
      dateStyle: "long",
      timeStyle: "short"
    });

    const tabelHTML = tabel
      ? tabel.outerHTML
      : "<p>Tabel data tidak ditemukan.</p>";

    const halaman = window.open("", "_blank");

    if (!halaman) {
      alert("Popup diblokir browser. Izinkan popup untuk website eLOLA.");
      return;
    }

    halaman.document.open();
    halaman.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Laporan ASN eLOLA - ${bulan}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, sans-serif;
            color: #222;
            margin: 30px;
            font-size: 12px;
          }

          h1 {
            color: #047857;
            text-align: center;
            margin-bottom: 5px;
            font-size: 22px;
          }

          h2 {
            text-align: center;
            font-size: 15px;
            margin-top: 5px;
          }

          .subjudul {
            text-align: center;
            color: #555;
            margin-bottom: 25px;
          }

          .statistik {
            display: flex;
            gap: 12px;
            margin: 20px 0;
          }

          .stat {
            flex: 1;
            padding: 14px;
            border: 1px solid #ccc;
            border-radius: 6px;
          }

          .stat p {
            margin: 0 0 8px;
            color: #555;
          }

          .stat strong {
            font-size: 20px;
            color: #047857;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }

          th, td {
            border: 1px solid #bbb;
            padding: 8px;
            text-align: left;
            overflow-wrap: anywhere;
          }

          th {
            background: #d1fae5;
            color: #064e3b;
          }

          tr {
            page-break-inside: avoid;
          }

          .footer {
            margin-top: 30px;
            color: #666;
            font-size: 10px;
            text-align: right;
          }

          button {
            padding: 10px 16px;
            background: #047857;
            color: white;
            border: 0;
            border-radius: 5px;
            cursor: pointer;
          }

          @media print {
            body {
              margin: 10mm;
            }

            .aksi {
              display: none;
            }

            .statistik {
              display: flex;
            }

            th {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }

          @media screen and (max-width: 600px) {
            body {
              margin: 12px;
            }

            .statistik {
              flex-direction: column;
            }
          }
        </style>
      </head>

      <body>
        <div class="aksi">
          <button onclick="window.print()">Cetak / Simpan PDF</button>
        </div>

        <h1>eLOLA</h1>
        <h2>Laporan Rekapitulasi ASN</h2>
        <p class="subjudul">Periode: ${escapeHTML(bulan)}</p>

        <div class="statistik">
          <div class="stat">
            <p>Jumlah ASN</p>
            <strong>${escapeHTML(jumlahASN)}</strong>
          </div>

          <div class="stat">
            <p>ASN Memenuhi Kewajiban</p>
            <strong>${escapeHTML(asnPatuh)}</strong>
          </div>

          <div class="stat">
            <p>Total Setoran</p>
            <strong>${escapeHTML(totalKg)} kg</strong>
          </div>
        </div>

        <h3>Data Setoran</h3>

        ${tabelHTML}

        <div class="footer">
          Dicetak melalui sistem eLOLA pada ${escapeHTML(tanggalCetak)}
        </div>

        <script>
          function escapeHTML(value) {
            return String(value)
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#39;");
          }
        <\/script>
      </body>
      </html>
    `);
    halaman.document.close();
  });

  console.log("Fitur ekspor PDF eLOLA siap digunakan.");
});

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
