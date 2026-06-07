import { mountChrome, productImg, icon, escapeHtml } from './ui.js';
import { api } from './api.js';
import { rupiah, tanggal } from './format.js';
import { getCachedOrder } from './store.js';

const id = location.pathname.split('/').pop() || new URLSearchParams(location.search).get('id');
const root = document.getElementById('order-root');

const PAY_LABEL = {
  va_bca: 'Virtual Account BCA',
  gopay: 'GoPay / E-Wallet',
  cod: 'Bayar di Tempat (COD)',
};

async function init() {
  await mountChrome();

  // 1) coba salinan lokal dulu — selalu ada untuk order yang baru dibuat,
  //    dan andal di deploy serverless. 2) kalau tidak ada, tarik dari API.
  const cached = getCachedOrder(id);
  if (cached) {
    document.title = `Pesanan ${cached.id} — Belantara`;
    render(cached);
    return;
  }

  try {
    const { order } = await api.order(id);
    document.title = `Pesanan ${order.id} — Belantara`;
    render(order);
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><h3>Pesanan tidak ditemukan</h3><p>${escapeHtml(err.message)}</p><a class="btn btn-brand" href="/">Ke beranda</a></div>`;
  }
}

function render(o) {
  const steps = ['Dibuat', 'Dibayar', 'Dikirim', 'Selesai'];
  const activeStep = o.payment?.method === 'cod' ? 1 : 1; // pesanan baru: tahap "Dibuat" selesai
  const stepHtml = steps
    .map(
      (s, i) => `
    <div class="step ${i < activeStep ? 'done' : ''}">
      <div class="dot">${i < activeStep ? icon('shield', 16) : i + 1}</div>
      <small>${s}</small>
    </div>`
    )
    .join('');

  const items = o.lines
    .map(
      (l) => `
    <div class="mini-item">
      <div class="thumb"><img src="${l.thumb || productImg(l.id, 100)}" alt="" onerror="this.onerror=null;this.src='${productImg(l.id, 100)}'"></div>
      <div style="flex:1">
        <a href="/product/${l.id}">${escapeHtml(l.title)}</a>
        <div class="q">${l.qty} &times; ${rupiah(l.price)}</div>
      </div>
      <div><b>${rupiah(l.lineTotal)}</b></div>
    </div>`
    )
    .join('');

  const c = o.customer || {};

  root.innerHTML = `
  <div class="order-hero">
    <div class="check">${icon('shield', 38)}</div>
    <h1>Pesanan Berhasil Dibuat!</h1>
    <p class="muted">Terima kasih, ${escapeHtml(c.name || 'Sobat Belantara')}. Kami sudah menerima pesananmu.</p>
    <div class="order-id-chip">${o.id}</div>
  </div>

  <div class="steps">${stepHtml}</div>

  <div class="checkout-layout">
    <div>
      <div class="form-card">
        <h3>Item Pesanan (${o.lines.length})</h3>
        <div style="margin-top:8px">${items}</div>
      </div>
      <div class="form-card">
        <h3>Dikirim ke</h3>
        <p style="margin:0;line-height:1.6">
          <b>${escapeHtml(c.name)}</b> &middot; ${escapeHtml(c.phone || '-')}<br>
          ${escapeHtml(c.address)}<br>
          ${escapeHtml(c.city)} ${escapeHtml(c.postalCode || '')}<br>
          ${c.note ? `<span class="muted">Catatan: ${escapeHtml(c.note)}</span>` : ''}
        </p>
      </div>
    </div>

    <aside>
      <div class="summary">
        <h3>Ringkasan</h3>
        <div class="sum-line"><span>Tanggal</span><span>${tanggal(o.createdAt)}</span></div>
        <div class="sum-line"><span>Pembayaran</span><span>${PAY_LABEL[o.payment?.method] || o.payment?.method}</span></div>
        <div class="sum-line"><span>Status bayar</span><span><span class="pill placed">${o.payment?.status || 'PENDING'}</span></span></div>
        <div class="sum-line"><span>Subtotal</span><span>${rupiah(o.subtotal)}</span></div>
        <div class="sum-line"><span>Ongkir</span><span>${o.shipping === 0 ? '<span class="free-tag">GRATIS</span>' : rupiah(o.shipping)}</span></div>
        <div class="sum-line"><span>PPN</span><span>${rupiah(o.tax)}</span></div>
        <div class="sum-line total"><span>Total</span><span class="val">${rupiah(o.total)}</span></div>
        <a class="btn btn-brand btn-block btn-lg" href="/account" style="margin-top:14px">Lihat Pesanan Saya</a>
        <a class="btn btn-ghost btn-block" href="/search" style="margin-top:10px">Belanja Lagi</a>
      </div>
    </aside>
  </div>`;
}

init();
