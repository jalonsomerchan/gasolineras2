import { FUELS, getFuel } from '../config/fuels.js';
import { readStorage, writeStorage } from './storage.js';

const STORAGE_KEY = 'gasolineras2:fuel';
const listeners = new Set();

export const FuelStore = {
  get() {
    const saved = readStorage(STORAGE_KEY, FUELS[0].id);
    return getFuel(saved).id;
  },
  current() {
    return getFuel(this.get());
  },
  set(fuelId) {
    const next = getFuel(fuelId).id;
    writeStorage(STORAGE_KEY, next);
    listeners.forEach((listener) => listener(next));
  },
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};
