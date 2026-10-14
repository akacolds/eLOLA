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
      const poinKeluar = tukarList.reduce((s, x) => s + (x.poin || 0), 0);
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
          <div style="font-size:1.1rem;font-weight:700">${fmtInt(h.harga)} poin</div>
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
        </tr>
      `).join("");
    } catch (err) {
      notif("err", err.message);
    }
  }

  window.prosesTukar = async (id, nama, harga, stok) => {
    try {
      await window.SupabaseDB.tukarHadiah(user.id, { id, nama, harga, stok });
      notif("ok", `Berhasil menukar ${nama}!`);
      segarkan();
    } catch (e) {
      notif("err", e.message);
    }
  };

  segarkan();
});
