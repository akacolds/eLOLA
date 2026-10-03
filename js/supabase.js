// eLOLA/js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Ganti nilai default ini dengan URL & Anon Key Supabase Anda
export const SUPABASE_URL = localStorage.getItem('ELOLA_SB_URL') || 'https://YOUR_SUPABASE_PROJECT.supabase.co';
export const SUPABASE_KEY = localStorage.getItem('ELOLA_SB_KEY') || 'YOUR_SUPABASE_ANON_KEY';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Guard session & role
export async function periksaSesi(peranBoleh = []) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.replace('/index.html');
    return null;
  }
  const { data: profil, error } = await sb
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error || !profil) {
    await sb.auth.signOut();
    window.location.replace('/index.html');
    return null;
  }

  if (peranBoleh.length > 0 && !peranBoleh.includes(profil.peran)) {
    arahKeRole(profil.peran);
    return null;
  }
  return { session, profil };
}

export function arahKeRole(peran) {
  if (peran === 'admin') window.location.replace('/admin/dashboard.html');
  else if (peran === 'petugas') window.location.replace('/petugas/verifikasi.html');
  else window.location.replace('/warga/setoran.html');
}

export async function keluarSesi() {
  await sb.auth.signOut();
  window.location.replace('/index.html');
}