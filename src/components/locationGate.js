import { h } from '../utils/dom.js';

export function LocationGate({ onSearch, title = 'Busca gasolineras cercanas', text = 'Para mostrar precios cerca de ti, necesitamos permiso de ubicación. También puedes buscar por municipio o provincia.' } = {}) {
  const button = h('button', { class: 'btn primary location-gate-btn', type: 'button' }, 'Buscar gasolineras cercanas');
  button.addEventListener('click', () => onSearch?.());
  return h('section', { class: 'location-gate glass-section' },
    h('div', { class: 'location-gate-icon', 'aria-hidden': 'true' }, '⌖'),
    h('div', {},
      h('h2', {}, title),
      h('p', {}, text),
      h('div', { class: 'location-gate-actions' },
        button,
        h('a', { class: 'btn ghost', href: '#/buscar' }, 'Buscar por zona')
      )
    )
  );
}
