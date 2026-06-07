import { Router } from 'express';
import {
  queryProducts,
  getProduct,
  getCategories,
  getRelated,
  getDeals,
  getBestsellers,
} from '../services/catalog.js';

const router = Router();

const toNum = (v) => (v == null || v === '' ? undefined : Number(v));

// GET /api/products  -> listing + pencarian + filter
router.get('/products', async (req, res, next) => {
  try {
    const { q, category, sort, minPrice, maxPrice, minRating, free, page } = req.query;
    const data = await queryProducts({
      q,
      category,
      sort,
      minPrice: toNum(minPrice),
      maxPrice: toNum(maxPrice),
      minRating: toNum(minRating),
      freeShipping: free === '1' || free === 'true',
      page: Math.max(1, Number(page) || 1),
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:id  -> detail + produk terkait
router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });
    const related = await getRelated(product);
    res.json({ product, related });
  } catch (err) {
    next(err);
  }
});

// GET /api/categories
router.get('/categories', async (_req, res, next) => {
  try {
    res.json({ categories: await getCategories() });
  } catch (err) {
    next(err);
  }
});

// GET /api/deals  -> diskon terbesar untuk strip "Flash Sale"
router.get('/deals', async (_req, res, next) => {
  try {
    res.json({ items: await getDeals() });
  } catch (err) {
    next(err);
  }
});

// GET /api/bestsellers
router.get('/bestsellers', async (_req, res, next) => {
  try {
    res.json({ items: await getBestsellers() });
  } catch (err) {
    next(err);
  }
});

export default router;
