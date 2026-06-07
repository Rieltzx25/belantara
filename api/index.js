// Entry point serverless untuk Vercel.
//
// Vercel menjadikan setiap berkas di /api sebagai Serverless Function.
// vercel.json me-rewrite SEMUA path ke sini, lalu aplikasi Express kita
// (server.js) yang menangani routing-nya — persis seperti di EC2,
// hanya saja port-nya diurus platform (tidak ada app.listen).
import app from '../server.js';

export default app;
