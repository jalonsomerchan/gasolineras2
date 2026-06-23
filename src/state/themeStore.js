import { Storage } from './storage.js';

const KEY = 'gasolineras2-theme';
const listeners = new Set();

function preferredTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(theme) {
  const selected = theme === 'system' ? preferredTheme() : theme;
  document.documentElement.dataset.theme = selected;
  document.documentElement.dataset.themeMode = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', selected === 'dark' ? '#041412' : '#f7fbf9');
}

export const ThemeStore = {
  get() {
    return Storage.get(KEY, 'system');
  },
  current() {
    const value = this.get();
    return value === 'system' ? preferredTheme() : value;
  },
  set(value) {
    Storage.set(KEY, value);
    apply(value);
    listeners.forEach((listener) => listener(value));
  },
  toggle() {
    const current = this.get();
    this.set(current === 'dark' ? 'light' : 'dark');
  },
  init() {
    apply(this.get());
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
      if (this.get() === 'system') apply('system');
    });
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
