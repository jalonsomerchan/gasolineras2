import { Api } from '../services/api.js';
import { FUELS } from '../config/fuels.js';
import { DiscountStore } from '../state/discountStore.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { dateText, numberValue, price, routePart, stationName } from '../utils/format.js';
import { displayDelta, displayFuelPrice, stationBrand } from '../utils/stationSettings.js';
import { Breadcrumbs } from '../components/breadcrumbs.js';
import { MapView } from '../components/mapView.js';
import { StationList } from '../components/stationList.js';
import { HistoricalExplorer } from '../components/historicalExplorer.js';
import { NavigationActions } from '../components/navigationActions.js';
import { SharePrice } from '../components/sharePrice.js';

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
  const currentInfo = DiscountStore.priceInfo(station, station[fuel.priceField]);
  const current = currentInfo.effective;
  const average = trendAverage(trendRows, fuel, station.fecha);
  if (current === null || average === null || average <= 0) return null;

  const delta = current - average;
  const suffix = currentInfo.hasDiscount ? ' con descuentos aplicados' : '';
  if (Math.abs(delta) < 0.0005) {
    return { text: `Igual que la media de los últimos días${suffix}`, className: 'is-neutral' };
  }

  const amount = displayDelta(Math.abs(delta));
  if (delta > 0) return { text: `+${amount} que la media de los últimos días${suffix}`, className: 'is-bad' };
  return { text: `-${amount} que la media de los últimos días${suffix}`, className: 'is-good' };
}

function DiscountEditor(station, onChange) {
  const current = DiscountStore.get(station.ideess);
  const brand = stationBrand(station);
  const brandDiscount = DiscountStore.getBrand(brand);
  const feedback = h('p', { class: 'discount-help' }, current > 0
    ? `Se está aplicando un descuento propio de -${DiscountStore.formatCents(current)} c/L a esta gasolinera.`
    : brandDiscount > 0
      ? `Además se aplica el descuento de marca ${brand}: -${DiscountStore.formatCents(brandDiscount)} c/L.`
      : 'Guarda un descuento personal para esta estación. Los descuentos por marca se editan en Ajustes.');
  const input = h('input', {
    class: 'discount-input',
    id: `discount-${station.ideess}`,
    type: 'number',
    min: '0',
    max: '300',
    step: '0.1',
    inputmode: 'decimal',
    placeholder: 'Ej. 10',
    value: current || ''
  });

  function saveDiscount(event) {
    event?.preventDefault?.();
    const saved = DiscountStore.set(station.ideess, input.value);
    feedback.textContent = saved > 0
      ? `Descuento guardado: -${DiscountStore.formatCents(saved)} c/L aplicado a esta gasolinera.`
      : 'Descuento eliminado para esta gasolinera.';
    onChange?.();
  }

  return h('section', { class: 'card discount-card station-editor-card' },
    h('div', { class: 'discount-card-head' },
      h('div', {},
        h('span', { class: 'summary-kicker' }, 'Descuento de estación'),
        h('h2', { class: 'section-title' }, '¿Tienes descuento?')
      ),
      current > 0 ? h('span', { class: 'discount-pill' }, `-${DiscountStore.formatCents(current)} c/L`) : null
    ),
    h('form', { class: 'discount-form', onSubmit: saveDiscount },
      h('label', { for: `discount-${station.ideess}` }, 'Céntimos por litro'),
      h('div', { class: 'discount-input-row' },
        input,
        h('span', {}, 'c/L'),
        h('button', { class: 'btn', type: 'submit' }, 'Aplicar')
      )
    ),
    feedback
  );
}

