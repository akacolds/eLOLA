import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = localStorage.getItem('ELOLA_SB_URL') || 'https://sezmeitlvzcvqleutdxl.supabase.co';
export const SUPABASE_KEY = localStorage.getItem('ELOLA_SB_KEY') || 'sb_publishable_lAfH12E4Opmc9qmeLhmxAw_nP9XpKju';

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Pasang ke window agar bisa diakses oleh skrip umum bila dibutuhkan
if (typeof window !== 'undefined') {
  window.sb = sb;
  window.supabaseClient = sb;
}

/**
 * Memeriksa sesi pengguna dan peran (role) yang diizinkan
 * @param {Array<string>} peranBoleh - daftar role yang diizinkan mengakses halaman
 * @returns {Promise<{session: object, profil: object} | null>}
 */
export async function periksaSesi(peranBoleh = []) {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.replace('/index.html');
    return null;
  }

  // Ambil profil pengguna dari tabel users
  let { data: profil, error } = await sb
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  // Jika profil belum ada di tabel users (misal auto signup), buat row profil default
  if (!profil) {
    const defaultPeran = session.user.user_metadata?.peran || 'warga';
    const isAsn = defaultPeran === 'asn' || Boolean(session.user.user_metadata?.is_asn);
    const emailName = (session.user.email || 'Pengguna').split('@')[0];

    const { data: newProfil, error: insertErr } = await sb
      .from('users')
      .insert({
        id: session.user.id,
        email: session.user.email,
        nama: session.user.user_metadata?.nama || emailName,
        peran: defaultPeran,
        is_asn: isAsn,
        saldo_poin: 0,
        total_kg: 0,
        kelurahan: session.user.user_metadata?.kelurahan || 'Kadia',
        rt: session.user.user_metadata?.rt || 'RT 01'
      })
      .select()
      .single();

    if (!insertErr && newProfil) {
      profil = newProfil;
    } else {
      // Fallback profil dari metadata
      profil = {
        id: session.user.id,
        email: session.user.email,
        nama: session.user.user_metadata?.nama || emailName,
        peran: defaultPeran,
        is_asn: isAsn,
        saldo_poin: 0,
        total_kg: 0,
        kelurahan: 'Kadia',
        rt: 'RT 01'
      };
    }
  }

  // Jika ada pembatasan role di halaman ini
  if (peranBoleh.length > 0 && !peranBoleh.includes(profil.peran)) {
    arahKeRole(profil.peran);
    return null;
  }

  return { session, profil };
}

/**
 * Mengarahkan pengguna ke dashboard sesuai perannya
 * @param {string} peran
 */
export function arahKeRole(peran) {
  if (peran === 'admin') {
    window.location.replace('/admin/dashboard.html');
  } else if (peran === 'petugas') {
    window.location.replace('/petugas/verifikasi.html');
  } else if (peran === 'asn') {
    window.location.replace('/warga/setoran.html');
  } else {
    window.location.replace('/warga/setoran.html');
  }
}

/**
 * Logout dari sistem dan redirect ke index
 */
export async function keluarSesi() {
  await sb.auth.signOut();
  window.location.replace('/index.html');
}
