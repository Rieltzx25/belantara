import crypto from 'node:crypto';
import { saveOrder, loadOrder } from './storage.js';
import { getProduct } from './catalog.js';

const SHIPPING_FLAT = 15000; // ongkir datar kalau ada item non-gratis-ongkir
const TAX_RATE = 0.11; // PPN 11%

/**
 * Bikin nomor pesanan yang enak dibaca manusia, mis. BLT-7F3K9Q2A.
 * crypto.randomBytes biar tidak gampang ditebak/bentrok.
 */
function newOrderId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa I,O,0,1 biar tak ambigu
  const bytes = crypto.randomBytes(8);
  let id = '';
  for (const b of bytes) id += alphabet[b % alphabet.length];
  return `BLT-${id}`;
}

/**
 * Hitung ulang harga di sisi server. JANGAN pernah percaya total
 * yang dikirim browser — ambil harga asli dari katalog.
 */
export async function priceCart(rawItems = []) {
  const lines = [];
  let subtotal = 0;
  let hasPaidShipping = false;

  for (const raw of rawItems) {
    const product = await getProduct(raw.id);
    if (!product) continue; // produk sudah hilang dari katalog -> lewati

    const qty = clampQty(raw.qty, product.stock);
    if (qty <= 0) continue;

    const lineTotal = product.price * qty;
    subtotal += lineTotal;
    if (!product.freeShipping) hasPaidShipping = true;

    lines.push({
      id: product.id,
      title: product.title,
      price: product.price,
      qty,
      lineTotal,
      freeShipping: product.freeShipping,
      seller: product.seller?.name,
      thumb: product.thumb || null,
    });
  }

  const shipping = hasPaidShipping ? SHIPPING_FLAT : 0;
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + shipping + tax;

  return { lines, subtotal, shipping, tax, total, itemCount: lines.reduce((n, l) => n + l.qty, 0) };
}

function clampQty(qty, stock) {
  const n = Math.floor(Number(qty) || 0);
  if (n < 0) return 0;
  if (stock != null) return Math.min(n, stock);
  return n;
}

export async function placeOrder({ items, customer }) {
  const priced = await priceCart(items);
  if (priced.lines.length === 0) {
    const err = new Error('Keranjang kosong atau semua produk tidak tersedia.');
    err.statusCode = 400;
    throw err;
  }

  const order = {
    id: newOrderId(),
    status: 'PLACED',
    createdAt: new Date().toISOString(),
    customer: sanitizeCustomer(customer),
    ...priced,
    payment: { method: customer?.payment || 'va_bca', status: 'PENDING' },
  };

  const where = await saveOrder(order.id, order);

  return { order, storage: where };
}

export async function getOrder(id) {
  // hanya terima format id yang kita buat sendiri, biar tak dipakai
  // untuk mengintip berkas/baris sembarangan
  if (!/^BLT-[A-Z2-9]{8}$/.test(id)) return null;
  return loadOrder(id);
}

function sanitizeCustomer(c = {}) {
  const pick = (v, max = 120) => String(v || '').trim().slice(0, max);
  return {
    name: pick(c.name),
    email: pick(c.email),
    phone: pick(c.phone, 20),
    address: pick(c.address, 300),
    city: pick(c.city),
    postalCode: pick(c.postalCode, 10),
    note: pick(c.note, 300),
  };
}
