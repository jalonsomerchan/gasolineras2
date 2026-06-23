import { ThemeStore } from '../state/themeStore.js';
import { h } from '../utils/dom.js';

export function ThemeToggle() {
  const isDark = ThemeStore.current() === 'dark';
  return h('button', {
    class: 'icon-button',
    type: 'button',
    title: isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
    'aria-label': isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
    onClick: () => ThemeStore.toggle()
  }, isDark ? '☀︎' : '☾');
}
