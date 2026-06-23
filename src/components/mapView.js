import { ensureLeaflet } from '../services/leafletLoader.js';
import { devicePosition, getBestLocation } from '../services/location.js';
import { h, loading } from '../utils/dom.js';
import { numberValue, price, stationName } from '../utils/format.js';
import { stationCoords } from '../utils/geo.js';
import { FuelStore } from '../state/fuelStore.js';
import { DiscountStore } from '../state/discountStore.js';
import { displayFuelPrice, mapMarkerLabel, visibleStations } from '../utils/stationSettings.js';

let mapId = 0;

export function MapView(stations = [], options = {}) {
  const visible = visibleStations(stations);
  const id = `map-${++mapId}`;
  const node = h('div', {
    class: `map-view ${options.small ? 'small' : ''} ${options.tall ? 'tall' : ''} is-loading`,
    id,
    role: 'img',
    'aria-label': 'Mapa de gasolineras con precios'
  }, loading('Cargando mapa...'));

  const searchHere = h('button', {
    class: 'map-search-here',
    type: 'button',
    hidden: true
  }, 'Buscar en esta localización');

  const controls = h('div', { class: 'map-actions', 'aria-label': 'Acciones del mapa' },
    h('button', { class: 'map-action', type: 'button', dataset: { action: 'cheapest' }, title: 'Ir a la más barata', 'aria-label': 'Ir a la más barata' }, '€'),
    h('button', { class: 'map-action', type: 'button', dataset: { action: 'me' }, title: 'Ir a mi ubicación', 'aria-label': 'Ir a mi ubicación' }, '⌖'),
    h('button', { class: 'map-action', type: 'button', dataset: { action: 'fit' }, title: 'Centrar resultados', 'aria-label': 'Centrar resultados' }, '□'),
    h('a', { class: 'map-action', dataset: { action: 'google' }, href: googleMapsUrl(visible, options.center), target: '_blank', rel: 'noopener', title: 'Abrir en Google Maps', 'aria-label': 'Abrir en Google Maps' }, 'G')
  );

  window.requestAnimationFrame(() => initMap(id, visible, options, controls, searchHere));
  const children = [node, controls];
  if (options.searchHere) children.push(searchHere);
  return h('div', { class: `map-card ${options.small ? 'is-compact-map' : ''} ${options.tall ? 'is-tall-map' : ''}` }, children);
}

async function initMap(id, stations, options, controls, searchHere) {
  const element = document.getElementById(id);
  if (!element) return;

  try {
    const L = await ensureLeaflet();
    if (!document.body.contains(element)) return;

    element.textContent = '';
    element.classList.remove('is-loading');

    const map = L.map(element, {
      scrollWheelZoom: true,
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
    bindControls({ L, map, controls, searchHere, bounds, stations, markers, getCenterMarker: () => centerMarker, setCenterMarker: (marker) => { centerMarker = marker; }, options });
  } catch (error) {
    element.classList.remove('is-loading');
    element.classList.add('map-error');
    element.innerHTML = `No se pudo cargar el mapa. <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">Abrir OpenStreetMap</a>`;
  }
}

function bindControls({ L, map, controls, searchHere, bounds, stations, markers, getCenterMarker, setCenterMarker, options }) {
  const googleLink = controls.querySelector('[data-action="google"]');

  function mapCenterLocation() {
    const center = map.getCenter();
    return {
      latitud: center.lat,
      longitud: center.lng,
      label: 'Zona del mapa',
      source: 'map'
    };
  }

  if (options.searchHere && searchHere) {
    map.on('movestart zoomstart', () => {
      searchHere.hidden = false;
    });
    map.on('moveend zoomend', () => {
      const center = mapCenterLocation();
      if (googleLink) googleLink.href = googleMapsUrl([], center);
    });
    searchHere.addEventListener('click', async () => {
      searchHere.disabled = true;
      searchHere.textContent = 'Buscando...';
      try {
        await options.onSearchHere?.(mapCenterLocation());
        searchHere.hidden = true;
      } finally {
        searchHere.disabled = false;
        searchHere.textContent = 'Buscar en esta localización';
      }
    });
  }

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
      const original = button.textContent;
      button.textContent = '…';
      try {
        let location;
        try {
          location = await devicePosition();
        } catch {
          location = await getBestLocation({ preferFresh: true });
        }
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
        button.textContent = original || '⌖';
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
    radius: 8,
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
      const basePrice = station.precio ?? station[fuel.priceField];
      const priceInfo = DiscountStore.priceInfo(station, basePrice);
      const currentPrice = priceInfo.effective;
      const marker = L.marker(coords, { icon: priceIcon(L, currentPrice, String(station.ideess) === String(cheapest?.ideess), priceInfo.hasDiscount) })
        .addTo(map)
        .bindPopup(popupHtml(station, priceInfo));
      marker.on('click', () => marker.openPopup());
      markers.push({ station, marker });
    });
}

function stationPrice(station) {
  const fuel = FuelStore.current();
  const basePrice = station?.precio ?? station?.[fuel.priceField];
  return numberValue(DiscountStore.effectivePrice(station, basePrice));
}

function cheapestStation(stations = []) {
  return stations
    .filter((station) => stationCoords(station) && stationPrice(station) !== null && stationPrice(station) > 0)
    .sort((a, b) => stationPrice(a) - stationPrice(b))[0] || null;
}

function priceIcon(L, currentPrice, isCheapest, hasDiscount = false) {
  const label = mapMarkerLabel(currentPrice);
  const tone = `${isCheapest ? 'is-cheap' : ''} ${hasDiscount ? 'has-discount' : ''}`.trim();
  return L.divIcon({
    className: 'leaflet-price-marker-wrap',
    html: `<span class="price-marker ${tone}">${escapeHtml(label)}</span>`,
    iconSize: [62, 36],
    iconAnchor: [31, 36],
    popupAnchor: [0, -34]
  });
}

function setInitialView(map, bounds, small = false) {
  if (bounds.length > 1) {
    map.fitBounds(bounds, { padding: small ? [18, 18] : [46, 46], maxZoom: small ? 13 : 15 });
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

function googleMapsUrl(stations = [], center = null) {
  const cheapest = cheapestStation(stations);
  const coords = cheapest ? stationCoords(cheapest) : stationCoords(stations[0]) || stationCoords(center);
  if (!coords) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${coords[0]},${coords[1]}`)}`;
}

function popupHtml(station, priceInfo) {
  const display = displayFuelPrice(priceInfo?.effective);
  const originalDisplay = priceInfo?.hasDiscount ? displayFuelPrice(priceInfo.original) : null;
  const discount = priceInfo?.hasDiscount
    ? `<em>${escapeHtml(DiscountStore.discountDescription(priceInfo))}</em>`
    : '';
  const original = priceInfo?.hasDiscount
    ? `<small>Antes: ${escapeHtml(originalDisplay.main || price(priceInfo.original))}</small>`
    : '';
  const secondary = display.secondary ? `<small>${escapeHtml(display.secondary)}</small>` : '';
  return `
    <div class="map-popup">
      <strong>${escapeHtml(stationName(station))}</strong>
      <span>${escapeHtml(display.main)}</span>
      ${secondary}
      ${original}
      ${discount}
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
