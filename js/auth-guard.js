import { sb, periksaSesi, keluarSesi } from './supabase.js';

export async function protectPage(allowedRoles = []) {
  return await periksaSesi(allowedRoles);
}

export function setupLogoutButton() {
  const btn = document.getElementById('btnLogout');
  if (btn) {
    btn.addEventListener('click', keluarSesi);
  }
}