function FuelPricesSummary(station) {
  return h('section', { class: 'card station-fuels-card station-wide-card' },
    h('div', { class: 'station-fuels-head' },
      h('div', {},
        h('span', { class: 'summary-kicker' }, 'Todos los combustibles'),
        h('h2', { class: 'section-title' }, 'Precios disponibles'),
        h('p', { class: 'section-subtitle' }, 'Precio final aplicando tus descuentos de marca o gasolinera.')
      )
    ),
    h('div', { class: 'fuel-price-table' },
      FUELS.map((item) => {
        const info = DiscountStore.priceInfo(station, station[item.priceField]);
        const display = displayFuelPrice(info.effective);
        const originalDisplay = info.hasDiscount ? displayFuelPrice(info.original) : null;
        return h('article', { class: `fuel-price-row ${info.hasDiscount ? 'has-discount' : ''}` },
          h('div', { class: 'fuel-price-main' },
            h('span', { class: 'fuel-price-icon', 'aria-hidden': 'true' }, item.id === 'gasoleo_a' ? '◆' : '⛽'),
            h('div', {},
              h('strong', {}, item.label),
              h('small', {}, station.fecha ? `Actualizado ${dateText(station.fecha)}` : 'Sin actualización')
            )
          ),
          h('div', { class: 'fuel-price-current' },
            info.hasDiscount ? h('small', { class: 'fuel-price-original' }, originalDisplay?.main || price(info.original)) : null,
            h('strong', {}, display.main),
            display.secondary ? h('small', { class: 'fuel-price-secondary' }, display.secondary) : null,
            info.hasDiscount ? h('em', {}, DiscountStore.discountDescription(info)) : null
          ),
          h('div', { class: 'fuel-price-range' },
            h('span', {}, `Mín. ${displayFuelPrice(station[item.minField]).main}`),
            h('span', {}, `Máx. ${displayFuelPrice(station[item.maxField]).main}`)
          )
        );
      })
    )
  );
}

function SummaryTile(label, value, detail = '', tone = '') {
  return h('article', { class: `station-summary-tile ${tone}` },
    h('span', {}, label),
    h('strong', {}, value),
    detail ? h('small', {}, detail) : null
  );
}

