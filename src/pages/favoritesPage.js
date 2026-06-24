import { Api } from '../services/api.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { DiscountStore } from '../state/discountStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { SettingsStore } from '../state/settingsStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { dateText, numberValue, routePart, shortPrice, stationName } from '../utils/format.js';
import { displayDelta, displayFuelPrice, stationBrand } from '../utils/stationSettings.js';
import { StationList } from '../components/stationList.js';

function stationBasePrice(station, fuel) {
  return numberValue(station?.precio ?? station?.[fuel.priceField]);
}

function stationInfo(station, fuel) {
  const original = stationBasePrice(station, fuel);
  const info = DiscountStore.priceInfo(station, original);
  return { original, effective: numberValue(info.effective), info };
}

function average(values) {
  const clean = values.filter((value) => value !== null && value > 0);
  if (!clean.length) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function euro(value) {
  const parsed = numberValue(value);
  if (parsed === null || parsed <= 0) return '—';
  return `${parsed.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

function TankCost(value) {
  const capacity = SettingsStore.tankCapacityLiters();
  if (!capacity || !value) return h('a', { href: '#/ajustes', class: 'table-link' }, 'Configurar');
  return `${euro(value * capacity)}`;
}

function Difference(value, reference, best = false) {
  if (value === null || reference === null || value <= 0 || reference <= 0) return h('span', {}, '—');
  const delta = value - reference;
  if (Math.abs(delta) < 0.0005) return h('span', { class: best ? 'is-good' : 'is-neutral' }, best ? 'Más barata' : 'Igual');
  return h('span', { class: delta > 0 ? 'is-bad' : 'is-good' }, `${delta > 0 ? '+' : '-'}${displayDelta(Math.abs(delta))}`);
}

function ComparatorTable(stations, sortMode, setSortMode) {
  const fuel = FuelStore.current();
  const rows = stations.map((station) => {
    const info = stationInfo(station, fuel);
    const saving = info.original && info.effective ? Math.max(0, info.original - info.effective) : 0;
    return { station, ...info, saving };
  });
  const cheapest = Math.min(...rows.map((row) => row.effective).filter((value) => value !== null && value > 0));
  const avg = average(rows.map((row) => row.effective));
  const sorted = [...rows].sort((a, b) => {
    if (sortMode === 'saving') return (b.saving || 0) - (a.saving || 0) || (a.effective ?? 999) - (b.effective ?? 999);
    return (a.effective ?? 999) - (b.effective ?? 999);
  });

  if (!rows.length) return h('div', { class: 'empty compact-empty' }, 'Todavía no tienes favoritos.');

  return h('section', { class: 'favorite-comparator card' },
    h('div', { class: 'favorite-comparator-head' },
      h('div', {},
        h('span', { class: 'summary-kicker' }, 'Comparador'),
        h('h2', { class: 'section-title' }, 'Comparativa de favoritos'),
        h('p', { class: 'section-subtitle' }, `Precio actual, descuentos, diferencias y coste de depósito para ${fuel.label}.`)
      ),
      h('button', {
        class: `btn ${sortMode === 'saving' ? '' : 'ghost'}`,
        type: 'button',
        onClick: () => setSortMode(sortMode === 'saving' ? 'price' : 'saving')
      }, sortMode === 'saving' ? 'Ordenar por precio' : 'Ordenar por ahorro real')
    ),
    h('div', { class: 'favorite-table-wrap' },
      h('table', { class: 'favorite-table' },
        h('thead', {}, h('tr', {},
          h('th', {}, 'Gasolinera'),
          h('th', {}, 'Actual'),
          h('th', {}, 'Con descuentos'),
          h('th', {}, 'vs barata'),
          h('th', {}, 'vs media'),
          h('th', {}, 'Actualización'),
          h('th', {}, 'Depósito')
        )),
        h('tbody', {}, sorted.map((row) => h('tr', {},
          h('td', {},
            h('a', { href: `#/gasolinera/${row.station.ideess}` }, stationName(row.station)),
            h('small', {}, `${stationBrand(row.station)} · ${row.station.municipio || ''}`)
          ),
          h('td', {}, `${shortPrice(row.original)} €/L`),
          h('td', {},
            h('strong', {}, `${shortPrice(row.effective)} €/L`),
            row.info.hasDiscount ? h('small', { class: 'is-good' }, `Ahorro ${displayDelta(row.saving)}`) : null
          ),
          h('td', {}, Difference(row.effective, cheapest, true)),
          h('td', {}, Difference(row.effective, avg)),
          h('td', {}, row.station.fecha ? dateText(row.station.fecha) : '—'),
          h('td', {}, TankCost(row.effective))
        )))
      )
    )
  );
}

export function FavoritesPage() {
  const content = h('div', {}, loading('Cargando favoritos...'));
  let sortMode = 'price';

  async function load() {
    clear(content).append(loading('Cargando favoritos...'));
    const ids = FavoritesStore.all();
    if (!ids.length) {
      clear(content).append(h('div', { class: 'empty compact-empty' }, 'Todavía no tienes favoritos. Marca una gasolinera con ★ para verla aquí.'));
      return;
    }
    try {
      const fuel = FuelStore.current();
      const stations = await Api.stationsDetail(ids);
      const sorted = [...stations].sort((a, b) => (numberValue(DiscountStore.effectivePrice(a, a[fuel.priceField] ?? a.precio)) ?? 999) - (numberValue(DiscountStore.effectivePrice(b, b[fuel.priceField] ?? b.precio)) ?? 999));
      renderContent(sorted);
    } catch (error) {
      clear(content).append(errorBox(error.message));
    }
  }

  function setSortMode(next) {
    sortMode = next;
    load();
  }

  function renderContent(stations) {
    clear(content).append(
      ComparatorTable(stations, sortMode, setSortMode),
      h('section', { class: 'glass-section stations-panel' },
        h('div', { class: 'section-head' },
          h('div', {}, h('h2', { class: 'section-title' }, 'Listado de favoritos'), h('p', { class: 'section-subtitle' }, 'Las mismas tarjetas que en el resto de la app.'))
        ),
        StationList(stations, {
          sortByPrice: true,
          onFavoriteChange: load,
          emptyMessage: 'No tienes favoritos guardados.'
        })
      )
    );
  }

  const page = h('div', { class: 'dashboard favorites-page' },
    h('section', { class: 'page-title-row' },
      h('div', {}, h('span', { class: 'pill' }, 'Favoritos'), h('h1', {}, 'Tus estaciones'), h('p', {}, 'Comparador con descuentos, ahorro real y coste del depósito.'))
    ),
    content
  );

  load();
  return page;
}
