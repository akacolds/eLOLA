(() => {
  const { baca, tulis, JENIS } = window.Utils;
  if (!baca("elola_seed", null)) {
    const akun = baca("elola_akun", {});
    const staf = {
      "ADM-001": { nama: "Admin DLH", peran: "admin", sandi: "elola123" },
      "PTG-001": { nama: "Petugas Lalolara", peran: "petugas", sandi: "elola123" }
    };
    Object.entries(staf).forEach(([id, a]) => {
      if (!akun[id]) akun[id] = { nikNip: "", kelurahan: "Lalolara", rw: "", rt: "", ...a };
    });
    tulis("elola_akun", akun);

    tulis("elola_hadiah", [
      { id: 1, kode: "kompos", nama: "Kompos 5 Kg", deskripsi: "Kompos olahan bank sampah untuk tanaman.", harga: 600, stok: 40 },
      { id: 2, kode: "pulsa", nama: "Pulsa Rp10.000", deskripsi: "Pulsa semua operator ke nomor terdaftar.", harga: 1300, stok: 50 },
      { id: 3, kode: "minyak", nama: "Minyak Goreng 1 Liter", deskripsi: "Minyak goreng kemasan, ambil di bank sampah.", harga: 1800, stok: 30 },
      { id: 4, kode: "token", nama: "Token Listrik Rp20.000", deskripsi: "Token PLN prabayar resmi.", harga: 2500, stok: 20 }
    ]);

    tulis("elola_tukar", []);
    tulis("elola_setoran", []);
    tulis("elola_seed", 1);
  }
})();
