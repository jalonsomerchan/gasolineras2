import { APP_NAME } from '../config/constants.js';
import { h } from '../utils/dom.js';
import { BottomNav } from './bottomNav.js';
import { FuelToggle } from './fuelToggle.js';
import { ThemeToggle } from './themeToggle.js';

export function AppShell(content) {
  return h('div', { class: 'app-shell' },
    h('a', { class: 'skip-link', href: '#main' }, 'Saltar al contenido'),
    h('header', { class: 'app-header' },
      h('div', { class: 'header-inner' },
        h('a', { class: 'brand', href: '#/' },
          h('span', { class: 'brand-mark', 'aria-hidden': 'true' }, '⛽'),
          h('span', {}, APP_NAME)
        ),
        h('div', { class: 'header-actions' },
          h('a', { class: 'header-pill', href: '#/' }, h('span', { 'aria-hidden': 'true' }, '⌖'), 'Cerca de ti'),
          ThemeToggle()
        )
      ),
      h('div', { class: 'fuel-row' }, FuelToggle())
    ),
    h('main', { id: 'main', class: 'main' }, content),
    BottomNav()
  );
}
