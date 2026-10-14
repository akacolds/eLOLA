// Konfigurasi Supabase Client
const SUPABASE_URL = "https://sezmeitlvzcvqleutdxl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lAfH12E4Opmc9qmeLhmxAw_nP9XpKju";

// Helper inisialisasi yang tahan banting
function getSupabase() {
  if (window.supabaseClient) {
    return window.supabaseClient;
  }

  // Cek global 'supabase' dari CDN unpkg / jsdelivr
  const lib = window.supabase || (typeof supabase !== "undefined" ? supabase : null);
  
  if (lib && typeof lib.createClient === "function") {
    window.supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return window.supabaseClient;
  }

  throw new Error("SDK Supabase belum termuat dari CDN. Periksa koneksi internet atau script tag di HTML.");
}

window.SupabaseDB = (() => {
  return {
    getClient() {
      return getSupabase();
    },

    // --- PROFILES / AUTH ---
    async getProfile(userId) {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async updateProfile(userId, payload) {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("profiles")
        .update(payload)
        .eq("id", userId);
      if (error) throw error;
      return data;
    },

    // --- SETORAN ---
    async getSetoran(userId = null) {
      const sb = getSupabase();
      let query = sb
        .from("setoran")
        .select("*, profiles:user_id(nama, peran)")
        .order("created_at", { ascending: false });

      if (userId) query = query.eq("user_id", userId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async tambahSetoran({ userId, rw, rt, rincian, kg, poin, fotoUrl = "" }) {
      const sb = getSupabase();
      const payload = {
        user_id: userId,
        rw: rw,
        rt: rt,
        rincian: rincian,
        klaim: rincian,
        kg: kg,
        kg_klaim: kg,
        poin: poin,
        foto_url: fotoUrl,
        status: "menunggu",
        catatan: "",
        created_at: new Date().toISOString()
      };

      const { data, error } = await sb
        .from("setoran")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async verifikasiSetoran(id, { aksi, rincianBaru, kgBaru, poinBaru, alasan = "", namaPetugas = "" }) {
      const sb = getSupabase();
      const updateData = {
        status: aksi === "setujui" ? "disetujui" : "ditolak",
        catatan: alasan,
        petugas: namaPetugas,
        verified_at: new Date().toISOString()
      };

      if (aksi === "setujui" && rincianBaru) {
        updateData.rincian = rincianBaru;
        updateData.kg = kgBaru;
        updateData.poin = poinBaru;
      }

      const { data, error } = await sb
        .from("setoran")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // --- HADIAH & PENUKARAN ---
    async getHadiah() {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("hadiah")
        .select("*")
        .order("harga", { ascending: true });
      if (error) throw error;
      return data;
    },

    async getRiwayatPenukaran(userId = null) {
      const sb = getSupabase();
      let q = sb
        .from("penukaran")
        .select("*")
        .order("created_at", { ascending: false });
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async tukarHadiah(userId, hadiah) {
      const sb = getSupabase();
      const { error: errStok } = await sb
        .from("hadiah")
        .update({ stok: hadiah.stok - 1 })
        .eq("id", hadiah.id);
      if (errStok) throw errStok;

      const { data, error } = await sb
        .from("penukaran")
        .insert([{
          user_id: userId,
          hadiah_id: hadiah.id,
          nama_hadiah: hadiah.nama,
          poin: hadiah.harga,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  };
})();
