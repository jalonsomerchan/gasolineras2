const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const API_BASE = (process.env.GASOLINA_API_BASE || 'https://alon.one/api/gasolina2').replace(/\/+$/, '');
const API_KEY = process.env.GASOLINA_API_KEY || '';
const SITE_URL = (process.env.SITE_URL || process.env.PAGES_URL || 'https://gasolineras2.alon.one').replace(/\/+$/, '');
const MAX_MUNICIPIOS = Number(process.env.MAX_SEO_MUNICIPIOS || 250);
const MAX_GASOLINERAS = Number(process.env.MAX_SEO_GASOLINERAS || 120);
const MAX_FUEL_PROVINCES = Number(process.env.MAX_SEO_FUEL_PROVINCES || 52);

const FUELS = [
  { id: 'gasolina_95', slug: 'gasolina-95', label: 'Gasolina 95' },
  { id: 'gasoleo_a', slug: 'diesel', label: 'Diésel' },
  { id: 'gasolina_98', slug: 'gasolina-98', label: 'Gasolina 98' },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pagina';
}

function routePart(value) {
  return encodeURIComponent(String(value ?? '').trim());
}

function ensureSlash(value) {
  const clean = String(value || '/').split('?')[0].replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return clean ? (clean.startsWith('/') ? clean : `/${clean}`) : '/';
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.warn(`No se pudo leer ${filePath}: ${error.message}`);
    return fallback;
  }
}

