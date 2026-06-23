import { FuelStore } from '../state/fuelStore.js';
import { h } from '../utils/dom.js';
import { numberValue, shortPrice } from '../utils/format.js';

function avg(values) {
  const valid = values.filter((value) => value !== null);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function metric(label, value, tone = '') {
  return h('div', { class: `radar-metric ${tone}` },
    h('span', {}, label),
    h('strong', {}, shortPrice(value), h('small', {}, ' €/L'))
  );
}

export function PriceRadar(stations = [], locationLabel = '') {
  const fuel = FuelStore.current();
  const prices = stations.map((station) => numberValue(station[fuel.priceField] ?? station.precio)).filter((value) => value && value > 0);
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const average = avg(prices);

  return h('section', { id: 'price-radar', class: 'radar-card' },
    h('div', { class: 'radar-header' },
      h('p', {}, 'Radar de precios'),
      h('span', {}, locationLabel ? `Dentro de 35 km · ${locationLabel}` : 'Dentro de 35 km')
    ),
    h('div', { class: 'radar-grid' },
      metric('Más barata', min, 'good'),
      metric('Media', average),
      metric('Más cara', max, 'warn')
    ),
    h('div', { class: 'radar-foot' },
      h('span', { class: 'live-dot', 'aria-hidden': 'true' }),
      h('span', {}, `Mostrando ${stations.length || 0} estaciones para ${fuel.label}`)
    )
  );
}
