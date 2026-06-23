import { Api } from '../services/api.js';
import { h, clear } from '../utils/dom.js';
import { routePart } from '../utils/format.js';

function suggestionHref(item) {
  if (item.tipo === 'gasolinera') return `#/gasolinera/${item.ideess}`;
  if (item.tipo === 'municipio') return `#/municipio/${routePart(item.provincia)}/${routePart(item.municipio)}`;
  if (item.tipo === 'provincia') return `#/provincia/${routePart(item.provincia)}`;
  return '#/';
}

function typeLabel(type) {
  return {
    gasolinera: 'Gasolinera',
    municipio: 'Municipio',
    provincia: 'Provincia'
  }[type] || 'Resultado';
}

export function SearchBox() {
  const results = h('div', { class: 'search-results', hidden: true });
  const input = h('input', {
    class: 'search-input',
    type: 'search',
    placeholder: 'Buscar gasolinera o zona',
    autocomplete: 'off',
    'aria-label': 'Buscar gasolineras, municipios o provincias'
  });

  let debounce = null;
  let suggestions = [];

  async function loadSuggestions() {
    const q = input.value.trim();
    clear(results);
    suggestions = [];
    if (q.length < 2) {
      results.hidden = true;
      return;
    }
    results.hidden = false;
    results.append(h('div', { class: 'loading' }, 'Buscando...'));
    try {
      suggestions = await Api.autocomplete(q, 'all', 8);
      clear(results);
      if (!suggestions.length) {
        results.append(h('div', { class: 'empty' }, 'Sin resultados'));
        return;
      }
      suggestions.forEach((item) => {
        results.append(h('button', {
          class: 'search-result',
          type: 'button',
          onClick: () => { location.hash = suggestionHref(item); }
        },
          h('span', {}, h('strong', {}, item.label), h('span', {}, `${typeLabel(item.tipo)}${item.total ? ` · ${item.total}` : ''}`)),
          h('span', {}, '→')
        ));
      });
    } catch (error) {
      clear(results);
      results.append(h('div', { class: 'error-box' }, error.message));
    }
  }

  input.addEventListener('input', () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(loadSuggestions, 220);
  });

  const form = h('form', {
    class: 'search-form',
    onSubmit: async (event) => {
      event.preventDefault();
      if (!suggestions.length) await loadSuggestions();
      if (suggestions[0]) location.hash = suggestionHref(suggestions[0]);
    }
  }, input, h('button', { class: 'btn', type: 'submit', 'aria-label': 'Buscar' }, 'Buscar'));

  return h('div', { class: 'search-wrap' }, form, results);
}
