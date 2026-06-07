import { mountChrome, icon } from './ui.js';

const root = document.getElementById('arch-root');

// CSS khusus halaman ini — disuntik di sini supaya styles.css tetap bersih.
const css = `
.arch-hero h1{font-size:1.9rem;margin:0 0 8px}
.arch-hero p{color:var(--muted);max-width:760px;line-height:1.7;margin:0 0 6px}
.arch-eyebrow{display:inline-block;font-size:.72rem;font-weight:800;letter-spacing:.08em;
  text-transform:uppercase;color:var(--brand);background:var(--brand-tint);
  padding:5px 12px;border-radius:999px;margin-bottom:14px}
.arch-map{display:grid;grid-template-columns:230px 1fr;gap:18px;align-items:stretch;margin:26px 0}
@media(max-width:820px){.arch-map{grid-template-columns:1fr}}
.arch-zone{border:1.5px dashed var(--line-strong);border-radius:14px;padding:16px;background:var(--surface)}
.arch-zone h3{margin:0 0 4px;font-size:1rem;display:flex;align-items:center;gap:8px}
.arch-zone small{color:var(--muted);display:block;margin-bottom:12px;font-size:.78rem}
.zone-aws{border-color:#d9a441;background:#fffaf0}
.zone-onprem{border-color:#8aa0b3;background:#f6f9fc}
.arch-tier{border:1px solid var(--line);border-radius:10px;padding:12px;margin-bottom:12px;background:#fff}
.arch-tier b{font-size:.8rem;color:#56616c;text-transform:uppercase;letter-spacing:.04em}
.node-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.node{border-radius:8px;padding:8px 11px;font-size:.82rem;font-weight:600;border:1px solid;line-height:1.3}
.node small{display:block;font-weight:500;font-size:.72rem;opacity:.85;margin-top:2px}
.n-core{position:relative}
.n-core::after{content:attr(data-no);position:absolute;top:-8px;right:-8px;width:20px;height:20px;
  border-radius:50%;background:var(--brand);color:#fff;font-size:.68rem;display:grid;place-items:center;font-weight:800}
.n-ec2{background:#fff3e6;border-color:#ED7100;color:#8a4500}
.n-nginx{background:#e8f5e9;border-color:#2E7D32;color:#1b5e20}
.n-sec{background:#fdecea;border-color:#C0392B;color:#7b241c}
.n-db{background:#e3f2fd;border-color:#1565C0;color:#0d47a1}
.n-redis{background:#fce4ec;border-color:#C2185B;color:#880e4f}
.n-store{background:#fff8e1;border-color:#F9A825;color:#e65100}
.n-dns{background:#ede7f6;border-color:#5E35B1;color:#311b92}
.n-vpn{background:#f3e5f5;border-color:#8C4FFF;color:#4a148c}
.arch-flow{counter-reset:step;list-style:none;padding:0;margin:14px 0 0}
.arch-flow li{position:relative;padding:14px 16px 14px 56px;border:1px solid var(--line);
  border-radius:10px;margin-bottom:10px;background:#fff;line-height:1.6}
.arch-flow li::before{counter-increment:step;content:counter(step);position:absolute;left:14px;top:14px;
  width:28px;height:28px;border-radius:50%;background:var(--brand);color:#fff;font-weight:800;display:grid;place-items:center}
.arch-flow b{color:var(--ink)}
.arch-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:.88rem}
.arch-table th,.arch-table td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
.arch-table th{color:#56616c;font-size:.76rem;text-transform:uppercase;letter-spacing:.04em}
.arch-table td.old{color:#b0341c;text-decoration:line-through;text-decoration-color:#e0a89c}
.arch-table td.arrow{color:var(--muted);text-align:center}
.callout{display:flex;gap:12px;background:var(--brand-tint);border:1px solid #bfe0cc;
  border-radius:12px;padding:16px 18px;margin:22px 0;line-height:1.6}
.callout .pico{font-size:1.5rem}
`;

