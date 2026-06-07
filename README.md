# Belantara — Marketplace Online di atas AWS

Proyek akhir mata kuliah **Big Data Infrastructure Technology**.

Belantara ("rimba" dalam bahasa Indonesia — paralel dengan *Amazon* si hutan
hujan) adalah marketplace online ala Amazon: katalog lintas kategori, pencarian +
filter, keranjang, checkout, sampai pelacakan pesanan. Aplikasinya **benar-benar
berjalan** dan **nyata memakai AWS** (Amazon S3 + DynamoDB, gratis).

Repo ini berisi dua hal yang diminta tugas:

1. **Blueprint arsitektur** — `docs/blueprint-belantara.drawio` (draw.io, ikon AWS resmi) + `docs/ARCHITECTURE.md`. Versi visual juga ada di website pada halaman **`/arsitektur`**.
2. **Aplikasi nyata** dengan integrasi AWS — seluruh kode di repo ini.

---

## Arsitektur — 15 layanan AWS, 4 layer

| Layer | Layanan |
|---|---|
| **1 · Edge & Security** | Amazon Route 53 · Amazon CloudFront · AWS WAF · Amazon Cognito |
| **2 · Compute** | Application Load Balancer · Amazon EC2 + Auto Scaling (multi-AZ) |
| **3 · Data & Storage** | Amazon RDS (Multi-AZ) · ElastiCache · **DynamoDB** · **S3** · EFS |
| **4 · Data Lake & Analytics** | Kinesis Data Firehose · S3 (Data Lake) · AWS Glue · Athena · QuickSight |

Jaringan (bukan "layanan"): VPC 10.0.0.0/16, 2 Availability Zone, public/private subnet, Internet Gateway, NAT Gateway.

> Detail + alur end-to-end: lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

### Yang benar-benar tersambung (gratis)
Supaya nyata memakai AWS tanpa biaya, dua layanan free-tier disambung penuh di kode:
- **Amazon S3** — katalog & gambar (free tier 5 GB).
- **Amazon DynamoDB** — pesanan & cart (Always-Free 25 GB).

Sisanya (EC2, RDS, NAT, WAF, Route 53, Kinesis, dst.) ada di blueprint sebagai
desain target — sebagian berbayar, jadi belum diaktifkan.

---

## Menjalankan secara lokal (mode demo, tanpa AWS)

```bash
npm install
copy .env.example .env      # Windows  (atau: cp .env.example .env)
npm start
```

Buka **http://localhost:3000**. 39 produk langsung termuat; semua fitur jalan.
Tanpa env AWS, katalog dibaca dari berkas bundel dan order disimpan lokal — jadi
bisa didemokan tanpa akun AWS.

> Butuh Node.js 18+ (diuji di Node 22).

---

## Menyambungkan ke AWS (S3 + DynamoDB, gratis)

1. Buat **bucket S3** (mis. `belantara-katalog`) dan siapkan nama **tabel DynamoDB** (mis. `belantara-orders`) di region `ap-southeast-1`.
2. Buat **IAM user** dengan izin minimal ke bucket + tabel itu, ambil Access Key.
3. Isi `.env`:

   ```env
   AWS_REGION=ap-southeast-1
   S3_BUCKET=belantara-katalog
   DYNAMODB_ORDERS_TABLE=belantara-orders
   AWS_ACCESS_KEY_ID=AKIA...
   AWS_SECRET_ACCESS_KEY=...
   ```

4. Seed sekali (upload katalog ke S3 + buat tabel DynamoDB on-demand):

   ```bash
   npm run seed:aws
   ```

5. `npm start`. Sekarang katalog dibaca dari **S3** dan setiap order disimpan ke **DynamoDB**.

> Saat dijalankan di **EC2/Lambda**, kosongkan Access Key dan pasang **IAM Role** —
> SDK mengambil kredensial otomatis (praktik yang disarankan AWS).

---

## Deploy ke Vercel (demo publik gratis)

Demo publik berjalan di **Vercel** (serverless) sebagai pengganti EC2 supaya bisa
dipakai siapa saja tanpa biaya. Konfigurasi sudah disiapkan: `api/index.js`
(handler), `vercel.json` (rewrite), dan `server.js` otomatis tidak `listen` saat serverless.

```bash
git push          # repo sudah ter-connect; atau import di vercel.com
```

Tanpa env, demo pakai data bundel. Untuk mengaktifkan S3 + DynamoDB di Vercel,
tambahkan env yang sama seperti di atas pada **Project Settings → Environment Variables**.

---

## Struktur proyek

```
belantara/
├── server.js                  # entry Express
├── api/index.js               # entry serverless (Vercel)
├── vercel.json
├── public/                    # frontend vanilla JS
│   ├── *.html (+ arsitektur.html)
│   ├── css/styles.css
│   └── js/ (ui, store, api, arsitektur, + per-halaman)
├── src/
│   ├── config/aws.js          # konfigurasi & klien AWS (lazy, IAM-role ready)
│   ├── aws/
│   │   ├── s3.js              # adapter Amazon S3
│   │   └── dynamo.js          # adapter Amazon DynamoDB
│   ├── routes/                # products, orders, images
│   ├── services/              # catalog, orders, storage (pemilih AWS/fallback)
│   ├── lib/                   # generator gambar produk
│   └── data/catalog/products.json
├── scripts/seed-aws.js        # upload katalog -> S3 + buat tabel DynamoDB
└── docs/
    ├── blueprint-belantara.drawio   # diagram 15 layanan (ikon AWS) ← utama
    ├── blueprint-belantara.eraser
    └── ARCHITECTURE.md
```

---

## API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/products?q=&category=&sort=&minPrice=&maxPrice=&minRating=&free=&page=` | Listing + pencarian + filter |
| GET | `/api/products/:id` | Detail + produk terkait |
| GET | `/api/categories` · `/api/deals` · `/api/bestsellers` | Kategori / promo / terlaris |
| POST | `/api/cart/price` | Hitung ulang total keranjang (otoritatif) |
| POST | `/api/orders` · GET `/api/orders/:id` | Buat / ambil pesanan |
| GET | `/api/health` | Status + layanan AWS aktif |

---

## Catatan

Proyek akademik, bukan toko sungguhan. Pembayaran di checkout adalah **simulasi**.
