import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isServerless, dataKeys } from '../config/runtime.js';

/**
 * Lapisan tipis penyimpanan. Dulu menempel ke Amazon S3; sekarang
 * mewakili Data + Storage tier on-premise (PostgreSQL/NAS/NFS), tapi
 * dengan implementasi default yang ringan supaya bisa jalan di mana saja:
 *
 *   - readCatalog()         : baca katalog produk (read-only, ikut bundle).
 *                             Di produksi -> ganti baca dari PostgreSQL replica.
 *   - saveOrder(id, order)  : simpan order. Lokal -> berkas src/data/orders.
 *                             Serverless -> memori proses (filesystem read-only).
 *                             Di produksi -> INSERT ke PostgreSQL master + arsip NAS.
 *   - loadOrder(id)         : ambil order kembali (memori dulu, baru berkas).
 *
 * Semua fungsi bekerja dengan objek JS biasa; urusan (de)serialisasi
 * ditangani di sini sekali saja.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.resolve(__dirname, '..', 'data');

// Penampung order untuk lingkungan serverless (filesystem read-only).
// Bertahan selama instance hangat — cukup untuk satu sesi checkout.
// Konfirmasi pesanan tetap andal karena klien juga menyimpan salinan
// di localStorage (lihat public/js/order.js).
const memOrders = new Map();

async function readJsonFile(relKey) {
  const file = path.join(dataRoot, relKey);
  const raw = await fs.readFile(file, 'utf-8');
  return JSON.parse(raw);
}

/** Katalog produk (mewakili baca dari DB replica / NAS). */
export async function readCatalog() {
  return readJsonFile(dataKeys.catalog);
}

/** Simpan satu order (mewakili tulis ke DB master + arsip ke NAS). */
export async function saveOrder(id, order) {
  if (isServerless) {
    memOrders.set(id, order);
    return { stored: 'memory', id };
  }
  const file = path.join(dataRoot, dataKeys.ordersPrefix, `${id}.json`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(order, null, 2), 'utf-8');
  return { stored: 'local', id, path: file };
}

/** Ambil order kembali. */
export async function loadOrder(id) {
  if (memOrders.has(id)) return memOrders.get(id);
  try {
    return await readJsonFile(`${dataKeys.ordersPrefix}${id}.json`);
  } catch {
    return null;
  }
}
