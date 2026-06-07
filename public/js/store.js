// State sisi-klien yang perlu bertahan antar halaman: keranjang,
// riwayat pesanan (referensi ringkas), dan produk terakhir dilihat.
// Semua disimpan di localStorage. Tiap perubahan keranjang memancarkan
// event "cart:change" supaya badge di header ikut update tanpa reload.

const CART_KEY = 'belantara.cart';
const ORDERS_KEY = 'belantara.orders';
const ORDER_DATA_KEY = 'belantara.orderdata';
const RECENT_KEY = 'belantara.recent';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ----------------------------- Keranjang ----------------------------- */
export function getCart() {
  return read(CART_KEY, []);
}

function saveCart(items) {
  write(CART_KEY, items);
  window.dispatchEvent(new CustomEvent('cart:change', { detail: { items } }));
}

export function cartCount() {
  return getCart().reduce((n, i) => n + i.qty, 0);
}

export function addToCart(id, qty = 1) {
  const items = getCart();
  const existing = items.find((i) => i.id === id);
  if (existing) existing.qty += qty;
  else items.push({ id, qty });
  saveCart(items);
  return cartCount();
}

export function setQty(id, qty) {
  let items = getCart();
  if (qty <= 0) {
    items = items.filter((i) => i.id !== id);
  } else {
    const it = items.find((i) => i.id === id);
    if (it) it.qty = qty;
  }
  saveCart(items);
}

export function removeFromCart(id) {
  saveCart(getCart().filter((i) => i.id !== id));
}

export function clearCart() {
  saveCart([]);
}

/* ----------------------------- Pesanan ----------------------------- */
export function rememberOrder(order) {
  const list = read(ORDERS_KEY, []);
  list.unshift({
    id: order.id,
    total: order.total,
    itemCount: order.itemCount,
    status: order.status,
    createdAt: order.createdAt,
    firstTitle: order.lines?.[0]?.title || '',
    lineCount: order.lines?.length || 0,
  });
  write(ORDERS_KEY, list.slice(0, 30));
}

export function getOrders() {
  return read(ORDERS_KEY, []);
}

/* Simpan SALINAN PENUH order di sisi klien. Di deploy serverless (Vercel),
 * order yang baru dibuat tersimpan di memori instance yang bisa beda dengan
 * instance yang melayani halaman konfirmasi. Salinan ini membuat halaman
 * /order/:id selalu bisa menampilkan detail, dengan API sebagai cadangan. */
export function cacheOrder(order) {
  const map = read(ORDER_DATA_KEY, {});
  map[order.id] = order;
  // batasi 10 order terakhir biar localStorage tidak membengkak
  const ids = Object.keys(map);
  if (ids.length > 10) delete map[ids[0]];
  write(ORDER_DATA_KEY, map);
}

export function getCachedOrder(id) {
  return read(ORDER_DATA_KEY, {})[id] || null;
}

/* ----------------------------- Terakhir dilihat ----------------------------- */
export function pushRecent(id) {
  let list = read(RECENT_KEY, []).filter((x) => x !== id);
  list.unshift(id);
  write(RECENT_KEY, list.slice(0, 12));
}

export function getRecent() {
  return read(RECENT_KEY, []);
}
