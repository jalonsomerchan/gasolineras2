import { h } from '../utils/dom.js';

export function Breadcrumbs(items = []) {
  return h('nav', { class: 'breadcrumbs', 'aria-label': 'Migas de pan' },
    h('a', { href: '#/' }, 'Inicio'),
    items.flatMap((item) => [' / ', item.href ? h('a', { href: item.href }, item.label) : h('span', {}, item.label)])
  );
}
