import 'dotenv/config';
import { createRequire } from 'node:module';
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import { region, s3, s3Enabled, dynamo, dynamoEnabled } from '../src/config/aws.js';
import { putJson } from '../src/aws/s3.js';

/**
 * Sekali jalan untuk menyiapkan AWS:
 *   1. Upload katalog (src/data/catalog/products.json) -> Amazon S3.
 *   2. Buat tabel DynamoDB untuk pesanan kalau belum ada (on-demand, gratis-tier).
 *
 * Cara pakai:
 *   1. Isi .env: AWS_REGION, S3_BUCKET, DYNAMODB_ORDERS_TABLE, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
 *   2. npm run seed:aws
 */

const require = createRequire(import.meta.url);
const catalog = require('../src/data/catalog/products.json');

async function seedS3() {
  if (!s3Enabled) {
    console.log('• S3 dilewati (S3_BUCKET kosong).');
    return;
  }
  const res = await putJson(s3.catalogKey, catalog);
  console.log(`✓ Katalog di-upload ke s3://${res.bucket}/${res.key} (${catalog.products?.length || 0} produk).`);
}

async function seedDynamo() {
  if (!dynamoEnabled) {
    console.log('• DynamoDB dilewati (DYNAMODB_ORDERS_TABLE kosong).');
    return;
  }
  const client = new DynamoDBClient({ region });
  try {
    await client.send(new DescribeTableCommand({ TableName: dynamo.ordersTable }));
    console.log(`✓ Tabel DynamoDB "${dynamo.ordersTable}" sudah ada.`);
  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') throw err;
    await client.send(
      new CreateTableCommand({
        TableName: dynamo.ordersTable,
        BillingMode: 'PAY_PER_REQUEST', // on-demand, masuk Always-Free tier
        AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
        KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
      })
    );
    console.log(`✓ Tabel DynamoDB "${dynamo.ordersTable}" dibuat (PAY_PER_REQUEST).`);
  }
}

async function main() {
  console.log(`Seeding AWS (region ${region})...`);
  await seedS3();
  await seedDynamo();
  console.log('Selesai.');
}

main().catch((err) => {
  console.error('Gagal seeding AWS:', err.message);
  process.exit(1);
});
