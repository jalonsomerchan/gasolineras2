import { DiscountStore } from '../state/discountStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { numberValue } from '../utils/format.js';
import { compareBrandPriority, visibleStations } from '../utils/stationSettings.js';
import { h } from '../utils/dom.js';
import { EmptyState } from './emptyState.js';
import { StationCard } from './stationCard.js';

function stationPrice(station) {
  const fuel = FuelStore.current();
  const basePrice = station?.precio ?? station?.[fuel.priceField];
  return numberValue(DiscountStore.effectivePrice(station?.ideess, basePrice));
}

function cheapestPrice(stations) {
  const prices = (stations || [])
    .map(stationPrice)
    .filter((value) => value !== null && value > 0);
  return prices.length ? Math.min(...prices) : null;
}

function sortedVisibleStations(stations, options) {
  const list = visibleStations(stations || []);
  const withIndex = list.map((station, index) => ({ station, index }));

  withIndex.sort((a, b) => {
    const brand = compareBrandPriority(a.station, b.station);
    if (brand !== 0) return brand;
    if (options.sortByPrice) {
      const price = (stationPrice(a.station) ?? 999) - (stationPrice(b.station) ?? 999);
      if (price !== 0) return price;
    }
    return a.index - b.index;
  });

  return withIndex.map((item) => item.station);
}

export function StationList(stations, options = {}) {
  if (!stations?.length) return EmptyState(options.emptyMessage || 'No hay gasolineras para mostrar.');

  const listStations = sortedVisibleStations(stations, options);
  if (!listStations.length) return EmptyState('No hay gasolineras visibles con tus ajustes actuales.');

  const cheapest = cheapestPrice(listStations);

  return h('div', { class: `station-list ${options.compact ? 'is-compact-list' : ''}` },
    listStations.map((station, index) => StationCard(station, { ...options, cheapestPrice: cheapest }, index))
  );
}
