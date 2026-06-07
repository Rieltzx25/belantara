import { mountChrome, productImg, toast, icon, escapeHtml } from './ui.js';
import { api } from './api.js';
import { rupiah } from './format.js';
import { getCart, setQty, removeFromCart, cartCount } from './store.js';

const root = document.getElementById('cart-root');

async function render() {
  await Promise.resolve();
  const items = getCart();

  if (items.length === 0) {
    root.innerHTML = `
      <div class="empty-state">
        <div class="big">${icon('cart', 56)}</div>
        <h3>Keranjangmu masih kosong</h3>
        <p>Yuk cari sesuatu yang kamu suka di Belantara.</p>
        <a class="btn btn-brand btn-lg" href="/search">Mulai Belanja</a>
      </div>`;
    return;
  }

  root.innerHTML = `<div class="panel">Menghitung keranjang…</div>`;

  let priced;
  try {
    priced = await api.priceCart(items);
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><p>Gagal memuat keranjang: ${escapeHtml(err.message)}</p></div>`;
    return;
  }

  // Sinkronkan qty lokal dengan yang sudah di-clamp server (mis. stok berkurang)
  for (const line of priced.lines) {
    const local = items.find((i) => i.id === line.id);
    if (local && local.qty !== line.qty) setQty(line.id, line.qty);
  }

  const rows = priced.lines
    .map(
      (l) => `
    <div class="cart-row" data-id="${l.id}">
      <a class="thumb" href="/product/${l.id}"><img src="${l.thumb || productImg(l.id, 200)}" alt="${escapeHtml(l.title)}" onerror="this.onerror=null;this.src='${productImg(l.id, 200)}'"></a>
      <div>
        <h4><a href="/product/${l.id}">${escapeHtml(l.title)}</a></h4>
        <div class="meta">${escapeHtml(l.seller || '')}</div>
        <div class="meta">${l.freeShipping ? '<span class="free-tag">Gratis Ongkir</span>' : 'Dikenai ongkir'}</div>
        <div class="line-actions">
          <div class="qty">
            <button data-act="dec" aria-label="Kurangi">&minus;</button>
            <input value="${l.qty}" data-qty inputmode="numeric" aria-label="Jumlah">
            <button data-act="inc" aria-label="Tambah">+</button>
          </div>
          <button class="remove" data-act="remove">Hapus</button>
        </div>
      </div>
      <div class="line-price">${rupiah(l.lineTotal)}<div class="meta" style="font-weight:400">@ ${rupiah(l.price)}</div></div>
    </div>`
    )
    .join('');

  root.innerHTML = `
    <div class="cart-layout">
      <section>
        <div class="section-head"><h2>Keranjang (${cartCount()} item)</h2></div>
        <div class="cart-items">${rows}</div>
      </section>
      <aside>
        <div class="summary">
          <h3>Ringkasan Belanja</h3>
          <div class="sum-line"><span>Subtotal</span><span>${rupiah(priced.subtotal)}</span></div>
          <div class="sum-line"><span>Ongkos kirim</span><span>${priced.shipping === 0 ? '<span class="free-tag">GRATIS</span>' : rupiah(priced.shipping)}</span></div>
          <div class="sum-line"><span>PPN 11%</span><span>${rupiah(priced.tax)}</span></div>
          <div class="sum-line total"><span>Total</span><span class="val">${rupiah(priced.total)}</span></div>
          <button class="btn btn-primary btn-block btn-lg" id="to-checkout" style="margin-top:14px">Lanjut ke Pembayaran</button>
          <a class="btn btn-ghost btn-block" href="/search" style="margin-top:10px">Lanjut Belanja</a>
        </div>
      </aside>
    </div>`;

  wire();
}

function wire() {
  root.querySelectorAll('.cart-row').forEach((row) => {
    const id = row.dataset.id;
    const input = row.querySelector('[data-qty]');
    const cur = () => parseInt(input.value, 10) || 1;

    row.querySelector('[data-act="dec"]').addEventListener('click', () => {
      setQty(id, Math.max(1, cur() - 1));
      render();
    });
    row.querySelector('[data-act="inc"]').addEventListener('click', () => {
      setQty(id, cur() + 1);
      render();
    });
    input.addEventListener('change', () => {
      const n = Math.max(1, parseInt(input.value, 10) || 1);
      setQty(id, n);
      render();
    });
    row.querySelector('[data-act="remove"]').addEventListener('click', () => {
      removeFromCart(id);
      toast('Produk dihapus dari keranjang', 'ok');
      render();
    });
  });

  root.querySelector('#to-checkout')?.addEventListener('click', () => {
    location.href = '/checkout';
  });
}

mountChrome().then(render);
