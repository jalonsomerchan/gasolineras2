import { Api } from '../services/api.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { DiscountStore } from '../state/discountStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { numberValue } from '../utils/format.js';
import { StationList } from '../components/stationList.js';

export function FavoritesPage() {
  const listContainer = h('div', {}, loading('Cargando favoritos...'));

  async function load() {
    clear(listContainer).append(loading('Cargando favoritos...'));
    const ids = FavoritesStore.all();
    if (!ids.length) {
      clear(listContainer).append(h('div', { class: 'empty compact-empty' }, 'Todavía no tienes favoritos. Marca una gasolinera con ★ para verla aquí.'));
      return;
    }
    try {
      const fuel = FuelStore.current();
      const stations = (await Api.stationsDetail(ids))
        .sort((a, b) => (numberValue(DiscountStore.effectivePrice(a.ideess, a[fuel.priceField] ?? a.precio)) ?? 999) - (numberValue(DiscountStore.effectivePrice(b.ideess, b[fuel.priceField] ?? b.precio)) ?? 999));
      clear(listContainer).append(StationList(stations, {
        ranked: true,
        sortByPrice: true,
        onFavoriteChange: load,
        emptyMessage: 'No tienes favoritos guardados.'
      }));
    } catch (error) {
      clear(listContainer).append(errorBox(error.message));
    }
  }

  const page = h('div', { class: 'dashboard favorites-page' },
    h('section', { class: 'page-title-row' },
      h('div', {}, h('span', { class: 'pill' }, 'Favoritos'), h('h1', {}, 'Tus estaciones'), h('p', {}, 'Ordenadas siempre de más barata a más cara.'))
    ),
    h('section', { class: 'glass-section stations-panel' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Favoritos'), h('p', { class: 'section-subtitle' }, 'Listado guardado en este dispositivo.'))
      ),
      listContainer
    )
  );

  load();
  return page;
}
