# Arsitektur Belantara — Hybrid (AWS minimal + On-Premise)

Versi ini adalah **penyesuaian** dari blueprint lama yang serba-AWS. Kotak
"AWS Cloud" yang dulu gemuk (Route 53, CloudFront, NAT Gateway, ALB, Auto
Scaling, RDS, ElastiCache, EFS, S3) **disusutkan drastis** menjadi hanya
**VPC + satu EC2**. Semua beban lain — DNS, CDN/caching, keamanan gerbang,
database, cache, dan penyimpanan file — **ditarik ke jaringan lokal
(On-Premise)** memakai software gratis/open-source. Tujuannya: biaya cloud
mendekati nol, tapi topologi tetap lengkap dan website tetap bisa dipakai.

## Diagram

Sumber utama: [`blueprint-belantara.drawio`](blueprint-belantara.drawio) (buka di
[app.diagrams.net](https://app.diagrams.net) → **Open Existing Diagram**).
Versi eraser: [`blueprint-belantara.eraser`](blueprint-belantara.eraser).

```
                          ┌──────── On-Premise — Jaringan Lokal (LAN) ────────┐
                          │  Edge & Perimeter                                  │
  Pembeli ──1.resolve──▶ DNS │   UFW/iptables → ModSecurity(WAF) → ① Nginx     │        ┌─── AWS Cloud ───┐
  & Seller │              │       (firewall)      (WAF)        (RP·CDN·LB·TLS) │        │ VPC 10.0.0.0/16 │
           └──2.HTTPS────▶│                              │                     │        │  Public Subnet  │
                          │  Data Tier                   └──3.reverse proxy────┼──VPN──▶│ ② Amazon EC2    │
                          │   ③ PostgreSQL MASTER ◀─4.tulis────────────────────┼────────┤  Node.js/Express│
                          │   ③ PostgreSQL SLAVE  ◀─5.baca─────────────────────┼────────┤  (Public IP,    │
                          │       ▲ replikasi            ④ Redis ◀─6.cache─────┼────────┤   tanpa NAT GW) │
                          │  Storage Tier                                      │        └─────────────────┘
                          │   ⑤ NFS Cluster ◀─7.shared files───────────────────┼────────────┘  │
                          │   ⑥ NAS/Storage ◀─8.gambar & aset (SFTP)───────────┼───────────────┘
                          └────────────────────────────────────────────────────┘
```

## 6 layanan inti (self-host, gratis)

| # | Layanan | Peran | Menggantikan |
|---|---|---|---|
| ① | **Nginx** (Reverse Proxy) | Caching statis (peran CDN), load balancing, terminasi TLS | CloudFront + ALB |
| ② | **Amazon EC2** | Compute Node.js/Express — satu-satunya yang tersisa di AWS; Public IP langsung, tanpa NAT Gateway | (tetap) |
| ③ | **PostgreSQL / MySQL** Master-Slave | Database; tulis ke Master, baca dari Slave; replikasi manual | RDS Multi-AZ |
| ④ | **Redis** | Cache query & sesi | ElastiCache |
| ⑤ | **NFS Cluster** | Shared folder antar-server lewat LAN | EFS |
| ⑥ | **NAS / Storage Server** | Objek: aset katalog, gambar, arsip order; akses SFTP/FTP | S3 |

### Komponen pendukung (bukan "layanan inti")
- **DNS** — dari registrar (Niagahoster/IDWebhost) atau **BIND9** sendiri (ganti Route 53).
- **UFW/iptables** (firewall paket) + **ModSecurity** (WAF) — keamanan perimeter (ganti keamanan gerbang AWS).
- **VPC + Public Subnet** — primitif jaringan bawaan AWS (gratis), wadah EC2.
- **Site-to-Site VPN / SSH tunnel** — menyambung EC2 (AWS) dengan data tier on-premise dengan aman.

## Alur kerja end-to-end

1. **Resolve domain** — browser pembeli menanyakan alamat ke **DNS** (registrar/BIND9).
2. **Perimeter** — request HTTPS disaring **UFW/iptables** lalu **ModSecurity (WAF)** (blokir SQLi/XSS).
3. **Reverse proxy + LB** — **Nginx** melayani aset statis dari cache & meneruskan request dinamis (terbagi rata) ke EC2 lewat **VPN**.
4. **Aplikasi** — **EC2** (Express) memproses katalog, pencarian, keranjang, checkout.
5. **Database tulis/baca** — EC2 menulis ke **PostgreSQL Master**, membaca dari **Slave**; replikasi menjaga sinkron.
6. **Cache** — query/sesi panas disimpan di **Redis**.
7. **Shared files** — berkas lintas-server lewat **NFS Cluster**.
8. **Aset & gambar** — diambil/disimpan di **NAS** via **SFTP/FTP**; respons mengalir balik EC2 → Nginx → pengguna (Nginx meng-cache untuk pengunjung berikutnya).

## Pemetaan ke kode

Karena layanan data berat tidak boleh membebani laptop dan website harus tetap
bisa dipakai siapa pun, kode dibuat **pluggable dengan default ringan**:

| Komponen blueprint | Realisasi di kode |
|---|---|
| ② EC2 (compute) | `server.js` + seluruh `src/` (di-deploy ke **Vercel** untuk demo publik — pengganti EC2 yang gratis) |
| ④ Redis (cache) | cache katalog di memori proses (`src/services/catalog.js`) |
| ③ Database | `src/services/storage.js` → `readCatalog()` baca data bundel; siap diarahkan ke PostgreSQL via `DATABASE_URL` |
| ⑥ NAS / order store | `src/services/storage.js` → `saveOrder`/`loadOrder` (berkas lokal di EC2; memori + cache klien di serverless) |
| Mode runtime | `src/config/runtime.js` (deteksi serverless, env layanan eksternal) |

> **Blueprint = target produksi (EC2 + on-premise).** Demo publik berjalan di
> **Vercel** (serverless gratis) sebagai pengganti EC2 supaya tidak perlu
> menyalakan server di laptop. Untuk produksi sungguhan, komponen data tinggal
> diarahkan ke PostgreSQL/Redis (sendiri di LAN, atau free-tier Neon/Upstash)
> lewat `DATABASE_URL`/`REDIS_URL` — tanpa mengubah kode pemakainya.

## File blueprint

| File | Tool | Cara buka |
|---|---|---|
| `blueprint-belantara.drawio` | draw.io / diagrams.net | [app.diagrams.net](https://app.diagrams.net) → **Open Existing Diagram** → pilih file ini. |
| `blueprint-belantara.eraser` | eraser.io | [app.eraser.io](https://app.eraser.io) → New file → `/` → **Diagram as Code** → **Cloud Architecture** → tempel isinya. |

Versi visual interaktif juga tersedia langsung di website: **`/arsitektur`**.
