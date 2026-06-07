import { mountChrome, productCard, loadCategories, icon } from './ui.js';
import { api } from './api.js';

const state = readState();
await mountChrome({ active: state.category });

const titleEl = document.getElementById('listing-title');
const crumbsEl = document.getElementById('crumbs');
const filtersEl = document.getElementById('filters');
const resultsEl = document.getElementById('results');

const categories = await loadCategories().catch(() => []);

function readState() {
  const p = new URLSearchParams(location.search);
  return {
    q: p.get('q') || '',
    category: p.get('category') || '',
    sort: p.get('sort') || 'relevance',
    minPrice: p.get('minPrice') || '',
    maxPrice: p.get('maxPrice') || '',
    minRating: p.get('minRating') || '',
    free: p.get('free') === '1',
    page: Number(p.get('page')) || 1,
  };
}

function toQuery(s) {
  const p = new URLSearchParams();
  if (s.q) p.set('q', s.q);
  if (s.category) p.set('category', s.category);
  if (s.sort && s.sort !== 'relevance') p.set('sort', s.sort);
  if (s.minPrice) p.set('minPrice', s.minPrice);
  if (s.maxPrice) p.set('maxPrice', s.maxPrice);
  if (s.minRating) p.set('minRating', s.minRating);
  if (s.free) p.set('free', '1');
  if (s.page > 1) p.set('page', s.page);
  return p.toString();
}

function apply(patch, { resetPage = true } = {}) {
  Object.assign(state, patch);
  if (resetPage) state.page = 1;
  const qs = toQuery(state);
  history.pushState(null, '', '/search' + (qs ? `?${qs}` : ''));
  render();
}

window.addEventListener('popstate', () => {
  Object.assign(state, readState());
  render();
});

function catName(slug) {
  return categories.find((c) => c.slug === slug)?.name || slug;
}

function renderHeading(total) {
  if (state.q) {
    titleEl.textContent = `Hasil pencarian "${state.q}"`;
    crumbsEl.innerHTML = `<a href="/">Beranda</a> &rsaquo; <span>Pencarian</span>`;
  } else if (state.category) {
    titleEl.textContent = catName(state.category);
    crumbsEl.innerHTML = `<a href="/">Beranda</a> &rsaquo; <a href="/search">Kategori</a> &rsaquo; <span>${catName(state.category)}</span>`;
  } else {
    titleEl.textContent = 'Semua Produk';
    crumbsEl.innerHTML = `<a href="/">Beranda</a> &rsaquo; <span>Semua Produk</span>`;
  }
}

function renderFilters() {
  const ratingOpts = [4.5, 4, 3.5]
    .map(
      (r) => `
    <label class="filter-opt">
      <input type="radio" name="rating" value="${r}" ${Number(state.minRating) === r ? 'checked' : ''}>
      <span class="stars" style="color:var(--star)">${'★'.repeat(Math.round(r))}</span>
      <span>${r} ke atas</span>
    </label>`
    )
    .join('');

  const catOpts = categories
    .map(
      (c) => `
    <label class="filter-opt">
      <input type="radio" name="cat" value="${c.slug}" ${state.category === c.slug ? 'checked' : ''}>
      <span>${c.name}</span>
      <span class="muted" style="margin-left:auto;font-size:.78rem">${c.count}</span>
    </label>`
    )
    .join('');

  filtersEl.innerHTML = `
    <div class="filter-block">
      <h3>Kategori</h3>
      <label class="filter-opt">
        <input type="radio" name="cat" value="" ${!state.category ? 'checked' : ''}>
        <span>Semua Kategori</span>
      </label>
      ${catOpts}
    </div>
    <div class="filter-block">
      <h3>Rentang Harga</h3>
      <div class="price-inputs">
        <input type="number" id="f-min" placeholder="Rp min" value="${state.minPrice}" min="0">
        <span>&ndash;</span>
        <input type="number" id="f-max" placeholder="Rp max" value="${state.maxPrice}" min="0">
      </div>
      <button class="btn btn-ghost" id="f-price-apply" style="margin-top:10px;width:100%;padding:8px">Terapkan</button>
    </div>
    <div class="filter-block">
      <h3>Rating</h3>
      ${ratingOpts}
      <label class="filter-opt">
        <input type="radio" name="rating" value="" ${!state.minRating ? 'checked' : ''}>
        <span>Semua rating</span>
      </label>
    </div>
    <div class="filter-block">
      <h3>Pengiriman</h3>
      <label class="filter-opt">
        <input type="checkbox" id="f-free" ${state.free ? 'checked' : ''}>
        <span>Gratis Ongkir</span>
      </label>
    </div>
    <button class="btn btn-ghost" id="f-reset" style="width:100%;margin-top:6px">Reset filter</button>
  `;

  filtersEl.querySelectorAll('input[name="cat"]').forEach((el) =>
    el.addEventListener('change', () => apply({ category: el.value }))
  );
  filtersEl.querySelectorAll('input[name="rating"]').forEach((el) =>
    el.addEventListener('change', () => apply({ minRating: el.value }))
  );
  filtersEl.querySelector('#f-free').addEventListener('change', (e) =>
    apply({ free: e.target.checked })
  );
  filtersEl.querySelector('#f-price-apply').addEventListener('click', () =>
    apply({
      minPrice: filtersEl.querySelector('#f-min').value,
      maxPrice: filtersEl.querySelector('#f-max').value,
    })
  );
  filtersEl.querySelector('#f-reset').addEventListener('click', () =>
    apply({ category: '', minPrice: '', maxPrice: '', minRating: '', free: false, sort: 'relevance' })
  );
}

