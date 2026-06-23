import { h } from '../utils/dom.js';

const items = [
  { href: '#/', icon: '◎', label: 'Radar' },
  { href: '#/', icon: '⌕', label: 'Buscar' },
  { href: '#/', icon: '♡', label: 'Favoritos' },
  { href: '#/', icon: '◇', label: 'Mapa' },
  { href: '#/', icon: '▥', label: 'Datos' }
];

export function BottomNav() {
  return h('nav', { class: 'bottom-nav', 'aria-label': 'Navegación principal' },
    items.map((item, index) => h('a', {
      href: item.href,
      class: index === 0 ? 'is-active' : '',
      onClick: (event) => {
        if (item.label === 'Buscar') {
          event.preventDefault();
          document.querySelector('.search-input')?.focus();
        }
        if (item.label === 'Favoritos') {
          event.preventDefault();
          document.getElementById('favorites')?.scrollIntoView({ behavior: 'smooth' });
        }
        if (item.label === 'Mapa') {
          event.preventDefault();
          document.getElementById('nearby-map')?.scrollIntoView({ behavior: 'smooth' });
        }
        if (item.label === 'Datos') {
          event.preventDefault();
          document.getElementById('price-radar')?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }, h('span', { 'aria-hidden': 'true' }, item.icon), h('small', {}, item.label)))
  );
}
