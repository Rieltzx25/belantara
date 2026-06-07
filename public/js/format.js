// Pembantu format tampilan. Sengaja dipisah supaya angka/rating
// diformat seragam di semua halaman.

export function rupiah(n) {
  return 'Rp' + Number(n || 0).toLocaleString('id-ID');
}

// 1284 -> "1,3rb", 67000 -> "67rb", 1200000 -> "1,2jt"
export function ringkas(n) {
  n = Number(n || 0);
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.', ',').replace(',0', '') + 'jt';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.', ',').replace(',0', '') + 'rb';
  return String(n);
}

// rating 4.6 -> "★★★★★" dengan bintang terakhir setengah lewat warna.
// Dibuat sederhana: bulatkan ke 0.5 lalu render karakter penuh/kosong.
export function bintang(rating) {
  const r = Math.round((rating || 0) * 2) / 2;
  let out = '';
  for (let i = 1; i <= 5; i++) {
    if (r >= i) out += '★';
    else if (r >= i - 0.5) out += '⯨';
    else out += '☆';
  }
  return out;
}

export function tanggal(iso) {
  try {
    return new Date(iso).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