function renderResults(data) {
  const { items, total, page, pages } = data;
  const sortSel = `
    <div class="sort-select">
      <label class="muted" style="font-size:.82rem;margin-right:6px">Urutkan</label>
      <select id="sort">
        ${[
          ['relevance', 'Paling Sesuai'],
          ['bestseller', 'Terlaris'],
          ['price-asc', 'Harga Termurah'],
          ['price-desc', 'Harga Tertinggi'],
          ['rating', 'Rating Tertinggi'],
          ['newest', 'Terbaru'],
        ]
          .map(([v, l]) => `<option value="${v}" ${state.sort === v ? 'selected' : ''}>${l}</option>`)
          .join('')}
      </select>
    </div>`;

  const toolbar = `
    <div class="toolbar">
      <button class="btn btn-ghost filter-toggle" id="filter-toggle">${icon('menu', 16)} Filter</button>
      <span class="count">Menampilkan <b>${items.length}</b> dari <b>${total}</b> produk</span>
      ${sortSel}
    </div>`;

  if (total === 0) {
    resultsEl.innerHTML =
      toolbar +
      `<div class="empty-state">
        <div class="big">${icon('search', 48)}</div>
        <h3>Produk tidak ditemukan</h3>
        <p>Coba kata kunci lain atau longgarkan filternya.</p>
      </div>`;
    wireToolbar();
    return;
  }

  const grid = `<div class="grid">${items.map(productCard).join('')}</div>`;
  resultsEl.innerHTML = toolbar + grid + pagination(page, pages);
  wireToolbar();
  resultsEl.querySelectorAll('[data-page]').forEach((b) =>
    b.addEventListener('click', () => {
      apply({ page: Number(b.dataset.page) }, { resetPage: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    })
  );
}

function pagination(page, pages) {
  if (pages <= 1) return '';
  let btns = `<button data-page="${page - 1}" ${page === 1 ? 'disabled' : ''}>&lsaquo;</button>`;
  for (let i = 1; i <= pages; i++) {
    btns += `<button data-page="${i}" class="${i === page ? 'active' : ''}">${i}</button>`;
  }
  btns += `<button data-page="${page + 1}" ${page === pages ? 'disabled' : ''}>&rsaquo;</button>`;
  return `<div class="pagination">${btns}</div>`;
}

function wireToolbar() {
  resultsEl.querySelector('#sort')?.addEventListener('change', (e) => apply({ sort: e.target.value }));
  resultsEl.querySelector('#filter-toggle')?.addEventListener('click', () =>
    filtersEl.classList.toggle('open')
  );
}

async function render() {
  renderHeading();
  renderFilters();
  resultsEl.innerHTML = `<div class="grid">${Array.from({ length: 8 }, () => '<div class="skeleton sk-card"></div>').join('')}</div>`;
  try {
    const data = await api.products(toQuery(state));
    renderHeading(data.total);
    renderResults(data);
  } catch (err) {
    resultsEl.innerHTML = `<div class="empty-state"><p>Gagal memuat produk: ${err.message}</p></div>`;
  }
}

render();
