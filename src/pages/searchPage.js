import { h } from '../utils/dom.js';
import { SearchBox } from '../components/searchBox.js';

export function SearchPage() {
  return h('div', { class: 'dashboard search-page' },
    h('section', { class: 'page-title-row' },
      h('div', {}, h('span', { class: 'pill' }, 'Buscar'), h('h1', {}, 'Buscar gasolineras'), h('p', {}, 'Busca por gasolinera, municipio o provincia.'))
    ),
    h('section', { class: 'search-only-card' }, SearchBox()),
    h('section', { class: 'card card-pad helper-card' },
      h('h2', { class: 'section-title' }, 'Consejo'),
      h('p', { class: 'station-meta' }, 'Escribe al menos dos letras. Al pulsar Enter entrarás en el primer resultado.')
    )
  );
}
