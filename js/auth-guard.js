import { sb } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Cek apakah halaman berada di dalam subfolder (warga, petugas, admin)
  const isSubFolder = 
    window.location.pathname.includes('/warga/') || 
    window.location.pathname.includes('/petugas/') || 
    window.location.pathname.includes('/admin/');

  const loginPath = isSubFolder ? '../index.html' : 'index.html';

  // 1. Validasi Sesi Pengguna
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = loginPath;
    return;
  }

  // 2. Hubungkan Tombol Keluar (Logout)
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      btnLogout.textContent = 'Memproses...';
      btnLogout.style.pointerEvents = 'none';

      try {
        await sb.auth.signOut();
      } catch (err) {
        console.error('Gagal keluar dari sesi:', err);
      } finally {
        window.location.href = loginPath;
      }
    });
  }
});
