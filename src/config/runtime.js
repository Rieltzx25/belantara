/**
 * Satu sumber kebenaran soal "di mana Belantara sedang berjalan" dan
 * "ke mana data disimpan". Menggantikan konfigurasi AWS S3 yang lama.
 *
 * Arsitektur baru = hybrid:
 *   - Compute  : Amazon EC2 (atau, untuk demo publik, serverless Vercel).
 *   - Data tier: PostgreSQL/MySQL (master-slave) + Redis  -> on-premise.
 *   - Storage  : NFS (shared folder) + NAS/SFTP (object)  -> on-premise.
 *
 * Supaya website tetap bisa dipakai siapa pun TANPA membebani laptop
 * dan TANPA wajib menyalakan server lokal, kode ini dibuat "dua mode":
 *
 *   1. MODE MANDIRI (default) — tidak butuh kredensial apa pun.
 *      Katalog dibaca dari berkas yang ikut ter-deploy (src/data),
 *      order disimpan sementara di memori proses (aman untuk serverless).
 *      Inilah yang jalan begitu di-deploy ke Vercel.
 *
 *   2. MODE EKSTERNAL (opsional) — kalau env diisi, adapter tinggal
 *      diarahkan ke layanan luar gratisan supaya beban lepas dari laptop:
 *        DATABASE_URL  -> PostgreSQL terkelola (mis. Neon / Supabase)
 *        REDIS_URL     -> Redis terkelola (mis. Upstash)
 *      (Hook-nya disiapkan di storage.js; implementasi driver menyusul
 *       saat kredensial tersedia — tidak mengubah kode pemakainya.)
 */

// Vercel menandai lingkungannya lewat env VERCEL=1. Di situ filesystem
// bersifat read-only kecuali /tmp, jadi order tidak boleh ditulis ke repo.
export const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// Alamat layanan eksternal (opsional). Kosong = pakai mode mandiri.
export const databaseUrl = process.env.DATABASE_URL?.trim() || null;
export const redisUrl = process.env.REDIS_URL?.trim() || null;

// "Kunci" logis data — dipakai lapisan storage untuk memetakan ke
// tabel/berkas/objek, persis seperti dulu memetakan ke key di S3.
export const dataKeys = {
  catalog: 'catalog/products.json',
  ordersPrefix: 'orders/',
};

export function describeMode() {
  const where = isServerless ? 'serverless (Vercel)' : 'EC2 / lokal';
  const db = databaseUrl ? 'PostgreSQL eksternal' : 'katalog bundel (read-only)';
  const orders = isServerless ? 'memori proses (ephemeral)' : 'berkas lokal src/data';
  return `Runtime ${where}  ·  data: ${db}  ·  order: ${orders}`;
}
