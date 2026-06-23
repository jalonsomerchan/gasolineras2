import { Api } from '../services/api.js';
import { RecentSearchStore } from '../state/recentSearchStore.js';
import { h, clear, loading, errorBox } from '../utils/dom.js';
import { routePart } from '../utils/format.js';

const QUICK_SUGGESTIONS = ['Madrid', 'Cáceres', 'Repsol', 'Cepsa', 'Plenoil', 'Ballenoil'];
const TYPES = [
  { id: 'all', label: 'Todo' },
  { id: 'gasolinera', label: 'Gasolineras' },
  { id: 'municipio', label: 'Municipios' },
  { id: 'provincia', label: 'Provincias' }
];

function href(item) {
  if (item.tipo === 'gasolinera') return `#/gasolinera/${item.ideess}`;
  if (item.tipo === 'municipio') return `#/municipio/${routePart(item.provincia)}/${routePart(item.municipio)}`;
  if (item.tipo === 'provincia') return `#/provincia/${routePart(item.provincia)}`;
  return '#/buscar';
}

function label(type) {
  return { gasolinera: 'Gasolineras', municipio: 'Municipios', provincia: 'Provincias' }[type] || 'Resultados';
}

function ResultGroup(type, items) {
  if (!items.length) return null;
  return h('section', { class: 'search-result-group' },
    h('h2', {}, label(type)),
    h('div', { class: 'advanced-results-list' },
      items.map((item) => h('a', { class: 'advanced-result-row', href: href(item) },
        h('span', {}, h('strong', {}, item.label), h('small', {}, `${item.provincia || ''}${item.municipio ? ` · ${item.municipio}` : ''}`.trim() || item.tipo)),
        h('em', {}, item.total ? `${item.total}` : '→')
      ))
    )
  );
}

export function SearchPage() {
  const results = h('div', { class: 'advanced-search-results' });
  const recentBox = h('div', { class: 'recent-searches' });
  let filter = 'all';
  let lastQuery = '';

  const input = h('input', {
    class: 'advanced-search-input',
    type: 'search',
    autocomplete: 'off',
    placeholder: 'Buscar gasolinera, municipio o provincia',
    'aria-label': 'Buscar gasolinera, municipio o provincia'
  });

  function renderRecent() {
    const recent = RecentSearchStore.all();
    clear(recentBox).append(
      recent.length ? h('div', { class: 'search-chip-row' },
        recent.map((item) => h('button', { class: 'soft-chip', type: 'button', onClick: () => runSearch(item) }, item)),
        h('button', { class: 'soft-chip ghost-chip', type: 'button', onClick: () => { RecentSearchStore.clear(); renderRecent(); } }, 'Limpiar')
      ) : h('p', { class: 'section-subtitle' }, 'Todavía no hay búsquedas recientes.')
    );
  }

  function renderFilterButtons(container) {
    clear(container).append(...TYPES.map((type) => h('button', {
      class: filter === type.id ? 'is-active' : '',
      type: 'button',
      onClick: () => { filter = type.id; renderFilterButtons(container); if (lastQuery) runSearch(lastQuery); }
    }, type.label)));
  }

  async function runSearch(query = input.value) {
    const q = String(query || '').trim();
    input.value = q;
    lastQuery = q;
    clear(results);
    if (q.length < 2) {
      results.append(h('div', { class: 'empty compact-empty' }, 'Escribe al menos dos letras.'));
      return;
    }
    RecentSearchStore.add(q);
    renderRecent();
    results.append(loading('Buscando...'));
    try {
      const data = await Api.autocomplete(q, filter, 30);
      clear(results);
      if (!data.length) {
        results.append(h('div', { class: 'empty compact-empty' }, 'No hay resultados.'));
        return;
      }
      const groups = ['gasolinera', 'municipio', 'provincia'].map((type) => ResultGroup(type, data.filter((item) => item.tipo === type))).filter(Boolean);
      results.append(...groups);
    } catch (error) {
      clear(results).append(errorBox(error.message));
    }
  }

  const filters = h('div', { class: 'search-filters', role: 'tablist' });
  renderFilterButtons(filters);
  renderRecent();

  return h('div', { class: 'dashboard search-page advanced-search-page' },
    h('section', { class: 'page-title-row' },
      h('div', {}, h('span', { class: 'pill' }, 'Buscar'), h('h1', {}, 'Buscar'), h('p', {}, 'Encuentra gasolineras, municipios y provincias con filtros rápidos.')),
      h('a', { class: 'btn', href: '#/radar' }, 'Cerca de mí')
    ),
    h('section', { class: 'advanced-search-card card' },
      h('form', { class: 'advanced-search-form', onSubmit: (event) => { event.preventDefault(); runSearch(); } },
        input,
        h('button', { class: 'btn', type: 'submit' }, 'Buscar')
      ),
      filters,
      h('div', { class: 'quick-suggestions' },
        h('span', {}, 'Sugerencias'),
        QUICK_SUGGESTIONS.map((item) => h('button', { type: 'button', onClick: () => runSearch(item) }, item))
      )
    ),
    h('section', { class: 'card card-pad' },
      h('div', { class: 'section-head' }, h('div', {}, h('h2', { class: 'section-title' }, 'Búsquedas recientes'))),
      recentBox
    ),
    results
  );
}
