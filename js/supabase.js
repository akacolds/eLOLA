// Konfigurasi Project Supabase
const SUPABASE_URL = "https://sezmeitlvzcvqleutdxl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lAfH12E4Opmc9qmeLhmxAw_nP9XpKju";

// Inisialisasi instan tanpa infinite loop
function initSupabase() {
  if (window.supabaseClient) return window.supabaseClient;

  // Cek apakah library CDN supabase sudah siap
  const lib = window.supabase || (typeof supabase !== "undefined" ? supabase : null);
  if (lib && typeof lib.createClient === "function") {
    try {
      window.supabaseClient = lib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return window.supabaseClient;
    } catch (e) {
      console.warn("Gagal inisialisasi Supabase:", e);
    }
  }
  return null;
}

// Coba inisialisasi langsung saat script dimuat
initSupabase();

window.SupabaseDB = (() => {
  const getClientOrThrow = () => {
    const client = initSupabase();
    if (!client) {
      throw new Error("SDK Supabase belum siap. Pastikan script CDN supabase termuat dan koneksi internet aktif.");
    }
    return client;
  };

  return {
    getClient() {
      return initSupabase();
    },

    // --- PROFILES ---
    async getProfile(userId) {
      const sb = getClientOrThrow();
      const { data, error } = await sb
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },

    async updateProfile(userId, payload) {
      const sb = getClientOrThrow();
      const { data, error } = await sb
        .from("profiles")
        .update(payload)
        .eq("id", userId);
      if (error) throw error;
      return data;
    },

    // --- DAFTAR PROFIL (untuk statistik admin) ---
    async getProfiles() {
      const sb = getClientOrThrow();
      const { data, error } = await sb
        .from("profiles")
        .select("*")
        .order("nama", { ascending: true });
      if (error) throw error;
      return data || [];
    },

    // --- SETORAN ---
    async getSetoran(userId = null) {
      const sb = getClientOrThrow();
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
      const sb = getClientOrThrow();
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
      const sb = getClientOrThrow();
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

    // --- RIWAYAT AKTIVITAS ADMIN & PETUGAS ---
    async logActivity({ action, actionLabel = "Aktivitas", description = "", targetId = null, metadata = {} }) {
      const sb = getClientOrThrow();
      const { data: { user }, error: userError } = await sb.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Sesi login tidak ditemukan.");
      const { data: profile, error: profileError } = await sb.from("profiles").select("nama, peran").eq("id", user.id).maybeSingle();
      if (profileError) throw profileError;
      if (!profile || !["admin", "petugas"].includes(String(profile.peran || "").toLowerCase())) return null;
      const { data, error } = await sb.from("activity_logs").insert([{
        actor_id: user.id,
        actor_name: profile.nama || user.email || "Pengguna",
        actor_role: String(profile.peran).toLowerCase(),
        action,
        action_label: actionLabel,
        description,
        target_id: targetId == null ? null : String(targetId),
        metadata: metadata || {}
      }]).select().single();
      if (error) throw error;
      return data;
    },

    async getActivityLogs({ limit = 30, role = null } = {}) {
      const sb = getClientOrThrow();
      let query = sb.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(limit);
      if (role) query = query.eq("actor_role", role);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    // --- HADIAH & PENUKARAN ---
    async getHadiah() {
      const sb = getClientOrThrow();
      const { data, error } = await sb
        .from("hadiah")
        .select("*")
        .order("harga", { ascending: true });
      if (error) throw error;
      return data;
    },

    async getRiwayatPenukaran(userId = null) {
      const sb = getClientOrThrow();
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
      const sb = getClientOrThrow();
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
