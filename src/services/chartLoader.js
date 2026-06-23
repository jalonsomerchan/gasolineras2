const CHART_URLS = [
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js',
  'https://unpkg.com/chart.js@4.4.7/dist/chart.umd.js'
];

let chartPromise = null;

function loadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-chartjs-src="${url}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Chart), { once: true });
      existing.addEventListener('error', reject, { once: true });
      if (window.Chart) resolve(window.Chart);
      return;
    }

    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.defer = true;
    script.dataset.chartjsSrc = url;
    script.onload = () => resolve(window.Chart);
    script.onerror = () => reject(new Error(`No se pudo cargar Chart.js desde ${url}`));
    document.head.append(script);
  });
}

export async function ensureChart() {
  if (window.Chart) return window.Chart;
  if (chartPromise) return chartPromise;

  chartPromise = CHART_URLS.reduce((promise, url) => {
    return promise.catch(() => loadScript(url));
  }, Promise.reject());

  const Chart = await chartPromise;
  if (!Chart) throw new Error('Chart.js no está disponible');
  return Chart;
}
