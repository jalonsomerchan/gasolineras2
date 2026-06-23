const LEAFLET_VERSION = '1.9.4';
const SOURCES = [
  {
    css: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`,
    js: `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
  },
  {
    css: `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`,
    js: `https://cdn.jsdelivr.net/npm/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`
  }
];

let loadingPromise = null;

export function ensureLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (loadingPromise) return loadingPromise;

  loadingPromise = loadFromSources()
    .then(() => {
      if (!window.L) throw new Error('Leaflet no está disponible tras cargar la librería.');
      return window.L;
    })
    .catch((error) => {
      loadingPromise = null;
      throw error;
    });

  return loadingPromise;
}

async function loadFromSources() {
  let lastError = null;
  for (const source of SOURCES) {
    try {
      await loadCss(source.css);
      await loadScript(source.js);
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No se pudo cargar Leaflet.');
}

function loadCss(href) {
  if (document.querySelector(`link[data-leaflet-css="${href}"]`)) return Promise.resolve();

  return new Promise((resolve) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.leafletCss = href;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.append(link);
  });
}

function loadScript(src) {
  if (document.querySelector(`script[data-leaflet-js="${src}"]`)) {
    return waitForLeaflet();
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.defer = true;
    script.dataset.leafletJs = src;
    script.onload = () => window.L ? resolve() : reject(new Error(`Leaflet no se inicializó desde ${src}`));
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.append(script);
  });
}

function waitForLeaflet() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (window.L) {
        window.clearInterval(timer);
        resolve();
      }
      if (attempts > 80) {
        window.clearInterval(timer);
        reject(new Error('Tiempo agotado cargando Leaflet.'));
      }
    }, 50);
  });
}
