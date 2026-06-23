import { Api } from '../services/api.js';
import { FUELS } from '../config/fuels.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { dateText, numberValue, price, routePart, shortPrice, stationName } from '../utils/format.js';
import { Breadcrumbs } from '../components/breadcrumbs.js';
import { MapView } from '../components/mapView.js';
import { StationList } from '../components/stationList.js';
import { HistoricalChart } from '../components/historicalChart.js';

function dateNDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function trendAverage(rows, fuel, currentDate) {
  const values = (rows || [])
    .filter((row) => String(row.periodo || row.fecha || row.fecha_desde || '').slice(0, 10) !== String(currentDate || '').slice(0, 10))
    .map((row) => numberValue(row[fuel.priceField] ?? row.precio))
    .filter((value) => value !== null && value > 0);

  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function currentVsAverage(station, trendRows, fuel) {
  const current = numberValue(station[fuel.priceField]);
  const average = trendAverage(trendRows, fuel, station.fecha);
  if (current === null || average === null || average <= 0) return null;

  const delta = current - average;
  if (Math.abs(delta) < 0.0005) {
    return { text: 'Igual que la media de los últimos días', className: 'is-neutral' };
  }

  const amount = `${shortPrice(Math.abs(delta))} €/L`;
  if (delta > 0) {
    return { text: `+${amount} que la media de los últimos días`, className: 'is-bad' };
  }
  return { text: `-${amount} que la media de los últimos días`, className: 'is-good' };
}

function FuelPricesSummary(station) {
  return h('section', { class: 'card station-fuels-card' },
    h('div', { class: 'station-fuels-head' },
      h('div', {},
        h('h2', { class: 'section-title' }, 'Precios disponibles'),
        h('p', { class: 'section-subtitle' }, 'Resumen actual de todos los combustibles en esta estación.')
      )
    ),
    h('div', { class: 'fuel-price-table' },
      FUELS.map((item) => h('article', { class: 'fuel-price-row' },
        h('div', { class: 'fuel-price-main' },
          h('span', { class: 'fuel-price-icon', 'aria-hidden': 'true' }, item.id === 'gasoleo_a' ? '◆' : '⛽'),
          h('div', {},
            h('strong', {}, item.label),
            h('small', {}, station.fecha ? `Actualizado ${dateText(station.fecha)}` : 'Sin actualización')
          )
        ),
        h('div', { class: 'fuel-price-current' }, price(station[item.priceField])),
        h('div', { class: 'fuel-price-range' },
          h('span', {}, `Mín. ${price(station[item.minField])}`),
          h('span', {}, `Máx. ${price(station[item.maxField])}`)
        )
      ))
    )
  );
}

function StationSummary(station, trendRows, selectedFuel) {
  const current = numberValue(station[selectedFuel.priceField]);
  const average = trendAverage(trendRows, selectedFuel, station.fecha);
  const minAvailable = Math.min(...FUELS.map((item) => numberValue(station[item.priceField])).filter((value) => value !== null && value > 0));
  const bestFuel = FUELS.find((item) => numberValue(station[item.priceField]) === minAvailable);

  return h('div', { class: 'card station-summary-card' },
    h('div', { class: 'station-summary-title' },
      h('span', { class: 'summary-kicker' }, 'Resumen'),
      h('strong', {}, station.fecha ? dateText(station.fecha) : 'Sin fecha')
    ),
    h('div', { class: 'summary-metrics' },
      h('article', { class: 'summary-metric is-primary' },
        h('span', {}, 'Ahora'),
        h('strong', {}, price(current)),
        h('small', {}, selectedFuel.label)
      ),
      h('article', { class: 'summary-metric' },
        h('span', {}, 'Media 30 días'),
        h('strong', {}, price(average)),
        h('small', {}, selectedFuel.label)
      ),
      h('article', { class: 'summary-metric' },
        h('span', {}, 'Más barato aquí'),
        h('strong', {}, price(minAvailable)),
        h('small', {}, bestFuel?.label || '—')
      )
    ),
    h('div', { class: 'summary-mini-grid' },
      h('div', {}, h('span', {}, 'Mínimo hoy'), h('strong', {}, price(station[selectedFuel.minField]))),
      h('div', {}, h('span', {}, 'Máximo hoy'), h('strong', {}, price(station[selectedFuel.maxField]))),
      h('div', {}, h('span', {}, 'Municipio'), h('strong', {}, station.municipio || '—'))
    )
  );
}

export function StationPage(params) {
  const container = h('div', {}, loading('Cargando gasolinera...'));

  async function load() {
    try {
      const station = await Api.gasStation(params.ideess);
      const [ranking, trend] = await Promise.all([
        Api.ranking({
          provincia: station.provincia,
          municipio: station.municipio,
          combustible: FuelStore.get(),
          order: 'baratas',
          limit: 8
        }).catch(() => []),
        Api.trend({ ideess: params.ideess, periodo: 'dia', fecha_desde: dateNDaysAgo(30) }).catch(() => ({ data: [] }))
      ]);
      render(station, ranking, trend?.data || []);
    } catch (error) {
      clear(container).append(errorBox(error.message));
    }
  }

  function render(station, ranking, trendRows = []) {
    const fuel = FuelStore.current();
    const isFavorite = FavoritesStore.has(station.ideess);
    const diff = currentVsAverage(station, trendRows, fuel);

    clear(container).append(
      Breadcrumbs([
        { label: station.provincia, href: `#/provincia/${routePart(station.provincia)}` },
        { label: station.municipio, href: `#/municipio/${routePart(station.provincia)}/${routePart(station.municipio)}` },
        { label: stationName(station) }
      ]),
      h('section', { class: 'hero station-hero' },
        h('div', { class: 'station-hero-top' },
          h('span', { class: 'pill' }, station.rotulo || 'Gasolinera'),
          station.fecha ? h('span', { class: 'pill' }, `Actualizado ${dateText(station.fecha)}`) : null
        ),
        h('h1', {}, stationName(station)),
        h('p', {}, [station.direccion, station.municipio, station.provincia].filter(Boolean).join(' · ')),
        h('div', { class: 'station-actions' },
          h('button', {
            class: `btn ${isFavorite ? 'secondary' : ''}`,
            type: 'button',
            onClick: () => {
              FavoritesStore.toggle(station.ideess);
              render(station, ranking, trendRows);
            }
          }, isFavorite ? '★ Quitar favorito' : '☆ Guardar favorito'),
          h('a', { class: 'btn ghost', href: `#/municipio/${routePart(station.provincia)}/${routePart(station.municipio)}` }, 'Ver municipio'),
          h('a', { class: 'btn ghost', href: `#/provincia/${routePart(station.provincia)}` }, 'Ver provincia')
        )
      ),
      h('section', { class: 'station-detail-grid' },
        h('div', { class: 'stack' },
          h('div', { class: 'card station-current-card' },
            h('span', { class: 'summary-kicker' }, `Precio de ${fuel.label}`),
            h('div', { class: 'station-current-price' }, price(station[fuel.priceField])),
            diff ? h('p', { class: `current-price-diff ${diff.className}` }, diff.text) : h('p', { class: 'current-price-diff is-neutral' }, 'Sin histórico suficiente para comparar con la media.'),
            h('p', { class: 'station-meta' }, station.fecha ? `Precio del ${dateText(station.fecha)}` : 'Sin fecha de actualización')
          ),
          MapView([station], { small: true })
        ),
        h('aside', { class: 'stack' },
          StationSummary(station, trendRows, fuel),
          h('div', { class: 'card card-pad station-data-card' },
            h('h2', { class: 'section-title' }, 'Datos'),
            h('p', { class: 'station-meta' }, `ID EESS: ${station.ideess}`),
            h('p', { class: 'station-meta' }, `Municipio: ${station.municipio}`),
            h('p', { class: 'station-meta' }, `Provincia: ${station.provincia}`)
          )
        )
      ),
      FuelPricesSummary(station),
      HistoricalChart(trendRows, {
        title: `Histórico ${fuel.label} en esta gasolinera`,
        subtitle: stationName(station),
        limit: 30,
        ariaLabel: `Histórico de precios de ${stationName(station)}`
      }),
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
