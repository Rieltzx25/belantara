import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { isServerless, s3Enabled, s3 as s3cfg, dynamoEnabled } from '../config/aws.js';
import * as S3 from '../aws/s3.js';
import * as DDB from '../aws/dynamo.js';

/**
 * Lapisan penyimpanan dengan strategi "AWS dulu, fallback aman":
 *
 *   readCatalog()        S3 (s3Enabled) -> bundel JSON (selalu ada)
 *   saveOrder(id,order)  DynamoDB (dynamoEnabled) -> berkas lokal (EC2) / memori (serverless)
 *   loadOrder(id)        DynamoDB -> memori/berkas
 *
 * Tujuannya: kalau env AWS diisi, website BENERAN pakai S3 + DynamoDB; kalau
 * tidak, demo tetap jalan tanpa akun AWS.
 */

const require = createRequire(import.meta.url);
const bundledCatalog = require('../data/catalog/products.json');
const dataRoot = path.join(process.cwd(), 'src', 'data');

// Penampung order saat serverless tanpa DynamoDB (filesystem read-only).
const memOrders = new Map();

/** Katalog produk — dari S3 kalau aktif, kalau gagal/tidak aktif pakai bundel. */
export async function readCatalog() {
  if (s3Enabled) {
    try {
      return await S3.getJson(s3cfg.catalogKey);
    } catch (err) {
      console.warn(`[s3] gagal baca katalog (${err.message}); pakai bundel.`);
    }
  }
  return bundledCatalog;
}

/** Simpan pesanan — DynamoDB kalau aktif, kalau tidak ke memori/berkas. */
export async function saveOrder(id, order) {
  if (dynamoEnabled) {
    await DDB.putOrder(order);
    return { stored: 'dynamodb', id };
  }
  if (isServerless) {
    memOrders.set(id, order);
    return { stored: 'memory', id };
  }
  const file = path.join(dataRoot, 'orders', `${id}.json`);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(order, null, 2), 'utf-8');
  return { stored: 'local', id };
}

/** Ambil pesanan kembali. */
export async function loadOrder(id) {
  if (dynamoEnabled) {
    try {
      return await DDB.getOrderItem(id);
    } catch {
      return null;
    }
  }
  if (memOrders.has(id)) return memOrders.get(id);
  try {
    const raw = await fs.readFile(path.join(dataRoot, 'orders', `${id}.json`), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
