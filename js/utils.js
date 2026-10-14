// js/utils.js - Helper dan utilitas antarmuka eLOLA
window.ElolaUtils = (() => {
  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Number(n).toLocaleString("id-ID", { maximumFractionDigits: 1 });
  const fmtInt = (n) => Math.round(Number(n)).toLocaleString("id-ID");
  const rupiah = (n) => "Rp " + fmtInt(n);
  const bulat1 = (n) => Math.round(n * 10) / 10;
  const baca = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
  const tulis = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const awalBulan = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime(); };
  const tglPanjang = (iso) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const tglJam = (iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) + ", " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(".", ":");
  };

  function el(tag, attrs = {}, ...anak) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "text") e.textContent = v;
      else if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    anak.flat().forEach(a => { if (a !== null && a !== undefined && a !== false) e.append(a); });
    return e;
  }

  function notif(tipe, teks, aksi) {
    const n = $("notif"); if (!n) return;
    n.className = "notif " + tipe;
    n.replaceChildren(el("span", { text: teks }));
    if (aksi) n.append(el("button", { type: "button", text: aksi.label, onclick: aksi.klik }));
  }

  const tutupNotif = () => { const n = $("notif"); if (n) n.className = "notif hidden"; };

  function kompres(file, maks = 640, mutu = 0.6) {
    return new Promise((res, rej) => {
      const img = new Image(), u = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, maks / Math.max(img.width, img.height)), c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", mutu));
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("Foto tidak bisa dibaca.")); };
      img.src = u;
    });
  }

  return { $, fmt, fmtInt, rupiah, bulat1, baca, tulis, awalBulan, tglPanjang, tglJam, el, notif, tutupNotif, kompres };
})();