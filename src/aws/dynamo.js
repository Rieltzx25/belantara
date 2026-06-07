import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, ddbDoc } from '../config/aws.js';

/**
 * Adapter tipis untuk Amazon DynamoDB (Layer 3 · Data).
 * Menyimpan pesanan sebagai item (partition key = id pesanan, mis. BLT-XXXX).
 * Hanya dipanggil saat dynamoEnabled = true (DYNAMODB_ORDERS_TABLE diisi).
 *
 * DynamoDB punya Always-Free tier (25 GB) — cukup untuk proyek ini tanpa biaya.
 */

export async function putOrder(order) {
  await ddbDoc().send(
    new PutCommand({ TableName: dynamo.ordersTable, Item: order })
  );
  return { table: dynamo.ordersTable, id: order.id };
}

export async function getOrderItem(id) {
  const res = await ddbDoc().send(
    new GetCommand({ TableName: dynamo.ordersTable, Key: { id } })
  );
  return res.Item || null;
}
