import { ensureLeaflet } from '../services/leafletLoader.js';
import { getBestLocation } from '../services/location.js';
import { h, loading } from '../utils/dom.js';
import { numberValue, price, shortPrice, stationName } from '../utils/format.js';
import { stationCoords } from '../utils/geo.js';
import { FuelStore } from '../state/fuelStore.js';

let mapId = 0;

export function MapView(stations = [], options = {}) {
  const id = `map-${++mapId}`;
  const node = h('div', {
    class: `map-view ${options.small ? 'small' : ''} is-loading`,
    id,
    role: 'img',
    'aria-label': 'Mapa de gasolineras con precios'
  }, loading('Cargando mapa...'));

  const controls = h('div', { class: 'map-actions', 'aria-label': 'Acciones del mapa' },
    h('button', { class: 'map-action', type: 'button', dataset: { action: 'cheapest' }, title: 'Ir a la más barata' }, '€'),
    h('button', { class: 'map-action', type: 'button', dataset: { action: 'me' }, title: 'Ir a mi ubicación' }, '⌖'),
    h('button', { class: 'map-action', type: 'button', dataset: { action: 'fit' }, title: 'Centrar resultados' }, '□'),
    h('a', { class: 'map-action', dataset: { action: 'google' }, href: googleMapsUrl(stations), target: '_blank', rel: 'noopener', title: 'Abrir en Google Maps' }, 'G')
  );

  window.requestAnimationFrame(() => initMap(id, stations, options, controls));
  const children = [node, controls];
  if (options.small) {
    children.push(h('a', { class: 'map-open-button', href: '#/mapa', onClick: (event) => { event.preventDefault(); document.getElementById('nearby-map')?.scrollIntoView({ behavior: 'smooth' }); } }, h('span', { 'aria-hidden': 'true' }, '◇'), 'Ver mapa'));
  }
  return h('div', { class: `map-card ${options.small ? 'is-compact-map' : ''}` }, children);
}

async function initMap(id, stations, options, controls) {
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
      zoomControl: !options.small,
      attributionControl: !options.small
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const bounds = [];
    const markers = [];
    let centerMarker = addCenterMarker(L, map, bounds, options.center);
    addStationMarkers(L, map, bounds, stations, markers);
    setInitialView(map, bounds, options.small);
    keepMapSized(map, element);
    bindControls({ L, map, controls, bounds, stations, markers, getCenterMarker: () => centerMarker, setCenterMarker: (marker) => { centerMarker = marker; } });
  } catch (error) {
    element.classList.remove('is-loading');
    element.classList.add('map-error');
    element.innerHTML = `No se pudo cargar el mapa. <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">Abrir OpenStreetMap</a>`;
  }
}

function bindControls({ L, map, controls, bounds, stations, markers, getCenterMarker, setCenterMarker }) {
  controls.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;

    if (action === 'fit') {
      setInitialView(map, bounds, false);
      return;
    }

    if (action === 'cheapest') {
      const cheapest = cheapestStation(stations);
      const coords = cheapest ? stationCoords(cheapest) : null;
      if (!coords) return;
      map.setView(coords, 15, { animate: true });
      const marker = markers.find((item) => String(item.station.ideess) === String(cheapest.ideess));
      marker?.marker?.openPopup();
      return;
    }

    if (action === 'me') {
      button.classList.add('is-loading');
      button.textContent = '…';
      try {
        const location = await getBestLocation({ preferFresh: true });
        const point = [Number(location.latitud), Number(location.longitud)];
        if (!Number.isFinite(point[0]) || !Number.isFinite(point[1])) return;
        const existing = getCenterMarker();
        if (existing) existing.remove();
        const marker = addCenterMarker(L, map, bounds, { ...location, label: location.label || 'Mi ubicación' });
        setCenterMarker(marker);
        map.setView(point, 14, { animate: true });
        marker?.openPopup();
      } finally {
        button.classList.remove('is-loading');
        button.textContent = '⌖';
      }
    }
  });
}

function addCenterMarker(L, map, bounds, center) {
  const lat = numberValue(center?.latitud);
  const lng = numberValue(center?.longitud);
  if (lat === null || lng === null) return null;

  const point = [lat, lng];
  bounds.push(point);
  return L.circleMarker(point, {
    radius: 7,
    color: '#0f766e',
    fillColor: '#14b8a6',
    fillOpacity: 0.95,
    weight: 3
  }).addTo(map).bindPopup(escapeHtml(center.label || 'Tu ubicación'));
}

function addStationMarkers(L, map, bounds, stations, markers = []) {
  const fuel = FuelStore.current();
  const cheapest = cheapestStation(stations);
  stations
    .map((station) => [station, stationCoords(station)])
    .filter(([, coords]) => coords)
    .forEach(([station, coords]) => {
      bounds.push(coords);
      const currentPrice = station.precio ?? station[fuel.priceField];
      const marker = L.marker(coords, { icon: priceIcon(L, currentPrice, String(station.ideess) === String(cheapest?.ideess)) })
        .addTo(map)
        .bindPopup(popupHtml(station, currentPrice));
      marker.on('click', () => marker.openPopup());
      markers.push({ station, marker });
    });
}

function stationPrice(station) {
  const fuel = FuelStore.current();
  return numberValue(station?.precio ?? station?.[fuel.priceField]);
}

function cheapestStation(stations = []) {
  return stations
    .filter((station) => stationCoords(station) && stationPrice(station) !== null && stationPrice(station) > 0)
    .sort((a, b) => stationPrice(a) - stationPrice(b))[0] || null;
}

function priceIcon(L, currentPrice, isCheapest) {
  const label = shortPrice(currentPrice);
  const tone = isCheapest ? 'is-cheap' : '';
  return L.divIcon({
    className: 'leaflet-price-marker-wrap',
    html: `<span class="price-marker ${tone}">${escapeHtml(label)}</span>`,
    iconSize: [58, 34],
    iconAnchor: [29, 34],
    popupAnchor: [0, -32]
  });
}

function setInitialView(map, bounds, small = false) {
  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: small ? [16, 16] : [34, 34], maxZoom: small ? 13 : 15 });
  } else if (bounds.length === 1) {
    map.setView(bounds[0], small ? 13 : 14);
  } else {
    map.setView([40.4168, -3.7038], 6);
  }
}

function keepMapSized(map, element) {
  const invalidate = () => map.invalidateSize({ pan: false });
  window.setTimeout(invalidate, 60);
  window.setTimeout(invalidate, 180);
  window.setTimeout(invalidate, 500);

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(invalidate);
    observer.observe(element);
    element.__mapResizeObserver = observer;
  }
}

function googleMapsUrl(stations = []) {
  const cheapest = cheapestStation(stations);
  const coords = cheapest ? stationCoords(cheapest) : stationCoords(stations[0]);
  if (!coords) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${coords[0]},${coords[1]}`)}`;
}

function popupHtml(station, currentPrice) {
  return `
    <div class="map-popup">
      <strong>${escapeHtml(stationName(station))}</strong>
      <span>${escapeHtml(price(currentPrice))}</span>
      <small>${escapeHtml([station.direccion, station.municipio].filter(Boolean).join(' · '))}</small>
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
