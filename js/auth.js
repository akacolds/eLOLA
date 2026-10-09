import { sb, arahKeRole } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const inputEmail = document.getElementById('inputEmail');
  const inputPassword = document.getElementById('inputPassword');
  const btnLogin = document.getElementById('btnLogin');
  const btnAutoRegisterWarga = document.getElementById('btnAutoRegisterWarga');
  const alertBox = document.getElementById('authAlert');
  const toggleDemoInfo = document.getElementById('toggleDemoInfo');
  const demoContent = document.getElementById('demoContent');
  const demoChevron = document.getElementById('demoChevron');

  // Periksa sesi login yang sudah ada
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) {
    const { data: profil } = await sb
      .from('users')
      .select('peran')
      .eq('id', session.user.id)
      .maybeSingle();

    if (profil) {
      arahKeRole(profil.peran);
      return;
    }
  }

  // Notifikasi Alert
  function showAlert(msg, tipe = 'info') {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = `alert-box alert-${tipe}`;
    alertBox.classList.remove('hidden');
  }

  function hideAlert() {
    if (alertBox) alertBox.classList.add('hidden');
  }

  function setLoading(btn, isLoading, defaultText, loadingText) {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading ? loadingText : defaultText;
  }

  // Buka-tutup Accordion Akun Demo
  toggleDemoInfo?.addEventListener('click', () => {
    const isHidden = demoContent.classList.contains('hidden');
    if (isHidden) {
      demoContent.classList.remove('hidden');
      demoChevron.textContent = '▲ Tutup';
    } else {
      demoContent.classList.add('hidden');
      demoChevron.textContent = '▼ Buka';
    }
  });

  // Tombol Isi Otomatis Akun Demo (mengambil nilai dari data-email dan data-password)
  document.querySelectorAll('.demo-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const email = pill.getAttribute('data-email');
      const password = pill.getAttribute('data-password');
      const role = pill.getAttribute('data-role');

      inputEmail.value = email;
      inputPassword.value = password;
      hideAlert();
      showAlert(`Akun ${role} dipilih. Klik "Masuk ke Sistem" untuk melanjutkan.`, 'info');
    });
  });

  // 1. Eksekusi Login
  async function prosesLogin() {
    hideAlert();
    const email = inputEmail.value.trim();
    const password = inputPassword.value;

    if (!email || !password) {
      showAlert('Silakan masukkan email dan kata sandi terlebih dahulu.', 'error');
      return;
    }

    setLoading(btnLogin, true, 'Masuk ke Sistem', 'Memverifikasi Akun...');

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });

      if (error) {
        const isKedinasan = email.endsWith('.go.id') || email.includes('admin') || email.includes('petugas') || email.includes('asn');

        if (error.message.toLowerCase().includes('invalid login credentials') || error.message.toLowerCase().includes('user not found')) {
          if (!isKedinasan) {
            showAlert('Akun belum terdaftar. Melakukan auto-daftar otomatis sebagai Warga...', 'info');
            await prosesAutoDaftarWarga(email, password);
            return;
          } else {
            throw new Error('Akun kedinasan khusus tidak ditemukan atau kata sandi keliru.');
          }
        }
        throw error;
      }

      // Ambil profil dari tabel users
      let { data: profil } = await sb
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      // Sinkronkan data jika belum tersimpan di tabel users
      if (!profil) {
        const metadataPeran = data.user.user_metadata?.peran || 'warga';
        const namaDefault = data.user.user_metadata?.nama || email.split('@')[0];
        const isAsn = metadataPeran === 'asn' || Boolean(data.user.user_metadata?.is_asn);

        const { data: newProfil } = await sb
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            nama: namaDefault,
            peran: metadataPeran,
            is_asn: isAsn,
            saldo_poin: 0,
            total_kg: 0,
            kelurahan: 'Kadia',
            rt: 'RT 01'
          })
          .select()
          .single();

        profil = newProfil || { peran: metadataPeran, nama: namaDefault };
      }

      showAlert(`Berhasil masuk! Selamat datang, ${profil.nama || 'Pengguna'} (${(profil.peran || 'warga').toUpperCase()}). Mengalihkan...`, 'success');
      setTimeout(() => arahKeRole(profil.peran), 700);

    } catch (err) {
      showAlert(err.message || 'Gagal masuk. Periksa kembali email dan kata sandi.', 'error');
    } finally {
      setLoading(btnLogin, false, 'Masuk ke Sistem', 'Memverifikasi Akun...');
    }
  }

  // 2. Eksekusi Auto-Daftar Warga
  async function prosesAutoDaftarWarga(customEmail = null, customPass = null) {
    hideAlert();
    const email = customEmail || inputEmail.value.trim();
    const password = customPass || inputPassword.value;

    if (!email || !password) {
      showAlert('Masukkan alamat email dan kata sandi untuk mendaftar otomatis.', 'error');
      return;
    }

    setLoading(btnAutoRegisterWarga, true, '✨ Auto-Daftar Warga Baru', 'Mendaftarkan Warga...');

    try {
      const namaWarga = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: {
            peran: 'warga',
            nama: namaWarga,
            is_asn: false,
            kelurahan: 'Kadia',
            rt: 'RT 01'
          }
        }
      });

      if (error) throw error;

      if (data?.user) {
        await sb.from('users').upsert({
          id: data.user.id,
          email: data.user.email,
          nama: namaWarga,
          peran: 'warga',
          is_asn: false,
          saldo_poin: 0,
          total_kg: 0,
          kelurahan: 'Kadia',
          rt: 'RT 01'
        }, { onConflict: 'id' });

        showAlert('Pendaftaran Warga otomatis berhasil! Mengalihkan...', 'success');
        setTimeout(() => arahKeRole('warga'), 800);
      }
    } catch (err) {
      if (err.message.toLowerCase().includes('already registered')) {
        showAlert('Email ini sudah terdaftar. Mencoba langsung masuk...', 'info');
        await prosesLogin();
      } else {
        showAlert(err.message || 'Gagal mendaftar otomatis.', 'error');
      }
    } finally {
      setLoading(btnAutoRegisterWarga, false, '✨ Auto-Daftar Warga Baru', 'Mendaftarkan Warga...');
    }
  }

  // Event Listeners
  btnLogin?.addEventListener('click', prosesLogin);
  btnAutoRegisterWarga?.addEventListener('click', () => prosesAutoDaftarWarga());

  inputPassword?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') prosesLogin();
  });
  inputEmail?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') inputPassword.focus();
  });
});
