import { numberValue } from './format.js';

export function stationCoords(station) {
  const lat = numberValue(station?.latitud);
  const lng = numberValue(station?.longitud);
  if (lat === null || lng === null) return null;
  return [lat, lng];
}

export function haversineKm(aLat, aLng, bLat, bLng) {
  const toRad = (deg) => deg * Math.PI / 180;
  const radius = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * radius * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
