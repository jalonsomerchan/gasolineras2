import { h } from '../utils/dom.js';

export function StatsGrid(items) {
  return h('div', { class: 'stats-grid' },
    items.map((item) => h('div', { class: 'stat' },
      h('small', {}, item.label),
      h('strong', {}, item.value)
    ))
  );
}
