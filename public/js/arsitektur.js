import { mountChrome, icon } from './ui.js';

const root = document.getElementById('arch-root');

const css = `
.arch-hero h1{font-size:1.9rem;margin:0 0 8px}
.arch-hero p{color:var(--muted);max-width:780px;line-height:1.7;margin:0 0 6px}
.arch-eyebrow{display:inline-block;font-size:.72rem;font-weight:800;letter-spacing:.08em;
  text-transform:uppercase;color:#ED7100;background:#fff3e6;padding:5px 12px;border-radius:999px;margin-bottom:14px}
.layers{display:grid;gap:16px;margin:24px 0}
.layer{border:1px solid var(--line);border-left:5px solid var(--lc,#888);border-radius:12px;padding:16px 18px;background:#fff}
.layer h3{margin:0 0 3px;font-size:1.05rem;display:flex;align-items:center;gap:8px}
.layer .sub{color:var(--muted);font-size:.82rem;margin:0 0 12px}
.svc-row{display:flex;flex-wrap:wrap;gap:8px}
.svc{display:flex;flex-direction:column;gap:1px;border:1px solid var(--line);border-radius:9px;
  padding:8px 12px;min-width:140px;background:var(--surface-2)}
.svc b{font-size:.86rem}
.svc small{color:var(--muted);font-size:.72rem}
.svc.live{border-color:#167a3c;background:#eafaf0}
.svc .tag{font-size:.62rem;font-weight:800;letter-spacing:.04em;text-transform:uppercase;margin-top:3px}
.svc.live .tag{color:#167a3c}
.svc.plan .tag{color:#b0820a}
.arch-flow{counter-reset:step;list-style:none;padding:0;margin:14px 0 0}
.arch-flow li{position:relative;padding:13px 16px 13px 54px;border:1px solid var(--line);
  border-radius:10px;margin-bottom:9px;background:#fff;line-height:1.55}
.arch-flow li::before{counter-increment:step;content:counter(step);position:absolute;left:13px;top:12px;
  width:26px;height:26px;border-radius:50%;background:var(--brand);color:#fff;font-weight:800;display:grid;place-items:center}
.callout{display:flex;gap:12px;border-radius:12px;padding:16px 18px;margin:22px 0;line-height:1.6}
.callout.green{background:var(--brand-tint);border:1px solid #bfe0cc}
.callout.amber{background:#fff8e8;border:1px solid #f0dca0}
.callout .pico{font-size:1.5rem}
.legend2{display:flex;gap:18px;flex-wrap:wrap;font-size:.8rem;color:var(--muted);margin-top:8px}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:middle}
`;

const LAYERS = [
  {
    name: 'Layer 1 · Edge & Security', color: '#DD344C', sub: 'Gerbang luar: DNS, CDN, firewall, & identitas',
    services: [
      { n: 'Amazon Route 53', d: 'DNS / routing domain' },
      { n: 'Amazon CloudFront', d: 'CDN + cache global + TLS' },
      { n: 'AWS WAF', d: 'firewall aplikasi (SQLi/XSS)' },
      { n: 'Amazon Cognito', d: 'login pembeli & seller' },
    ],
  },
  {
    name: 'Layer 2 · Compute', color: '#ED7100', sub: 'Aplikasi Node.js berjalan, skala otomatis, multi-AZ',
    services: [
      { n: 'Application Load Balancer', d: 'bagi trafik antar instance' },
      { n: 'Amazon EC2 + Auto Scaling', d: 'host Node.js/Express (2 AZ)' },
    ],
  },
  {
    name: 'Layer 3 · Data & Storage', color: '#C925D1', sub: 'Database, cache, dan penyimpanan objek/berkas',
    services: [
      { n: 'Amazon RDS (Multi-AZ)', d: 'database relasional' },
      { n: 'Amazon ElastiCache', d: 'cache query/sesi' },
      { n: 'Amazon DynamoDB', d: 'pesanan & cart (NoSQL)', live: true },
      { n: 'Amazon S3', d: 'katalog, gambar, aset', live: true },
      { n: 'Amazon EFS', d: 'shared file antar-instance' },
    ],
  },
  {
    name: 'Layer 4 · Data Lake & Analytics', color: '#8C4FFF', sub: 'Kumpulkan event, olah, query, & visualisasikan',
    services: [
      { n: 'Kinesis Data Firehose', d: 'aliran event order/klik' },
      { n: 'Amazon S3 (Data Lake)', d: 'gudang data mentah' },
      { n: 'AWS Glue', d: 'ETL + Data Catalog' },
      { n: 'Amazon Athena', d: 'query SQL ke data lake' },
      { n: 'Amazon QuickSight', d: 'dashboard BI' },
    ],
  },
];

