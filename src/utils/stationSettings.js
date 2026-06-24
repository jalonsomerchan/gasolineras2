import { KNOWN_BRANDS, SettingsStore } from '../state/settingsStore.js';
import { numberValue, shortPrice, stationName } from './format.js';

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

export function stationBrand(station) {
  const name = normalize(`${station?.rotulo || ''} ${station?.nombre || ''}`);
  const known = KNOWN_BRANDS.find((brand) => name.includes(normalize(brand)));
  if (known) return known;
  const fallback = normalize(stationName(station)).split(' ')[0] || 'Otra';
  return fallback.charAt(0) + fallback.slice(1).toLowerCase();
}

const BRAND_LOGOS = [
  ['REPSOL', './assets/brands/repsol.svg'],
  ['CAMPSA', './assets/brands/campsa.svg'],
  ['CEPSA', './assets/brands/cepsa.svg'],
  ['BALLENOIL', './assets/brands/ballenoil.svg'],
  ['BP', './assets/brands/bp.svg'],
  ['GALP', './assets/brands/galp.svg'],
  ['PLENOIL', './assets/brands/plenoil.svg'],
  ['PLENERGY', './assets/brands/plenergy.svg'],
  ['SHELL', './assets/brands/shell.svg'],
  ['PETRONOR', './assets/brands/petronor.svg'],
  ['AVIA', './assets/brands/avia.svg'],
  ['Q8', './assets/brands/q8.svg'],
  ['EASYGAS', './assets/brands/easygas.svg'],
  ['CARREFOUR', './assets/brands/carrefour.svg'],
  ['ALCAMPO', './assets/brands/alcampo.svg'],
  ['BONAREA', './assets/brands/bonarea.svg'],
  ['COOP', './assets/brands/coop.svg'],
  ['TAMOIL', './assets/brands/tamoil.svg']
];

export function stationBrandLogo(station) {
  const brand = normalize(stationBrand(station));
  const match = BRAND_LOGOS.find(([name]) => brand.includes(name) || name.includes(brand));
  return match?.[1] || null;
}

export function isStationHidden(station) {
  return SettingsStore.brandMode(stationBrand(station)) === 'hidden';
}

export function isStationPrioritized(station) {
  return SettingsStore.brandMode(stationBrand(station)) === 'favorite';
}

export function visibleStations(stations = []) {
  return (stations || []).filter((station) => !isStationHidden(station));
}

export function brandPriority(station) {
  return isStationPrioritized(station) ? 0 : 1;
}

export function compareBrandPriority(a, b) {
  return brandPriority(a) - brandPriority(b);
}

export function displayFuelPrice(literPrice) {
  const parsed = numberValue(literPrice);
  if (parsed === null || parsed <= 0) {
    return { main: '—', unit: SettingsStore.usesTankPrice() ? 'depósito' : '€/L', value: null, isTank: SettingsStore.usesTankPrice() };
  }
  const capacity = SettingsStore.tankCapacityLiters();
  if (capacity) {
    const total = parsed * capacity;
    return {
      main: `${total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
      unit: 'depósito',
      value: total,
      literValue: parsed,
      isTank: true,
      secondary: `${shortPrice(parsed)} €/L · ${capacity.toLocaleString('es-ES', { maximumFractionDigits: 1 })} L`
    };
  }
  return {
    main: `${shortPrice(parsed)} €/L`,
    unit: '€/L',
    value: parsed,
    literValue: parsed,
    isTank: false
  };
}

export function displayDelta(literDelta) {
  const parsed = numberValue(literDelta);
  if (parsed === null) return '—';
  const capacity = SettingsStore.tankCapacityLiters();
  if (capacity) {
    const total = parsed * capacity;
    return `${total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € depósito`;
  }
  return `${shortPrice(parsed)} €/L`;
}

export function mapMarkerLabel(literPrice) {
  const parsed = numberValue(literPrice);
  if (parsed === null || parsed <= 0) return '—';
  const capacity = SettingsStore.tankCapacityLiters();
  if (capacity) return `${Math.round(parsed * capacity).toLocaleString('es-ES')}€`;
  return shortPrice(parsed);
}