async function fetchJson(endpoint, params = {}) {
  if (!API_KEY) {
    throw new Error('GASOLINA_API_KEY no definido');
  }

  const url = new URL(`${API_BASE}/${endpoint.replace(/^\/+/, '')}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });
  url.searchParams.set('api_key', API_KEY);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'X-API-Key': API_KEY,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`${endpoint} respondió ${response.status}`);
  }

  const json = await response.json();
  if (json?.error) {
    throw new Error(json.msg || `Error en ${endpoint}`);
  }
  return json;
}

function htmlForPage(page) {
  const pagePath = ensureSlash(page.path);
  const route = page.route || pagePath;
  const title = page.title || 'Gasolina al día';
  const description = page.description || 'Consulta precios actualizados de gasolina, diésel y gasolina 98.';
  const h1 = page.h1 || title;
  const canonical = `${SITE_URL}${pagePath === '/' ? '/' : `${pagePath}/`.replace(/\/+/g, '/')}`;
  const initialFuel = page.fuel || '';

  const scriptOpen = '<SCRIPT>';
  const scriptClose = '</' + 'SCRIPT>';
  const moduleScriptOpen = '<SCRIPT type="module" src="./src/app.js">';

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <base href="/">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#041412">
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <title>${escapeHtml(title)}</title>
    <link rel="manifest" href="./manifest.webmanifest">
    <link rel="icon" href="./assets/icon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="./assets/icon-192.png">
    <link rel="preconnect" href="https://alon.one">
    <link rel="preconnect" href="https://tile.openstreetmap.org">
    <link rel="stylesheet" href="./src/styles/base.css">
    <link rel="stylesheet" href="./src/styles/layout.css">
    <link rel="stylesheet" href="./src/styles/components.css">
  </head>
  <body>
    <noscript>
      <main style="max-width:900px;margin:40px auto;padding:24px;font-family:system-ui,sans-serif">
        <h1>${escapeHtml(h1)}</h1>
        <p>${escapeHtml(description)}</p>
        <p>Activa JavaScript para consultar precios, mapas y favoritos.</p>
      </main>
    </noscript>
    <main id="seo-content" style="position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden">
      <h1>${escapeHtml(h1)}</h1>
      <p>${escapeHtml(description)}</p>
      <a href="/#${escapeHtml(route)}">Abrir ${escapeHtml(h1)}</a>
    </main>
    <div id="app"></div>
    ${scriptOpen}
      window.GASOLINA_INITIAL_ROUTE = ${JSON.stringify(route)};
      window.GASOLINA_INITIAL_FUEL = ${JSON.stringify(initialFuel)};
    ${scriptClose}
    <SCRIPT src="./config.js"></SCRIPT>
    ${moduleScriptOpen}${scriptClose}
  </body>
</html>
`;
}

function writePage(page) {
  const pagePath = ensureSlash(page.path);
  if (pagePath === '/') return;

  const targetDir = path.join(ROOT, ...pagePath.split('/').filter(Boolean));
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(path.join(targetDir, 'index.html'), htmlForPage(page), 'utf8');
}

function uniquePages(pages) {
  const map = new Map();
  for (const page of pages) {
    if (!page?.path) continue;
    map.set(ensureSlash(page.path), { ...page, path: ensureSlash(page.path) });
  }
  return [...map.values()];
}

function manualPages() {
  const config = readJson(path.join(ROOT, 'data', 'seo-pages.json'), { pages: [] });
  if (Array.isArray(config)) return config;
  return Array.isArray(config.pages) ? config.pages : [];
}

async function apiPages() {
  const pages = [];

  for (const fuel of FUELS) {
    pages.push({
      path: `/${fuel.slug}/`,
      route: '/',
      fuel: fuel.id,
      title: `Precio de ${fuel.label} cerca de ti`,
      h1: `Precio de ${fuel.label} cerca de ti`,
      description: `Consulta el precio de ${fuel.label} actualizado, encuentra gasolineras cercanas y compara tus favoritos.`,
    });
  }

  let provinces = [];
  try {
    provinces = await fetchJson('provincias');
  } catch (error) {
    console.warn(`No se pudieron generar provincias desde API: ${error.message}`);
    return pages;
  }

  for (const province of provinces) {
    const name = province.provincia;
    if (!name) continue;
    pages.push({
      path: `/provincia/${slugify(name)}/`,
      route: `/provincia/${routePart(name)}`,
      title: `Precio de gasolina y diésel en ${name}`,
      h1: `Gasolineras en ${name}`,
      description: `Consulta precios actualizados de gasolina 95, diésel y gasolina 98 en la provincia de ${name}.`,
    });
  }

  for (const fuel of FUELS) {
    for (const province of provinces.slice(0, MAX_FUEL_PROVINCES)) {
      const name = province.provincia;
      if (!name) continue;
      pages.push({
        path: `/${fuel.slug}/${slugify(name)}/`,
        route: `/provincia/${routePart(name)}`,
        fuel: fuel.id,
        title: `Precio de ${fuel.label} en ${name}`,
        h1: `${fuel.label} en ${name}`,
        description: `Compara el precio de ${fuel.label} en ${name} y encuentra las gasolineras más baratas.`,
      });
    }
  }

  let municipalitiesCreated = 0;
  for (const province of provinces) {
    if (municipalitiesCreated >= MAX_MUNICIPIOS) break;
    const provinceName = province.provincia;
    if (!provinceName) continue;
    try {
      const municipalities = await fetchJson('municipios', { provincia: provinceName });
      for (const municipality of municipalities) {
        if (municipalitiesCreated >= MAX_MUNICIPIOS) break;
        const municipalityName = municipality.municipio;
        if (!municipalityName) continue;
        pages.push({
          path: `/municipio/${slugify(provinceName)}/${slugify(municipalityName)}/`,
          route: `/municipio/${routePart(provinceName)}/${routePart(municipalityName)}`,
          title: `Precio de gasolina en ${municipalityName}, ${provinceName}`,
          h1: `Gasolineras en ${municipalityName}`,
          description: `Consulta precios actualizados de gasolina y diésel en ${municipalityName}, ${provinceName}.`,
        });
        municipalitiesCreated += 1;
      }
    } catch (error) {
      console.warn(`No se pudieron generar municipios de ${provinceName}: ${error.message}`);
    }
  }

  try {
    const ranking = await fetchJson('ranking', { combustible: 'gasolina_95', limit: MAX_GASOLINERAS });
    for (const station of ranking) {
      if (!station.ideess) continue;
      const name = station.rotulo || station.nombre || `Gasolinera ${station.ideess}`;
      const municipality = station.municipio ? ` en ${station.municipio}` : '';
      pages.push({
        path: `/gasolinera/${station.ideess}/`,
        route: `/gasolinera/${station.ideess}`,
        title: `${name}${municipality}: precios de gasolina`,
        h1: `${name}${municipality}`,
        description: `Consulta el precio actualizado de gasolina 95, diésel y gasolina 98 en ${name}${municipality}.`,
      });
    }
  } catch (error) {
    console.warn(`No se pudieron generar gasolineras desde ranking: ${error.message}`);
  }

  return pages;
}

async function main() {
  const pages = uniquePages([...manualPages(), ...(await apiPages())]);
  pages.forEach(writePage);
  console.log(`Generadas ${pages.length} páginas SEO estáticas.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
