window.SupabaseDB = (() => {
  const { baca, tulis, nomorBaru, bulat1, JENIS } = window.Utils;

  const poinMap = Object.fromEntries(JENIS.map(j => [j.k, j.poin]));

  return {
    async getSetoran(filterAkun = null) {
      let data = baca("elola_setoran", []);
      if (filterAkun) data = data.filter(d => d.akun === filterAkun);
      return data.sort((a, b) => b.waktu.localeCompare(a.waktu));
    },
    async tambahSetoran(setoran) {
      const list = baca("elola_setoran", []);
      let kgTot = 0, poinTot = 0;
      for (const [k, v] of Object.entries(setoran.rincian)) {
        kgTot += v;
        poinTot += Math.round(v * (poinMap[k] || 0));
      }
      const baru = {
        nomor: nomorBaru(),
        id: "S" + String(nomorBaru()).padStart(5, "0"),
        akun: setoran.akun,
        waktu: new Date().toISOString(),
        rw: setoran.rw,
        rt: setoran.rt,
        rincian: setoran.rincian,
        klaim: setoran.rincian,
        kg: bulat1(kgTot),
        kg_klaim: bulat1(kgTot),
        poin: poinTot,
        status: "menunggu",
        catatan: "",
        foto: setoran.foto || ""
      };
      list.push(baru);
      tulis("elola_setoran", list);
      return baru;
    },
    async verifikasiSetoran(nomor, aksi, rincianTimbang = null, alasan = "") {
      const list = baca("elola_setoran", []);
      const item = list.find(x => x.nomor === Number(nomor));
      if (!item) throw new Error("Setoran tidak ditemukan");
      if (aksi === "tolak") {
        item.status = "ditolak";
        item.catatan = alasan;
      } else if (aksi === "setujui") {
        item.status = "disetujui";
        if (rincianTimbang) {
          item.rincian = rincianTimbang;
          let kgTot = 0, poinTot = 0;
          for (const [k, v] of Object.entries(rincianTimbang)) {
            kgTot += v;
            poinTot += Math.round(v * (poinMap[k] || 0));
          }
          item.kg = bulat1(kgTot);
          item.poin = poinTot;
        }
      }
      tulis("elola_setoran", list);
      return item;
    },
    async getHadiah() {
      return baca("elola_hadiah", []);
    },
    async tukarHadiah(akunId, hadiahId) {
      const hadiahList = baca("elola_hadiah", []);
      const h = hadiahList.find(x => x.id === Number(hadiahId));
      if (!h || h.stok < 1) throw new Error("Hadiah tidak tersedia");
      
      const setoran = (baca("elola_setoran", [])).filter(s => s.akun === akunId && s.status === "disetujui");
      const poinDapat = setoran.reduce((s, x) => s + x.poin, 0);
      const tukarList = baca("elola_tukar", []);
      const poinTukar = tukarList.filter(t => t.akun === akunId).reduce((s, x) => s + x.poin, 0);
      const saldo = poinDapat - poinTukar;

      if (saldo < h.harga) throw new Error("Poin tidak mencukupi");
      h.stok--;
      tukarList.push({ nomor: nomorBaru(), id: "T" + String(nomorBaru()).padStart(5, "0"), akun: akunId, nama: h.nama, poin: h.harga, waktu: new Date().toISOString() });
      tulis("elola_hadiah", hadiahList);
      tulis("elola_tukar", tukarList);
      return h;
    }
  };
})();
