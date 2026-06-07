import { mountChrome, productCard, icon, escapeHtml } from './ui.js';
import { api } from './api.js';
import { rupiah, tanggal } from './format.js';
import { getOrders, getRecent } from './store.js';

const root = document.getElementById('account-root');

const STATUS_PILL = { PLACED: 'placed', SHIPPED: 'shipped', DONE: 'done' };
const STATUS_TEXT = { PLACED: 'Diproses', SHIPPED: 'Dikirim', DONE: 'Selesai' };

async function init() {
  await mountChrome();
  const orders = getOrders();
  const recentIds = getRecent();
  const spent = orders.reduce((s, o) => s + (o.total || 0), 0);

  const ordersHtml = orders.length
    ? orders
        .map(
          (o) => `
      <div class="order-card">
        <div class="top">
          <div>
            <b>${o.id}</b>
            <span class="muted" style="margin-left:8px">${tanggal(o.createdAt)}</span>
          </div>
          <span class="pill ${STATUS_PILL[o.status] || 'placed'}">${STATUS_TEXT[o.status] || o.status}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <div>${escapeHtml(o.firstTitle || 'Pesanan')}${o.lineCount > 1 ? ` <span class="muted">+ ${o.lineCount - 1} produk lain</span>` : ''}</div>
            <div class="muted" style="font-size:.84rem">${o.itemCount} item</div>
          </div>
          <div style="text-align:right">
            <div style="font-weight:800;color:var(--price)">${rupiah(o.total)}</div>
            <a class="btn btn-ghost" style="padding:6px 14px;margin-top:6px" href="/order/${o.id}">Lihat Detail</a>
          </div>
        </div>
      </div>`
        )
        .join('')
    : `<div class="empty-state" style="padding:40px">
         <div class="big">${icon('cart', 48)}</div>
         <h3>Belum ada pesanan</h3>
         <p>Pesanan yang kamu buat akan muncul di sini.</p>
         <a class="btn btn-brand" href="/search">Mulai Belanja</a>
       </div>`;

  root.innerHTML = `
  <h1 style="margin:6px 0 18px">Akun Saya</h1>
  <div class="account-layout">
    <aside>
      <div class="panel" style="padding:14px">
        <div style="display:flex;align-items:center;gap:12px;padding:6px 8px 14px;border-bottom:1px solid var(--line);margin-bottom:10px">
          <div style="width:46px;height:46px;border-radius:50%;background:var(--brand-tint);color:var(--brand);display:grid;place-items:center">${icon('user', 24)}</div>
          <div>
            <b>Sobat Belantara</b>
            <div class="muted" style="font-size:.8rem">${escapeHtml(account_email())}</div>
          </div>
        </div>
        <nav class="account-nav">
          <a class="active" href="#orders">${icon('truck', 16)} Pesanan Saya</a>
          <a href="#recent">${icon('search', 16)} Terakhir Dilihat</a>
          <a href="/cart">${icon('cart', 16)} Keranjang</a>
          <a href="/sell">${icon('shield', 16)} Jadi Seller</a>
        </nav>
      </div>
    </aside>

    <div>
      <div class="stat-row">
        <div class="stat"><div class="n">${orders.length}</div><div class="l">Total Pesanan</div></div>
        <div class="stat"><div class="n">${rupiah(spent).replace('Rp', 'Rp ')}</div><div class="l">Total Belanja</div></div>
        <div class="stat"><div class="n">${recentIds.length}</div><div class="l">Produk Dilihat</div></div>
      </div>

      <section id="orders">
        <div class="section-head"><h2>Pesanan Saya</h2></div>
        ${ordersHtml}
      </section>

      <section id="recent" style="margin-top:24px">
        <div class="section-head"><h2>Terakhir Dilihat</h2></div>
        <div class="grid" id="recent-grid"></div>
      </section>
    </div>
  </div>`;

  renderRecent(recentIds);
}

function account_email() {
  // demo: ambil dari pesanan terakhir kalau ada, kalau tidak default
  const last = getOrders()[0];
  return 'tamu@belantara.id';
}

async function renderRecent(ids) {
  const grid = document.getElementById('recent-grid');
  if (!ids.length) {
    grid.outerHTML = `<p class="muted">Belum ada produk yang kamu lihat. <a href="/search" style="color:var(--brand)">Jelajahi produk &rsaquo;</a></p>`;
    return;
  }
  try {
    const products = await Promise.all(
      ids.slice(0, 6).map((id) => api.product(id).then((r) => r.product).catch(() => null))
    );
    grid.innerHTML = products.filter(Boolean).map(productCard).join('');
  } catch {
    grid.innerHTML = '<p class="muted">Gagal memuat produk.</p>';
  }
}

init();