function StationSummary(station, trendRows, selectedFuel) {
  const currentInfo = DiscountStore.priceInfo(station, station[selectedFuel.priceField]);
  const currentDisplay = displayFuelPrice(currentInfo.effective);
  const currentOriginalDisplay = currentInfo.hasDiscount ? displayFuelPrice(currentInfo.original) : null;
  const average = trendAverage(trendRows, selectedFuel, station.fecha);
  const averageDisplay = displayFuelPrice(average);
  const fuelInfos = FUELS.map((item) => ({ item, info: DiscountStore.priceInfo(station, station[item.priceField]) }))
    .filter(({ info }) => info.effective !== null && info.effective > 0);
  const minAvailable = fuelInfos.length ? Math.min(...fuelInfos.map(({ info }) => info.effective)) : null;
  const bestFuel = fuelInfos.find(({ info }) => info.effective === minAvailable)?.item;

  return h('section', { class: 'card station-summary-card station-modern-summary' },
    h('div', { class: 'station-summary-title' },
      h('div', {}, h('span', { class: 'summary-kicker' }, 'Resumen'), h('h2', { class: 'section-title' }, 'Vista rápida')),
      h('strong', {}, station.fecha ? dateText(station.fecha) : 'Sin fecha')
    ),
    h('div', { class: 'station-summary-feature' },
      h('span', {}, currentInfo.hasDiscount ? 'Ahora con descuentos' : 'Ahora'),
      currentInfo.hasDiscount ? h('small', {}, `Antes ${currentOriginalDisplay?.main || price(currentInfo.original)}`) : null,
      h('strong', {}, currentDisplay.main),
      h('em', {}, currentDisplay.secondary || selectedFuel.label)
    ),
    h('div', { class: 'station-summary-tiles' },
      SummaryTile('Media 30 días', averageDisplay.main, averageDisplay.secondary || selectedFuel.label),
      SummaryTile('Más barato aquí', displayFuelPrice(minAvailable).main, bestFuel?.label || '—', 'is-good'),
      SummaryTile('Mínimo hoy', displayFuelPrice(station[selectedFuel.minField]).main, selectedFuel.label),
      SummaryTile('Máximo hoy', displayFuelPrice(station[selectedFuel.maxField]).main, selectedFuel.label),
      SummaryTile('Marca', stationBrand(station), station.municipio || ''),
      SummaryTile('Municipio', station.municipio || '—', station.provincia || '')
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
    const currentInfo = DiscountStore.priceInfo(station, station[fuel.priceField]);
    const currentDisplay = displayFuelPrice(currentInfo.effective);
    const originalDisplay = currentInfo.hasDiscount ? displayFuelPrice(currentInfo.original) : null;

    clear(container).append(
      Breadcrumbs([
        { label: station.provincia, href: `#/provincia/${routePart(station.provincia)}` },
        { label: station.municipio, href: `#/municipio/${routePart(station.provincia)}/${routePart(station.municipio)}` },
        { label: stationName(station) }
      ]),
      h('section', { class: 'station-hero-v16' },
        h('div', { class: 'station-hero-meta' },
          h('span', { class: 'pill' }, stationBrand(station)),
          station.fecha ? h('span', { class: 'pill' }, `Actualizado ${dateText(station.fecha)}`) : null
        ),
        h('div', { class: 'station-hero-content' },
          h('div', {},
            h('h1', {}, stationName(station)),
            h('p', {}, [station.direccion, station.municipio, station.provincia].filter(Boolean).join(' · '))
          ),
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
        )
      ),
      h('section', { class: 'station-layout-v16' },
        h('div', { class: 'station-main-column' },
          h('div', { class: `card station-current-card station-current-v16 ${currentInfo.hasDiscount ? 'has-discount' : ''}` },
            h('span', { class: 'summary-kicker' }, `Precio de ${fuel.label}`),
            currentInfo.hasDiscount ? h('p', { class: 'station-original-price' }, `Antes: ${originalDisplay?.main || price(currentInfo.original)}`) : null,
            h('div', { class: 'station-current-price' }, currentDisplay.main),
            currentDisplay.secondary ? h('p', { class: 'station-meta' }, currentDisplay.secondary) : null,
            currentInfo.hasDiscount ? h('p', { class: 'station-discount-note' }, DiscountStore.discountDescription(currentInfo)) : null,
            diff ? h('p', { class: `current-price-diff ${diff.className}` }, diff.text) : h('p', { class: 'current-price-diff is-neutral' }, 'Sin histórico suficiente para comparar con la media.'),
            h('p', { class: 'station-meta' }, station.fecha ? `Precio del ${dateText(station.fecha)}` : 'Sin fecha de actualización')
          ),
          MapView([station], { small: true })
        ),
        h('aside', { class: 'station-side-column' },
          StationSummary(station, trendRows, fuel),
          DiscountEditor(station, () => render(station, ranking, trendRows)),
          h('div', { class: 'card card-pad station-data-card station-data-v16' },
            h('h2', { class: 'section-title' }, 'Datos'),
            h('dl', { class: 'station-data-list' },
              h('div', {}, h('dt', {}, 'ID EESS'), h('dd', {}, station.ideess || '—')),
              h('div', {}, h('dt', {}, 'Municipio'), h('dd', {}, station.municipio || '—')),
              h('div', {}, h('dt', {}, 'Provincia'), h('dd', {}, station.provincia || '—')),
              h('div', {}, h('dt', {}, 'Marca detectada'), h('dd', {}, stationBrand(station)))
            )
          )
        )
      ),
      NavigationActions(station),
      FuelPricesSummary(station),
      SharePrice(station),
      HistoricalExplorer({
        heading: 'Histórico de precios',
        title: `Histórico ${fuel.label} en esta gasolinera`,
        subtitle: stationName(station),
        initialRows: trendRows,
        filters: { ideess: params.ideess },
        ariaLabel: `Histórico de precios de ${stationName(station)}`
      }),
      h('section', { class: 'section' },
        h('div', { class: 'section-head' },
          h('div', {}, h('h2', { class: 'section-title' }, 'Más baratas en este municipio'), h('p', { class: 'section-subtitle' }, 'Comparativa rápida con el combustible seleccionado.'))
        ),
        StationList(ranking.filter((item) => String(item.ideess) !== String(station.ideess)).slice(0, 6), { emptyMessage: 'No hay comparativa disponible.', sortByPrice: true })
      )
    );
  }

  load();
  return container;
}
