// Pembungkus fetch supaya pemanggilan API ringkas dan penanganan
// error-nya seragam. Semua endpoint balikannya JSON.

async function handle(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* biarkan null kalau bukan JSON */
  }
  if (!res.ok) {
    const msg = body?.error || `Permintaan gagal (${res.status})`;
    throw new Error(msg);
  }
  return body;
}

export function getJSON(url) {
  return fetch(url, { headers: { Accept: 'application/json' } }).then(handle);
}

export function postJSON(url, data) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  }).then(handle);
}

export const api = {
  products: (qs = '') => getJSON('/api/products' + (qs ? `?${qs}` : '')),
  product: (id) => getJSON(`/api/products/${encodeURIComponent(id)}`),
  categories: () => getJSON('/api/categories'),
  deals: () => getJSON('/api/deals'),
  bestsellers: () => getJSON('/api/bestsellers'),
  priceCart: (items) => postJSON('/api/cart/price', { items }),
  placeOrder: (payload) => postJSON('/api/orders', payload),
  order: (id) => getJSON(`/api/orders/${encodeURIComponent(id)}`),
};
