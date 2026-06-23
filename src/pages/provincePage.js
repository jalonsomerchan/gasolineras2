import { Api } from '../services/api.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { integer, price, routePart } from '../utils/format.js';
import { Breadcrumbs } from '../components/breadcrumbs.js';
import { MapView } from '../components/mapView.js';
import { StationList } from '../components/stationList.js';
import { StatsGrid } from '../components/statsGrid.js';
import { HistoricalChart } from '../components/historicalChart.js';

function dateNDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function ProvincePage(params) {
  const provincia = decodeURIComponent(params.provincia || '');
  const container = h('div', {}, loading('Cargando provincia...'));

  async function load() {
    try {
      const fuel = FuelStore.current();
      const [stats, municipalities, ranking, mapStations, trend] = await Promise.all([
        Api.stats({ provincia }),
        Api.municipalities({ provincia }),
        Api.ranking({ provincia, combustible: fuel.id, order: 'baratas', limit: 12 }),
        Api.map({ provincia, limit: 500 }),
        Api.trend({ provincia, periodo: 'dia', fecha_desde: dateNDaysAgo(30) }).catch(() => ({ data: [] }))
      ]);
      render(stats, municipalities, ranking, mapStations, trend?.data || []);
    } catch (error) {
      clear(container).append(errorBox(error.message));
    }
  }

  function municipalityCard(item) {
    const fuel = FuelStore.current();
    return h('a', { class: 'soft-card', href: `#/municipio/${routePart(item.provincia)}/${routePart(item.municipio)}` },
      h('strong', {}, item.municipio),
      h('p', { class: 'station-meta' }, `${integer(item.total_gasolineras)} gasolineras · media ${price(item[fuel.priceField])}`)
    );
  }

  function render(stats, municipalities, ranking, mapStations, trendRows = []) {
    const fuel = FuelStore.current();
    clear(container).append(
      Breadcrumbs([{ label: provincia }]),
      h('section', { class: 'hero' },
        h('span', { class: 'pill' }, 'Provincia'),
        h('h1', {}, `Precio de carburantes en ${provincia}`),
        h('p', {}, `Resumen provincial para ${fuel.label}, municipios y gasolineras más baratas.`)
      ),
      h('section', { class: 'section' },
        h('div', { class: 'card card-pad' },
          StatsGrid([
            { label: 'Gasolineras', value: integer(stats?.total_gasolineras) },
            { label: 'Municipios', value: integer(stats?.total_municipios) },
            { label: `Media ${fuel.shortLabel}`, value: price(stats?.[fuel.priceField]) }
          ])
        )
      ),
      HistoricalChart(trendRows, {
        title: `Histórico ${fuel.label} en ${provincia}`,
        subtitle: `Media diaria provincial`,
        limit: 30,
        ariaLabel: `Histórico de precios en ${provincia}`
      }),
      h('section', { class: 'grid-two section' },
        h('div', { class: 'stack' },
          h('div', { class: 'section-head' },
            h('div', {}, h('h2', { class: 'section-title' }, 'Municipios'), h('p', { class: 'section-subtitle' }, 'Entra en un municipio para ver sus gasolineras.'))
          ),
          h('div', { class: 'station-list' }, municipalities.map(municipalityCard))
        ),
        h('aside', { class: 'stack' },
          MapView(mapStations, { small: false }),
          h('div', { class: 'card card-pad' },
            h('h2', { class: 'section-title' }, 'Más baratas'),
            StationList(ranking, { emptyMessage: 'No hay ranking disponible.' })
          )
        )
      )
    );
  }

  load();
  return container;
}
