import { ensureLeaflet } from '../services/leafletLoader.js';
import { h } from '../utils/dom.js';
import { numberValue, price, stationName } from '../utils/format.js';
import { stationCoords } from '../utils/geo.js';
import { FuelStore } from '../state/fuelStore.js';

let mapId = 0;

export function MapView(stations = [], options = {}) {
  const id = `map-${++mapId}`;
  const node = h('div', {
    class: `map-view ${options.small ? 'small' : ''} is-loading`,
    id,
    role: 'img',
    'aria-label': 'Mapa de gasolineras'
  }, 'Cargando mapa...');

  window.requestAnimationFrame(() => initMap(id, stations, options));
  return h('div', { class: 'card map-card' }, node);
}

async function initMap(id, stations, options) {
  const element = document.getElementById(id);
  if (!element) return;

  try {
    const L = await ensureLeaflet();
    if (!document.body.contains(element)) return;

    element.textContent = '';
    element.classList.remove('is-loading');

    const map = L.map(element, {
      scrollWheelZoom: false,
      tap: true,
      zoomControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const bounds = [];
    addCenterMarker(L, map, bounds, options.center);
    addStationMarkers(L, map, bounds, stations);
    setInitialView(map, bounds);
    keepMapSized(map, element);
  } catch (error) {
    element.classList.remove('is-loading');
    element.classList.add('map-error');
    element.innerHTML = `No se pudo cargar el mapa. <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">Abrir OpenStreetMap</a>`;
  }
}

function addCenterMarker(L, map, bounds, center) {
  const lat = numberValue(center?.latitud);
  const lng = numberValue(center?.longitud);
  if (lat === null || lng === null) return;

  const point = [lat, lng];
  bounds.push(point);
  L.circleMarker(point, {
    radius: 8,
    color: '#0f766e',
    fillColor: '#14b8a6',
    fillOpacity: 0.85,
    weight: 2
  }).addTo(map).bindPopup(escapeHtml(center.label || 'Tu ubicación'));
}

function addStationMarkers(L, map, bounds, stations) {
  const fuel = FuelStore.current();
  stations
    .map((station) => [station, stationCoords(station)])
    .filter(([, coords]) => coords)
    .forEach(([station, coords]) => {
      bounds.push(coords);
      const currentPrice = station.precio ?? station[fuel.priceField];
      L.marker(coords)
        .addTo(map)
        .bindPopup(popupHtml(station, currentPrice));
    });
}

function setInitialView(map, bounds) {
  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15 });
  } else if (bounds.length === 1) {
    map.setView(bounds[0], 14);
  } else {
    map.setView([40.4168, -3.7038], 6);
  }
}

function keepMapSized(map, element) {
  const invalidate = () => map.invalidateSize({ pan: false });
  window.setTimeout(invalidate, 80);
  window.setTimeout(invalidate, 300);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(invalidate);
    observer.observe(element);
    element.__mapResizeObserver = observer;
  }
}

function popupHtml(station, currentPrice) {
  return `
    <div class="map-popup">
      <strong>${escapeHtml(stationName(station))}</strong>
      <span>${escapeHtml(price(currentPrice))}</span>
      <a href="#/gasolinera/${encodeURIComponent(station.ideess)}">Ver ficha</a>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