const FLOW = [
  ['Pengguna membuka Belantara; <b>Route 53</b> meresolusi domain dan request mengalir ke <b>CloudFront</b> (CDN) yang menyajikan aset statis dari cache.'],
  ['<b>AWS WAF</b> menyaring serangan (SQLi/XSS) di edge sebelum request dinamis diteruskan ke dalam VPC; <b>Cognito</b> mengurus login pembeli/seller.'],
  ['<b>Application Load Balancer</b> membagi trafik ke beberapa <b>EC2</b> (Auto Scaling) di dua Availability Zone — kalau satu AZ tumbang, yang lain tetap melayani.'],
  ['<b>EC2</b> (Node.js) memproses logika: baca katalog dari <b>S3</b>, baca/tulis pesanan ke <b>DynamoDB</b>, query relasional ke <b>RDS</b>, dan cache panas di <b>ElastiCache</b>.'],
  ['Berkas yang dibagi antar-instance lewat <b>EFS</b>; <b>RDS</b> direplikasi otomatis ke standby (Multi-AZ).'],
  ['Setiap event (order dibuat, produk dilihat) dikirim ke <b>Kinesis Data Firehose</b> → ditumpuk di <b>S3 (Data Lake)</b>.'],
  ['<b>AWS Glue</b> mengkatalog & meng-ETL data lake; <b>Athena</b> mengquery-nya dengan SQL; <b>QuickSight</b> menampilkan dashboard penjualan/perilaku.'],
];

function svcCard(s) {
  const cls = s.live ? 'svc live' : 'svc plan';
  const tag = s.live ? 'terintegrasi · gratis' : 'blueprint';
  return `<div class="${cls}"><b>${s.n}</b><small>${s.d}</small><span class="tag">${tag}</span></div>`;
}

function render() {
  root.innerHTML = `
  <style>${css}</style>

  <section class="arch-hero">
    <span class="arch-eyebrow">${icon('shield', 14)} Arsitektur Sistem</span>
    <h1>Di atas AWS — 15 Layanan, 4 Layer</h1>
    <p>Belantara dirancang sebagai aplikasi <b>AWS-native</b> bertopologi lengkap: dari edge
       (Route 53, CloudFront, WAF) → compute multi-AZ (ALB, EC2) → data (RDS, DynamoDB, S3, EFS,
       ElastiCache) → sampai data lake & analitik (Kinesis, Glue, Athena, QuickSight).</p>
  </section>

  <div class="callout green">
    <span class="pico">⚙️</span>
    <div><b>Terintegrasi penuh di kode (siap pakai):</b> <b>Amazon S3</b> (katalog &amp; gambar)
      dan <b>Amazon DynamoDB</b> (pesanan) — memakai AWS SDK asli, bukan stub. Keduanya free tier &amp;
      tanpa VPC, jadi <b>aktif otomatis</b> begitu kredensial AWS diisi. Demo publik ini sementara
      berjalan <b>mode fallback</b> (data bundel) supaya nol biaya. Sisanya ada di blueprint sebagai
      desain target (sebagian berbayar, belum diaktifkan).</div>
  </div>

  <div class="layers">
    ${LAYERS.map((l) => `
      <div class="layer" style="--lc:${l.color}">
        <h3 style="color:${l.color}">${l.name}</h3>
        <p class="sub">${l.sub}</p>
        <div class="svc-row">${l.services.map(svcCard).join('')}</div>
      </div>`).join('')}
  </div>
  <div class="legend2">
    <span><span class="dot" style="background:#167a3c"></span>terintegrasi di kode &amp; gratis (S3, DynamoDB)</span>
    <span><span class="dot" style="background:#d9b13b"></span>blueprint / desain target</span>
  </div>

  <div class="section-head" style="margin-top:26px"><h2>Alur Kerja End-to-End</h2></div>
  <ol class="arch-flow">
    ${FLOW.map(([d]) => `<li>${d}</li>`).join('')}
  </ol>

  <div class="callout amber">
    <span class="pico">💡</span>
    <div><b>Gratis vs berbayar.</b> Always-free / free tier: <b>S3, DynamoDB, Cognito, CloudFront, Lambda</b>.
      Hanya gratis 12 bulan untuk akun baru: <b>EC2, RDS, ElastiCache, EFS, ALB</b>. Berbayar (belum dipakai):
      <b>NAT Gateway, Route 53, WAF, Kinesis, Glue ETL, Athena, QuickSight</b>. Demo publik ini berjalan di
      Vercel sebagai pengganti EC2 supaya bisa dipakai siapa saja tanpa biaya; begitu env AWS diisi, S3 &amp;
      DynamoDB langsung aktif.</div>
  </div>
  `;
}

async function init() {
  await mountChrome();
  render();
}

init();
