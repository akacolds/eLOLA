import { sb } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const selectKelurahan = document.getElementById('selectKelurahan');
  const selectRw = document.getElementById('selectRw');
  const selectRt = document.getElementById('selectRt');
  const options = document.querySelectorAll('.waste-card-option');
  const inputBerat = document.getElementById('inputBerat');
  const inputCatatan = document.getElementById('inputCatatan');
  const inputFoto = document.getElementById('inputFoto');
  const previewContainer = document.getElementById('previewContainer');
  const imgPreview = document.getElementById('imgPreview');
  const valEstimasiPoin = document.getElementById('valEstimasiPoin');
  const btnKirim = document.getElementById('btnKirimSetoran');
  const setorAlert = document.getElementById('setorAlert');

  const targetAsnCard = document.getElementById('targetAsnCard');
  const targetAsnStatus = document.getElementById('targetAsnStatus');
  const targetProgressBar = document.getElementById('targetProgressBar');

  let selectedKategori = 'plastik';
  let poinRate = 100;

  // 1. Validasi sesi aktif
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) {
    window.location.href = '../index.html';
    return;
  }

  const userId = session.user.id;

  // 2. Ambil profil warga dan parse wilayah RT / RW
  const { data: userProfil } = await sb
    .from('users')
    .select('is_asn, peran, total_kg, rt, kelurahan')
    .eq('id', userId)
    .maybeSingle();

  if (userProfil) {
    if (userProfil.kelurahan && selectKelurahan) {
      selectKelurahan.value = userProfil.kelurahan;
    }

    if (userProfil.rt) {
      if (userProfil.rt.includes(' / ')) {
        const [rtVal, rwVal] = userProfil.rt.split(' / ');
        if (selectRt && rtVal) selectRt.value = rtVal.trim();
        if (selectRw && rwVal) selectRw.value = rwVal.trim();
      } else {
        if (selectRt) selectRt.value = userProfil.rt;
      }
    }

    // Evaluasi kuota wajib ASN
    if (userProfil.is_asn || userProfil.peran === 'asn') {
      targetAsnCard?.classList.remove('hidden');
      const kgSekarang = Number(userProfil.total_kg || 0);
      const persen = Math.min(100, Math.round((kgSekarang / 2.0) * 100));
      if (targetAsnStatus) targetAsnStatus.textContent = `${kgSekarang.toFixed(1)} / 2.0 kg (${persen}%)`;
      if (targetProgressBar) targetProgressBar.style.width = `${persen}%`;
    }
  }

  // 3. Pilihan jenis sampah
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedKategori = opt.getAttribute('data-kategori');
      poinRate = Number(opt.getAttribute('data-poin')) || 100;
      hitungEstimasi();
    });
  });

  // 4. Hitung estimasi poin
  function hitungEstimasi() {
    const berat = parseFloat(inputBerat.value) || 0;
    const totalPoin = Math.round(berat * poinRate);
    if (valEstimasiPoin) {
      valEstimasiPoin.textContent = `${totalPoin.toLocaleString('id-ID')} Poin`;
    }
    return totalPoin;
  }

  inputBerat?.addEventListener('input', hitungEstimasi);

  // 5. Pratinjau foto bukti
  inputFoto?.addEventListener('change', () => {
    const file = inputFoto.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imgPreview.src = e.target.result;
        previewContainer.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    } else {
      previewContainer.classList.add('hidden');
      imgPreview.src = '';
    }
  });

  function showAlert(msg, tipe = 'info') {
    if (!setorAlert) return;
    setorAlert.textContent = msg;
    setorAlert.className = `alert-box alert-${tipe}`;
    setorAlert.classList.remove('hidden');
  }

  // 6. Pengiriman setoran
  btnKirim?.addEventListener('click', async () => {
    setorAlert?.classList.add('hidden');
    const berat = parseFloat(inputBerat.value);

    if (!berat || berat <= 0) {
      showAlert('Silakan masukkan estimasi berat sampah yang valid.', 'error');
      return;
    }

    const kelurahanPilihan = selectKelurahan ? selectKelurahan.value : 'Lalolara';
    const rtPilihan = selectRt ? selectRt.value : 'RT 01';
    const rwPilihan = selectRw ? selectRw.value : 'RW 01';
    const formatWilayah = `${rtPilihan} / ${rwPilihan}`;

    btnKirim.disabled = true;
    btnKirim.textContent = 'Menyimpan...';

    try {
      let fotoUrl = null;
      const file = inputFoto?.files[0];

      // Unggah gambar ke Supabase Storage (jika disertakan)
      if (file) {
        btnKirim.textContent = 'Mengunggah foto...';
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadErr } = await sb.storage
          .from('bukti-setoran')
          .upload(filePath, file);

        if (!uploadErr) {
          const { data: urlData } = sb.storage
            .from('bukti-setoran')
            .getPublicUrl(filePath);
          fotoUrl = urlData.publicUrl;
        }
      }

      // Perbarui domisili RT/RW di profil pengguna
      await sb
        .from('users')
        .update({
          rt: formatWilayah,
          kelurahan: kelurahanPilihan
        })
        .eq('id', userId);

      // Simpan setoran ke database
      const estimasiPoin = hitungEstimasi();
      const { error: insertErr } = await sb
        .from('transaksi_setoran')
        .insert({
          user_id: userId,
          kategori: selectedKategori,
          berat_kg: berat,
          estimasi_poin: estimasiPoin,
          foto_url: fotoUrl,
          catatan: inputCatatan?.value?.trim() || null,
          status: 'menunggu'
        });

      if (insertErr) throw insertErr;

      showAlert(`Setoran berhasil diajukan untuk ${formatWilayah} ${kelurahanPilihan}! Mengalihkan...`, 'success');
      setTimeout(() => {
        window.location.href = 'dompet.html';
      }, 1000);

    } catch (err) {
      showAlert(err.message || 'Gagal mengirim pengajuan setoran.', 'error');
    } finally {
      btnKirim.disabled = false;
      btnKirim.textContent = 'Kirim Pengajuan Setoran';
    }
  });
});
