import { mountChrome, productImg, toast, icon, escapeHtml } from './ui.js';
import { api } from './api.js';
import { rupiah } from './format.js';
import { getCart, clearCart, rememberOrder, cacheOrder } from './store.js';

const root = document.getElementById('checkout-root');

const PAYMENTS = [
  { id: 'va_bca', icon: '🏦', title: 'Virtual Account BCA', sub: 'Bayar lewat m-banking / ATM' },
  { id: 'gopay', icon: '📱', title: 'GoPay / E-Wallet', sub: 'Saldo dompet digital' },
  { id: 'cod', icon: '💵', title: 'Bayar di Tempat (COD)', sub: 'Bayar tunai saat barang tiba' },
];

async function init() {
  await mountChrome();
  const items = getCart();
  if (items.length === 0) {
    location.replace('/cart');
    return;
  }

  let priced;
  try {
    priced = await api.priceCart(items);
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><p>${escapeHtml(err.message)}</p></div>`;
    return;
  }

  render(priced);
}

function field(id, label, opts = {}) {
  const { type = 'text', ph = '', req = true, full = true } = opts;
  return `
    <div class="field" data-field="${id}" ${full ? '' : 'style="margin:0"'}>
      <label for="${id}">${label}${req ? '' : ' <span class="muted">(opsional)</span>'}</label>
      <input id="${id}" name="${id}" type="${type}" placeholder="${ph}" ${req ? 'data-req' : ''}>
      <div class="err">Wajib diisi</div>
    </div>`;
}

function render(priced) {
  const miniItems = priced.lines
    .map(
      (l) => `
    <div class="mini-item">
      <div class="thumb"><img src="${l.thumb || productImg(l.id, 100)}" alt="" onerror="this.onerror=null;this.src='${productImg(l.id, 100)}'"></div>
      <div style="flex:1">
        <div>${escapeHtml(l.title.slice(0, 40))}</div>
        <div class="q">${l.qty} &times; ${rupiah(l.price)}</div>
      </div>
      <div><b>${rupiah(l.lineTotal)}</b></div>
    </div>`
    )
    .join('');

  const payOpts = PAYMENTS.map(
    (p, i) => `
    <label class="pay-opt ${i === 0 ? 'sel' : ''}">
      <input type="radio" name="payment" value="${p.id}" ${i === 0 ? 'checked' : ''}>
      <span class="pi">${p.icon}</span>
      <span><span class="pt">${p.title}</span><br><span class="ps">${p.sub}</span></span>
    </label>`
  ).join('');

  root.innerHTML = `
  <div class="crumbs"><a href="/cart">Keranjang</a> &rsaquo; <span>Pembayaran</span></div>
  <h1 style="margin:6px 0 18px">Checkout</h1>
  <form id="checkout-form" class="checkout-layout" novalidate>
    <div>
      <div class="form-card">
        <h3>Alamat Pengiriman</h3>
        <p class="hint">Pastikan alamat lengkap supaya kurir gampang nemu.</p>
        ${field('name', 'Nama Penerima', { ph: 'Nama lengkap' })}
        <div class="field-row">
          ${field('email', 'Email', { type: 'email', ph: 'nama@email.com' })}
          ${field('phone', 'No. HP', { ph: '08xxxxxxxxxx' })}
        </div>
        ${field('address', 'Alamat Lengkap', { ph: 'Jalan, nomor rumah, RT/RW, patokan' })}
        <div class="field-row">
          ${field('city', 'Kota / Kabupaten', { ph: 'mis. Jakarta Selatan' })}
          ${field('postalCode', 'Kode Pos', { ph: '12345', req: false })}
        </div>
        ${field('note', 'Catatan untuk kurir', { ph: 'mis. titip ke satpam', req: false })}
      </div>

      <div class="form-card">
        <h3>Metode Pembayaran</h3>
        <p class="hint">Ini simulasi — tidak ada transaksi sungguhan yang diproses.</p>
        <div id="pay-list">${payOpts}</div>
      </div>
    </div>

    <aside>
      <div class="summary">
        <h3>Pesananmu</h3>
        <div class="mini-items">${miniItems}</div>
        <div class="sum-line"><span>Subtotal</span><span>${rupiah(priced.subtotal)}</span></div>
        <div class="sum-line"><span>Ongkir</span><span>${priced.shipping === 0 ? '<span class="free-tag">GRATIS</span>' : rupiah(priced.shipping)}</span></div>
        <div class="sum-line"><span>PPN 11%</span><span>${rupiah(priced.tax)}</span></div>
        <div class="sum-line total"><span>Total</span><span class="val">${rupiah(priced.total)}</span></div>
        <button type="submit" class="btn btn-primary btn-block btn-lg" id="place" style="margin-top:14px">
          ${icon('shield', 18)} Buat Pesanan
        </button>
        <p class="hint" style="text-align:center;margin:12px 0 0">
          Dengan memesan, kamu setuju dengan syarat Belantara.
        </p>
      </div>
    </aside>
  </form>`;

  wire();
}

function wire() {
  // highlight kartu pembayaran terpilih
  const payList = root.querySelector('#pay-list');
  payList.addEventListener('change', () => {
    payList.querySelectorAll('.pay-opt').forEach((o) =>
      o.classList.toggle('sel', o.querySelector('input').checked)
    );
  });

  const form = root.querySelector('#checkout-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validate(form)) {
      toast('Lengkapi dulu data yang wajib diisi', 'err');
      return;
    }

    const btn = root.querySelector('#place');
    btn.disabled = true;
    btn.textContent = 'Memproses…';

    const customer = collect(form);
    customer.payment = form.querySelector('input[name="payment"]:checked')?.value;

    try {
      const { order } = await api.placeOrder({ items: getCart(), customer });
      rememberOrder(order);
      cacheOrder(order);
      clearCart();
      location.href = `/order/${order.id}`;
    } catch (err) {
      toast(err.message || 'Gagal membuat pesanan', 'err');
      btn.disabled = false;
      btn.innerHTML = 'Buat Pesanan';
    }
  });

  // hapus tanda error begitu user mengetik
  form.querySelectorAll('input[data-req]').forEach((inp) =>
    inp.addEventListener('input', () => inp.closest('.field').classList.remove('invalid'))
  );
}

function validate(form) {
  let ok = true;
  form.querySelectorAll('input[data-req]').forEach((inp) => {
    const wrap = inp.closest('.field');
    const val = inp.value.trim();
    let valid = Boolean(val);
    if (valid && inp.type === 'email') valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(val);
    wrap.classList.toggle('invalid', !valid);
    if (!valid) ok = false;
  });
  return ok;
}

function collect(form) {
  const data = {};
  ['name', 'email', 'phone', 'address', 'city', 'postalCode', 'note'].forEach((k) => {
    data[k] = form.querySelector(`#${k}`)?.value.trim() || '';
  });
  return data;
}

init();
