import { mountChrome, toast, icon } from './ui.js';

await mountChrome();

const perks = [
  ['truck', 'Jangkau Jutaan Pembeli', 'Produkmu langsung tampil di etalase Belantara dan mesin pencarinya.'],
  ['shield', 'Pembayaran Aman', 'Dana ditahan sampai pembeli menerima barang. Aman buat dua belah pihak.'],
  ['cart', 'Kelola dari Satu Dasbor', 'Pesanan, stok, dan pengiriman diatur dari satu tempat yang rapi.'],
  ['user', 'Tanpa Biaya Pendaftaran', 'Buka toko gratis. Komisi cuma diambil saat produkmu laku.'],
];

document.getElementById('perks').innerHTML = perks
  .map(
    ([ic, h, p]) => `
  <div class="perk">
    <div class="pico" style="color:var(--brand)">${icon(ic, 30)}</div>
    <h3>${h}</h3>
    <p>${p}</p>
  </div>`
  )
  .join('');

const form = document.getElementById('seller-form');
form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const shop = form.querySelector('#shop').value.trim();
  if (!shop) {
    toast('Isi nama toko dulu ya', 'err');
    return;
  }
  toast(`Toko "${shop}" siap dibuat! (demo) Tim kami akan menghubungimu.`, 'ok', { timeout: 4200 });
  form.reset();
});