const CORE = [
  { no: 1, cls: 'n-nginx', name: 'Nginx — Reverse Proxy', role: 'Gerbang masuk: caching statis (peran CDN), load balancing, terminasi TLS.', repl: 'menggantikan CloudFront + Application Load Balancer' },
  { no: 2, cls: 'n-ec2', name: 'Amazon EC2 — Node.js', role: 'Satu-satunya compute yang tersisa di AWS. Menjalankan aplikasi Express. Public IP langsung, tanpa NAT Gateway.', repl: 'tetap dipakai (di-deploy via Vercel untuk demo publik)' },
  { no: 3, cls: 'n-db', name: 'PostgreSQL / MySQL (Master-Slave)', role: 'Database utama. Tulis ke Master, baca dari Slave/replica. Replikasi manual menggantikan Multi-AZ.', repl: 'menggantikan Amazon RDS Multi-AZ' },
  { no: 4, cls: 'n-redis', name: 'Redis Server', role: 'Cache query & sesi supaya respons cepat tanpa selalu menembak database.', repl: 'menggantikan Amazon ElastiCache' },
  { no: 5, cls: 'n-store', name: 'NFS Cluster', role: 'Shared folder antar-server lewat LAN — satu folder dipakai bersama banyak mesin.', repl: 'menggantikan Amazon EFS' },
  { no: 6, cls: 'n-store', name: 'NAS / Storage Server', role: 'Penyimpanan objek: aset katalog, gambar produk, arsip order. Akses via SFTP/FTP.', repl: 'menggantikan Amazon S3' },
];

const FLOW = [
  ['Resolve domain', 'Pembeli membuka Belantara. Domain di-<i>resolve</i> oleh <b>DNS</b> dari registrar (Niagahoster/IDWebhost) atau server <b>BIND9</b> sendiri — bukan lagi Route 53.'],
  ['Lewati perimeter keamanan', 'Request HTTPS masuk dan disaring <b>UFW/iptables</b> (firewall paket) lalu <b>ModSecurity (WAF)</b> yang memblokir serangan web seperti SQL injection & XSS — peran yang dulu dipegang AWS di gerbang luar.'],
  ['Nginx reverse proxy + load balance', 'Trafik bersih sampai ke <b>Nginx</b>. Aset statis dilayani dari cache (peran CDN); request dinamis diteruskan & dibagi rata ke aplikasi lewat <b>VPN terenkripsi</b> menuju EC2.'],
  ['Aplikasi berjalan di EC2', '<b>Amazon EC2</b> (Node.js/Express) memproses logika: katalog, pencarian, keranjang, checkout. Inilah satu-satunya komponen yang tersisa di dalam AWS VPC.'],
  ['Baca/tulis database', 'EC2 menulis data (mis. order) ke <b>PostgreSQL/MySQL Master</b> dan membaca dari <b>Slave/replica</b>. Replikasi Master→Slave menjaga data tetap sinkron tanpa RDS.'],
  ['Cache via Redis', 'Query yang sering diulang & data sesi disimpan di <b>Redis</b> supaya halaman berikutnya tampil instan tanpa membebani database.'],
  ['Berkas bersama lewat NFS', 'File yang perlu dibagi antar-server (upload, berkas sementara) ditaruh di <b>NFS Cluster</b> sehingga semua mesin melihat folder yang sama.'],
  ['Aset & gambar dari NAS', 'Gambar produk dan arsip order diambil/disimpan di <b>NAS/Storage Server</b> via <b>SFTP/FTP</b>. Respons lalu mengalir balik EC2 → Nginx → pengguna; Nginx menyimpan salinan cache untuk pengunjung berikutnya.'],
];

const MAP = [
  ['Amazon Route 53 (DNS)', 'DNS Registrar / BIND9'],
  ['Amazon CloudFront (CDN)', 'Nginx (cache statis)'],
  ['Application Load Balancer', 'Nginx (load balancing)'],
  ['NAT Gateway', 'Public IP langsung / NAT Instance'],
  ['EC2 Auto Scaling', 'Nginx LB ke beberapa node manual'],
  ['Keamanan gerbang AWS', 'ModSecurity (WAF) + UFW/iptables'],
  ['Amazon RDS (Multi-AZ)', 'PostgreSQL/MySQL Master-Slave'],
  ['Amazon ElastiCache', 'Redis Server'],
  ['Amazon EFS', 'NFS Cluster (LAN)'],
  ['Amazon S3', 'NAS / Storage Server (SFTP/FTP)'],
];

function nodeTag(label, sub, cls, no) {
  const core = no ? ` n-core" data-no="${no}` : '';
  return `<span class="node ${cls}${core}">${label}${sub ? `<small>${sub}</small>` : ''}</span>`;
}

