document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.AuthGuard(["warga", "asn"]);
  if (!user) return;

  const { $, fmtInt, rupiah, notif, tglJam } = window.Utils;
  const poinPerRupiah = Number(window.Utils.POIN_RUPIAH) || 100;
  let saldoSaatIni = 0;
  let riwayatTukar = [];
  let riwayatTarik = [];
  let tabelPenarikanAktif = false;
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const statusTeks = (s) => String(s || "menunggu").toLowerCase() === "menunggu" ? "proses" : String(s || "menunggu");
  const statusKelas = (s) => String(s || "").toLowerCase() === "disetujui" ? "ok" : String(s || "").toLowerCase() === "ditolak" ? "tolak" : "";

  async function segarkan() {
    try {
      const setoran = (await window.SupabaseDB.getSetoran(user.id)).filter(s => String(s.status).toLowerCase() === "disetujui");
      riwayatTukar = await window.SupabaseDB.getRiwayatPenukaran(user.id);
      try {
        riwayatTarik = await window.SupabaseDB.getRiwayatPenarikan(user.id);
        tabelPenarikanAktif = true;
      } catch (err) {
        riwayatTarik = [];
        tabelPenarikanAktif = false;
        const tbody = $("isiPenarikan");
        if (tbody) tbody.innerHTML = '<tr><td colspan="6">Jalankan SETUP-TARIK-DANA.sql di Supabase untuk mengaktifkan penarikan.</td></tr>';
        console.warn("Riwayat penarikan belum tersedia:", err.message);
      }

      const poinMasuk = setoran.reduce((s, x) => s + (Number(x.poin) || 0), 0);
      const kgTotal = setoran.reduce((s, x) => s + (Number(x.kg) || 0), 0);
      const poinTukar = riwayatTukar.filter(x => ["menunggu", "disetujui"].includes(String(x.status || "disetujui").toLowerCase())).reduce((s, x) => s + (Number(x.poin) || 0), 0);
      const poinTarik = riwayatTarik.filter(x => ["menunggu", "disetujui"].includes(String(x.status || "").toLowerCase())).reduce((s, x) => s + (Number(x.poin_dipotong) || 0), 0);
      saldoSaatIni = Math.max(0, poinMasuk - poinTukar - poinTarik);

      $("saldo").textContent = fmtInt(saldoSaatIni);
      $("rupiah").textContent = rupiah(saldoSaatIni * poinPerRupiah);
      $("kgTotal").textContent = kgTotal.toFixed(1) + " kg";
      $("btnTarikDana").disabled = !tabelPenarikanAktif || saldoSaatIni < 1;
      $("btnTarikDana").title = !tabelPenarikanAktif ? "Jalankan SQL setup tarik dana terlebih dahulu" : saldoSaatIni < 1 ? "Saldo poin belum tersedia" : "Tarik dana";

      const katalog = await window.SupabaseDB.getHadiah();
      $("katalog").innerHTML = katalog.map(h => `
        <div class="hadiah">
          <b>${esc(h.nama)}</b>
          <p>${esc(h.deskripsi || "")}</p>
          <div class="harga-hadiah">${fmtInt(h.harga)} poin</div>
          <small>Stok: ${fmtInt(h.stok)}</small>
          <button class="tombol btn-tukar-hadiah" style="padding:8px" data-id="${esc(h.id)}" data-nama="${esc(h.nama)}" data-harga="${esc(h.harga)}" data-stok="${esc(h.stok)}" ${saldoSaatIni < Number(h.harga) || Number(h.stok) < 1 ? "disabled" : ""}>
            ${Number(h.stok) < 1 ? "Habis" : "Tukar"}
          </button>
        </div>
      `).join("") || '<p>Belum ada hadiah di katalog.</p>';

      $("isiTukar").innerHTML = riwayatTukar.map(t => `
        <tr><td>${esc(tglJam(t.created_at))}</td><td>${esc(t.nama_hadiah)}</td><td>-${fmtInt(t.poin)}</td><td><span class="chip ${statusKelas(t.status)}">${esc(statusTeks(t.status))}</span></td></tr>
      `).join("") || '<tr><td colspan="4">Belum ada riwayat penukaran hadiah.</td></tr>';
      renderRiwayatTarik();
      perbaruiInfoTarik();
    } catch (err) {
      notif("err", err.message);
    }
  }

  function renderRiwayatTarik() {
    const tbody = $("isiPenarikan");
    if (!tbody) return;
    if (!tabelPenarikanAktif) return;
    tbody.innerHTML = riwayatTarik.map(t => {
      const tujuan = String(t.metode) === "cash" ? `Cash · WA ${t.nomor_tujuan}` : `${t.provider || "E-wallet"} · ${t.nomor_tujuan}`;
      return `<tr><td>${esc(tglJam(t.created_at))}</td><td>${esc(rupiah(t.nominal_rp))}</td><td>${String(t.metode) === "cash" ? "Cash" : esc(t.provider || "E-wallet")}</td><td>${esc(tujuan)}</td><td><span class="chip ${statusKelas(t.status)}">${esc(statusTeks(t.status))}</span></td><td>${esc(t.catatan_admin || "-")}</td></tr>`;
    }).join("") || '<tr><td colspan="6">Belum ada riwayat penarikan.</td></tr>';
  }

  function perbaruiInfoTarik() {
    const maksimum = saldoSaatIni * poinPerRupiah;
    $("nominalTarik").max = String(maksimum);
    $("infoSaldoTarik").textContent = `Saldo tersedia ${fmtInt(saldoSaatIni)} poin (${rupiah(maksimum)}). Minimal penarikan Rp100 dan harus kelipatan Rp100.`;
    const nominal = Number($("nominalTarik").value) || 0;
    $("konversiTarik").textContent = nominal > 0 && nominal % poinPerRupiah === 0
      ? `Dipotong ${fmtInt(nominal / poinPerRupiah)} poin dari saldo.`
      : `Kurs internal: 1 poin = Rp${fmtInt(poinPerRupiah)}.`;
  }

  function ubahMetodeTarik() {
    const cash = $("metodeTarik").value === "cash";
    $("areaProviderTarik").classList.toggle("hidden", cash);
    $("providerTarik").required = !cash;
    $("labelTujuanTarik").textContent = cash ? "Nomor WhatsApp aktif" : "Nomor e-wallet tujuan";
    $("nomorTujuanTarik").placeholder = cash ? "Nomor WA aktif untuk dihubungi" : "Masukkan nomor e-wallet";
    perbaruiInfoTarik();
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
      await segarkan();
    } catch (e) {
      notif("err", e.message);
    }
  };

  $("katalog").addEventListener("click", ev => {
    const btn = ev.target.closest("[data-id]");
    if (!btn) return;
    window.prosesTukar(Number(btn.dataset.id), btn.dataset.nama, Number(btn.dataset.harga), Number(btn.dataset.stok));
  });

  $("btnTarikDana").addEventListener("click", () => {
    $("formTarikDana").reset();
    $("pesanTarikDana").className = "notif hidden";
    $("pesanTarikDana").textContent = "";
    $("modalTarikDana").classList.remove("hidden");
    ubahMetodeTarik();
    perbaruiInfoTarik();
  });
  $("tutupTarikDana").addEventListener("click", () => $("modalTarikDana").classList.add("hidden"));
  $("modalTarikDana").addEventListener("click", ev => { if (ev.target === $("modalTarikDana")) $("modalTarikDana").classList.add("hidden"); });
  $("metodeTarik").addEventListener("change", ubahMetodeTarik);
  $("nominalTarik").addEventListener("input", perbaruiInfoTarik);

  $("formTarikDana").addEventListener("submit", async ev => {
    ev.preventDefault();
    const btn = $("kirimTarikDana");
    const nominalRp = Number($("nominalTarik").value);
    const metode = $("metodeTarik").value;
    const provider = metode === "ewallet" ? $("providerTarik").value : null;
    const nomorTujuan = $("nomorTujuanTarik").value.trim();
    if (!Number.isSafeInteger(nominalRp) || nominalRp < 100 || nominalRp % poinPerRupiah !== 0) {
      notif("err", `Nominal minimal Rp${fmtInt(poinPerRupiah)} dan harus kelipatan Rp${fmtInt(poinPerRupiah)}.`, "pesanTarikDana"); return;
    }
    if (nominalRp > saldoSaatIni * poinPerRupiah) {
      notif("err", "Nominal melebihi saldo yang tersedia.", "pesanTarikDana"); return;
    }
    if (!/^[+0-9][0-9\s().-]{7,19}$/.test(nomorTujuan)) {
      notif("err", "Masukkan nomor tujuan/WhatsApp aktif yang valid.", "pesanTarikDana"); return;
    }
    if (!tabelPenarikanAktif) {
      notif("err", "Tabel penarikan belum tersedia. Jalankan SETUP-TARIK-DANA.sql di Supabase.", "pesanTarikDana"); return;
    }

    btn.disabled = true; btn.textContent = "Mengirim...";
    try {
      await window.SupabaseDB.ajukanPenarikan({ nominalRp, metode, provider, nomorTujuan });
      $("modalTarikDana").classList.add("hidden");
      notif("ok", "Permintaan penarikan terkirim. Poin ditahan sampai admin menyelesaikan atau menolak permintaan.");
      await segarkan();
    } catch (e) {
      notif("err", e.message || "Permintaan penarikan gagal.", "pesanTarikDana");
    } finally {
      btn.disabled = false; btn.textContent = "Ajukan Penarikan";
    }
  });

  segarkan();
});
