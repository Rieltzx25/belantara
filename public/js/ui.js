// "Chrome" bersama: header, sub-nav kategori, footer, toast, dan
// komponen kartu produk. Dipanggil tiap halaman lewat mountChrome().

import { rupiah, ringkas, bintang } from './format.js';
import { cartCount } from './store.js';
import { api } from './api.js';

/* ----------------------------- Ikon (inline SVG) ----------------------------- */
const ICONS = {
  leaf: '<path d="M5 21c0-7 4-13 14-15-1 9-6 14-14 15z"/><path d="M5 21c2-5 5-8 9-10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  cart: '<circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/><path d="M2 3h3l2.4 12.4a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.2L22 7H6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  truck: '<rect x="1" y="6" width="13" height="11" rx="1"/><path d="M14 9h4l3 3v5h-7z"/><circle cx="6" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/>',
  back: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  electronics: '<rect x="3" y="4" width="18" height="12" rx="1"/><path d="M8 20h8M12 16v4"/>',
  fashion: '<path d="M8 3l4 2 4-2 4 3-2 3-2-1v11H8V8L6 9 4 6z"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>',
  books: '<path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v13c-3-1-6-1-8 1-2-2-5-2-8-1z"/>',
  sports: '<circle cx="12" cy="12" r="8"/><path d="M5 8l14 8M19 8L5 16"/>',
  beauty: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/>',
  toys: '<rect x="3" y="8" width="8" height="8" rx="1"/><rect x="13" y="8" width="8" height="8" rx="1"/>',
  groceries: '<path d="M5 7h14l-1.5 12h-11z"/><path d="M8 7l2-4h4l2 4"/>',
};

