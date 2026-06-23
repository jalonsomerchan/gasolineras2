import { FavoritesStore } from '../state/favoritesStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h } from '../utils/dom.js';
import { dateText, distance, price, routePart, stationName } from '../utils/format.js';

export function StationCard(station, options = {}) {
  const fuel = FuelStore.current();
  const isFavorite = FavoritesStore.has(station.ideess);
  const currentPrice = station.precio ?? station[fuel.priceField];
  const title = stationName(station);
  const subtitle = [station.direccion, station.municipio, station.provincia].filter(Boolean).join(' · ');

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

  return h('article', { class: 'station-card' },
    h('div', {},
      h('h3', { class: 'station-title' }, h('a', { href: `#/gasolinera/${station.ideess}` }, title)),
      h('p', { class: 'station-meta' }, subtitle || 'Sin dirección'),
      h('div', { class: 'station-actions' },
        station.distancia_km !== undefined ? h('span', { class: 'pill' }, '📍 ', distance(station.distancia_km)) : null,
        station.fecha ? h('span', { class: 'pill' }, 'Actualizado ', dateText(station.fecha)) : null,
        station.municipio ? h('a', { class: 'pill', href: `#/municipio/${routePart(station.provincia)}/${routePart(station.municipio)}` }, station.municipio) : null,
        station.provincia ? h('a', { class: 'pill', href: `#/provincia/${routePart(station.provincia)}` }, station.provincia) : null
      )
    ),
    h('div', { class: 'price-box' },
      favoriteButton,
      h('div', { class: 'price-value' }, price(currentPrice)),
      h('div', { class: 'price-label' }, fuel.label)
    )
  );
}
