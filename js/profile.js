(() => {
  const $ = (id) => document.getElementById(id);
  const modal = $('modalProfil');
  const tombolProfil = $('profilTop');
  if (!modal || !tombolProfil) return;
  let userAktif = null;
  let profilAktif = null;
  const pesan = (teks, error = false) => {
    const el = $('pesanProfil');
    el.textContent = teks;
    el.classList.remove('hidden', 'sukses', 'error');
    el.classList.add(error ? 'error' : 'sukses');
  };
  const buka = async () => {
    const sb = window.SupabaseDB?.getClient();
    if (!sb) return;
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) { alert('Sesi login tidak ditemukan. Silakan login kembali.'); return; }
    userAktif = data.user;
    try { profilAktif = await window.SupabaseDB.getProfile(userAktif.id); }
    catch (e) { profilAktif = null; }
    $('editNama').value = profilAktif?.nama || userAktif.email?.split('@')[0] || '';
    $('editEmail').value = userAktif.email || '';
    $('passwordLama').value = '';
    $('passwordBaru').value = '';
    $('passwordUlang').value = '';
    $('pesanProfil').classList.add('hidden');
    modal.classList.remove('hidden');
    document.body.classList.add('modal-profil-terbuka');
  };
  const tutup = () => { modal.classList.add('hidden'); document.body.classList.remove('modal-profil-terbuka'); };
  tombolProfil.addEventListener('click', buka);
  $('tutupModalProfil').addEventListener('click', tutup);
  modal.addEventListener('click', e => { if (e.target === modal) tutup(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) tutup(); });
  $('formProfil').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sb = window.SupabaseDB?.getClient();
    if (!sb || !userAktif) return pesan('Sesi tidak tersedia. Muat ulang halaman dan login kembali.', true);
    const nama = $('editNama').value.trim();
    const email = $('editEmail').value.trim();
    const lama = $('passwordLama').value;
    const baru = $('passwordBaru').value;
    const ulang = $('passwordUlang').value;
    if (!nama || !email) return pesan('Nama dan email wajib diisi.', true);
    if (baru && baru !== ulang) return pesan('Password baru dan ulangannya tidak sama.', true);
    if (baru && baru.length < 6) return pesan('Password baru minimal 6 karakter.', true);
    const ubahEmail = email.toLowerCase() !== String(userAktif.email || '').toLowerCase();
    const ubahPassword = Boolean(baru);
    if ((ubahEmail || ubahPassword) && !lama) return pesan('Masukkan password lama untuk memverifikasi perubahan email atau password.', true);
    const btn = $('simpanProfilBtn'); btn.disabled = true; btn.textContent = 'Menyimpan...';
    try {
      if (ubahEmail || ubahPassword) {
        const { error: verifikasiError } = await sb.auth.signInWithPassword({ email: userAktif.email, password: lama });
        if (verifikasiError) throw new Error('Password lama salah. Perubahan dibatalkan.');
      }
      // Nama disimpan ke profil utama. Tabel users diselaraskan bila barisnya ada.
      const { error: profileError } = await sb.from('profiles').update({ nama }).eq('id', userAktif.id);
      if (profileError) throw new Error('Nama gagal disimpan. Periksa izin UPDATE pada tabel profiles. ' + profileError.message);
      const { error: usersError } = await sb.from('users').update({ nama }).eq('id', userAktif.id);
      if (usersError) console.warn('Nama di tabel users belum tersinkron:', usersError.message);
      if (ubahEmail || ubahPassword) {
        const payload = {};
        if (ubahEmail) payload.email = email;
        if (ubahPassword) payload.password = baru;
        const { error: updateError } = await sb.auth.updateUser(payload);
        if (updateError) throw updateError;
      }
      if ($('profilNama')) $('profilNama').textContent = nama;
      if ($('profilAvatar')) $('profilAvatar').textContent = nama.charAt(0).toUpperCase();
      if ($('salam')) $('salam').textContent = 'Halo, ' + nama.split(' ')[0] + '.';
      if (ubahEmail) pesan('Nama tersimpan. Permintaan perubahan email dikirim; cek inbox email lama/baru untuk konfirmasi jika diminta.');
      else if (ubahPassword) pesan('Profil dan password berhasil diperbarui.');
      else pesan('Nama berhasil diperbarui.');
      userAktif = (await sb.auth.getUser()).data.user || userAktif;
      setTimeout(() => { if (!modal.classList.contains('hidden')) tutup(); }, 1800);
    } catch (err) {
      pesan(err.message || 'Perubahan gagal disimpan. Coba lagi atau hubungi Admin.', true);
    } finally { btn.disabled = false; btn.textContent = 'Simpan Perubahan'; }
  });
})();
