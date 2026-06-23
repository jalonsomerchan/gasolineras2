import { Api } from '../services/api.js';
import { FUELS } from '../config/fuels.js';
import { DiscountStore } from '../state/discountStore.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { dateText, numberValue, price, routePart, stationName } from '../utils/format.js';
import { displayDelta, displayFuelPrice } from '../utils/stationSettings.js';
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
  const currentInfo = DiscountStore.priceInfo(station.ideess, station[fuel.priceField]);
  const current = currentInfo.effective;
  const average = trendAverage(trendRows, fuel, station.fecha);
  if (current === null || average === null || average <= 0) return null;

  const delta = current - average;
  const suffix = currentInfo.hasDiscount ? ' con tu descuento aplicado' : '';
  if (Math.abs(delta) < 0.0005) {
    return { text: `Igual que la media de los últimos días${suffix}`, className: 'is-neutral' };
  }

  const amount = displayDelta(Math.abs(delta));
  if (delta > 0) {
    return { text: `+${amount} que la media de los últimos días${suffix}`, className: 'is-bad' };
  }
  return { text: `-${amount} que la media de los últimos días${suffix}`, className: 'is-good' };
}

function DiscountEditor(station, onChange) {
  const current = DiscountStore.get(station.ideess);
  const feedback = h('p', { class: 'discount-help' }, current > 0
    ? `Se está aplicando un descuento de -${DiscountStore.formatCents(current)} c/L a esta gasolinera.`
    : 'Guarda tu descuento personal para aplicarlo en todos los listados y mapas de esta gasolinera.');
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

  return h('section', { class: 'card discount-card' },
    h('div', { class: 'discount-card-head' },
      h('div', {},
        h('span', { class: 'summary-kicker' }, 'Descuento'),
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
  return h('section', { class: 'card station-fuels-card' },
    h('div', { class: 'station-fuels-head' },
      h('div', {},
        h('h2', { class: 'section-title' }, 'Precios disponibles'),
        h('p', { class: 'section-subtitle' }, 'Resumen actual de todos los combustibles en esta estación.')
      )
    ),
    h('div', { class: 'fuel-price-table' },
      FUELS.map((item) => {
        const info = DiscountStore.priceInfo(station.ideess, station[item.priceField]);
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
            info.hasDiscount ? h('em', {}, `Dto. -${DiscountStore.formatCents(info.discountCents)} c/L`) : null
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

function StationSummary(station, trendRows, selectedFuel) {
  const currentInfo = DiscountStore.priceInfo(station.ideess, station[selectedFuel.priceField]);
  const currentDisplay = displayFuelPrice(currentInfo.effective);
  const currentOriginalDisplay = currentInfo.hasDiscount ? displayFuelPrice(currentInfo.original) : null;
  const average = trendAverage(trendRows, selectedFuel, station.fecha);
  const fuelInfos = FUELS.map((item) => ({ item, info: DiscountStore.priceInfo(station.ideess, station[item.priceField]) }))
    .filter(({ info }) => info.effective !== null && info.effective > 0);
  const minAvailable = fuelInfos.length ? Math.min(...fuelInfos.map(({ info }) => info.effective)) : null;
  const bestFuel = fuelInfos.find(({ info }) => info.effective === minAvailable)?.item;

  return h('div', { class: 'card station-summary-card' },
    h('div', { class: 'station-summary-title' },
      h('span', { class: 'summary-kicker' }, 'Resumen'),
      h('strong', {}, station.fecha ? dateText(station.fecha) : 'Sin fecha')
    ),
    h('div', { class: 'summary-metrics' },
      h('article', { class: 'summary-metric is-primary' },
        h('span', {}, currentInfo.hasDiscount ? 'Ahora con descuento' : 'Ahora'),
        h('strong', {}, currentDisplay.main),
        h('small', {}, currentInfo.hasDiscount ? `Antes ${currentOriginalDisplay?.main || price(currentInfo.original)}` : (currentDisplay.secondary || selectedFuel.label))
      ),
      h('article', { class: 'summary-metric' },
        h('span', {}, 'Media 30 días'),
        h('strong', {}, displayFuelPrice(average).main),
        h('small', {}, displayFuelPrice(average).secondary || selectedFuel.label)
      ),
      h('article', { class: 'summary-metric' },
        h('span', {}, 'Más barato aquí'),
        h('strong', {}, displayFuelPrice(minAvailable).main),
        h('small', {}, bestFuel?.label || '—')
      )
    ),
    h('div', { class: 'summary-mini-grid' },
      h('div', {}, h('span', {}, 'Mínimo hoy'), h('strong', {}, displayFuelPrice(station[selectedFuel.minField]).main)),
      h('div', {}, h('span', {}, 'Máximo hoy'), h('strong', {}, displayFuelPrice(station[selectedFuel.maxField]).main)),
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
    const currentInfo = DiscountStore.priceInfo(station.ideess, station[fuel.priceField]);
    const currentDisplay = displayFuelPrice(currentInfo.effective);
    const originalDisplay = currentInfo.hasDiscount ? displayFuelPrice(currentInfo.original) : null;

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
          h('div', { class: `card station-current-card ${currentInfo.hasDiscount ? 'has-discount' : ''}` },
            h('span', { class: 'summary-kicker' }, `Precio de ${fuel.label}`),
            currentInfo.hasDiscount ? h('p', { class: 'station-original-price' }, `Antes: ${originalDisplay?.main || price(currentInfo.original)}`) : null,
            h('div', { class: 'station-current-price' }, currentDisplay.main),
            currentDisplay.secondary ? h('p', { class: 'station-meta' }, currentDisplay.secondary) : null,
            currentInfo.hasDiscount ? h('p', { class: 'station-discount-note' }, `Descuento aplicado: -${DiscountStore.formatCents(currentInfo.discountCents)} c/L`) : null,
            diff ? h('p', { class: `current-price-diff ${diff.className}` }, diff.text) : h('p', { class: 'current-price-diff is-neutral' }, 'Sin histórico suficiente para comparar con la media.'),
            h('p', { class: 'station-meta' }, station.fecha ? `Precio del ${dateText(station.fecha)}` : 'Sin fecha de actualización')
          ),
          MapView([station], { small: true })
        ),
        h('aside', { class: 'stack' },
          DiscountEditor(station, () => render(station, ranking, trendRows)),
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
        StationList(ranking.filter((item) => String(item.ideess) !== String(station.ideess)).slice(0, 6), { emptyMessage: 'No hay comparativa disponible.', sortByPrice: true })
      )
    );
  }

  load();
  return container;
}
