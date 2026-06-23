import { DiscountStore } from '../state/discountStore.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h } from '../utils/dom.js';
import { dateText, distance, numberValue, price, routePart, stationName } from '../utils/format.js';
import { displayDelta, displayFuelPrice, stationBrand } from '../utils/stationSettings.js';

function initials(name) {
  return String(name || 'G').trim().slice(0, 2).toUpperCase();
}

function priceDelta(currentPrice, cheapestPrice) {
  const current = numberValue(currentPrice);
  const cheapest = numberValue(cheapestPrice);
  if (current === null || cheapest === null || current <= 0 || cheapest <= 0) return null;
  const delta = current - cheapest;
  if (Math.abs(delta) < 0.0005) {
    return { label: 'Opción más barata', className: 'is-cheapest' };
  }
  return { label: `+${displayDelta(delta)} más cara`, className: 'is-more-expensive' };
}

export function StationCard(station, options = {}, index = 0) {
  const fuel = FuelStore.current();
  const isFavorite = FavoritesStore.has(station.ideess);
  const basePrice = station.precio ?? station[fuel.priceField];
  const priceInfo = DiscountStore.priceInfo(station, basePrice);
  const currentPrice = priceInfo.effective;
  const displayCurrent = displayFuelPrice(currentPrice);
  const displayOriginal = priceInfo.hasDiscount ? displayFuelPrice(priceInfo.original) : null;
  const title = stationName(station);
  const subtitle = [station.direccion, station.municipio].filter(Boolean).join(' · ');
  const delta = priceDelta(currentPrice, options.cheapestPrice);

  const favoriteButton = h('button', {
    class: `favorite-btn ${isFavorite ? 'is-active' : ''}`,
    type: 'button',
    title: isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
    'aria-label': isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
    onClick: (event) => {
      event.preventDefault();
      event.stopPropagation();
      FavoritesStore.toggle(station.ideess);
      const active = FavoritesStore.has(station.ideess);
      event.currentTarget.classList.toggle('is-active', active);
      event.currentTarget.classList.remove('is-bouncing');
      void event.currentTarget.offsetWidth;
      event.currentTarget.classList.add('is-bouncing');
      event.currentTarget.textContent = active ? '★' : '☆';
      event.currentTarget.title = active ? 'Quitar de favoritos' : 'Añadir a favoritos';
      event.currentTarget.setAttribute('aria-label', active ? 'Quitar de favoritos' : 'Añadir a favoritos');
      window.setTimeout(() => event.currentTarget?.classList?.remove('is-bouncing'), 420);
      options.onFavoriteChange?.();
    }
  }, isFavorite ? '★' : '☆');

  return h('article', { class: `station-card ${options.compact ? 'is-compact' : ''} ${priceInfo.hasDiscount ? 'has-discount' : ''}` },
    options.ranked ? h('div', { class: `rank ${index < 3 ? 'is-top' : ''}` }, String(index + 1)) : null,
    h('a', { class: 'station-logo', href: `#/gasolinera/${station.ideess}`, 'aria-hidden': 'true' }, initials(title)),
    h('div', { class: 'station-main' },
      h('h3', { class: 'station-title' }, h('a', { href: `#/gasolinera/${station.ideess}` }, title)),
      h('p', { class: 'station-meta' }, subtitle || 'Sin dirección'),
      h('div', { class: 'station-actions' },
        h('span', { class: 'mini-meta brand-meta' }, stationBrand(station)),
        station.distancia_km !== undefined ? h('span', { class: 'mini-meta' }, distance(station.distancia_km)) : null,
        station.fecha ? h('span', { class: 'mini-meta' }, dateText(station.fecha)) : null,
        station.municipio ? h('a', { class: 'mini-meta', href: `#/municipio/${routePart(station.provincia)}/${routePart(station.municipio)}` }, station.municipio) : null,
        station.provincia && !options.compact ? h('a', { class: 'mini-meta', href: `#/provincia/${routePart(station.provincia)}` }, station.provincia) : null
      )
    ),
    h('div', { class: 'price-box' },
      h('div', { class: 'price-line' },
        h('a', { class: 'price-link', href: `#/gasolinera/${station.ideess}` },
          priceInfo.hasDiscount ? h('div', { class: 'price-original' }, displayOriginal?.main || price(priceInfo.original)) : null,
          h('div', { class: 'price-value' }, displayCurrent.main),
          displayCurrent.secondary ? h('div', { class: 'price-secondary' }, displayCurrent.secondary) : null
        ),
        favoriteButton
      ),
      delta ? h('div', { class: `price-delta ${delta.className}` }, delta.label) : null
    )
  );
}
