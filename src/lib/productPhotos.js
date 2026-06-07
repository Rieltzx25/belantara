/**
 * Foto produk asli (Unsplash). Tiap id produk dipetakan ke satu foto.
 * URL dibangun dengan crop persegi supaya kartu seragam.
 *
 * Kalau suatu foto gagal dimuat, frontend otomatis jatuh ke gambar
 * SVG bawaan (route /img/product/:id.svg) — jadi tidak pernah broken.
 */

const PHOTO = {
  // Elektronik
  'elc-001': '1511707171634-5f897ff02aa9', // smartphone
  'elc-002': '1590658268037-6bf12165a8df', // earbuds / TWS
  'elc-003': '1496181133206-80ce9b88a853', // laptop
  'elc-004': '1502920917128-1aa500764cbd', // action cam
  'elc-005': '1593305841991-05c297ba4575', // smart tv
  'elc-006': '1583863788434-e58a36330cf0', // charger / kabel

  // Fashion
  'fsn-001': '1521572163474-6864f9cf17ab', // kaos polos
  'fsn-002': '1549298916-b41d501d3772',    // sneakers
  'fsn-003': '1595777457583-95e059d581b8', // dress
  'fsn-004': '1553062407-98eeb64c6a62',    // ransel
  'fsn-005': '1524592094714-0f0654e20314', // jam tangan
  'fsn-006': '1596755094514-f87e34085b2c', // kemeja flanel

  // Rumah & Dapur
  'hom-001': '1594213114663-d94db9b17125', // teko listrik
  'hom-002': '1522771739844-6a9f6d5f14af', // sprei / bedding
  'hom-003': '1594620302200-9a762244a156', // rak
  'hom-004': '1507473885765-e6ed057f782c', // lampu meja
  'hom-005': { lf: 'frypan', lock: 2 }, // wajan (Unsplash id meleset -> keyword)

  // Buku
  'bok-001': '1544947950-fa07a98d237f',    // buku
  'bok-002': '1512820790803-83ca734da794', // buku
  'bok-003': '1532012197267-da84d127e765', // buku
  'bok-004': '1503676260728-1c00da094a0b', // buku anak
  'bok-005': '1497633762265-9d179a990aa6', // rak buku

  // Olahraga
  'spo-001': '1592432678016-e910b452f9a2', // matras yoga
  'spo-002': '1638536532686-d610adfc8e5c', // dumbbell
  'spo-003': '1602143407151-7111542de6e8', // botol minum
  'spo-004': '1542291026-7eec264c27ff',    // sepatu lari
  'spo-005': '1598971639058-fab3c3109a00', // resistance band

  // Kecantikan
  'bea-001': '1620916566398-39f1143ab7be', // serum
  'bea-002': '1556228578-8c89e6adf883',    // sunscreen
  'bea-003': '1586495777744-4413f21062fa', // lip cream
  'bea-004': { lf: 'blowdryer', lock: 3 }, // hair dryer (foto produk ghd)

  // Mainan & Hobi
  'toy-001': '1558060370-d644479cb6f7',    // brick / balok
  'toy-002': '1594787318286-3d835c1d207f', // rc mobil
  'toy-003': '1606503153255-59d8b8b82176', // puzzle / miniatur
  'toy-004': '1559454403-b8fb88521f11',    // boneka

  // Kebutuhan Harian
  'gro-001': '1447933601403-0c6688de566e', // kopi
  'gro-002': { lf: 'honey,jar', lock: 23 },     // madu (Unsplash id meleset -> keyword)
  'gro-003': '1586201375761-83865001e31c', // beras
  'gro-004': { lf: 'granola,breakfast', lock: 11 }, // granola (Unsplash id meleset -> keyword)
};

export function photoUrl(id, size = 600) {
  const v = PHOTO[id];
  if (!v) return null;
  // Nilai berupa objek { lf, lock } -> foto loremflickr by keyword (relevansi terjamin).
  if (typeof v === 'object' && v.lf) {
    return `https://loremflickr.com/${size}/${size}/${v.lf}?lock=${v.lock}`;
  }
  return `https://images.unsplash.com/photo-${v}?auto=format&fit=crop&w=${size}&h=${size}&q=72`;
}

export function hasPhoto(id) {
  return Boolean(PHOTO[id]);
}
