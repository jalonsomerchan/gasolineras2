import { FUELS } from '../config/fuels.js';
import { FuelStore } from '../state/fuelStore.js';
import { h } from '../utils/dom.js';

export function FuelToggle() {
  const current = FuelStore.get();
  return h('div', { class: 'fuel-toggle', role: 'group', 'aria-label': 'Seleccionar combustible' },
    FUELS.map((fuel) => h('button', {
      class: `fuel-option ${fuel.id === current ? 'is-active' : ''}`,
      type: 'button',
      'aria-pressed': fuel.id === current ? 'true' : 'false',
      onClick: () => FuelStore.set(fuel.id)
    }, h('span', { 'aria-hidden': 'true' }, fuel.id === 'gasoleo_a' ? '◆' : '⛽'), h('span', { class: 'fuel-label', dataset: { short: fuel.shortLabel } }, fuel.label)))
  );
}
