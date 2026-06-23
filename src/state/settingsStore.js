import { readStorage, writeStorage } from './storage.js';
import { numberValue } from '../utils/format.js';

const KEY = 'gasolineras2:user-settings:v1';

export const KNOWN_BRANDS = [
  'Repsol',
  'Cepsa',
  'Ballenoil',
  'Plenoil',
  'Galp',
  'BP',
  'Shell',
  'Petronor',
  'Avia',
  'Q8',
  'EasyGas',
  'Carrefour',
  'Alcampo',
  'BonÀrea',
  'Coop',
  'Tamoil'
];

const DEFAULTS = {
  favoriteBrands: [],
  hiddenBrands: [],
  tankCapacityLiters: ''
};

function normalizeBrand(brand) {
  return String(brand || '').trim();
}

function uniqueBrands(values = []) {
  return [...new Set(values.map(normalizeBrand).filter(Boolean))];
}

function normalizeState(value) {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    favoriteBrands: uniqueBrands(input.favoriteBrands || []),
    hiddenBrands: uniqueBrands(input.hiddenBrands || []),
    tankCapacityLiters: normalizeCapacity(input.tankCapacityLiters)
  };
}

function normalizeCapacity(value) {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = numberValue(value);
  if (parsed === null || parsed <= 0) return '';
  return Math.min(250, Math.round(parsed * 10) / 10);
}

function state() {
  return normalizeState(readStorage(KEY, DEFAULTS));
}

function save(next) {
  const normalized = normalizeState(next);
  writeStorage(KEY, normalized);
  window.dispatchEvent(new CustomEvent('gasolina:settings-change', { detail: normalized }));
  return normalized;
}

function setBrandMode(brand, mode) {
  const normalizedBrand = normalizeBrand(brand);
  if (!normalizedBrand) return state();
  const current = state();
  const favoriteBrands = current.favoriteBrands.filter((item) => item !== normalizedBrand);
  const hiddenBrands = current.hiddenBrands.filter((item) => item !== normalizedBrand);

  if (mode === 'favorite') favoriteBrands.push(normalizedBrand);
  if (mode === 'hidden') hiddenBrands.push(normalizedBrand);

  return save({ ...current, favoriteBrands, hiddenBrands });
}

function brandMode(brand) {
  const normalizedBrand = normalizeBrand(brand);
  const current = state();
  if (current.hiddenBrands.includes(normalizedBrand)) return 'hidden';
  if (current.favoriteBrands.includes(normalizedBrand)) return 'favorite';
  return 'normal';
}

function setTankCapacityLiters(value) {
  const current = state();
  return save({ ...current, tankCapacityLiters: normalizeCapacity(value) });
}

function tankCapacityLiters() {
  const value = state().tankCapacityLiters;
  return value === '' ? null : Number(value);
}

function usesTankPrice() {
  return tankCapacityLiters() !== null;
}

export const SettingsStore = {
  all: state,
  save,
  brandMode,
  setBrandMode,
  setTankCapacityLiters,
  tankCapacityLiters,
  usesTankPrice,
  normalizeCapacity
};
