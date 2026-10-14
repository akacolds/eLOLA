// js/auth.js - Logika Masuk & Registrasi Akun
document.addEventListener("DOMContentLoaded", () => {
  const { $, baca, tulis, notif, tutupNotif } = window.ElolaUtils;
  const { AWAL } = window.ElolaAuth;

  let kartu = "warga", masuk = true;
  const petugas = () => kartu === "petugas";
  const semuaAkun = () => baca("elola_akun", {});
  const bersih = (v) => v.replace(/\s/g, "");
  const gmailOk = (v) => /^[^\s@]+@gmail\.com$/i.test(v.trim());
  const kartuUntuk = (peran) => (peran === "warga" ? "warga" : peran === "asn" ? "asn" : "petugas");
  const namaKartu = { warga: "Warga", asn: "ASN", petugas: "Petugas / Admin" };

  function errMasuk() {
    const id = $("idMasuk").value.trim();
    if (petugas()) { if (!id) return "isi ID Petugas / Admin."; }
    else if (!gmailOk(id)) return "isi Gmail yang benar (contoh: nama@gmail.com).";
    if (!$("sMasuk").value) return "isi kata sandi.";
    return "";
  }
  function errDaftar() {
    if (!$("nama").value.trim()) return "isi nama lengkap.";
    if (kartu === "asn" && !/^(\d{16}|\d{18})$/.test(bersih($("nikNip").value))) return "NIP harus 18 angka atau NIK 16 angka.";
    if (!$("kel").value) return "pilih kelurahan.";
    if (!$("rt").value) return "pilih RT.";
    if (!gmailOk($("emailDaftar").value)) return "isi Gmail yang benar (contoh: nama@gmail.com).";
    if ($("sDaftar").value.length < 6) return "kata sandi minimal 6 karakter.";
    return "";
  }
  function petunjuk(err, idPesan, idTombol) {
    $(idPesan).textContent = err ? "Belum lengkap: " + err : "Semua data sudah terisi dengan benar ✓";
    $(idPesan).classList.toggle("ok", !err);
    $(idTombol).disabled = !!err;
  }
  function cekSemua() {
    petunjuk(errMasuk(), "pMasuk", "bMasuk");
    petunjuk(errDaftar(), "pDaftar", "bDaftar");
  }

  ["fMasuk", "fDaftar"].forEach(f => {
    $(f).addEventListener("input", cekSemua);
    $(f).addEventListener("change", cekSemua);
  });

  function segarkan() {
    if (petugas()) masuk = true;
    ["warga", "asn", "petugas"].forEach(k => $("p" + k[0].toUpperCase() + k.slice(1)).classList.toggle("aktif", kartu === k));
    $("tDaftar").classList.toggle("hidden", petugas());
    $("tMasuk").classList.toggle("aktif", masuk);
    $("tDaftar").classList.toggle("aktif", !masuk);
    $("fMasuk").classList.toggle("hidden", !masuk);
    $("fDaftar").classList.toggle("hidden", masuk);
    $("blokAsn").classList.toggle("hidden", kartu !== "asn");

    $("lblIdMasuk").textContent = petugas() ? "ID Petugas / Admin" : "Gmail";
    $("idMasuk").type = petugas() ? "text" : "email";
    $("idMasuk").placeholder = petugas() ? "Contoh: PTG-001 atau ADM-001" : "nama@gmail.com";
    $("bantuan").textContent = petugas()
      ? "Akun petugas dan admin dibuat oleh moderator server. Lupa kata sandi? Hubungi moderator server."
      : "Lupa kata sandi? Hubungi admin kelurahan Anda untuk reset akun.";
    cekSemua();
  }

  const pilihKartu = (k) => () => { kartu = k; tutupNotif(); segarkan(); };
  $("pWarga").onclick = pilihKartu("warga");
  $("pAsn").onclick = pilihKartu("asn");
  $("pPetugas").onclick = pilihKartu("petugas");
  $("tMasuk").onclick = () => { masuk = true; tutupNotif(); segarkan(); };
  $("tDaftar").onclick = () => { masuk = false; tutupNotif(); segarkan(); };

  document.querySelectorAll(".lihat").forEach(b => b.onclick = () => {
    const k = $(b.dataset.t), buka = k.type === "password";
    k.type = buka ? "text" : "password";
    b.classList.toggle("tampil", buka);
    b.setAttribute("aria-label", buka ? "Sembunyikan kata sandi" : "Tampilkan kata sandi");
  });

  $("fMasuk").onsubmit = (e) => {
    e.preventDefault();
    if (errMasuk()) return;
    const kunci = petugas() ? bersih($("idMasuk").value).toUpperCase() : $("idMasuk").value.trim().toLowerCase();
    const semua = semuaAkun();
    let akun = semua[kunci], baru = false;

    if (!akun && kartu === "warga") {
      if ($("sMasuk").value.length < 6) return notif("err", "Kata sandi minimal 6 karakter untuk akun warga baru.");
      const nama = kunci.split("@")[0].replace(/[._\-\d]+/g, " ").trim().replace(/\b\w/g, c => c.toUpperCase()) || "Warga eLOLA";
      akun = semua[kunci] = { nama, sandi: $("sMasuk").value, peran: "warga", isASN: false, nikNip: "", kelurahan: "Lalolara", rw: "", rt: "" };
      baru = true;
    }
    if (!akun) {
      return petugas()
        ? notif("err", "Akun tidak ditemukan. Hubungi moderator server.")
        : notif("err", "Akun belum terdaftar.", { label: "Daftar Akun", klik: () => { masuk = false; tutupNotif(); segarkan(); } });
    }
    if (kartuUntuk(akun.peran) !== kartu) {
      return notif("err", "Ini akun " + namaKartu[kartuUntuk(akun.peran)] + ". Pilih kartu yang sesuai.",
        { label: "Pindah kartu", klik: () => { kartu = kartuUntuk(akun.peran); tutupNotif(); segarkan(); } });
    }
    if (!baru && akun.sandi !== $("sMasuk").value) return notif("err", "Kata sandi salah. Coba lagi.");

    if (baru && !tulis("elola_akun", semua)) return notif("err", "Penyimpanan peramban penuh atau diblokir.");
    tulis("elola_sesi", { id: kunci, nama: akun.nama, peran: akun.peran });
    notif("ok", baru ? "Akun warga baru dibuat otomatis. Selamat datang, " + akun.nama + "." : "Berhasil masuk. Selamat datang, " + akun.nama + ".");
    setTimeout(() => { location.href = AWAL[akun.peran]; }, 700);
  };

  $("fDaftar").onsubmit = (e) => {
    e.preventDefault();
    if (errDaftar()) return;
    const email = $("emailDaftar").value.trim().toLowerCase();
    const nikNip = kartu === "asn" ? bersih($("nikNip").value) : "";
    const tersimpan = baca("elola_akun", {});

    const dupEmail = tersimpan[email];
    const dupNik = nikNip && Object.entries(tersimpan).find(([, a]) => a.nikNip === nikNip);
    if (dupEmail || dupNik) {
      const emailAda = dupEmail ? email : dupNik[0];
      return notif("info", "Sudah terdaftar. " + (dupEmail ? "Gmail" : "NIP / NIK") + " ini sudah punya akun.",
        { label: "Masuk", klik: () => { masuk = true; $("idMasuk").value = emailAda; $("sMasuk").value = ""; tutupNotif(); segarkan(); } });
    }

    tersimpan[email] = {
      nama: $("nama").value.trim(), sandi: $("sDaftar").value, peran: kartu,
      isASN: kartu === "asn", nikNip, kelurahan: $("kel").value, rw: "", rt: $("rt").value
    };
    tulis("elola_akun", tersimpan);
    masuk = true; $("idMasuk").value = email; $("sMasuk").value = "";
    segarkan();
    notif("ok", "Akun berhasil dibuat. Masukkan kata sandi untuk masuk.");
  };

  segarkan();
  const sesiAwal = baca("elola_sesi", null);
  if (sesiAwal && semuaAkun()[sesiAwal.id]) notif("info", "Sudah masuk sebagai " + sesiAwal.nama + ".",
    { label: "Buka halaman", klik: () => { location.href = AWAL[sesiAwal.peran]; } });
});