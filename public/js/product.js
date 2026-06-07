import { mountChrome, productCard, productImg, toast, icon, escapeHtml } from './ui.js';
import { api } from './api.js';
import { rupiah, ringkas, bintang } from './format.js';
import { addToCart, pushRecent } from './store.js';

const id = location.pathname.split('/').pop() || new URLSearchParams(location.search).get('id');
const root = document.getElementById('pdp-root');
const relatedWrap = document.getElementById('related');

let product = null;

// Foto utama + dua varian crop supaya galeri terasa seperti beberapa angle.
function galleryVariants(p) {
  if (!p.image) return [productImg(p.id, 600)];
  return [p.image, p.image + '&crop=entropy', p.image + '&crop=edges'];
}

async function init() {
  await mountChrome();
  try {
    const data = await api.product(id);
    product = data.product;
    pushRecent(product.id);
    document.title = `${product.title} — Belantara`;
    render(data);
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><h3>Produk tidak ditemukan</h3><p>${escapeHtml(err.message)}</p><a class="btn btn-brand" href="/">Kembali ke beranda</a></div>`;
  }
}

function render({ product: p, related }) {
  const off = p.discount ? `<span class="off">Hemat ${p.discount}%</span>` : '';
  const was = p.listPrice > p.price ? `<span class="was">${rupiah(p.listPrice)}</span>` : '';
  const stockLine =
    p.stock > 10
      ? `<div class="stock-ok">${icon('shield', 16)} Stok tersedia</div>`
      : `<div class="stock-low">⚠ Tinggal ${p.stock} lagi — buruan!</div>`;

  const specs = Object.entries(p.specs || {})
    .map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`)
    .join('');

  const highlights = (p.highlights || []).map((h) => `<li>${escapeHtml(h)}</li>`).join('');

  root.innerHTML = `
  <div class="crumbs">
    <a href="/">Beranda</a> &rsaquo;
    <a href="/search?category=${p.category}">${escapeHtml(p.subcategory || p.category)}</a> &rsaquo;
    <span>${escapeHtml(p.title)}</span>
  </div>
  <div class="pdp">
    <div class="pdp-gallery">
      <div class="pdp-main-img">
        <img id="main-img" src="${p.image || productImg(p.id, 600)}" alt="${escapeHtml(p.title)}"
             onerror="this.onerror=null;this.src='${productImg(p.id, 600)}'">
      </div>
      <div class="pdp-thumbs" id="thumbs">
        ${galleryVariants(p)
          .map(
            (src, i) =>
              `<button class="${i === 0 ? 'active' : ''}" data-src="${src}"><img src="${src}" alt="foto ${i + 1}" onerror="this.onerror=null;this.src='${productImg(p.id, 120)}'"></button>`
          )
          .join('')}
      </div>
    </div>

    <div class="pdp-info">
      <div class="pdp-brand">${escapeHtml(p.brand)}</div>
      <h1>${escapeHtml(p.title)}</h1>
      <div class="pdp-rating">
        <span class="stars" style="font-size:1rem">${bintang(p.rating)}</span>
        <span><b>${p.rating.toFixed(1)}</b></span>
        <span>${ringkas(p.ratingCount)} ulasan</span>
        <span class="sold">${ringkas(p.sold)}+ terjual</span>
      </div>

      <div class="pdp-price-box">
        <div class="pdp-price">
          <span class="now">${rupiah(p.price)}</span>
          ${was} ${off}
        </div>
      </div>

      <div class="pdp-section">
        <h3>Sorotan</h3>
        <ul class="highlights">${highlights}</ul>
      </div>

      <div class="pdp-section">
        <h3>Deskripsi</h3>
        <p style="margin:0;color:#333">${escapeHtml(p.description)}</p>
      </div>

      <div class="pdp-section">
        <h3>Spesifikasi</h3>
        <div class="specs">${specs}</div>
      </div>
    </div>

    <aside>
      <div class="buybox">
        <div class="bb-price">${rupiah(p.price)}</div>
        ${stockLine}
        <div class="ship-line">${p.freeShipping ? '<b style="color:var(--ok)">Gratis Ongkir</b> ke seluruh Indonesia' : 'Ongkir dihitung di checkout'}</div>

        <div class="qty" role="group" aria-label="Jumlah">
          <button id="q-minus" aria-label="Kurangi">&minus;</button>
          <input id="q-input" type="text" inputmode="numeric" value="1" aria-label="Jumlah">
          <button id="q-plus" aria-label="Tambah">+</button>
        </div>

        <button class="btn btn-cart btn-block btn-lg" id="add-cart">${icon('cart', 18)} Masukkan Keranjang</button>
        <button class="btn btn-primary btn-block" id="buy-now" style="margin-top:10px">Beli Sekarang</button>

        <div class="seller-card">
          <div>Dijual oleh</div>
          <div class="name">${escapeHtml(p.seller?.name || 'Belantara')}</div>
          <div class="muted">${escapeHtml(p.seller?.location || '')} &middot; Rating toko ${p.seller?.rating || 98}%</div>
        </div>

        <div class="trust-row">
          <div><div class="t-ico">${icon('shield', 20)}</div>Garansi Belantara</div>
          <div><div class="t-ico">${icon('truck', 20)}</div>Pengiriman cepat</div>
          <div><div class="t-ico">${icon('back', 20)}</div>7 hari retur</div>
        </div>
      </div>
    </aside>
  </div>`;

  wireGallery();
  wireBuybox(p);

  // Produk terkait
  if (related?.length) {
    relatedWrap.innerHTML = `
      <div class="section-head"><h2>Produk Serupa</h2></div>
      <div class="grid">${related.map(productCard).join('')}</div>`;
  }
}

function wireGallery() {
  const main = document.getElementById('main-img');
  document.querySelectorAll('#thumbs button').forEach((btn) =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('#thumbs button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      main.src = btn.dataset.src;
    })
  );
}

function wireBuybox(p) {
  const input = document.getElementById('q-input');
  const clamp = (n) => Math.max(1, Math.min(p.stock || 99, n));
  const get = () => clamp(parseInt(input.value, 10) || 1);
  const set = (n) => (input.value = String(clamp(n)));

  document.getElementById('q-minus').addEventListener('click', () => set(get() - 1));
  document.getElementById('q-plus').addEventListener('click', () => set(get() + 1));
  input.addEventListener('input', () => (input.value = input.value.replace(/[^0-9]/g, '')));
  input.addEventListener('blur', () => set(get()));

  document.getElementById('add-cart').addEventListener('click', () => {
    addToCart(p.id, get());
    toast(`${get()}x "${p.title.slice(0, 28)}…" ditambahkan`, 'ok', {
      actionText: 'Lihat keranjang',
      actionHref: '/cart',
    });
  });

  document.getElementById('buy-now').addEventListener('click', () => {
    addToCart(p.id, get());
    location.href = '/checkout';
  });
}

init();
