document.addEventListener('DOMContentLoaded', () => {
  // Ambil instance Supabase yang sudah dideklarasikan di supabase.js
  const client = window.supabaseClient || window.supabase || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);

  const tabWarga = document.getElementById('tabWarga');
  const tabInternal = document.getElementById('tabInternal');
  const sectionWarga = document.getElementById('sectionWarga');
  const sectionInternal = document.getElementById('sectionInternal');
  const alertBox = document.getElementById('authAlert');

  const btnWargaLogin = document.getElementById('btnWargaLogin');
  const btnWargaRegister = document.getElementById('btnWargaRegister');
  const btnInternalLogin = document.getElementById('btnInternalLogin');

  function showAlert(msg, isError = false) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.className = `alert-box ${isError ? 'alert-error' : 'alert-success'}`;
    alertBox.classList.remove('hidden');
  }

  function hideAlert() {
    if (alertBox) alertBox.classList.add('hidden');
  }

  function setLoading(btn, isLoading, text) {
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = text;
  }

  // Navigasi Tab
  tabWarga?.addEventListener('click', () => {
    tabWarga.classList.add('active');
    tabInternal.classList.remove('active');
    sectionWarga.classList.remove('hidden');
    sectionInternal.classList.add('hidden');
    hideAlert();
  });

  tabInternal?.addEventListener('click', () => {
    tabInternal.classList.add('active');
    tabWarga.classList.remove('active');
    sectionInternal.classList.remove('hidden');
    sectionWarga.classList.add('hidden');
    hideAlert();
  });

  // Alur Redirect Berdasarkan Role
  async function handleRedirect(user) {
    if (!client) {
      window.location.href = 'warga/setoran.html';
      return;
    }

    try {
      const { data: profile } = await client
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role || user.user_metadata?.role || 'warga';

      if (role === 'admin') {
        window.location.href = 'admin/dashboard.html';
      } else if (role === 'petugas') {
        window.location.href = 'petugas/verifikasi.html';
      } else if (role === 'asn') {
        window.location.href = 'warga/setoran.html?kategori=asn';
      } else {
        window.location.href = 'warga/setoran.html';
      }
    } catch (e) {
      window.location.href = 'warga/setoran.html';
    }
  }

  // 1. Registrasi Warga
  btnWargaRegister?.addEventListener('click', async () => {
    hideAlert();
    const email = document.getElementById('wargaEmail')?.value.trim();
    const password = document.getElementById('wargaPassword')?.value;

    if (!email || !password) {
      showAlert('Isi email dan kata sandi terlebih dahulu.', true);
      return;
    }
    if (password.length < 6) {
      showAlert('Kata sandi minimal 6 karakter.', true);
      return;
    }

    setLoading(btnWargaRegister, true, 'Mendaftarkan...');

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: 'warga',
            lokasi_setor: 'bank_sampah'
          }
        }
      });

      if (error) throw error;

      // Sinkronkan ke tabel profiles jika session terbentuk
      if (data?.user) {
        try {
          await client.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            role: 'warga',
            lokasi_setor: 'bank_sampah'
          });
        } catch (_) {}
      }

      // Bila session langsung ada (email confirmation off di Supabase)
      if (data?.session) {
        showAlert('Registrasi berhasil! Mengalihkan...');
        setTimeout(() => handleRedirect(data.user), 1000);
      } else {
        showAlert('Akun berhasil dibuat! Silakan cek kotak masuk email jika verifikasi aktif, atau coba Masuk sekarang.');
      }
    } catch (err) {
      showAlert(err.message || 'Gagal mendaftar. Silakan coba lagi.', true);
    } finally {
      setLoading(btnWargaRegister, false, 'Daftar Mandiri');
    }
  });

  // 2. Login Warga
  btnWargaLogin?.addEventListener('click', async () => {
    hideAlert();
    const email = document.getElementById('wargaEmail')?.value.trim();
    const password = document.getElementById('wargaPassword')?.value;

    if (!email || !password) {
      showAlert('Masukkan email dan kata sandi.', true);
      return;
    }

    setLoading(btnWargaLogin, true, 'Memeriksa...');

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      showAlert('Login berhasil! Mengalihkan...');
      setTimeout(() => handleRedirect(data.user), 800);
    } catch (err) {
      showAlert(err.message || 'Email atau kata sandi tidak cocok.', true);
    } finally {
      setLoading(btnWargaLogin, false, 'Masuk');
    }
  });

  // 3. Login Internal (ASN, Petugas, Admin)
  btnInternalLogin?.addEventListener('click', async () => {
    hideAlert();
    const email = document.getElementById('internalEmail')?.value.trim();
    const password = document.getElementById('internalPassword')?.value;

    if (!email || !password) {
      showAlert('Masukkan email kedinasan dan kata sandi.', true);
      return;
    }

    setLoading(btnInternalLogin, true, 'Memverifikasi Akses...');

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Cek apakah akun terdaftar sebagai internal
      const { data: profile } = await client
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      const userRole = profile?.role || data.user.user_metadata?.role;
      const internalRoles = ['admin', 'petugas', 'asn'];

      if (!userRole || !internalRoles.includes(userRole)) {
        await client.auth.signOut();
        showAlert('Akses ditolak: Akun ini tidak terdaftar sebagai ASN, Petugas, atau Admin.', true);
        return;
      }

      showAlert('Berhasil masuk! Mengalihkan ke dashboard...');
      setTimeout(() => handleRedirect(data.user), 800);
    } catch (err) {
      showAlert(err.message || 'Gagal masuk akun internal.', true);
    } finally {
      setLoading(btnInternalLogin, false, 'Masuk Sebagai Petugas / ASN');
    }
  });
});