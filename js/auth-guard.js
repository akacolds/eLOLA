window.AuthGuard = async (rolesBoleh = []) => {
  const sb = window.SupabaseDB ? window.SupabaseDB.getClient() : null;
  if (!sb) {
    location.replace("/index.html");
    return null;
  }

  // 1. Ambil session / user dari token Supabase yang sudah tersimpan
  const { data: { user }, error: errUser } = await sb.auth.getUser();

  if (errUser || !user) {
    location.replace("/index.html");
    return null;
  }

  // 2. Ambil data profil dari tabel profiles
  let profil = null;
  try {
    profil = await window.SupabaseDB.getProfile(user.id);
  } catch (e) {
    console.warn("Gagal membaca profiles:", e);
  }

  // Fallback jika baris di profiles belum ada
  if (!profil) {
    profil = {
      id: user.id,
      nama: (user.email || "").split("@")[0],
      peran: "warga",
      rw: "RW 01",
      rt: "RT 01",
      nik_nip: ""
    };
  }

  // 3. Validasi peran akses halaman
  if (rolesBoleh.length && !rolesBoleh.includes(profil.peran)) {
    if (profil.peran === "admin") location.replace("/admin/dashboard.html");
    else if (profil.peran === "petugas") location.replace("/petugas/verifikasi.html");
    else location.replace("/warga/setoran.html");
    return null;
  }

  const stateUser = { ...user, ...profil };
  window.CurrentUser = stateUser;

  function ambilInisial(nama) {
    if (!nama) return "W";
    return nama.trim().split(/\s+/).slice(0, 2).map(k => k[0].toUpperCase()).join("");
  }

  function perbaruiSidebar(data) {
    const salamEl = document.getElementById("salam");
    if (salamEl && data.nama) salamEl.textContent = "Halo, " + data.nama.split(" ")[0] + ".";

    const peranEl = document.getElementById("peranLabel");
    if (peranEl) peranEl.textContent = (data.peran || "Warga").toUpperCase() + " – " + (data.rt || "RT 01");

    const avatarEl = document.getElementById("avatarInisial");
    if (avatarEl) avatarEl.textContent = ambilInisial(data.nama || user.email);

    const infoEl = document.getElementById("infoTambahanProfil");
    if (infoEl) {
      infoEl.textContent = data.nik_nip
        ? `NIP/NIK: ${data.nik_nip}`
        : `${data.rw || "RW 01"} / ${data.rt \vert{}\vert{} "RT 01"} · ${user.email || "Lalolara"}`;
    }

    // Sinkronkan pilihan RW & RT di halaman setoran jika ada
    const selRw = document.getElementById("rw");
    const selRt = document.getElementById("rt");
    if (selRw && data.rw) selRw.value = data.rw;
    if (selRt && data.rt) selRt.value = data.rt;
  }

  perbaruiSidebar(stateUser);

  // 4. Pasang Modal Profil otomatis untuk Warga & ASN tanpa perlu buat file baru
  if (["warga", "asn"].includes((stateUser.peran || "warga").toLowerCase())) {
    pasangModalProfil(stateUser, perbaruiSidebar, ambilInisial);
  }

  return stateUser;
};

function pasangModalProfil(user, perbaruiSidebar, ambilInisial) {
  if (document.getElementById("modalProfilElola")) return;

  const bungkus = document.createElement("div");
  bungkus.id = "modalProfilElola";
  bungkus.className = "modal-profil-latar hidden";
  bungkus.innerHTML = `
    <div class="modal-profil-kartu" onclick="event.stopPropagation()">
      <div class="modal-profil-kepala">
        <div style="display:flex;align-items:center;gap:14px">
          <div class="avatar-bulat besar" id="mpAvatar">${ambilInisial(user.nama)}</div>
          <div>
            <h3 id="mpNamaJudul" style="font-family:var(--font-judul);font-size:1.35rem">${user.nama || "Warga"}</h3>
            <p style="font-size:.82rem;color:var(--abu)">${user.email || "-"}</p>
            <span class="badge-peran" id="mpBadge">${(user.peran \vert{}\vert{} "warga").toUpperCase()} · ${user.rt || "RT 01"}</span>
          </div>
        </div>
        <button type="button" class="tutup-modal-btn" onclick="tutupModalProfil()">✕</button>
      </div>

      <!-- Target Kuota Khusus ASN -->
      <div id="mpKuotaAsn" class="kuota-asn-kartu kuota ${user.peran === 'asn' ? '' : 'hidden'}" style="margin-top:14px;margin-bottom:14px">
        <div class="baris">
          <b>Kuota Wajib Setoran ASN</b>
          <span id="mpTeksKuota">0 / 2 kg</span>
        </div>
        <div class="jalur"><i id="mpBarKuota"></i></div>
        <div class="ket" id="mpKetKuota">Target minimal setoran sampah terverifikasi untuk ASN adalah 2,0 kg.</div>
      </div>

      <div id="mpNotif" class="notif hidden"></div>

      <form id="mpForm">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label for="mpNama">Nama Lengkap</label>
            <input id="mpNama" type="text" required value="${user.nama || ""}">
          </div>
          <div>
            <label for="mpPeran">Status Peran</label>
            <select id="mpPeran">
              <option value="warga" ${user.peran !== "asn" ? "selected" : ""}>Warga</option>
              <option value="asn" ${user.peran === "asn" ? "selected" : ""}>ASN</option>
            </select>
          </div>
        </div>

        <label for="mpNik" id="mpLblNik">${user.peran === "asn" ? "NIP / NIK (Wajib untuk ASN)" : "NIK / NIP (Opsional)"}</label>
        <input id="mpNik" type="text" placeholder="Masukkan nomor NIP atau NIK" value="${user.nik_nip || ""}">

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label for="mpRw">RW</label>
            <select id="mpRw">
              <option>RW 01</option><option>RW 02</option><option>RW 03</option><option>RW 04</option><option>RW 05</option>
            </select>
          </div>
          <div>
            <label for="mpRt">RT</label>
            <select id="mpRt">
              <option>RT 01</option><option>RT 02</option><option>RT 03</option><option>RT 04</option>
            </select>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:20px">
          <button type="button" class="tombol-kecil" style="flex:1" onclick="tutupModalProfil()">Tutup</button>
          <button type="submit" class="tombol" id="mpBtnSimpan" style="flex:2;padding:11px">Simpan Profil</button>
        </div>
