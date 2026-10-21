document.addEventListener("DOMContentLoaded", () => {
  window.AuthGuard(["admin"]);
  const { $, fmt, fmtInt, baca, tglJam } = window.Utils;

  const setoran = baca("elola_setoran", []);
  const akun = baca("elola_akun", {});

  const sah = setoran.filter(s => s.status === "disetujui");
  const totKg = sah.reduce((s, x) => s + x.kg, 0);
  const totPoin = sah.reduce((s, x) => s + x.poin, 0);

  $("stKg").textContent = fmt(totKg) + " kg";
  $("stPoin").textContent = fmtInt(totPoin);
  $("stAkun").textContent = Object.keys(akun).length;

  $("tabelLog").innerHTML = setoran.slice().reverse().map(s => `
    <tr>
      <td>${tglJam(s.waktu)}</td>
      <td>${s.akun}</td>
      <td>${s.rw} / ${s.rt}</td>
      <td>${s.kg} kg</td>
      <td>${s.poin}</td>
      <td><span class="chip ${s.status === 'disetujui' ? 'ok' : s.status === 'ditolak' ? 'tolak' : ''}">${s.status}</span></td>
    </tr>
  `).join("");
});
