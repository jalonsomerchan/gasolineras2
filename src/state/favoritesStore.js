import { readStorage, writeStorage } from './storage.js';

const STORAGE_KEY = 'gasolineras2:favorites';
const listeners = new Set();

function normalizeId(id) {
  return String(id || '').trim();
}

export const FavoritesStore = {
  all() {
    return readStorage(STORAGE_KEY, []);
  },
  has(id) {
    return this.all().includes(normalizeId(id));
  },
  add(id) {
    const value = normalizeId(id);
    if (!value) return;
    const next = Array.from(new Set([...this.all(), value]));
    writeStorage(STORAGE_KEY, next);
    listeners.forEach((listener) => listener(next));
  },
  remove(id) {
    const value = normalizeId(id);
    const next = this.all().filter((item) => item !== value);
    writeStorage(STORAGE_KEY, next);
    listeners.forEach((listener) => listener(next));
  },
  toggle(id) {
    this.has(id) ? this.remove(id) : this.add(id);
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
