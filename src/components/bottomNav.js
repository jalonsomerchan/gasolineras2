import { h } from '../utils/dom.js';

const items = [
  { href: '#/', path: '/', icon: '⌂', label: 'Inicio' },
  { href: '#/radar', path: '/radar', icon: '◎', label: 'Radar' },
  { href: '#/buscar', path: '/buscar', icon: '⌕', label: 'Buscar' },
  { href: '#/favoritos', path: '/favoritos', icon: '♡', label: 'Favoritos' },
  { href: '#/mapa', path: '/mapa', icon: '◇', label: 'Mapa' },
  { href: '#/ajustes', path: '/ajustes', icon: '⚙', label: 'Ajustes' }
];

function currentPath() {
  const raw = location.hash.replace(/^#/, '') || '/';
  return raw.split('?')[0].replace(/\/+$/, '') || '/';
}

export function BottomNav() {
  const active = currentPath();
  return h('nav', { class: 'bottom-nav', 'aria-label': 'Navegación principal' },
    items.map((item) => h('a', {
      href: item.href,
      class: active === item.path ? 'is-active' : ''
    }, h('span', { 'aria-hidden': 'true' }, item.icon), h('small', {}, item.label)))
  );
}
