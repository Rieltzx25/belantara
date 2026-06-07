import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Satu sumber kebenaran untuk integrasi AWS.
 *
 * Belantara dirancang AWS-native (lihat blueprint 15 layanan), tapi dibuat
 * "dua mode" supaya demo publik tetap jalan tanpa biaya:
 *
 *   - Layanan GRATIS yang benar-benar disambung = Amazon S3 + Amazon DynamoDB.
 *     Keduanya diakses lewat endpoint publik AWS + kredensial IAM (tanpa VPC),
 *     jadi cocok dijalankan dari serverless (Vercel) maupun EC2.
 *   - Kalau env-nya KOSONG, otomatis fallback ke berkas bundel / memori,
 *     sehingga website tetap hidup tanpa akun AWS.
 *
 * Kredensial: kalau AWS_ACCESS_KEY_ID/SECRET diisi, dipakai; selain itu SDK
 * mencari sendiri (IAM Role saat di EC2/Lambda) — praktik yang disarankan AWS.
 */

export const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

export const region = process.env.AWS_REGION || 'ap-southeast-1';

const explicitCreds =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

export const s3 = {
  bucket: process.env.S3_BUCKET?.trim() || null,
  catalogKey: process.env.S3_CATALOG_KEY || 'catalog/products.json',
  assetPrefix: process.env.S3_ASSET_PREFIX || 'images/',
};

export const dynamo = {
  ordersTable: process.env.DYNAMODB_ORDERS_TABLE?.trim() || null,
};

export const s3Enabled = Boolean(s3.bucket);
export const dynamoEnabled = Boolean(dynamo.ordersTable);

// Klien dibuat malas (lazy) — hanya saat layanannya benar-benar dipakai,
// jadi mode fallback tidak pernah menyentuh jaringan AWS.
let _s3Client;
export function s3Client() {
  if (!_s3Client) _s3Client = new S3Client({ region, credentials: explicitCreds });
  return _s3Client;
}

let _ddbDoc;
export function ddbDoc() {
  if (!_ddbDoc) {
    _ddbDoc = DynamoDBDocumentClient.from(
      new DynamoDBClient({ region, credentials: explicitCreds }),
      { marshallOptions: { removeUndefinedValues: true } }
    );
  }
  return _ddbDoc;
}

export function describeMode() {
  const where = isServerless ? 'serverless' : 'node/EC2';
  const svc = [
    s3Enabled ? `S3:${s3.bucket}` : 'S3:fallback-bundel',
    dynamoEnabled ? `DynamoDB:${dynamo.ordersTable}` : 'DynamoDB:fallback-lokal',
  ].join('  ·  ');
  return `${where}  ·  ${svc}  ·  region ${region}`;
}
