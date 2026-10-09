import { sb } from './supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  const options = document.querySelectorAll('.waste-card-option');
  const inputBerat = document.getElementById('inputBerat');
  const inputCatatan = document.getElementById('inputCatatan');
  const inputFoto = document.getElementById('inputFoto');
  const previewContainer = document.getElementById('previewContainer');
  const imgPreview = document.getElementById('imgPreview');
  const valEstimasiPoin = document.getElementById('valEstimasiPoin');
  const btnKirim = document.getElementById('btnKirimSetoran');
  const setorAlert = document.getElementById('setorAlert');

  // Widget Target ASN
  const targetAsnCard = document.getElementById('targetAsnCard');
  const targetAsnStatus = document.getElementById('targetAsnStatus');
  const targetProgressBar = document.getElementById('targetProgressBar');

  let selectedKategori = 'plastik';
  let poinRate = 100;

  // 1. Cek sesi & profil user
  const { data: { session } } = await sb.auth.getSession();
  if (!session?.user) {
    window.location.href = '../index.html';
    return;
  }

  const userId = session.user.id;

  // Cek apakah akun ASN untuk menampilkan target 2 kg
  const { data: userProfil } = await sb
    .from('users')
    .select('is_asn, peran, total_kg')
    .eq('id', userId)
    .maybeSingle();

  if (userProfil?.is_asn || userProfil?.peran === 'asn') {
    targetAsnCard?.classList.remove('hidden');
    const kgSekarang = Number(userProfil.total_kg || 0);
    const persen = Math.min(100, Math.round((kgSekarang / 2.0) * 100));
    if (targetAsnStatus) targetAsnStatus.textContent = `${kgSekarang.toFixed(1)} / 2.0 kg (${persen}%)`;
    if (targetProgressBar) targetProgressBar.style.width = `${persen}%`;
  }

  // 2. Pemilihan Kategori Sampah
  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      selectedKategori = opt.getAttribute('data-kategori');
      poinRate = Number(opt.getAttribute('data-poin')) || 100;
      hitungEstimasi();
    });
  });

  // 3. Kalkulasi Estimasi Poin
  function hitungEstimasi() {
    const berat = parseFloat(inputBerat.value) || 0;
    const totalPoin = Math.round(berat * poinRate);
    if (valEstimasiPoin) {
      valEstimasiPoin.textContent = `${totalPoin.toLocaleString('id-ID')} Poin`;
    }
    return totalPoin;
  }

  inputBerat?.addEventListener('input', hitungEstimasi);

  // 4. Pratinjau Foto Bukti
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

  // 5. Kirim Pengajuan Setoran
  btnKirim?.addEventListener('click', async () => {
    setorAlert?.classList.add('hidden');
    const berat = parseFloat(inputBerat.value);

    if (!berat || berat <= 0) {
      showAlert('Silakan masukkan estimasi berat sampah yang valid.', 'error');
      return;
    }

    btnKirim.disabled = true;
    btnKirim.textContent = 'Mengirim data...';

    try {
      let fotoUrl = null;
      const file = inputFoto?.files[0];

      // Upload file ke Storage jika pengguna memilih foto
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
        } else {
          console.warn('Gagal unggah foto ke storage:', uploadErr.message);
        }
      }

      btnKirim.textContent = 'Menyimpan setoran...';
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

      showAlert('Setoran berhasil diajukan! Menunggu verifikasi petugas bank sampah.', 'success');
      inputBerat.value = '';
      if (inputCatatan) inputCatatan.value = '';
      if (inputFoto) inputFoto.value = '';
      previewContainer?.classList.add('hidden');
      hitungEstimasi();

      setTimeout(() => {
        window.location.href = 'dompet.html';
      }, 1200);

    } catch (err) {
      showAlert(err.message || 'Gagal mengirim pengajuan setoran.', 'error');
    } finally {
      btnKirim.disabled = false;
      btnKirim.textContent = 'Kirim Pengajuan Setoran';
    }
  });
});
