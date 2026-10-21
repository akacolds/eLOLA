document.addEventListener("DOMContentLoaded", () => {
  const { $, fmtInt, baca, RW, RT } = window.Utils;
  const setoran = baca("elola_setoran", []).filter(s => s.status === "disetujui");

  const rekap = {};
  RW.forEach(rw => RT.forEach(rt => { rekap[rw + "|" + rt] = { rw, rt, poin: 0, kg: 0 }; }));

  setoran.forEach(s => {
    const k = s.rw + "|" + s.rt;
    if (rekap[k]) {
      rekap[k].poin += s.poin;
      rekap[k].kg += s.kg;
    }
  });

  const list = Object.values(rekap).sort((a, b) => b.poin - a.poin);

  // Podium 1-3
  $("podium").innerHTML = `
    <div class="juara j2">
      <div class="urut">2</div>
      <b>${list[1].rt} / ${list[1].rw}</b>
      <small>${fmtInt(list[1].poin)} poin</small>
    </div>
    <div class="juara j1">
      <div class="urut">1</div>
      <b>${list[0].rt} / ${list[0].rw}</b>
      <small>${fmtInt(list[0].poin)} poin</small>
    </div>
    <div class="juara j3">
      <div class="urut">3</div>
      <b>${list[2].rt} / ${list[2].rw}</b>
      <small>${fmtInt(list[2].poin)} poin</small>
    </div>
  `;

  $("daftarRank").innerHTML = list.slice(3).map((d, i) => `
    <div class="rank-baris">
      <div style="font-weight:700">#${i + 4}</div>
      <div><b>${d.rt} / ${d.rw}</b></div>
      <div style="font-weight:700">${fmtInt(d.poin)} poin</div>
    </div>
  `).join("");
});
