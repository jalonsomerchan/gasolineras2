import { DEFAULT_POSITION } from '../config/constants.js';

const LAST_LOCATION_KEY = 'gasolina:last-location';
const DEVICE_TIMEOUT = 32000;

function isLocalhost() {
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function isSecureEnough() {
  return window.isSecureContext || isLocalhost();
}

function emitLocation(location) {
  window.dispatchEvent(new CustomEvent('gasolina:location', { detail: location }));
  return location;
}

async function permissionState() {
  try {
    if (!navigator.permissions?.query) return 'prompt';
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state || 'prompt';
  } catch {
    return 'prompt';
  }
}

function normalizeDevicePosition(position, label = 'tu ubicación actual') {
  return {
    latitud: position.coords.latitude,
    longitud: position.coords.longitude,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Math.round(position.coords.accuracy || 0),
    label,
    source: 'device'
  };
}

function geoErrorMessage(error) {
  if (!error) return 'No se pudo obtener la ubicación';
  if (error.code === 1) return 'El navegador no ha dado permiso de ubicación';
  if (error.code === 2) return 'El sistema no puede calcular la ubicación ahora mismo';
  if (error.code === 3) return 'El navegador tardó demasiado en dar la ubicación';
  return error.message || 'No se pudo obtener la ubicación';
}

function saveLastLocation(location) {
  try {
    window.localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ ...location, savedAt: Date.now() }));
  } catch {}
}

function lastDeviceLocation(maxAge = 7 * 24 * 60 * 60 * 1000) {
  try {
    const raw = window.localStorage.getItem(LAST_LOCATION_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (!saved?.latitud || !saved?.longitud) return null;
    if (Date.now() - Number(saved.savedAt || 0) > maxAge) return null;
    return { ...saved, label: 'tu última ubicación', source: 'device-cache' };
  } catch {
    return null;
  }
}

function getCachedCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation || !isSecureEnough()) {
      reject(new Error('Geolocalización no disponible'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(normalizeDevicePosition(position)),
      (error) => reject(new Error(geoErrorMessage(error))),
      { enableHighAccuracy: false, timeout: 4500, maximumAge: 15 * 60 * 1000 }
    );
  });
}

function watchDevicePosition(timeout = DEVICE_TIMEOUT) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation || !isSecureEnough()) {
      reject(new Error('Geolocalización no disponible'));
      return;
    }

    let watchId = null;
    let best = null;
    let lastError = null;
    let settled = false;

    const finish = (result, error = null) => {
      if (settled) return;
      settled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(timer);
      if (result) resolve(result);
      else reject(error || lastError || new Error('No se pudo obtener la ubicación del dispositivo'));
    };

    const timer = window.setTimeout(() => {
      finish(best, lastError || new Error('No se pudo obtener una ubicación precisa del dispositivo'));
    }, timeout);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = normalizeDevicePosition(position);
        if (!best || Number(location.accuracy || Infinity) < Number(best.accuracy || Infinity)) {
          best = location;
        }

        // En escritorio la precisión puede ser amplia; se acepta si el sistema devuelve coordenadas reales.
        if (!location.accuracy || location.accuracy <= 3000) {
          finish(location);
        }
      },
      (error) => {
        lastError = new Error(geoErrorMessage(error));
        if (error?.code === 1) finish(null, lastError);
        // POSITION_UNAVAILABLE en macOS/iOS suele llegar antes de que CoreLocation termine.
        // Se espera hasta timeout en vez de caer a IP al primer error.
      },
      { enableHighAccuracy: false, timeout, maximumAge: 0 }
    );
  });
}

async function devicePosition({ preferFresh = true } = {}) {
  if ((await permissionState()) === 'denied') {
    throw new Error('El navegador tiene bloqueada la ubicación para esta web');
  }

  if (!preferFresh) {
    try {
      const cachedBrowserPosition = await getCachedCurrentPosition();
      saveLastLocation(cachedBrowserPosition);
      return cachedBrowserPosition;
    } catch {}
  }

  const location = await watchDevicePosition(preferFresh ? DEVICE_TIMEOUT : 22000);
  saveLastLocation(location);
  return location;
}

async function ipPosition() {
  const endpoints = [
    { url: 'https://ipwho.is/', provider: 'ipwhois' },
    { url: 'https://ipapi.co/json/', provider: 'ipapi' }
  ];

  if (window.location.protocol === 'http:' || isLocalhost()) {
    endpoints.push({
      url: 'http://ip-api.com/json/?fields=status,message,lat,lon,city,regionName,country,query',
      provider: 'ipapi-http'
    });
  }

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint.url, { cache: 'no-store', mode: 'cors' });
      const data = await response.json();
      if (!response.ok) throw new Error('No se pudo consultar la ubicación por IP');

      if (endpoint.provider === 'ipapi') {
        if (!data.latitude || !data.longitude) throw new Error(data.reason || 'ipapi no respondió con ubicación');
        return {
          latitud: Number(data.latitude),
          longitud: Number(data.longitude),
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          label: [data.city, data.region].filter(Boolean).join(', ') || data.country_name || 'ubicación por IP',
          source: 'ip',
          ip: data.ip
        };
      }

      if (endpoint.provider === 'ipwhois') {
        if (data.success === false || !data.latitude || !data.longitude) throw new Error(data.message || 'ipwho.is no respondió con ubicación');
        return {
          latitud: Number(data.latitude),
          longitud: Number(data.longitude),
          latitude: Number(data.latitude),
          longitude: Number(data.longitude),
          label: [data.city, data.region].filter(Boolean).join(', ') || data.country || 'ubicación por IP',
          source: 'ip',
          ip: data.ip
        };
      }

      if (data.status !== 'success') throw new Error(data.message || 'ip-api no respondió con ubicación');
      return {
        latitud: Number(data.lat),
        longitud: Number(data.lon),
        latitude: Number(data.lat),
        longitude: Number(data.lon),
        label: [data.city, data.regionName].filter(Boolean).join(', ') || data.country || 'ubicación por IP',
        source: 'ip',
        ip: data.query
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No se pudo obtener ubicación por IP');
}

export async function getBestLocation({ preferFresh = true } = {}) {
  const cached = lastDeviceLocation();

  try {
    return emitLocation(await devicePosition({ preferFresh }));
  } catch (deviceError) {
    if (!preferFresh && cached) return emitLocation(cached);
    try {
      return emitLocation(await ipPosition());
    } catch {
      if (cached) return emitLocation(cached);
      return emitLocation({ ...DEFAULT_POSITION, error: deviceError.message });
    }
  }
}
