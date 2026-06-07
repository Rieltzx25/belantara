import { readCatalog } from './storage.js';
import { photoUrl } from '../lib/productPhotos.js';

/**
 * Katalog produk. Dimuat sekali lalu disimpan di memori — ini berperan
 * sebagai lapisan cache (④ Redis di blueprint). Isinya jarang berubah,
 * jadi cache proses sudah cukup dan menghemat round-trip ke database.
 * Kalau nanti mau real-time tinggal taruh TTL atau invalidate lewat webhook.
 */

let cache = null;

export async function loadCatalog({ force = false } = {}) {
  if (cache && !force) return cache;
  const data = await readCatalog();
  cache = normalize(data);
  return cache;
}

function normalize(data) {
  const products = (data.products || []).map((p) => ({
    ...p,
    discount:
      p.listPrice && p.listPrice > p.price
        ? Math.round(((p.listPrice - p.price) / p.listPrice) * 100)
        : 0,
    image: photoUrl(p.id, 600),
    thumb: photoUrl(p.id, 400),
  }));

  const categories = data.categories || [];
  const byId = new Map(products.map((p) => [p.id, p]));

  return { products, categories, byId };
}

export async function getProduct(id) {
  const { byId } = await loadCatalog();
  return byId.get(id) || null;
}

export async function getCategories() {
  const { categories, products } = await loadCatalog();
  // tempel jumlah produk per kategori biar bisa ditampilkan di menu
  const counts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  return categories.map((c) => ({ ...c, count: counts[c.slug] || 0 }));
}

/**
 * Query serbaguna untuk halaman listing & hasil pencarian.
 * Mendukung: kata kunci, kategori, rentang harga, rating minimum,
 * "gratis ongkir", dan beberapa pilihan urutan.
 */
export async function queryProducts({
  q = '',
  category = '',
  sort = 'relevance',
  minPrice,
  maxPrice,
  minRating,
  freeShipping,
  page = 1,
  perPage = 24,
} = {}) {
  const { products } = await loadCatalog();
  const term = q.trim().toLowerCase();

  let result = products.filter((p) => {
    if (category && p.category !== category) return false;
    if (minPrice != null && p.price < minPrice) return false;
    if (maxPrice != null && p.price > maxPrice) return false;
    if (minRating != null && p.rating < minRating) return false;
    if (freeShipping && !p.freeShipping) return false;

    if (term) {
      const haystack = [
        p.title,
        p.brand,
        p.category,
        p.subcategory,
        ...(p.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    return true;
  });

  result = sortProducts(result, sort, term);

  const total = result.length;
  const start = (page - 1) * perPage;
  const items = result.slice(start, start + perPage);

  return {
    items,
    total,
    page,
    perPage,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

function sortProducts(list, sort, term) {
  const arr = [...list];
  switch (sort) {
    case 'price-asc':
      return arr.sort((a, b) => a.price - b.price);
    case 'price-desc':
      return arr.sort((a, b) => b.price - a.price);
    case 'rating':
      return arr.sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
    case 'newest':
      return arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'bestseller':
      return arr.sort((a, b) => (b.sold || 0) - (a.sold || 0));
    case 'relevance':
    default:
      // tanpa kata kunci, "relevansi" kita artikan sebagai produk paling laku
      if (!term) return arr.sort((a, b) => (b.sold || 0) - (a.sold || 0));
      return arr.sort(
        (a, b) => relevanceScore(b, term) - relevanceScore(a, term)
      );
  }
}

function relevanceScore(p, term) {
  let score = 0;
  const title = p.title.toLowerCase();
  if (title === term) score += 100;
  if (title.startsWith(term)) score += 50;
  if (title.includes(term)) score += 25;
  if ((p.brand || '').toLowerCase().includes(term)) score += 15;
  if ((p.tags || []).some((t) => t.toLowerCase().includes(term))) score += 10;
  // sedikit dorongan dari popularitas & rating
  score += Math.min(10, (p.sold || 0) / 1000);
  score += p.rating || 0;
  return score;
}

export async function getRelated(product, limit = 6) {
  const { products } = await loadCatalog();
  return products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .sort((a, b) => (b.sold || 0) - (a.sold || 0))
    .slice(0, limit);
}

export async function getDeals(limit = 12) {
  const { products } = await loadCatalog();
  return products
    .filter((p) => p.discount >= 15)
    .sort((a, b) => b.discount - a.discount)
    .slice(0, limit);
}

export async function getBestsellers(limit = 12) {
  const { products } = await loadCatalog();
  return [...products].sort((a, b) => (b.sold || 0) - (a.sold || 0)).slice(0, limit);
}
