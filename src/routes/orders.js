import { Router } from 'express';
import { priceCart, placeOrder, getOrder } from '../services/orders.js';

const router = Router();

// POST /api/cart/price  -> server menghitung ulang total keranjang
// Dipakai halaman cart supaya angka yang tampil selalu otoritatif (anti utak-atik).
router.post('/cart/price', async (req, res, next) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    res.json(await priceCart(items));
  } catch (err) {
    next(err);
  }
});

// POST /api/orders  -> buat pesanan
router.post('/orders', async (req, res, next) => {
  try {
    const { items, customer } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Keranjang kosong.' });
    }
    const missing = ['name', 'email', 'address', 'city'].filter(
      (f) => !customer?.[f]?.trim()
    );
    if (missing.length) {
      return res
        .status(400)
        .json({ error: `Lengkapi data pengiriman: ${missing.join(', ')}` });
    }

    const { order } = await placeOrder({ items, customer });
    res.status(201).json({ order });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message });
    next(err);
  }
});

// GET /api/orders/:id  -> halaman konfirmasi / lacak pesanan
router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
    res.json({ order });
  } catch (err) {
    next(err);
  }
});

export default router;
