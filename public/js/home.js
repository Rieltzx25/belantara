import { mountChrome, productCard, icon } from './ui.js';
import { api } from './api.js';
import { ringkas } from './format.js';

await mountChrome({ active: '' });

const catStrip = document.getElementById('cat-strip');
const dealStrip = document.getElementById('deal-strip');
const bestGrid = document.getElementById('best-grid');
const showcases = document.getElementById('showcases');

function skeletons(host, n, cls = 'sk-card') {
  host.innerHTML = Array.from({ length: n }, () => `<div class="skeleton ${cls}"></div>`).join('');
}
skeletons(dealStrip, 6);
skeletons(bestGrid, 6);

// Strip kategori
api.categories().then(({ categories }) => {
  catStrip.innerHTML = categories
    .map(
      (c) => `
    <a class="cat-pill" href="/search?category=${c.slug}">
      <span class="cat-ico" style="background:${c.color}">${icon(c.slug, 26)}</span>
      <span>${c.name}</span>
      <small>${c.count} produk</small>
    </a>`
    )
    .join('');
});

// Flash sale (diskon terbesar)
api.deals().then(({ items }) => {
  dealStrip.innerHTML = items.slice(0, 10).map(productCard).join('');
});

// Terlaris
api.bestsellers().then(({ items }) => {
  bestGrid.innerHTML = items.slice(0, 12).map(productCard).join('');
});

// Dua etalase kategori (Elektronik & Fashion) biar home terasa berisi
const featured = [
  { slug: 'electronics', title: 'Gadget & Elektronik Pilihan' },
  { slug: 'home', title: 'Bikin Rumah Makin Nyaman' },
];
Promise.all(
  featured.map((f) => api.products(`category=${f.slug}&sort=bestseller`).then((r) => ({ ...f, items: r.items })))
).then((blocks) => {
  showcases.innerHTML = blocks
    .map(
      (b) => `
    <section class="section">
      <div class="section-head">
        <h2>${b.title}</h2>
        <a href="/search?category=${b.slug}">Lihat semua &rsaquo;</a>
      </div>
      <div class="grid">${b.items.slice(0, 6).map(productCard).join('')}</div>
    </section>`
    )
    .join('');
});