export function icon(name, size = 20) {
  const body = ICONS[name] || '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

export function productImg(id, size = 320) {
  return `/img/product/${encodeURIComponent(id)}.svg?s=${size}`;
}

/* ----------------------------- Gambar produk ----------------------------- */
// Pakai foto asli (p.image dari Unsplash); kalau gagal, jatuh ke SVG bawaan.
export function productImageTag(p, { size = 400, eager = false } = {}) {
  const real = size > 500 ? p.image : p.thumb || p.image;
  const src = real || productImg(p.id, size);
  const fallback = productImg(p.id, size);
  return `<img src="${src}" alt="${escapeAttr(p.title)}" ${eager ? '' : 'loading="lazy"'}
    onerror="this.onerror=null;this.src='${fallback}'">`;
}

/* ----------------------------- Kartu produk ----------------------------- */
export function productCard(p) {
  const off = p.discount
    ? `<span class="badge-discount">-${p.discount}%</span>`
    : '';
  const was = p.listPrice && p.listPrice > p.price
    ? `<span class="price-was">${rupiah(p.listPrice)}</span>`
    : '';
  const ship = p.freeShipping
    ? `<span class="card-ship">Gratis Ongkir</span>`
    : '';
  return `
  <a class="card" href="/product/${p.id}">
    <div class="card-media">
      ${productImageTag(p, { size: 400 })}
      ${off}
    </div>
    <div class="card-body">
      <div class="card-title">${escapeHtml(p.title)}</div>
      <div class="card-price">
        <span class="price-now">${rupiah(p.price)}</span>
        ${was}
      </div>
      <div class="card-meta">
        <span class="stars">★</span>
        <span>${p.rating.toFixed(1)}</span>
        <span class="dot">·</span>
        <span>${ringkas(p.sold)} terjual</span>
      </div>
      ${ship}
    </div>
  </a>`;
}

export function escapeHtml(s = '') {
  return String(s).replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
}
export function escapeAttr(s = '') {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

/* ----------------------------- Toast ----------------------------- */
let toastWrap;
export function toast(message, type = 'ok', { actionText, actionHref, timeout = 3200 } = {}) {
  if (!toastWrap) {
    toastWrap = document.createElement('div');
    toastWrap.className = 'toast-wrap';
    document.body.appendChild(toastWrap);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const action = actionHref ? ` <a href="${actionHref}">${actionText || 'Lihat'}</a>` : '';
  el.innerHTML = `<span>${message}</span>${action}`;
  toastWrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateX(30px)';
    setTimeout(() => el.remove(), 260);
  }, timeout);
}

/* ----------------------------- Header + Footer ----------------------------- */
let categoriesCache = null;
export async function loadCategories() {
  if (!categoriesCache) {
    const { categories } = await api.categories();
    categoriesCache = categories;
  }
  return categoriesCache;
}

function headerHtml() {
  return `
  <header class="site-header">
    <div class="header-main">
      <a class="logo" href="/" aria-label="Belantara beranda">
        <span class="leaf" style="color:var(--accent)">${icon('leaf', 26)}</span>
        <span>Belantara<small>MARKETPLACE</small></span>
      </a>
      <form class="search" id="search-form" role="search">
        <select id="search-cat" aria-label="Kategori pencarian">
          <option value="">Semua</option>
        </select>
        <input id="search-input" name="q" type="search" autocomplete="off"
               placeholder="Cari produk, merek, atau kategori di Belantara...">
        <button type="submit" aria-label="Cari">${icon('search', 20)}</button>
      </form>
      <nav class="header-actions">
        <a class="h-link hide-sm" href="/account">
          <span>Halo, masuk</span><b>Akun &amp; Pesanan</b>
        </a>
        <a class="h-link hide-sm" href="/sell">
          <span>Mulai</span><b>Jualan</b>
        </a>
        <a class="h-link cart-link" href="/cart" aria-label="Keranjang">
          <span class="cart-ico">${icon('cart', 26)}</span>
          <b class="hide-sm">Keranjang</b>
          <span class="cart-count" id="cart-count">0</span>
        </a>
      </nav>
    </div>
    <div class="header-nav">
      <div class="nav-row" id="nav-row">
        <a class="all" href="/search">${icon('menu', 16)} Semua Kategori</a>
      </div>
    </div>
  </header>`;
}

function footerHtml() {
  const col = (title, links) =>
    `<div><h4>${title}</h4>${links.map((l) => `<a href="${l[1]}">${l[0]}</a>`).join('')}</div>`;
  return `
  <div class="back-top" id="back-top">${icon('back', 16)} Kembali ke atas</div>
  <footer class="site-footer">
    <div class="wrap">
      <div class="footer-cols">
        ${col('Belanja', [['Semua Kategori', '/search'], ['Produk Terlaris', '/search?sort=bestseller'], ['Promo & Diskon', '/search?sort=relevance'], ['Gratis Ongkir', '/search?free=1']])}
        ${col('Jual di Belantara', [['Mulai Berjualan', '/sell'], ['Pusat Seller', '/sell'], ['Biaya & Komisi', '/sell'], ['Tips Berjualan', '/sell']])}
        ${col('Bantuan', [['Cara Belanja', '#'], ['Lacak Pesanan', '/account'], ['Pengembalian', '#'], ['Hubungi Kami', '#']])}
        ${col('Tentang', [['Tentang Belantara', '#'], ['Arsitektur Sistem', '/arsitektur'], ['Kebijakan Privasi', '#'], ['Syarat & Ketentuan', '#']])}
      </div>
      <div class="footer-bottom">
        <div>&copy; 2026 Belantara. Proyek akademik Big Data Infrastructure Technology &mdash; bukan toko sungguhan.</div>
        <div class="badges">
          <span><a href="/arsitektur" style="color:inherit;text-decoration:none">Arsitektur AWS</a></span>
          <span>CloudFront</span>
          <span>EC2</span>
          <span>S3</span>
          <span>DynamoDB</span>
          <span>RDS</span>
        </div>
      </div>
    </div>
  </footer>`;
}

export function updateCartBadge() {
  const el = document.getElementById('cart-count');
  if (!el) return;
  const n = cartCount();
  el.textContent = n > 99 ? '99+' : String(n);
  el.style.display = n > 0 ? 'grid' : 'none';
}

async function wireHeader(active) {
  // isi dropdown + sub-nav kategori
  const categories = await loadCategories().catch(() => []);
  const sel = document.getElementById('search-cat');
  const nav = document.getElementById('nav-row');
  for (const c of categories) {
    const opt = document.createElement('option');
    opt.value = c.slug;
    opt.textContent = c.name;
    sel.appendChild(opt);

    const a = document.createElement('a');
    a.href = `/search?category=${c.slug}`;
    a.innerHTML = `${icon(c.slug, 15)} ${c.name}`;
    if (active === c.slug) a.style.background = 'rgba(255,255,255,.16)';
    nav.appendChild(a);
  }
  const extra = [
    ['Terlaris', '/search?sort=bestseller'],
    ['Gratis Ongkir', '/search?free=1'],
  ];
  for (const [label, href] of extra) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    nav.appendChild(a);
  }

  // pencarian
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const params = new URLSearchParams(location.search);
  if (params.get('q')) input.value = params.get('q');
  if (params.get('category')) sel.value = params.get('category');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    const cat = sel.value;
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (cat) qs.set('category', cat);
    location.href = '/search' + (qs.toString() ? `?${qs}` : '');
  });

  // tombol kembali ke atas
  document.getElementById('back-top')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

export async function mountChrome({ active = '' } = {}) {
  const head = document.getElementById('app-header');
  const foot = document.getElementById('app-footer');
  if (head) head.innerHTML = headerHtml();
  if (foot) foot.innerHTML = footerHtml();

  updateCartBadge();
  window.addEventListener('cart:change', updateCartBadge);

  await wireHeader(active);
}
