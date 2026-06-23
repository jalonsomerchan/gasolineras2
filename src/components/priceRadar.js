import { NEARBY_RADIUS_KM } from '../config/constants.js';
import { DiscountStore } from '../state/discountStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h } from '../utils/dom.js';
import { numberValue } from '../utils/format.js';
import { displayFuelPrice, visibleStations } from '../utils/stationSettings.js';

function avg(values) {
  const valid = values.filter((value) => value !== null);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function metric(label, value, tone = '') {
  const display = displayFuelPrice(value);
  return h('div', { class: `radar-metric ${tone}` },
    h('span', {}, label),
    h('strong', {}, display.main, display.secondary ? h('small', {}, display.secondary) : null)
  );
}

export function PriceRadar(stations = [], locationLabel = '') {
  const fuel = FuelStore.current();
  const list = visibleStations(stations);
  const prices = list
    .map((station) => DiscountStore.effectivePrice(station, station[fuel.priceField] ?? station.precio))
    .map(numberValue)
    .filter((value) => value && value > 0);
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const average = avg(prices);

  return h('section', { id: 'price-radar', class: 'radar-card' },
    h('div', { class: 'radar-header' },
      h('p', {}, 'Radar de precios'),
      h('span', {}, locationLabel ? `Dentro de ${NEARBY_RADIUS_KM} km · ${locationLabel}` : `Dentro de ${NEARBY_RADIUS_KM} km`)
    ),
    h('div', { class: 'radar-grid' },
      metric('Más barata', min, 'good'),
      metric('Media', average),
      metric('Más cara', max, 'warn')
    ),
    h('div', { class: 'radar-foot' },
      h('span', { class: 'live-dot', 'aria-hidden': 'true' }),
      h('span', {}, `Mostrando ${list.length || 0} estaciones para ${fuel.label}`)
    )
  );
}
