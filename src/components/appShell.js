import { APP_NAME } from '../config/constants.js';
import { h } from '../utils/dom.js';
import { FuelToggle } from './fuelToggle.js';

export function AppShell(content) {
  return h('div', { class: 'app-shell' },
    h('a', { class: 'skip-link', href: '#main' }, 'Saltar al contenido'),
    h('header', { class: 'app-header' },
      h('div', { class: 'header-inner' },
        h('a', { class: 'brand', href: '#/' },
          h('span', { class: 'brand-icon', 'aria-hidden': 'true' }, '⛽'),
          h('span', {}, APP_NAME, h('small', {}, 'Precios de carburantes'))
        ),
        FuelToggle()
      )
    ),
    h('main', { id: 'main', class: 'main' }, content)
  );
}
