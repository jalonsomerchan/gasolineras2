import { DEFAULT_POSITION } from '../config/constants.js';

const LAST_LOCATION_KEY = 'gasolina:last-location';
const PUBLIC_IP_ENDPOINT = 'https://api64.ipify.org?format=json';

function emitLocation(location) {
  window.dispatchEvent(new CustomEvent('gasolina:location', { detail: location }));
  return location;
}

function saveLastLocation(location) {
  try {
    window.localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ ...location, savedAt: Date.now() }));
  } catch {}
}

function lastLocation(maxAge = 24 * 60 * 60 * 1000) {
  try {
    const raw = window.localStorage.getItem(LAST_LOCATION_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (!saved?.latitud || !saved?.longitud) return null;
    if (Date.now() - Number(saved.savedAt || 0) > maxAge) return null;
    return { ...saved, label: saved.label || 'tu última ubicación', source: `${saved.source || 'cache'}-cache` };
  } catch {
    return null;
  }
}

async function publicIp() {
  const response = await fetch(PUBLIC_IP_ENDPOINT, { cache: 'no-store', mode: 'cors' });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.ip) throw new Error('No se pudo detectar la IP pública');
  return data.ip;
}

function pickNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number !== 0) return number;
  }
  return null;
}

function normalizeIpGuide(data, ip) {
  const location = data?.location || data?.city || data?.geo || data || {};
  const latitud = pickNumber(
    location.latitude,
    location.lat,
    location.latitud,
    data?.latitude,
    data?.lat,
    data?.latitud
  );
  const longitud = pickNumber(
    location.longitude,
    location.lon,
    location.lng,
    location.longitud,
    data?.longitude,
    data?.lon,
    data?.lng,
    data?.longitud
  );

  if (latitud === null || longitud === null) {
    throw new Error('ip.guide no devolvió coordenadas para esta IP');
  }

  const city = location.city || location.city_name || data?.city;
  const region = location.region || location.region_name || data?.region;
  const country = location.country || location.country_name || data?.country;

  return {
    latitud,
    longitud,
    latitude: latitud,
    longitude: longitud,
    label: [city, region].filter(Boolean).join(', ') || country || 'ubicación por IP',
    source: 'ip',
    ip: data?.ip || ip
  };
}

async function ipPosition() {
  const ip = await publicIp();
  const response = await fetch(`https://ip.guide/${encodeURIComponent(ip)}`, { cache: 'no-store', mode: 'cors' });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error('No se pudo consultar ip.guide');
  const location = normalizeIpGuide(data, ip);
  saveLastLocation(location);
  return location;
}

export async function getBestLocation({ preferFresh = false } = {}) {
  const cached = !preferFresh ? lastLocation() : null;
  if (cached) return emitLocation(cached);

  try {
    return emitLocation(await ipPosition());
  } catch (error) {
    const olderCached = lastLocation(7 * 24 * 60 * 60 * 1000);
    if (olderCached) return emitLocation(olderCached);
    return emitLocation({ ...DEFAULT_POSITION, error: error.message });
  }
}
