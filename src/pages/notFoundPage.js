import { h } from '../utils/dom.js';

export function NotFoundPage() {
  return h('section', { class: 'hero' },
    h('span', { class: 'pill' }, '404'),
    h('h1', {}, 'Página no encontrada'),
    h('p', {}, 'La página que buscas no existe o ha cambiado de ruta.'),
    h('a', { class: 'btn', href: '#/' }, 'Volver al inicio')
  );
}
