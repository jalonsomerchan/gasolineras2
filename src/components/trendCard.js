import { FuelStore } from '../state/fuelStore.js';
import { h } from '../utils/dom.js';
import { numberValue, shortPrice } from '../utils/format.js';

function points(values, width, height) {
  const valid = values.filter((item) => item.value !== null);
  if (!valid.length) return '';
  const min = Math.min(...valid.map((item) => item.value));
  const max = Math.max(...valid.map((item) => item.value));
  const span = Math.max(max - min, 0.001);
  return values.map((item, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = item.value === null ? height / 2 : height - ((item.value - min) / span) * (height - 20) - 10;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function shortDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || '';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function TrendCard(rows = []) {
  const fuel = FuelStore.current();
  const field = fuel.priceField;
  const data = rows.slice(-7).map((row) => ({
    label: shortDate(row.periodo || row.fecha || row.fecha_desde),
    value: numberValue(row[field])
  }));
  const latest = [...data].reverse().find((item) => item.value !== null)?.value ?? null;
  const polyline = points(data, 280, 92);

  return h('section', { class: 'trend-card' },
    h('div', { class: 'trend-header' },
      h('h2', {}, `Histórico ${fuel.label}`),
      h('span', {}, '7 días')
    ),
    h('div', { class: 'trend-body' },
      h('svg', { class: 'trend-chart', viewBox: '0 0 280 118', role: 'img', 'aria-label': 'Evolución de precios' },
        h('line', { x1: '0', y1: '100', x2: '280', y2: '100', class: 'trend-grid-line' }),
        h('line', { x1: '0', y1: '56', x2: '280', y2: '56', class: 'trend-grid-line' }),
        polyline ? h('polyline', { points: polyline, class: 'trend-line' }) : null,
        data.map((item, index) => {
          if (item.value === null) return null;
          const [x, y] = polyline.split(' ')[index].split(',');
          return h('circle', { cx: x, cy: y, r: '3.6', class: 'trend-dot' });
        }),
        data.map((item, index) => h('text', { x: String(data.length === 1 ? 140 : (index / (data.length - 1)) * 280), y: '116', class: 'trend-label', 'text-anchor': 'middle' }, item.label))
      ),
      h('div', { class: 'trend-summary' },
        h('strong', {}, shortPrice(latest)),
        h('span', {}, '€/L')
      )
    )
  );
}
