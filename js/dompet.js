document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.AuthGuard(["warga", "asn"]);
  if (!user) return;

  const { $, fmtInt, rupiah, notif, tglJam } = window.Utils;

  async function segarkan() {
    try {
      // 1. Ambil data setoran user yang disetujui
      const setoran = (await window.SupabaseDB.getSetoran(user.id)).filter(s => s.status === "disetujui");
      const poinMasuk = setoran.reduce((s, x) => s + (x.poin || 0), 0);
      const kgTotal = setoran.reduce((s, x) => s + (x.kg || 0), 0);

      // 2. Ambil riwayat penukaran dari tabel penukaran
      const tukarList = await window.SupabaseDB.getRiwayatPenukaran(user.id);
      const poinKeluar = tukarList.filter(x => ["menunggu", "disetujui"].includes(String(x.status || "disetujui").toLowerCase())).reduce((s, x) => s + (Number(x.poin) || 0), 0);
      const saldo = poinMasuk - poinKeluar;

      $("saldo").textContent = fmtInt(saldo);
      $("rupiah").textContent = rupiah(saldo * window.Utils.POIN_RUPIAH);
      $("kgTotal").textContent = kgTotal.toFixed(1) + " kg";

      // 3. Render katalog hadiah
      const katalog = await window.SupabaseDB.getHadiah();
      $("katalog").innerHTML = katalog.map(h => `
        <div class="hadiah">
          <b>${h.nama}</b>
          <p>${h.deskripsi || ""}</p>
          <div class="harga-hadiah">${fmtInt(h.harga)} poin</div>
          <small>Stok: ${h.stok}</small>
          <button class="tombol" style="padding:8px" ${saldo < h.harga || h.stok < 1 ? 'disabled' : ''} onclick="prosesTukar(${h.id}, '${h.nama}', ${h.harga}, ${h.stok})">
            ${h.stok < 1 ? 'Habis' : 'Tukar'}
          </button>
        </div>
      `).join("");

      // 4. Render tabel riwayat penukaran
      $("isiTukar").innerHTML = tukarList.map(t => `
        <tr>
          <td>${tglJam(t.created_at)}</td>
          <td>${t.nama_hadiah}</td>
          <td>-${fmtInt(t.poin)}</td>
          <td>${String(t.status || "disetujui")}</td>
        </tr>
      `).join("");
    } catch (err) {
      notif("err", err.message);
    }
  }

  window.prosesTukar = async (id, nama, harga, stok) => {
    try {
      const catatan = prompt("Catatan untuk penukaran (wajib):", "")?.trim();
      if (!catatan) { notif("err", "Catatan penukaran wajib diisi."); return; }
      const nomorWa = prompt("Nomor HP/WhatsApp aktif (wajib):", "")?.trim();
      if (!nomorWa || !/^[+0-9][0-9\s().-]{7,19}$/.test(nomorWa)) {
        notif("err", "Masukkan nomor HP/WhatsApp yang valid."); return;
      }
      await window.SupabaseDB.tukarHadiah(user.id, { id, nama, harga, stok, catatan, nomorWa });
      notif("ok", `Permintaan penukaran ${nama} dikirim. Poin ditahan sampai petugas memprosesnya.`);
      segarkan();
    } catch (e) {
      notif("err", e.message);
    }
  };

  segarkan();
});
