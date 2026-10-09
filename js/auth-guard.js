import { sb } from './supabase.js';

async function initGuard() {
  const isSubFolder = 
    window.location.pathname.includes('/warga/') || 
    window.location.pathname.includes('/petugas/') || 
    window.location.pathname.includes('/admin/');

  const loginPath = isSubFolder ? '../index.html' : 'index.html';

  // 1. Pasang fungsi klik tombol logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      btnLogout.textContent = 'Keluar...';
      btnLogout.style.pointerEvents = 'none';

      try {
        await sb.auth.signOut();
      } catch (err) {
        console.error('Gagal keluar:', err);
      } finally {
        window.location.replace(loginPath);
      }
    });
  }

  // 2. Periksa apakah pengguna memiliki sesi login aktif
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.replace(loginPath);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGuard);
} else {
  initGuard();
}
