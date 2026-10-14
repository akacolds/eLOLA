// Konfigurasi Supabase Client
const SUPABASE_URL = "https://sezmeitlvzcvqleutdxl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lAfH12E4Opmc9qmeLhmxAw_nP9XpKju";

// Cek apakah library CDN Supabase sudah terpasang
if (typeof supabase !== "undefined" && supabase.createClient) {
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else if (typeof window.supabase !== "undefined" && window.supabase.createClient) {
  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.error("SDK Supabase belum terpasang atau gagal dimuat dari CDN!");
}

window.SupabaseDB = (() => {
  const sb = () => {
    if (!window.supabaseClient) {
      throw new Error("Koneksi Supabase belum siap. Periksa koneksi internet atau CDN script.");
    }
    return window.supabaseClient;
  };

  return {
    // --- PROFILES / AUTH ---
    async getProfile(userId) {
      const { data, error } = await sb()
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },

    // ... method lainnya tetap sama
  };
})();

    // --- KATEGORI SAMPAH ---
    async getKategoriSampah() {
      const { data, error } = await sb()
        .from("kategori_sampah")
        .select("*")
        .order("id", { ascending: true });
      if (error) throw error;
      return data;
    },

    // --- SETORAN (Sesuai kolom tabel: setoran) ---
    async getSetoran(userId = null) {
      let query = sb()
        .from("setoran")
        .select("*, profiles:user_id(nama, peran)")
        .order("created_at", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async tambahSetoran({ userId, rw, rt, rincian, kg, poin, fotoUrl = "" }) {
      const payload = {
        user_id: userId,
        rw: rw,
        rt: rt,
        rincian: rincian,         // jsonb
        klaim: rincian,           // jsonb
        kg: kg,                   // numeric
        kg_klaim: kg,             // numeric
        poin: poin,               // int4
        foto_url: fotoUrl,        // text
        status: "menunggu",       // text
        catatan: "",
        created_at: new Date().toISOString()
      };

      const { data, error } = await sb()
        .from("setoran")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    async verifikasiSetoran(id, { aksi, rincianBaru, kgBaru, poinBaru, alasan = "", namaPetugas = "" }) {
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

      const { data, error } = await sb()
        .from("setoran")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    // --- HADIAH & PENUKARAN (Sesuai tabel: hadiah & penukaran) ---
    async getHadiah() {
      const { data, error } = await sb()
        .from("hadiah")
        .select("*")
        .order("harga", { ascending: true });
      if (error) throw error;
      return data;
    },

    async getRiwayatPenukaran(userId = null) {
      let q = sb()
        .from("penukaran")
        .select("*")
        .order("created_at", { ascending: false });
      if (userId) q = q.eq("user_id", userId);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },

    async tukarHadiah(userId, hadiah) {
      // 1. Kurangi stok hadiah
      const { error: errStok } = await sb()
        .from("hadiah")
        .update({ stok: hadiah.stok - 1 })
        .eq("id", hadiah.id);
      if (errStok) throw errStok;

      // 2. Buat catatan di tabel penukaran
      const { data, error } = await sb()
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
    },

    // --- PERINGKAT RT ---
    async getPeringkatRT() {
      const { data, error } = await sb()
        .from("peringkat_rt")
        .select("*")
        .order("total_kg", { ascending: false });
      if (error) throw error;
      return data;
    }
  };
})();