function render() {
  root.innerHTML = `
  <style>${css}</style>

  <section class="arch-hero">
    <span class="arch-eyebrow">${icon('shield', 14)} Arsitektur Sistem</span>
    <h1>Dari "Full-AWS" ke Hybrid Hemat Biaya</h1>
    <p>Blueprint lama menaruh belasan layanan berbayar di dalam kotak AWS (Route 53, CloudFront,
       NAT Gateway, RDS, ElastiCache, EFS, S3). Versi ini <b>menyusutkan kotak AWS secara drastis</b>:
       yang tersisa hanya <b>VPC + satu EC2</b> untuk menjalankan kode. Seluruh data, penyimpanan,
       keamanan gerbang, dan DNS ditarik ke <b>jaringan lokal (On-Premise)</b> berbasis
       software gratis/open-source — biaya cloud mendekati nol.</p>
  </section>

  <div class="arch-map">
    <div class="arch-zone zone-aws">
      <h3>${icon('shield', 16)} AWS Cloud</h3>
      <small>menyusut — 2 komponen</small>
      <div class="arch-tier">
        <b>VPC 10.0.0.0/16 · Public Subnet</b>
        <div class="node-row">
          ${nodeTag('Amazon EC2', 'Node.js · Public IP · tanpa NAT GW', 'n-ec2', 2)}
        </div>
      </div>
      <div class="node-row">${nodeTag('Site-to-Site VPN', 'jembatan AWS ↔ on-premise', 'n-vpn')}</div>
    </div>

    <div class="arch-zone zone-onprem">
      <h3>${icon('menu', 16)} On-Premise — Jaringan Lokal (LAN)</h3>
      <small>software gratis / open-source · biaya cloud = 0</small>

      <div class="arch-tier">
        <b>Edge &amp; Perimeter</b>
        <div class="node-row">
          ${nodeTag('DNS', 'Registrar / BIND9', 'n-dns')}
          ${nodeTag('UFW / iptables', 'firewall', 'n-sec')}
          ${nodeTag('ModSecurity', 'WAF', 'n-sec')}
          ${nodeTag('Nginx', 'reverse proxy · CDN · LB', 'n-nginx', 1)}
        </div>
      </div>

      <div class="arch-tier">
        <b>Data Tier — Database &amp; Cache</b>
        <div class="node-row">
          ${nodeTag('PostgreSQL/MySQL', 'Master (tulis)', 'n-db', 3)}
          ${nodeTag('PostgreSQL/MySQL', 'Slave (baca)', 'n-db')}
          ${nodeTag('Redis', 'cache', 'n-redis', 4)}
        </div>
      </div>

      <div class="arch-tier">
        <b>Storage Tier — Shared &amp; Object</b>
        <div class="node-row">
          ${nodeTag('NFS Cluster', 'shared folder (LAN)', 'n-store', 5)}
          ${nodeTag('NAS / Storage', 'aset · gambar · order (SFTP)', 'n-store', 6)}
        </div>
      </div>
    </div>
  </div>

  <div class="section-head"><h2>6 Layanan Inti</h2></div>
  <div class="perks">
    ${CORE.map((c) => `
      <div class="perk">
        <div class="pico"><span class="node ${c.cls} n-core" data-no="${c.no}" style="font-size:.8rem">${c.no}</span></div>
        <h3>${c.name}</h3>
        <p>${c.role}</p>
        <p style="margin-top:8px;color:var(--brand);font-weight:600">↳ ${c.repl}</p>
      </div>`).join('')}
  </div>

  <div class="section-head" style="margin-top:26px"><h2>Alur Kerja End-to-End</h2></div>
  <ol class="arch-flow">
    ${FLOW.map(([t, d]) => `<li><b>${t}.</b> ${d}</li>`).join('')}
  </ol>

  <div class="callout">
    <span class="pico">💡</span>
    <div><b>Catatan deploy.</b> Blueprint di atas adalah <b>target produksi</b> (EC2 + on-premise).
      Demo publik yang sedang kamu buka ini berjalan di <b>Vercel</b> (serverless gratis) sebagai
      pengganti EC2 — supaya website bisa dipakai siapa saja tanpa menyalakan server di laptop.
      Komponen data berat (PostgreSQL, Redis) cukup diarahkan ke layanan free-tier (Neon, Upstash)
      lewat variabel <code>DATABASE_URL</code> / <code>REDIS_URL</code> tanpa mengubah kode.</div>
  </div>

  <div class="section-head" style="margin-top:26px"><h2>Sebelum → Sesudah</h2></div>
  <table class="arch-table">
    <thead><tr><th>Layanan AWS (lama)</th><th></th><th>Pengganti On-Premise / Gratis</th></tr></thead>
    <tbody>
      ${MAP.map(([o, n]) => `<tr><td class="old">${o}</td><td class="arrow">→</td><td>${n}</td></tr>`).join('')}
    </tbody>
  </table>
  `;
}

async function init() {
  await mountChrome();
  render();
}

init();
