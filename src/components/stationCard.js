import { FavoritesStore } from '../state/favoritesStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h } from '../utils/dom.js';
import { dateText, distance, price, routePart, stationName } from '../utils/format.js';

function initials(name) {
  return String(name || 'G').trim().slice(0, 2).toUpperCase();
}

export function StationCard(station, options = {}, index = 0) {
  const fuel = FuelStore.current();
  const isFavorite = FavoritesStore.has(station.ideess);
  const currentPrice = station.precio ?? station[fuel.priceField];
  const title = stationName(station);
  const subtitle = [station.direccion, station.municipio].filter(Boolean).join(' · ');

  const favoriteButton = h('button', {
    class: `favorite-btn ${isFavorite ? 'is-active' : ''}`,
    type: 'button',
    title: isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
    'aria-label': isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
    onClick: (event) => {
      event.preventDefault();
      event.stopPropagation();
      FavoritesStore.toggle(station.ideess);
      options.onFavoriteChange?.();
    }
  }, isFavorite ? '★' : '☆');

  return h('article', { class: `station-card ${options.compact ? 'is-compact' : ''}` },
    options.ranked ? h('div', { class: `rank ${index < 3 ? 'is-top' : ''}` }, String(index + 1)) : null,
    h('a', { class: 'station-logo', href: `#/gasolinera/${station.ideess}`, 'aria-hidden': 'true' }, initials(title)),
    h('div', { class: 'station-main' },
      h('h3', { class: 'station-title' }, h('a', { href: `#/gasolinera/${station.ideess}` }, title)),
      h('p', { class: 'station-meta' }, subtitle || 'Sin dirección'),
      h('div', { class: 'station-actions' },
        station.distancia_km !== undefined ? h('span', { class: 'mini-meta' }, distance(station.distancia_km)) : null,
        station.fecha ? h('span', { class: 'mini-meta' }, dateText(station.fecha)) : null,
        station.municipio ? h('a', { class: 'mini-meta', href: `#/municipio/${routePart(station.provincia)}/${routePart(station.municipio)}` }, station.municipio) : null,
        station.provincia && !options.compact ? h('a', { class: 'mini-meta', href: `#/provincia/${routePart(station.provincia)}` }, station.provincia) : null
      )
    ),
    h('div', { class: 'price-box' },
      favoriteButton,
      h('a', { class: 'price-link', href: `#/gasolinera/${station.ideess}` },
        h('div', { class: 'price-value' }, price(currentPrice)),
        h('div', { class: 'price-label' }, fuel.shortLabel)
      )
    )
  );
}
