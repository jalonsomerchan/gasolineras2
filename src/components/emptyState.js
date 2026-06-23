import { h } from '../utils/dom.js';

export function EmptyState(message, action = null) {
  return h('div', { class: 'empty' },
    h('strong', {}, message),
    action ? h('div', { style: 'margin-top:.75rem' }, action) : null
  );
}
