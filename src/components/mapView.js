import { h } from '../utils/dom.js';
import { price, stationName } from '../utils/format.js';
import { stationCoords } from '../utils/geo.js';
import { FuelStore } from '../state/fuelStore.js';

let mapId = 0;

export function MapView(stations, options = {}) {
  const id = `map-${++mapId}`;
  const node = h('div', { class: `map-view ${options.small ? 'small' : ''}`, id, role: 'img', 'aria-label': 'Mapa de gasolineras' });
  window.setTimeout(() => initMap(id, stations, options), 0);
  return h('div', { class: 'card map-card' }, node);
}

function initMap(id, stations, options) {
  const L = window.L;
  const element = document.getElementById(id);
  if (!L || !element) {
    if (element) element.textContent = 'No se pudo cargar el mapa.';
    return;
  }

  const map = L.map(element, { scrollWheelZoom: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const points = [];
  if (options.center) {
    points.push([options.center.latitud, options.center.longitud]);
    L.circleMarker([options.center.latitud, options.center.longitud], {
      radius: 8,
      color: '#0f766e',
      fillColor: '#14b8a6',
      fillOpacity: .85
    }).addTo(map).bindPopup(options.center.label || 'Tu ubicación');
  }

  const fuel = FuelStore.current();
  stations
    .map((station) => [station, stationCoords(station)])
    .filter(([, coords]) => coords)
    .forEach(([station, coords]) => {
      points.push(coords);
      const currentPrice = station.precio ?? station[fuel.priceField];
      L.marker(coords)
        .addTo(map)
        .bindPopup(`<div class="map-popup"><strong>${stationName(station)}</strong><span>${price(currentPrice)}</span><a href="#/gasolinera/${station.ideess}">Ver ficha</a></div>`);
    });

  if (points.length > 1) map.fitBounds(points, { padding: [28, 28] });
  else if (points.length === 1) map.setView(points[0], 13);
  else map.setView([40.4168, -3.7038], 6);

  window.setTimeout(() => map.invalidateSize(), 120);
}
