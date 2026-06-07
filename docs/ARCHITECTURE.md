# Arsitektur Belantara di AWS — 15 layanan, 4 layer

Belantara dirancang sebagai aplikasi **AWS-native** bertopologi lengkap. Total
**15 layanan AWS** tersusun dalam **4 layer**. Komponen jaringan (VPC, subnet,
Internet Gateway, Availability Zone) adalah infrastruktur bawaan VPC — bukan
dihitung sebagai layanan.

Sumber diagram: [`blueprint-belantara.drawio`](blueprint-belantara.drawio) (buka di
[app.diagrams.net](https://app.diagrams.net)). Versi visual interaktif juga ada di
website pada halaman **`/arsitektur`**.

## 15 layanan (per layer)

| Layer | Layanan | Peran |
|---|---|---|
| **1 · Edge & Security** | **Amazon Route 53** | DNS / routing domain |
| | **Amazon CloudFront** | CDN, cache global, TLS |
| | **AWS WAF** | firewall aplikasi (SQLi/XSS) di edge |
| | **Amazon Cognito** | login pembeli & seller |
| **2 · Compute** | **Application Load Balancer** | bagi trafik antar instance |
| | **Amazon EC2 + Auto Scaling** | host Node.js/Express, multi-AZ |
| **3 · Data & Storage** | **Amazon RDS (Multi-AZ)** | database relasional + standby |
| | **Amazon ElastiCache** | cache query / sesi |
| | **Amazon DynamoDB** | pesanan & cart (NoSQL) |
| | **Amazon S3** | katalog, gambar, aset |
| | **Amazon EFS** | shared file antar-instance |
| **4 · Data Lake & Analytics** | **Kinesis Data Firehose** | aliran event order/klik |
| | **Amazon S3 (Data Lake)** | gudang data mentah |
| | **AWS Glue** | ETL + Data Catalog |
| | **Amazon Athena** | query SQL ke data lake |
| | **Amazon QuickSight** | dashboard BI |

Infrastruktur jaringan (bukan "layanan"): **VPC 10.0.0.0/16**, **2 Availability Zone**,
**Public/Private Subnet**, **Internet Gateway**, **NAT Gateway**.

## Alur kerja end-to-end

1. **Route 53** meresolusi domain → request ke **CloudFront** (CDN, aset dari cache).
2. **AWS WAF** menyaring serangan di edge; **Cognito** mengurus login.
3. **ALB** membagi trafik ke **EC2** (Auto Scaling) di **2 AZ** — tahan jika satu AZ tumbang.
4. **EC2** (Node.js) baca katalog dari **S3**, baca/tulis pesanan ke **DynamoDB**, query ke **RDS**, cache di **ElastiCache**.
5. Berkas bersama via **EFS**; **RDS** replikasi ke standby (Multi-AZ).
6. Event (order, view) dikirim ke **Kinesis Firehose** → **S3 Data Lake**.
7. **Glue** meng-ETL, **Athena** query SQL, **QuickSight** menampilkan dashboard.

## Integrasi AWS di kode (gratis)

Dua layanan free-tier **diintegrasikan penuh di kode** (AWS SDK asli, bukan stub) dan
aktif otomatis begitu kredensial AWS diisi; sisanya tetap di blueprint sebagai desain target.

| Service | Status | Realisasi di kode |
|---|---|---|
| **Amazon S3** | ✅ terintegrasi — aktif saat env diisi (free tier) | `src/aws/s3.js` — baca katalog dari bucket (`S3_CATALOG_KEY`) |
| **Amazon DynamoDB** | ✅ terintegrasi — aktif saat env diisi (always-free) | `src/aws/dynamo.js` — simpan/baca pesanan (tabel `DYNAMODB_ORDERS_TABLE`) |
| EC2 / Vercel | runtime | `server.js` (+ `api/index.js` utk serverless) |
| RDS, ElastiCache, EFS, Route53, CloudFront, WAF, Cognito, ALB, Kinesis, Glue, Athena, QuickSight | blueprint | infra/IaC — sebagian berbayar, belum diaktifkan |

### Pola "AWS dulu, fallback aman"
`src/services/storage.js` memilih sumber data otomatis:
- **Katalog**: dari **S3** kalau `S3_BUCKET` diisi; kalau tidak → berkas bundel `src/data`.
- **Pesanan**: ke **DynamoDB** kalau `DYNAMODB_ORDERS_TABLE` diisi; kalau tidak → berkas lokal (EC2) / memori (serverless).

Jadi demo publik (di Vercel, tanpa env AWS) tetap jalan; begitu env diisi + `npm run seed:aws`,
S3 & DynamoDB langsung aktif tanpa mengubah kode.

| Komponen kode | Berkas |
|---|---|
| Konfigurasi & klien AWS (lazy, IAM-role ready) | `src/config/aws.js` |
| Adapter S3 / DynamoDB | `src/aws/s3.js`, `src/aws/dynamo.js` |
| Pemilih sumber data + fallback | `src/services/storage.js` |
| Seed (upload katalog ke S3 + buat tabel DynamoDB) | `scripts/seed-aws.js` |

## Gratis vs berbayar (free tier)

- **Always-free / free tier:** S3, DynamoDB, Cognito, CloudFront, Lambda.
- **Gratis 12 bulan (akun baru):** EC2, RDS, ElastiCache, EFS, ALB.
- **Berbayar (belum diaktifkan):** NAT Gateway, Route 53, AWS WAF, Kinesis Firehose, Glue ETL, Athena, QuickSight.

## File blueprint

| File | Tool |
|---|---|
| `blueprint-belantara.drawio` | draw.io / diagrams.net (ikon AWS resmi) |
| `blueprint-belantara.eraser` | eraser.io (diagram-as-code) |
