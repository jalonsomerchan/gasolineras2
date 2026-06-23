import { FuelStore } from '../state/fuelStore.js';
import { numberValue } from '../utils/format.js';
import { h } from '../utils/dom.js';
import { EmptyState } from './emptyState.js';
import { StationCard } from './stationCard.js';

function stationPrice(station) {
  const fuel = FuelStore.current();
  return numberValue(station?.precio ?? station?.[fuel.priceField]);
}

function cheapestPrice(stations) {
  const prices = (stations || [])
    .map(stationPrice)
    .filter((value) => value !== null && value > 0);
  return prices.length ? Math.min(...prices) : null;
}

export function StationList(stations, options = {}) {
  if (!stations?.length) return EmptyState(options.emptyMessage || 'No hay gasolineras para mostrar.');

  const listStations = options.sortByPrice
    ? [...stations].sort((a, b) => (stationPrice(a) ?? 999) - (stationPrice(b) ?? 999))
    : stations;

  const cheapest = cheapestPrice(listStations);

  return h('div', { class: `station-list ${options.compact ? 'is-compact-list' : ''}` },
    listStations.map((station, index) => StationCard(station, { ...options, cheapestPrice: cheapest }, index))
  );
}
