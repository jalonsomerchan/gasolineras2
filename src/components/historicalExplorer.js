import { Api } from '../services/api.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, clear, loading, errorBox } from '../utils/dom.js';
import { numberValue, shortPrice } from '../utils/format.js';
import { displayDelta } from '../utils/stationSettings.js';
import { HistoricalChart } from './historicalChart.js';

const PERIODS = [
  { id: '7', label: '7 días', days: 7, limit: 7 },
  { id: '30', label: '30 días', days: 30, limit: 30 },
  { id: '90', label: '90 días', days: 90, limit: 90 },
  { id: '365', label: '1 año', days: 365, limit: 365 },
  { id: 'all', label: 'Desde siempre', from: '2000-01-01' }
];

function dateNDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function rowDate(row) {
  return String(row?.periodo || row?.fecha || row?.fecha_desde || '').slice(0, 10);
}

function rowValue(row, fuel) {
  return numberValue(row?.[fuel.priceField] ?? row?.precio);
}

function normalize(rows) {
  const fuel = FuelStore.current();
  return (rows || [])
    .map((row) => ({ date: rowDate(row), value: rowValue(row, fuel) }))
    .filter((item) => item.date && item.value !== null && item.value > 0);
}

function shortDate(value) {
  const date = new Date(`${String(value || '').slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
}

function stats(rows) {
  const data = normalize(rows);
  if (!data.length) return null;
  const values = data.map((item) => item.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  const first = data.at(0)?.value ?? null;
  const last = data.at(-1)?.value ?? null;
  const trend = first !== null && last !== null ? last - first : null;
  const best = data.find((item) => item.value === min);
  return { min, max, avg, trend, best, count: data.length };
}

function Stat(label, value, detail = '', tone = '') {
  return h('article', { class: `period-stat ${tone}` },
    h('span', {}, label),
    h('strong', {}, value),
    detail ? h('small', {}, detail) : null
  );
}

function StatsSummary(rows) {
  const fuel = FuelStore.current();
  const item = stats(rows);
  if (!item) return h('div', { class: 'period-stats-empty' }, 'No hay suficientes datos para calcular el resumen del periodo.');
  const trendTone = item.trend > 0.0005 ? 'is-bad' : item.trend < -0.0005 ? 'is-good' : 'is-neutral';
  const trendText = Math.abs(item.trend || 0) < 0.0005
    ? 'estable'
    : `${item.trend > 0 ? '+' : '-'}${displayDelta(Math.abs(item.trend))}`;
  return h('div', { class: 'period-stats' },
    Stat('Mínimo', `${shortPrice(item.min)} €/L`, fuel.label, 'is-good'),
    Stat('Máximo', `${shortPrice(item.max)} €/L`, fuel.label, 'is-bad'),
    Stat('Media', `${shortPrice(item.avg)} €/L`, `${item.count} registros`),
    Stat('Tendencia', trendText, item.trend > 0.0005 ? 'subiendo' : item.trend < -0.0005 ? 'bajando' : 'sin cambios', trendTone),
    Stat('Mejor día', shortDate(item.best?.date), `${shortPrice(item.best?.value)} €/L`, 'is-good')
  );
}

export function HistoricalExplorer(options = {}) {
  const period = options.initialPeriod || '30';
  let currentPeriod = PERIODS.find((item) => item.id === period) || PERIODS[1];
  let rows = options.initialRows || [];

  function subtitleForPeriod() {
    if (options.subtitle) return options.subtitle;
    return currentPeriod.id === 'all'
      ? 'Todo el histórico disponible'
      : `Últimos ${currentPeriod.label}`;
  }

  const body = h('div', { class: 'historical-explorer-body' });
  const buttons = h('div', { class: 'period-buttons', role: 'tablist', 'aria-label': 'Periodo histórico' });

  function renderButtons() {
    clear(buttons).append(...PERIODS.map((item) => h('button', {
      class: item.id === currentPeriod.id ? 'is-active' : '',
      type: 'button',
      onClick: () => loadPeriod(item)
    }, item.label)));
  }

  function renderBody() {
    clear(body).append(
      HistoricalChart(rows, {
        title: options.title || `Histórico ${FuelStore.current().label}`,
        subtitle: subtitleForPeriod(),
        limit: currentPeriod.limit,
        ariaLabel: options.ariaLabel || 'Histórico de precios'
      }),
      StatsSummary(rows)
    );
  }

  async function loadPeriod(nextPeriod) {
    currentPeriod = nextPeriod;
    renderButtons();
    clear(body).append(loading(`Cargando histórico de ${nextPeriod.label}...`));
    try {
      const result = await Api.trend({
        ...(options.filters || {}),
        periodo: 'dia',
        fecha_desde: nextPeriod.from || (nextPeriod.days ? dateNDaysAgo(nextPeriod.days) : undefined)
      });
      rows = result?.data || [];
      renderBody();
    } catch (error) {
      clear(body).append(errorBox(error.message));
    }
  }

  renderButtons();
  renderBody();

  return h('section', { class: 'historical-explorer' },
    h('div', { class: 'historical-explorer-head' },
      h('div', {},
        h('span', { class: 'summary-kicker' }, 'Histórico'),
        h('h2', { class: 'section-title' }, options.heading || 'Evolución del precio')
      ),
      buttons
    ),
    body
  );
}
