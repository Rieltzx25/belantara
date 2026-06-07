import 'dotenv/config';
import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import path from 'node:path';

import productRoutes from './src/routes/products.js';
import orderRoutes from './src/routes/orders.js';
import imageRoutes from './src/routes/images.js';
import { describeMode, isServerless } from './src/config/aws.js';
import { loadCatalog } from './src/services/catalog.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '256kb' }));

// --- API ---
app.use('/api', productRoutes);
app.use('/api', orderRoutes);
app.use('/img', imageRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    runtime: isServerless ? 'serverless' : 'node',
    mode: describeMode(),
    time: new Date().toISOString(),
  });
});

// --- Aset statis (css, js, gambar) ---
// process.cwd() = root proyek di lokal maupun serverless (/var/task) —
// tahan banting kalau bundler memindah berkas (__dirname bisa bergeser).
const publicDir = path.join(process.cwd(), 'public');
// maxAge 0 + etag: browser selalu revalidasi, jadi perubahan css/js langsung kebaca.
app.use(express.static(publicDir, { extensions: ['html'], maxAge: 0, etag: true }));

// --- URL halaman yang "bersih" -> dipetakan ke berkas HTML ---
const pages = {
  '/': 'index.html',
  '/search': 'search.html',
  '/category': 'search.html', // listing & search berbagi satu halaman
  '/product': 'product.html',
  '/cart': 'cart.html',
  '/checkout': 'checkout.html',
  '/order': 'order.html',
  '/account': 'account.html',
  '/sell': 'sell.html',
  '/arsitektur': 'arsitektur.html',
};
for (const [route, file] of Object.entries(pages)) {
  app.get(route, (_req, res) => res.sendFile(path.join(publicDir, file)));
}
// /product/elc-001 -> product.html (id dibaca dari query oleh JS)
app.get('/product/:id', (_req, res) =>
  res.sendFile(path.join(publicDir, 'product.html'))
);
app.get('/order/:id', (_req, res) =>
  res.sendFile(path.join(publicDir, 'order.html'))
);

// 404 untuk path API yang tak dikenal
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ada' }));

// Penangan error terpusat
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: status === 500 ? 'Terjadi kesalahan di server' : err.message,
  });
});

// Panaskan cache katalog sebelum menerima trafik supaya request pertama
// tidak kena latensi muat. Sekaligus jadi pengecekan dini kalau data rusak.
async function start() {
  try {
    const { products } = await loadCatalog();
    console.log(`\n  Belantara siap.`);
    console.log(`  ${describeMode()}`);
    console.log(`  ${products.length} produk dimuat.`);
    app.listen(PORT, () => {
      console.log(`  Buka  ->  http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('\n  Gagal memuat katalog:', err.message);
    process.exit(1);
  }
}

// Di serverless (Vercel) kita TIDAK memanggil app.listen — platform yang
// mengurus port; app cukup diekspor sebagai handler (lihat api/index.js).
// Saat dijalankan biasa (`node server.js` di EC2/lokal), nyalakan server.
if (!isServerless) start();

export default app;
