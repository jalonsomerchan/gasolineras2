import { readStorage, writeStorage } from './storage.js';
import { numberValue } from '../utils/format.js';

const KEY = 'gasolineras2:station-discounts:v1';
const MAX_CENTS_PER_LITER = 300;

function normalizeId(ideess) {
  return String(ideess ?? '').trim();
}

function normalizeCents(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(MAX_CENTS_PER_LITER, Math.round(parsed * 10) / 10);
}

function state() {
  const value = readStorage(KEY, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function save(next) {
  writeStorage(KEY, next);
}

function get(ideess) {
  const id = normalizeId(ideess);
  if (!id) return 0;
  return normalizeCents(state()[id]);
}

function set(ideess, cents) {
  const id = normalizeId(ideess);
  if (!id) return 0;
  const next = state();
  const normalized = normalizeCents(cents);
  if (normalized > 0) next[id] = normalized;
  else delete next[id];
  save(next);
  window.dispatchEvent(new CustomEvent('station-discounts:change', { detail: { ideess: id, cents: normalized } }));
  return normalized;
}

function remove(ideess) {
  return set(ideess, 0);
}

function formatCents(cents) {
  const normalized = normalizeCents(cents);
  if (!normalized) return '0';
  return normalized.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

function priceInfo(ideess, value) {
  const original = numberValue(value);
  const discountCents = get(ideess);
  if (original === null || original <= 0) {
    return {
      original,
      effective: original,
      discountCents,
      discountEuros: discountCents / 100,
      hasDiscount: false
    };
  }

  const discountEuros = discountCents / 100;
  const hasDiscount = discountEuros > 0;
  return {
    original,
    effective: hasDiscount ? Math.max(0, original - discountEuros) : original,
    discountCents,
    discountEuros,
    hasDiscount
  };
}

function effectivePrice(ideess, value) {
  return priceInfo(ideess, value).effective;
}

export const DiscountStore = {
  all: state,
  get,
  set,
  remove,
  formatCents,
  priceInfo,
  effectivePrice
};
