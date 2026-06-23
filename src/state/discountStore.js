import { readStorage, writeStorage } from './storage.js';
import { numberValue } from '../utils/format.js';
import { stationBrand } from '../utils/stationSettings.js';

const STATION_KEY = 'gasolineras2:station-discounts:v1';
const BRAND_KEY = 'gasolineras2:brand-discounts:v1';
const MAX_CENTS_PER_LITER = 300;

function normalizeId(ideess) {
  return String(ideess ?? '').trim();
}

function normalizeBrandName(brand) {
  return String(brand || '').trim();
}

function normalizeCents(value) {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(MAX_CENTS_PER_LITER, Math.round(parsed * 10) / 10);
}

function objectState(key) {
  const value = readStorage(key, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function save(key, next) {
  writeStorage(key, next);
}

function stationDiscounts() {
  return objectState(STATION_KEY);
}

function brandDiscounts() {
  return objectState(BRAND_KEY);
}

function get(ideess) {
  const id = normalizeId(ideess);
  if (!id) return 0;
  return normalizeCents(stationDiscounts()[id]);
}

function getBrand(brand) {
  const key = normalizeBrandName(brand);
  if (!key) return 0;
  return normalizeCents(brandDiscounts()[key]);
}

function set(ideess, cents) {
  const id = normalizeId(ideess);
  if (!id) return 0;
  const next = stationDiscounts();
  const normalized = normalizeCents(cents);
  if (normalized > 0) next[id] = normalized;
  else delete next[id];
  save(STATION_KEY, next);
  window.dispatchEvent(new CustomEvent('station-discounts:change', { detail: { ideess: id, cents: normalized } }));
  return normalized;
}

function setBrand(brand, cents) {
  const key = normalizeBrandName(brand);
  if (!key) return 0;
  const next = brandDiscounts();
  const normalized = normalizeCents(cents);
  if (normalized > 0) next[key] = normalized;
  else delete next[key];
  save(BRAND_KEY, next);
  window.dispatchEvent(new CustomEvent('brand-discounts:change', { detail: { brand: key, cents: normalized } }));
  return normalized;
}

function remove(ideess) {
  return set(ideess, 0);
}

function removeBrand(brand) {
  return setBrand(brand, 0);
}

function formatCents(cents) {
  const normalized = normalizeCents(cents);
  if (!normalized) return '0';
  return normalized.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

function targetInfo(target) {
  if (target && typeof target === 'object') {
    const id = normalizeId(target.ideess);
    const brand = stationBrand(target);
    return { id, brand };
  }
  return { id: normalizeId(target), brand: '' };
}

function priceInfo(target, value) {
  const original = numberValue(value);
  const { id, brand } = targetInfo(target);
  const stationDiscountCents = get(id);
  const brandDiscountCents = getBrand(brand);
  const discountCents = normalizeCents(stationDiscountCents + brandDiscountCents);

  if (original === null || original <= 0) {
    return {
      original,
      effective: original,
      stationDiscountCents,
      brandDiscountCents,
      discountCents,
      discountEuros: discountCents / 100,
      hasDiscount: false,
      hasStationDiscount: false,
      hasBrandDiscount: false,
      brand
    };
  }

  const discountEuros = discountCents / 100;
  const hasDiscount = discountEuros > 0;
  return {
    original,
    effective: hasDiscount ? Math.max(0, original - discountEuros) : original,
    stationDiscountCents,
    brandDiscountCents,
    discountCents,
    discountEuros,
    hasDiscount,
    hasStationDiscount: stationDiscountCents > 0,
    hasBrandDiscount: brandDiscountCents > 0,
    brand
  };
}

function effectivePrice(target, value) {
  return priceInfo(target, value).effective;
}

function discountDescription(info) {
  if (!info?.hasDiscount) return '';
  const parts = [];
  if (info.brandDiscountCents > 0 && info.brand) parts.push(`${info.brand}: -${formatCents(info.brandDiscountCents)} c/L`);
  if (info.stationDiscountCents > 0) parts.push(`gasolinera: -${formatCents(info.stationDiscountCents)} c/L`);
  if (!parts.length) return `Dto. -${formatCents(info.discountCents)} c/L aplicado`;
  return `Dto. -${formatCents(info.discountCents)} c/L aplicado (${parts.join(' + ')})`;
}

export const DiscountStore = {
  all: stationDiscounts,
  brandAll: brandDiscounts,
  get,
  getBrand,
  set,
  setBrand,
  remove,
  removeBrand,
  formatCents,
  priceInfo,
  effectivePrice,
  discountDescription
};
