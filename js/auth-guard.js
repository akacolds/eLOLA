import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function protectPage(allowedRoles = []) {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = '/index.html';
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          await signOut(auth);
          window.location.href = '/index.html';
          return;
        }
        const profile = userDoc.data();
        if (allowedRoles.length > 0 && !allowedRoles.includes(profile.peran)) {
          alert('Akses ditolak: peran Anda tidak memiliki hak akses ke halaman ini.');
          // Redirect sesuai peran sebenarnya
          if (profile.peran === 'warga') window.location.href = '/warga/setoran.html';
          else if (profile.peran === 'petugas') window.location.href = '/petugas/verifikasi.html';
          else if (profile.peran === 'admin') window.location.href = '/admin/dashboard.html';
          return;
        }
        resolve({ user, profile });
      } catch (err) {
        console.error(err);
        window.location.href = '/index.html';
      }
    });
  });
}

export function setupLogoutButton() {
  const btn = document.getElementById('btnLogout');
  if (btn) {
    btn.addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = '/index.html';
    });
  }
}