import { h } from '../utils/dom.js';
import { stationName } from '../utils/format.js';

function hasCoords(station) {
  return Number.isFinite(Number(station?.latitud)) && Number.isFinite(Number(station?.longitud));
}

function query(station) {
  if (hasCoords(station)) return `${station.latitud},${station.longitud}`;
  return [stationName(station), station?.direccion, station?.municipio, station?.provincia].filter(Boolean).join(', ');
}

function encodedQuery(station) {
  return encodeURIComponent(query(station));
}

export function mapsUrls(station) {
  const q = encodedQuery(station);
  const ll = hasCoords(station) ? `${station.latitud},${station.longitud}` : '';
  return {
    google: hasCoords(station)
      ? `https://www.google.com/maps/dir/?api=1&destination=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`,
    apple: hasCoords(station)
      ? `https://maps.apple.com/?daddr=${q}&dirflg=d`
      : `https://maps.apple.com/?q=${q}`,
    waze: hasCoords(station)
      ? `https://waze.com/ul?ll=${encodeURIComponent(ll)}&navigate=yes`
      : `https://waze.com/ul?q=${q}&navigate=yes`
  };
}

export function NavigationActions(station) {
  const urls = mapsUrls(station);
  return h('section', { class: 'card nav-actions-card station-wide-card' },
    h('div', { class: 'nav-actions-head' },
      h('div', {},
        h('span', { class: 'summary-kicker' }, 'Navegación'),
        h('h2', { class: 'section-title' }, 'Cómo llegar')
      ),
      h('span', { class: 'mini-meta' }, station?.municipio || '')
    ),
    h('div', { class: 'nav-actions-grid' },
      h('a', { class: 'btn nav-action-primary', href: urls.google, target: '_blank', rel: 'noopener' }, 'Cómo llegar'),
      h('a', { class: 'btn ghost', href: urls.google, target: '_blank', rel: 'noopener' }, 'Abrir en Google Maps'),
      h('a', { class: 'btn ghost', href: urls.apple, target: '_blank', rel: 'noopener' }, 'Abrir en Apple Maps'),
      h('a', { class: 'btn ghost', href: urls.waze, target: '_blank', rel: 'noopener' }, 'Abrir en Waze')
    )
  );
}
