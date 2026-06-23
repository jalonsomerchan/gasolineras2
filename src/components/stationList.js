import { h } from '../utils/dom.js';
import { EmptyState } from './emptyState.js';
import { StationCard } from './stationCard.js';

export function StationList(stations, options = {}) {
  if (!stations?.length) return EmptyState(options.emptyMessage || 'No hay gasolineras para mostrar.');
  return h('div', { class: 'station-list' }, stations.map((station) => StationCard(station, options)));
}
