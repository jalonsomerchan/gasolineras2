import { Api } from '../services/api.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { dateText, distance, price, routePart, stationName } from '../utils/format.js';
import { Breadcrumbs } from '../components/breadcrumbs.js';
import { MapView } from '../components/mapView.js';
import { StationList } from '../components/stationList.js';
import { StatsGrid } from '../components/statsGrid.js';

export function StationPage(params) {
  const container = h('div', {}, loading('Cargando gasolinera...'));

  async function load() {
    try {
      const station = await Api.gasStation(params.ideess);
      const ranking = await Api.ranking({
        provincia: station.provincia,
        municipio: station.municipio,
        combustible: FuelStore.get(),
        order: 'baratas',
        limit: 8
      }).catch(() => []);
      render(station, ranking);
    } catch (error) {
      clear(container).append(errorBox(error.message));
    }
  }

  function render(station, ranking) {
    const fuel = FuelStore.current();
    const isFavorite = FavoritesStore.has(station.ideess);
    clear(container).append(
      Breadcrumbs([
        { label: station.provincia, href: `#/provincia/${routePart(station.provincia)}` },
        { label: station.municipio, href: `#/municipio/${routePart(station.provincia)}/${routePart(station.municipio)}` },
        { label: stationName(station) }
      ]),
      h('section', { class: 'hero' },
        h('span', { class: 'pill' }, station.rotulo || 'Gasolinera'),
        h('h1', {}, stationName(station)),
        h('p', {}, [station.direccion, station.municipio, station.provincia].filter(Boolean).join(' · ')),
        h('div', { class: 'station-actions' },
          h('button', {
            class: `btn ${isFavorite ? 'secondary' : ''}`,
            type: 'button',
            onClick: () => {
              FavoritesStore.toggle(station.ideess);
              render(station, ranking);
            }
          }, isFavorite ? '★ Quitar favorito' : '☆ Guardar favorito'),
          h('a', { class: 'btn ghost', href: `#/municipio/${routePart(station.provincia)}/${routePart(station.municipio)}` }, 'Ver municipio'),
          h('a', { class: 'btn ghost', href: `#/provincia/${routePart(station.provincia)}` }, 'Ver provincia')
        )
      ),
      h('section', { class: 'detail-layout' },
        h('div', { class: 'stack' },
          h('div', { class: 'card card-pad' },
            h('h2', { class: 'section-title' }, `Precio de ${fuel.label}`),
            h('div', { class: 'price-value', style: 'margin-top:.75rem;font-size:2.4rem' }, price(station[fuel.priceField])),
            h('p', { class: 'station-meta' }, station.fecha ? `Precio del ${dateText(station.fecha)}` : 'Sin fecha de actualización')
          ),
          MapView([station], { small: true })
        ),
        h('aside', { class: 'stack' },
          h('div', { class: 'card card-pad' },
            h('h2', { class: 'section-title' }, 'Resumen'),
            StatsGrid([
              { label: 'Actual', value: price(station[fuel.priceField]) },
              { label: 'Mínimo hoy', value: price(station[fuel.minField]) },
              { label: 'Máximo hoy', value: price(station[fuel.maxField]) }
            ])
          ),
          h('div', { class: 'card card-pad' },
            h('h2', { class: 'section-title' }, 'Datos'),
            h('p', { class: 'station-meta' }, `ID EESS: ${station.ideess}`),
            h('p', { class: 'station-meta' }, `Municipio: ${station.municipio}`),
            h('p', { class: 'station-meta' }, `Provincia: ${station.provincia}`)
          )
        )
      ),
      h('section', { class: 'section' },
        h('div', { class: 'section-head' },
          h('div', {}, h('h2', { class: 'section-title' }, 'Más baratas en este municipio'), h('p', { class: 'section-subtitle' }, 'Comparativa rápida con el combustible seleccionado.'))
        ),
        StationList(ranking.filter((item) => String(item.ideess) !== String(station.ideess)).slice(0, 6), { emptyMessage: 'No hay comparativa disponible.' })
      )
    );
  }

  load();
  return container;
}
