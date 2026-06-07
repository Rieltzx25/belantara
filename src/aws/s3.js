import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3, s3Client } from '../config/aws.js';

/**
 * Adapter tipis untuk Amazon S3 (Layer 3 · Storage).
 * Dipakai menyimpan katalog produk, gambar, dan aset statis sebagai object.
 * Hanya dipanggil saat s3Enabled = true (S3_BUCKET diisi).
 */

export async function getJson(key) {
  const res = await s3Client().send(
    new GetObjectCommand({ Bucket: s3.bucket, Key: key })
  );
  return JSON.parse(await res.Body.transformToString());
}

export async function putJson(key, value) {
  await s3Client().send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: key,
      Body: JSON.stringify(value, null, 2),
      ContentType: 'application/json',
    })
  );
  return { bucket: s3.bucket, key };
}

export async function putObject(key, body, contentType = 'application/octet-stream') {
  await s3Client().send(
    new PutObjectCommand({ Bucket: s3.bucket, Key: key, Body: body, ContentType: contentType })
  );
  return { bucket: s3.bucket, key };
}
