# Belantara — Marketplace Online (Arsitektur Hybrid)

Proyek akhir mata kuliah **Big Data Infrastructure Technology**.

Belantara ("rimba" dalam bahasa Indonesia — paralel dengan *Amazon* si hutan
hujan) adalah marketplace online ala Amazon: katalog produk lintas kategori,
pencarian + filter, keranjang, checkout, sampai pelacakan pesanan. Aplikasinya
**benar-benar berjalan** dan bisa dipakai siapa saja secara online.

Repo ini berisi dua hal yang diminta tugas:

1. **Blueprint arsitektur** — `docs/blueprint-belantara.drawio` (draw.io) + penjelasan di `docs/ARCHITECTURE.md`. Versi visual juga ada langsung di website pada halaman **`/arsitektur`**.
2. **Aplikasi nyata** — seluruh kode di repo ini.

---

## Arsitektur singkat — hybrid, hemat biaya

Blueprint lama menaruh belasan layanan berbayar di AWS. Versi ini
**menyusutkan AWS jadi hanya VPC + 1 EC2**, dan memindahkan sisanya ke
**jaringan lokal (On-Premise)** berbasis software gratis/open-source.

| # | Layanan inti | Peran | Menggantikan |
|---|---|---|---|
| ① | **Nginx** | Reverse proxy: cache statis (CDN), load balancing, TLS | CloudFront + ALB |
| ② | **Amazon EC2** | Compute Node.js/Express (satu-satunya di AWS) | — |
| ③ | **PostgreSQL/MySQL** (Master-Slave) | Database + replikasi | RDS Multi-AZ |
| ④ | **Redis** | Cache query & sesi | ElastiCache |
| ⑤ | **NFS Cluster** | Shared folder antar-server (LAN) | EFS |
| ⑥ | **NAS / Storage** | Aset, gambar, arsip order (SFTP/FTP) | S3 |

Pendukung: **DNS** (registrar/BIND9, ganti Route 53), **ModSecurity + UFW/iptables**
(keamanan perimeter), **VPC** (primitif jaringan gratis), **VPN** (sambung EC2 ↔ on-premise).

> Detail lengkap + alur end-to-end: lihat [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Menjalankan secara lokal

```bash
npm install
copy .env.example .env      # Windows  (atau: cp .env.example .env)
npm start
```

Buka **http://localhost:3000**. Selesai — 39 produk langsung termuat, semua fitur
jalan (cari, filter, keranjang, checkout, riwayat pesanan). Tidak perlu akun
cloud, database, atau kredensial apa pun: secara default katalog dibaca dari
berkas bundel dan order disimpan di `src/data/`.

> Butuh Node.js 18+ (diuji di Node 22).

---

## Deploy ke Vercel (demo publik gratis)

Supaya website bisa dipakai siapa saja **tanpa menyalakan server di laptop**,
aplikasi di-deploy ke **Vercel** (serverless) — ini menggantikan peran EC2 untuk
demo. Konfigurasinya sudah disiapkan:

- `api/index.js` — meng-ekspor app Express sebagai Serverless Function.
- `vercel.json` — me-*rewrite* semua path ke fungsi tersebut.
- `server.js` — otomatis **tidak** memanggil `app.listen` saat di serverless.

**Cara deploy (lewat GitHub — paling mulus):**

```bash
git init && git add . && git commit -m "Belantara hybrid"
# buat repo kosong di GitHub, lalu:
git remote add origin https://github.com/<user>/belantara.git
git branch -M main && git push -u origin main
```

Lalu di [vercel.com](https://vercel.com): **Add New → Project → Import** repo itu →
**Deploy**. Tidak ada env wajib; sekali klik langsung live.

**Atau lewat CLI:** `npm i -g vercel` → `vercel login` → `vercel --prod`.

### Menaikkan ke skala produksi (opsional)

Order pada demo serverless bersifat *ephemeral* (disimpan di memori + cache
browser). Untuk persisten sungguhan tanpa membebani laptop, arahkan ke layanan
free-tier lewat env — tanpa mengubah kode pemakainya:

```env
DATABASE_URL=postgres://...   # mis. Neon / Supabase  (pengganti PostgreSQL on-prem)
REDIS_URL=redis://...         # mis. Upstash          (pengganti Redis on-prem)
```

---

## Struktur proyek

```
belantara/
├── server.js                  # entry Express: middleware, routing, error handling
├── api/index.js               # entry serverless (Vercel) — re-export app
├── vercel.json                # rewrite semua request ke fungsi Express
├── package.json · .env.example
├── public/                    # frontend (vanilla JS, tanpa framework)
│   ├── index.html · search.html · product.html · cart.html
│   ├── checkout.html · order.html · account.html · sell.html
│   ├── arsitektur.html        # halaman penjelasan arsitektur (visual)
│   ├── css/styles.css
│   └── js/
│       ├── ui.js · store.js · api.js · format.js
│       ├── arsitektur.js      # render blueprint hybrid di website
│       └── home/search/product/cart/checkout/order/account/sell.js
├── src/
│   ├── config/runtime.js      # deteksi runtime (serverless?) + env layanan eksternal
│   ├── routes/                # products, orders, images (API)
│   ├── services/              # catalog, orders, storage (logika domain)
│   ├── lib/                   # generator gambar produk + peta foto
│   └── data/catalog/products.json
└── docs/
    ├── blueprint-belantara.drawio   # sumber diagram (draw.io)  ← utama
    ├── blueprint-belantara.eraser   # versi eraser.io
    └── ARCHITECTURE.md              # penjelasan blueprint + alur
```

---

## Cara kerja singkat

- **Katalog** dimuat sekali ke memori (`src/services/catalog.js`) — ini lapisan
  cache (peran ④ Redis) — lalu dipakai untuk listing, pencarian relevansi, filter,
  dan produk terkait.
- **Harga keranjang dihitung ulang di server** (`src/services/orders.js`) — angka
  dari browser tidak dipercaya; subtotal, ongkir, dan PPN 11% dihitung dari harga
  asli katalog supaya anti-manipulasi.
- **Gambar produk** memakai foto asli (Unsplash/loremflickr). Kalau gagal dimuat,
  jatuh ke gambar SVG bawaan (`/img/product/:id.svg`) — tidak pernah ada gambar rusak.
- **Pesanan** mendapat nomor seperti `BLT-7F3K9Q2A`. Di EC2/lokal ditulis sebagai
  berkas; di serverless disimpan di memori + di-cache di browser supaya halaman
  konfirmasi `/order/:id` selalu bisa menampilkannya.

---

## API

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/products?q=&category=&sort=&minPrice=&maxPrice=&minRating=&free=&page=` | Listing + pencarian + filter |
| GET | `/api/products/:id` | Detail + produk terkait |
| GET | `/api/categories` | Kategori + jumlah produk |
| GET | `/api/deals` · `/api/bestsellers` | Strip promo & terlaris |
| POST | `/api/cart/price` | Hitung ulang total keranjang (otoritatif) |
| POST | `/api/orders` | Buat pesanan |
| GET | `/api/orders/:id` | Ambil pesanan |
| GET | `/api/health` | Status & mode runtime |

---

## Catatan

Ini proyek akademik, bukan toko sungguhan. Metode pembayaran di checkout adalah
**simulasi** — tidak ada transaksi nyata yang diproses.
