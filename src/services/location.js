import { DEFAULT_POSITION } from '../config/constants.js';

const LAST_LOCATION_KEY = 'gasolina:last-location';
const DEVICE_TIMEOUT = 26000;

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

function positionOnce(options) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no disponible en este navegador'));
      return;
    }
    if (!isSecureEnough()) {
      reject(new Error('La geolocalización solo funciona en HTTPS o localhost'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(normalizeDevicePosition(position)),
      (error) => reject(new Error(geoErrorMessage(error))),
      options
    );
  });
}

function watchPositionBest(timeout = DEVICE_TIMEOUT) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation || !isSecureEnough()) {
      reject(new Error('Geolocalización no disponible'));
      return;
    }

    let watchId = null;
    let best = null;
    let lastError = null;

    const finish = (result, error = null) => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      window.clearTimeout(timer);
      if (result) resolve(result);
      else reject(error || lastError || new Error('No se pudo obtener la ubicación del dispositivo'));
    };

    const timer = window.setTimeout(() => finish(best, lastError || new Error('El navegador tardó demasiado en dar la ubicación')), timeout);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = normalizeDevicePosition(position);
        if (!best || Number(location.accuracy || Infinity) < Number(best.accuracy || Infinity)) {
          best = location;
        }
        if (!location.accuracy || location.accuracy <= 250) finish(location);
      },
      (error) => {
        lastError = new Error(geoErrorMessage(error));
        if (error?.code === 1) finish(null, lastError);
        // iOS/macOS puede lanzar POSITION_UNAVAILABLE al principio y dar posición segundos después.
        // Por eso no se rechaza en code 2; se espera hasta timeout.
      },
      { enableHighAccuracy: true, timeout, maximumAge: 0 }
    );
  });
}

function normalizeDevicePosition(position) {
  return {
    latitud: position.coords.latitude,
    longitud: position.coords.longitude,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: Math.round(position.coords.accuracy || 0),
    label: 'tu ubicación actual',
    source: 'device'
  };
}

async function devicePosition() {
  if (await permissionState() === 'denied') {
    throw new Error('El navegador tiene bloqueada la ubicación para esta web');
  }

  const tries = [
    { enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity },
    { enableHighAccuracy: false, timeout: 13000, maximumAge: 5 * 60 * 1000 },
    { enableHighAccuracy: true, timeout: 22000, maximumAge: 0 }
  ];

  let lastError = null;
  for (const options of tries) {
    try {
      const location = await positionOnce(options);
      saveLastLocation(location);
      return location;
    } catch (error) {
      lastError = error;
      await sleep(450);
    }
  }

  try {
    const location = await watchPositionBest();
    saveLastLocation(location);
    return location;
  } catch (error) {
    lastError = error;
  }

  throw lastError || new Error('No se pudo obtener la ubicación del dispositivo');
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function saveLastLocation(location) {
  try {
    window.localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ ...location, savedAt: Date.now() }));
  } catch {}
}

function lastDeviceLocation(maxAge = 24 * 60 * 60 * 1000) {
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

function geoErrorMessage(error) {
  if (!error) return 'No se pudo obtener la ubicación';
  if (error.code === 1) return 'El navegador no ha dado permiso de ubicación';
  if (error.code === 2) return 'La ubicación no está disponible ahora mismo';
  if (error.code === 3) return 'El navegador tardó demasiado en dar la ubicación';
  return error.message || 'No se pudo obtener la ubicación';
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
    return emitLocation(await devicePosition());
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
