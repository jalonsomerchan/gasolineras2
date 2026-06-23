import { h } from '../utils/dom.js';

export function SortToggle(current, onChange) {
  const options = [
    ['distance', 'Cercanía'],
    ['price', 'Precio']
  ];
  return h('div', { class: 'sort-toggle', role: 'group', 'aria-label': 'Ordenar gasolineras' },
    options.map(([id, label]) => h('button', {
      type: 'button',
      class: current === id ? 'is-active' : '',
      onClick: () => onChange(id)
    }, label))
  );
}
