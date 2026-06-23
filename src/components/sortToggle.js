import { h } from '../utils/dom.js';

const options = [
  { id: 'price', label: 'Precio' },
  { id: 'distance', label: 'Cercanía' }
];

export function SortToggle(value, onChange) {
  return h('div', { class: 'sort-select', role: 'group', 'aria-label': 'Ordenar gasolineras' },
    h('span', {}, 'Ordenar:'),
    options.map((option) => h('button', {
      type: 'button',
      class: option.id === value ? 'is-active' : '',
      'aria-pressed': option.id === value ? 'true' : 'false',
      onClick: () => onChange(option.id)
    }, option.label))
  );
}
