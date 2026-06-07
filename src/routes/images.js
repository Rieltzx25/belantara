import { Router } from 'express';
import { getProduct } from '../services/catalog.js';
import { renderProductSVG } from '../lib/productImage.js';

const router = Router();

// GET /img/product/:id.svg
// Membuat gambar produk on-the-fly sebagai SVG, jadi demo tidak perlu
// menyimpan file biner. Di blueprint, gambar asli dilayani dari ⑥ NAS
// (via SFTP) dan di-cache oleh ① Nginx (peran CDN).
router.get('/product/:id.svg', async (req, res, next) => {
  try {
    const product = await getProduct(req.params.id);
    if (!product) return res.status(404).end();
    const size = Math.min(960, Math.max(120, Number(req.query.s) || 480));
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(renderProductSVG(product, { size }));
  } catch (err) {
    next(err);
  }
});

export default router;
