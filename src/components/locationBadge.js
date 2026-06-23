import { h } from '../utils/dom.js';

export function LocationBadge(label = 'Cerca de ti') {
  return h('span', { class: 'location-badge' }, h('span', { 'aria-hidden': 'true' }, '⌖'), label);
}
