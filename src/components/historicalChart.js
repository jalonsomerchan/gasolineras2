import { FuelStore } from '../state/fuelStore.js';
import { ensureChart } from '../services/chartLoader.js';
import { h } from '../utils/dom.js';
import { numberValue, shortPrice } from '../utils/format.js';

let chartId = 0;

function shortDate(value) {
  const raw = String(value || '').slice(0, 10);
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value || '';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function cssVar(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function normalizeRows(rows, limit) {
  const fuel = FuelStore.current();
  return (rows || [])
    .slice(-limit)
    .map((row) => ({
      label: shortDate(row.periodo || row.fecha || row.fecha_desde),
      value: numberValue(row[fuel.priceField] ?? row.precio)
    }))
    .filter((item) => item.label && item.value !== null && item.value > 0);
}

function average(data) {
  if (!data.length) return null;
  return data.reduce((sum, item) => sum + item.value, 0) / data.length;
}

export function HistoricalChart(rows = [], options = {}) {
  const fuel = FuelStore.current();
  const id = `chart-${++chartId}`;
  const data = normalizeRows(rows, options.limit || 14);
  const latest = data.at(-1)?.value ?? null;
  const media = average(data);
  const canvas = h('canvas', { id, role: 'img', 'aria-label': options.ariaLabel || `Histórico de ${fuel.label}` });
  const status = h('span', { class: 'chart-status' }, data.length ? `${data.length} días` : 'Sin datos');

  window.requestAnimationFrame(() => renderChart(id, data, options));

  return h('section', { class: `chart-card ${options.compact ? 'is-compact' : ''}` },
    h('div', { class: 'chart-head' },
      h('div', {},
        h('h2', {}, options.title || `Histórico ${fuel.label}`),
        h('p', {}, options.subtitle || 'Evolución de precios con Chart.js')
      ),
      status
    ),
    h('div', { class: 'chart-body' }, canvas),
    h('div', { class: 'chart-summary' },
      h('span', {}, 'Último'), h('strong', {}, `${shortPrice(latest)} €/L`),
      h('span', {}, 'Media'), h('strong', {}, `${shortPrice(media)} €/L`)
    )
  );
}

async function renderChart(id, data, options) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const shell = canvas.closest('.chart-card');
  try {
    const Chart = await ensureChart();
    if (!document.body.contains(canvas)) return;
    if (!data.length) {
      shell?.classList.add('is-empty');
      canvas.replaceWith(h('div', { class: 'chart-empty' }, 'No hay suficientes datos para pintar el histórico.'));
      return;
    }

    const brand = cssVar('--brand', '#45e0c7');
    const brandDark = cssVar('--brand-dark', '#0a7c70');
    const muted = cssVar('--muted', '#7a8582');
    const border = cssVar('--border-strong', 'rgba(0,0,0,.15)');
    const text = cssVar('--text', '#10201d');

    const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, canvas.clientHeight || 220);
    gradient.addColorStop(0, colorWithAlpha(brand, 0.28));
    gradient.addColorStop(1, colorWithAlpha(brand, 0.02));

    if (canvas.__chartInstance) canvas.__chartInstance.destroy();
    canvas.__chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((item) => item.label),
        datasets: [{
          label: options.datasetLabel || FuelStore.current().label,
          data: data.map((item) => item.value),
          tension: 0.38,
          fill: true,
          borderColor: brandDark,
          backgroundColor: gradient,
          pointBackgroundColor: brand,
          pointBorderColor: text,
          pointBorderWidth: 1.5,
          pointRadius: options.compact ? 2.4 : 3.2,
          pointHoverRadius: 5,
          borderWidth: options.compact ? 2.2 : 2.8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(context) {
                const value = context.parsed.y;
                return `${context.dataset.label}: ${value.toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €/L`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: muted, maxRotation: 0, autoSkip: true, maxTicksLimit: options.compact ? 5 : 7 }
          },
          y: {
            beginAtZero: false,
            grid: { color: border, drawBorder: false },
            ticks: {
              color: muted,
              maxTicksLimit: options.compact ? 4 : 5,
              callback(value) {
                return Number(value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
              }
            }
          }
        }
      }
    });
  } catch (error) {
    canvas.replaceWith(h('div', { class: 'chart-empty' }, 'No se pudo cargar Chart.js.'));
  }
}

function colorWithAlpha(color, alpha) {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const bigint = parseInt(hex.length === 3 ? hex.split('').map((x) => x + x).join('') : hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}
