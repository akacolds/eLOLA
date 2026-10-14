document.addEventListener("DOMContentLoaded", async () => {
  const user = await window.AuthGuard(["warga", "asn"]);
  if (!user) return;

  const { $, fmt, bulat1, JENIS, notif, tglJam } = window.Utils;
  const daftarJenis = $("daftarJenis");
  const berat = Object.fromEntries(JENIS.map(j => [j.k, 0]));

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
      await window.SupabaseDB.tambahSetoran({
        userId: user.id,
        rw: $("rw").value,
        rt: $("rt").value,
        rincian: rincianBersih,
        kg: bulat1(totKg),
        poin: Math.round(totPoin)
      });

      notif("ok", "Setoran sampah berhasil disimpan ke antrean!");
      JENIS.forEach(j => { berat[j.k] = 0; $("in-" + j.k).value = 0; });
      hitung();
      muatRiwayat();
    } catch (err) {
      notif("err", err.message);
    } finally {
      btn.textContent = "Kirim Setoran →";
      btn.disabled = false;
    }
  };

  async function muatRiwayat() {
    try {
      const list = await window.SupabaseDB.getSetoran(user.id);
      const wadah = $("isiRiwayat");
      if (!wadah) return;
      wadah.innerHTML = list.map(s => `
        <tr>
          <td>${tglJam(s.created_at)}</td>
          <td>${Object.entries(s.rincian || {}).map(([k, v]) => `${k}${v}kg`).join(", ")}</td>
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
