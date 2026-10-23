document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.AuthGuard(["warga", "asn"]);
  if (!user) return;

  const { $, fmt, bulat1, JENIS, notif, tglJam } = window.Utils;
  const daftarJenis = $("daftarJenis");
  const inputFoto = $("fotoSetoran");
  const inputKamera = $("kameraSetoran");
  const previewBungkus = $("pratinjauFotoBungkus");
  const previewFoto = $("pratinjauFoto");
  const namaFoto = $("namaFotoSetoran");
  const hapusFotoBtn = $("hapusFotoBtn");
  let fileFotoTerpilih = null;
  let urlPreviewFoto = null;
  const berat = Object.fromEntries(JENIS.map(j => [j.k, 0]));
  const isAsn = String(user.peran || "").toLowerCase() === "asn";
  let statusKuota = null;

  // Wilayah setoran harus berasal dari profil Supabase, bukan pilihan statis.
  // Ini mencegah warga memilih RT/RW yang berbeda dari data akunnya.
  const inputRwWilayah = $("rw");
  const inputRtWilayah = $("rt");
  if (inputRwWilayah) inputRwWilayah.value = String(user.rw || "").trim();
  if (inputRtWilayah) inputRtWilayah.value = String(user.rt || "").trim();
  if (!inputRwWilayah?.value || !inputRtWilayah?.value) {
    notif("err", "RT/RW akun belum lengkap. Hubungi admin untuk memperbarui profil sebelum menyetor.");
    const tombolKirim = $("bSetor");
    if (tombolKirim) tombolKirim.disabled = true;
  }

  // Status kewajiban ASN dibuat dari data setoran terverifikasi bulan berjalan.
  if (isAsn && $("fSetor")) {
    statusKuota = document.createElement("section");
    statusKuota.id = "statusKuotaAsn";
    statusKuota.className = "status-kuota-asn belum";
    statusKuota.setAttribute("role", "status");
    statusKuota.innerHTML = `<div><b>Kewajiban Setoran ASN</b><p>Minimal 2 kg sampah anorganik setiap bulan.</p></div><strong id="kuotaAsnAngka">Memuat...</strong>`;
    $("fSetor").before(statusKuota);
  }

  async function perbaruiKuotaAsn(list) {
    if (!isAsn || !statusKuota) return;
    const now = new Date();
    const kgBulanIni = list.reduce((total, s) => {
      const d = new Date(s.created_at || s.waktu || 0);
      const bulanSama = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      return total + (bulanSama && s.status === "disetujui" ? Number(s.kg) || 0 : 0);
    }, 0);
    const patuh = kgBulanIni >= window.Utils.KUOTA_ASN;
    statusKuota.classList.toggle("patuh", patuh);
    statusKuota.classList.toggle("belum", !patuh);
    $("kuotaAsnAngka").textContent = `${fmt(bulat1(kgBulanIni))} / 2 kg`;
    const p = statusKuota.querySelector("p");
    p.textContent = patuh
      ? "Target bulanan terpenuhi berdasarkan setoran yang telah disetujui."
      : `Belum memenuhi target. Kurang ${fmt(bulat1(Math.max(0, window.Utils.KUOTA_ASN - kgBulanIni)))} kg lagi. Setoran dihitung setelah disetujui petugas.`;
  }

  function pilihFileFoto(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith("image/")) {
      notif("err", "File harus berupa gambar.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notif("err", "Ukuran foto maksimal 5 MB. Pilih foto yang lebih kecil.");
      return;
    }
    fileFotoTerpilih = file;
    if (urlPreviewFoto) URL.revokeObjectURL(urlPreviewFoto);
    urlPreviewFoto = URL.createObjectURL(file);
    previewFoto.src = urlPreviewFoto;
    namaFoto.textContent = file.name || "Foto dari kamera";
    previewBungkus.classList.remove("hidden");
    hapusFotoBtn.classList.remove("hidden");
    notif("info", "Foto siap dilampirkan ke setoran.");
  }

  $("pilihFotoBtn").addEventListener("click", () => inputFoto.click());
  $("kameraFotoBtn").addEventListener("click", () => inputKamera.click());
  inputFoto.addEventListener("change", () => {
    pilihFileFoto(inputFoto.files && inputFoto.files[0]);
    inputFoto.value = "";
  });
  inputKamera.addEventListener("change", () => {
    pilihFileFoto(inputKamera.files && inputKamera.files[0]);
    inputKamera.value = "";
  });
  hapusFotoBtn.addEventListener("click", () => {
    fileFotoTerpilih = null;
    previewFoto.removeAttribute("src");
    previewBungkus.classList.add("hidden");
    hapusFotoBtn.classList.add("hidden");
    if (urlPreviewFoto) URL.revokeObjectURL(urlPreviewFoto);
    urlPreviewFoto = null;
  });

  JENIS.forEach(j => {
    const baris = document.createElement("div");
    baris.className = "baris-jenis";
    baris.id = "baris-" + j.k;
    baris.innerHTML = `
      <div><b>${j.k}</b><span class="sub">${j.ket} · ${j.poin} poin/kg</span></div>
      <div class="langkah">
        <button type="button" class="btn-kurang" data-k="${j.k}">−</button>
        <input type="number" id="in-${j.k}" min="0" max="99" step="0.5" value="0">
        <button type="button" class="btn-tambah" data-k="${j.k}">+</button>
      </div>
    `;
    daftarJenis.append(baris);

    baris.querySelector(".btn-kurang").onclick = () => ubah(j.k, -0.5);
    baris.querySelector(".btn-tambah").onclick = () => ubah(j.k, 0.5);
    baris.querySelector("input").oninput = (e) => {
      berat[j.k] = Math.max(0, parseFloat(e.target.value) || 0);
      hitung();
    };
  });

  function ubah(k, d) {
    berat[k] = Math.max(0, bulat1((berat[k] || 0) + d));
    $("in-" + k).value = berat[k];
    hitung();
  }

  function hitung() {
    let totKg = 0, totPoin = 0;
    JENIS.forEach(j => {
      totKg += berat[j.k];
      totPoin += berat[j.k] * j.poin;
      $("baris-" + j.k).classList.toggle("aktif", berat[j.k] > 0);
    });
    $("totKg").textContent = fmt(bulat1(totKg)) + " kg";
    $("totPoin").textContent = fmt(Math.round(totPoin));
    $("bSetor").disabled = totKg <= 0;
  }

  $("fSetor").onsubmit = async (e) => {
    e.preventDefault();
    const btn = $("bSetor");
    if (!String(user.id || "").trim() || !String(user.rw || "").trim() || !String(user.rt || "").trim()) {
      notif("err", "ID akun atau data RT/RW tidak lengkap. Hubungi admin.");
      return;
    }
    btn.disabled = true; btn.textContent = "Mengirim...";

    let totKg = 0, totPoin = 0;
    const rincianBersih = {};
    JENIS.forEach(j => {
      if (berat[j.k] > 0) {
        rincianBersih[j.k] = berat[j.k];
        totKg += berat[j.k];
        totPoin += berat[j.k] * j.poin;
      }
    });

    try {
      let fotoUrl = "";
      if (fileFotoTerpilih) {
        btn.textContent = "Mengunggah foto...";
        fotoUrl = await window.SupabaseDB.uploadFotoSetoran(fileFotoTerpilih, user.id);
      }

      await window.SupabaseDB.tambahSetoran({
        userId: user.id,
        rw: String(user.rw).trim(),
        rt: String(user.rt).trim(),
        rincian: rincianBersih,
        kg: bulat1(totKg),
        poin: Math.round(totPoin),
        fotoUrl
      });

      notif("ok", "Setoran sampah berhasil disimpan ke antrean!");
      JENIS.forEach(j => { berat[j.k] = 0; $("in-" + j.k).value = 0; });
      hapusFotoBtn.click();
      hitung();
      muatRiwayat();
    } catch (err) {
      notif("err", err.message);
    } finally {
      btn.textContent = "Kirim Setoran →";
      hitung();
    }
  };

  async function muatRiwayat() {
    try {
      const list = await window.SupabaseDB.getSetoran(user.id);
      await perbaruiKuotaAsn(list);
      const wadah = $("isiRiwayat");
      if (!wadah) return;
      wadah.innerHTML = list.map(s => `
        <tr>
          <td>${tglJam(s.created_at)}</td>
          <td>${Object.entries(s.rincian || {}).map(([k, v]) => `${k} ${v}kg`).join(", ")}${s.foto_url ? `<br><a href="${s.foto_url}" target="_blank" rel="noopener">Lihat foto</a>` : ""}</td>
          <td>${s.kg} kg</td>
          <td>${s.poin}</td>
          <td><span class="chip ${s.status === 'disetujui' ? 'ok' : s.status === 'ditolak' ? 'tolak' : ''}">${s.status}</span></td>
        </tr>
      `).join("");
    } catch (err) {
      console.error(err);
    }
  }

  muatRiwayat();
});
