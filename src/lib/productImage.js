/**
 * Pembuat gambar produk berbasis SVG.
 *
 * Daripada menyeret ratusan file foto (yang juga bikin repo gemuk dan
 * butuh internet), tiap produk dirender jadi kartu SVG bergaya: gradien
 * sesuai warna kategori + ikon garis. Ringan, tajam di layar retina,
 * dan gampang di-upload ke S3 sebagai object .svg.
 */

const ICONS = {
  electronics: `<rect x="56" y="60" width="128" height="84" rx="8"/><rect x="92" y="150" width="56" height="8" rx="4"/><line x1="80" y1="170" x2="160" y2="170"/>`,
  fashion: `<path d="M88 60l32 18 32-18 30 22-20 26-14-8v66H92v-66l-14 8-20-26z"/>`,
  home: `<path d="M60 120l60-44 60 44"/><rect x="78" y="120" width="84" height="58" rx="4"/><rect x="104" y="142" width="32" height="36"/>`,
  books: `<path d="M120 64c-20-10-44-10-56-4v92c12-6 36-6 56 4 20-10 44-10 56-4V60c-12-6-36-6-56 4z"/><line x1="120" y1="64" x2="120" y2="160"/>`,
  sports: `<circle cx="120" cy="112" r="40"/><line x1="92" y1="84" x2="148" y2="140"/><line x1="148" y1="84" x2="92" y2="140"/>`,
  beauty: `<rect x="98" y="86" width="44" height="74" rx="10"/><rect x="110" y="64" width="20" height="24" rx="4"/><line x1="98" y1="116" x2="142" y2="116"/>`,
  toys: `<rect x="70" y="96" width="44" height="44" rx="6"/><rect x="126" y="96" width="44" height="44" rx="6"/><circle cx="92" cy="118" r="6"/><circle cx="148" cy="118" r="6"/>`,
  groceries: `<path d="M74 92h92l-10 70H84z"/><path d="M96 92l8-22h32l8 22"/>`,
  default: `<circle cx="120" cy="112" r="42"/><circle cx="120" cy="112" r="18"/>`,
};

function shade(hex, amount) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.min(255, ((n >> 16) & 0xff) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amount));
  return `rgb(${r},${g},${b})`;
}

function esc(s = '') {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c])
  );
}

export function renderProductSVG(product, { size = 480 } = {}) {
  const base = product.color || '#0b6b3a';
  const top = shade(base, 28);
  const bottom = shade(base, -34);
  const glyph = ICONS[product.category] || ICONS.default;
  const brand = esc((product.brand || 'Belantara').toUpperCase());

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 240 240" role="img" aria-label="${esc(product.title)}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
    <radialGradient id="spot" cx="0.3" cy="0.25" r="0.9">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="240" height="240" fill="url(#g)"/>
  <rect width="240" height="240" fill="url(#spot)"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.92" stroke-width="5"
     stroke-linecap="round" stroke-linejoin="round">${glyph}</g>
  <text x="120" y="214" text-anchor="middle" fill="#ffffff" fill-opacity="0.82"
        font-family="Segoe UI, Arial, sans-serif" font-size="12"
        font-weight="700" letter-spacing="2">${brand}</text>
</svg>`;
}
