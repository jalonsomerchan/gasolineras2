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

export function MunicipalityPage(params) {
  const provincia = decodeURIComponent(params.provincia || '');
  const municipio = decodeURIComponent(params.municipio || '');
  const container = h('div', {}, loading('Cargando municipio...'));

  async function load() {
    try {
      const fuel = FuelStore.current();
      const [stats, stationsResult, ranking, mapStations, trend] = await Promise.all([
        Api.stats({ provincia, municipio }),
        Api.stations({ provincia, municipio, combustible: fuel.id, order: 'precio_asc', limit: 80 }),
        Api.ranking({ provincia, municipio, combustible: fuel.id, order: 'baratas', limit: 10 }),
        Api.map({ provincia, municipio, limit: 300 }),
        Api.trend({ provincia, municipio, periodo: 'dia', fecha_desde: dateNDaysAgo(30) }).catch(() => ({ data: [] }))
      ]);
      render(stats, stationsResult.data || [], ranking, mapStations, trend?.data || []);
    } catch (error) {
      clear(container).append(errorBox(error.message));
    }
  }

  function render(stats, stations, ranking, mapStations, trendRows = []) {
    const fuel = FuelStore.current();
    clear(container).append(
      Breadcrumbs([
        { label: provincia, href: `#/provincia/${routePart(provincia)}` },
        { label: municipio }
      ]),
      h('section', { class: 'hero' },
        h('span', { class: 'pill' }, 'Municipio'),
        h('h1', {}, `Gasolineras en ${municipio}`),
        h('p', {}, `Consulta precios de ${fuel.label} en ${municipio}, ${provincia}.`)
      ),
      h('section', { class: 'section' },
        h('div', { class: 'card card-pad' },
          StatsGrid([
            { label: 'Gasolineras', value: integer(stats?.total_gasolineras) },
            { label: `Media ${fuel.shortLabel}`, value: price(stats?.[fuel.priceField]) },
            { label: `Mínimo ${fuel.shortLabel}`, value: price(stats?.[fuel.minField]) }
          ])
        )
      ),
      HistoricalChart(trendRows, {
        title: `Histórico ${fuel.label} en ${municipio}`,
        subtitle: `Media diaria de ${municipio}, ${provincia}`,
        limit: 30,
        ariaLabel: `Histórico de precios en ${municipio}`
      }),
      h('section', { class: 'grid-two section' },
        h('div', { class: 'stack' },
          h('div', { class: 'section-head' },
            h('div', {}, h('h2', { class: 'section-title' }, 'Listado de gasolineras'), h('p', { class: 'section-subtitle' }, 'Ordenadas por precio ascendente.'))
          ),
          StationList(stations)
        ),
        h('aside', { class: 'stack' },
          MapView(mapStations, { small: false }),
          h('div', { class: 'card card-pad' },
            h('h2', { class: 'section-title' }, 'Top precios'),
            StationList(ranking.slice(0, 5), { emptyMessage: 'No hay ranking disponible.' })
          )
        )
      )
    );
  }

  load();
  return container;
}
