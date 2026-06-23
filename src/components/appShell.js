import { APP_NAME } from '../config/constants.js';
import { h } from '../utils/dom.js';
import { BottomNav } from './bottomNav.js';
import { FuelToggle } from './fuelToggle.js';
import { ThemeToggle } from './themeToggle.js';

function LocationPill() {
  const label = h('span', { class: 'header-location-text' }, 'Cerca de ti');
  window.addEventListener('gasolina:location', (event) => {
    const location = event.detail;
    if (!location) return;
    label.textContent = location.label || 'Cerca de ti';
  });
  return h('div', { class: 'header-location-pill' },
    h('span', { class: 'header-location-icon', 'aria-hidden': 'true' }, '⌖'),
    label
  );
}

export function AppShell(content) {
  return h('div', { class: 'app-shell' },
    h('a', { class: 'skip-link', href: '#main' }, 'Saltar al contenido'),
    h('header', { class: 'app-header' },
      h('div', { class: 'header-inner' },
        h('a', { class: 'brand', href: '#/radar' }, APP_NAME),
        h('div', { class: 'header-actions' },
          LocationPill(),
          ThemeToggle()
        )
      ),
      h('div', { class: 'fuel-row' }, FuelToggle())
    ),
    h('main', { id: 'main', class: 'main' }, content),
    BottomNav()
  );
}
