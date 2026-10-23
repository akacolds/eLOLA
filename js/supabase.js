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

    async uploadFotoSetoran(file, userId) {
      const sb = getClientOrThrow();
      if (!file || !userId) throw new Error("Foto atau akun pengguna tidak ditemukan.");
      const ekstensi = (file.name || "foto.jpg").split(".").pop().toLowerCase();
      const aman = /^[a-z0-9]+$/.test(ekstensi) ? ekstensi : "jpg";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${aman}`;
      const { error } = await sb.storage
        .from("foto-setoran")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "image/jpeg"
        });
      if (error) {
        if (error.message && /bucket/i.test(error.message)) {
          throw new Error("Bucket foto-setoran belum dibuat di Supabase Storage. Ikuti petunjuk di file SETUP-FOTO-SUPABASE.txt.");
        }
        throw error;
      }
      const { data } = sb.storage.from("foto-setoran").getPublicUrl(path);
      return data.publicUrl;
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
      // Permintaan masuk antrean petugas. Stok baru dikurangi setelah disetujui.
      const { data, error } = await sb
        .from("penukaran")
        .insert([{
          user_id: userId,
          hadiah_id: hadiah.id,
          nama_hadiah: hadiah.nama,
          poin: hadiah.harga,
          status: "menunggu",
          catatan_pengguna: hadiah.catatan,
          nomor_wa: hadiah.nomorWa,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async getAntreanPenukaran() {
      const sb = getClientOrThrow();
      const { data, error } = await sb
        .from("penukaran")
        .select("*")
        .eq("status", "menunggu")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },

    async prosesPenukaran(id, aksi, namaPetugas = "Petugas", catatan = "") {
      const sb = getClientOrThrow();
      const { data: item, error: itemError } = await sb.from("penukaran").select("*").eq("id", id).single();
      if (itemError) throw itemError;
      if (item.status && item.status !== "menunggu") throw new Error("Permintaan ini sudah diproses.");
      if (aksi === "setujui") {
        const { data: hadiah, error: hadiahError } = await sb.from("hadiah").select("id,stok").eq("id", item.hadiah_id).single();
        if (hadiahError) throw hadiahError;
        if (Number(hadiah.stok) < 1) throw new Error("Stok hadiah habis.");
        const { error: stokError } = await sb.from("hadiah").update({ stok: Number(hadiah.stok) - 1 }).eq("id", hadiah.id).gte("stok", 1);
        if (stokError) throw stokError;
      }
      const payload = {
        status: aksi === "setujui" ? "disetujui" : "ditolak",
        petugas: namaPetugas,
        catatan,
        verified_at: new Date().toISOString()
      };
      const { data, error } = await sb.from("penukaran").update(payload).eq("id", id).eq("status", "menunggu").select().single();
      if (error) throw error;
      return data;
    }
  };
})();
