import { DEFAULT_POSITION } from '../config/constants.js';

const LAST_LOCATION_KEY = 'gasolina:last-location';

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

function watchPositionOnce(timeout = 12000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation || !isSecureEnough()) {
      reject(new Error('Geolocalización no disponible'));
      return;
    }

    let watchId = null;
    const timer = window.setTimeout(() => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      reject(new Error('El navegador tardó demasiado en dar la ubicación'));
    }, timeout);

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        window.clearTimeout(timer);
        navigator.geolocation.clearWatch(watchId);
        resolve(normalizeDevicePosition(position));
      },
      (error) => {
        window.clearTimeout(timer);
        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        reject(new Error(geoErrorMessage(error)));
      },
      { enableHighAccuracy: false, timeout, maximumAge: 10 * 60 * 1000 }
    );
  });
}

function normalizeDevicePosition(position) {
  return {
    latitud: position.coords.latitude,
    longitud: position.coords.longitude,
    accuracy: Math.round(position.coords.accuracy || 0),
    label: 'tu ubicación actual',
    source: 'device'
  };
}

async function devicePosition() {
  const tries = [
    { enableHighAccuracy: false, timeout: 7000, maximumAge: 10 * 60 * 1000 },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 2 * 60 * 1000 }
  ];

  let lastError = null;
  for (const options of tries) {
    try {
      const location = await positionOnce(options);
      saveLastLocation(location);
      return location;
    } catch (error) {
      lastError = error;
    }
  }

  try {
    const location = await watchPositionOnce();
    saveLastLocation(location);
    return location;
  } catch (error) {
    lastError = error;
  }

  throw lastError || new Error('No se pudo obtener la ubicación del dispositivo');
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
          latitud: data.latitude,
          longitud: data.longitude,
          label: [data.city, data.region].filter(Boolean).join(', ') || data.country_name || 'ubicación por IP',
          source: 'ip',
          ip: data.ip
        };
      }

      if (endpoint.provider === 'ipwhois') {
        if (data.success === false || !data.latitude || !data.longitude) throw new Error(data.message || 'ipwho.is no respondió con ubicación');
        return {
          latitud: data.latitude,
          longitud: data.longitude,
          label: [data.city, data.region].filter(Boolean).join(', ') || data.country || 'ubicación por IP',
          source: 'ip',
          ip: data.ip
        };
      }

      if (data.status !== 'success') throw new Error(data.message || 'ip-api no respondió con ubicación');
      return {
        latitud: data.lat,
        longitud: data.lon,
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

  if (!preferFresh && cached) return emitLocation(cached);

  try {
    return emitLocation(await devicePosition());
  } catch (deviceError) {
    if (cached) return emitLocation(cached);
    try {
      return emitLocation(await ipPosition());
    } catch {
      return emitLocation({ ...DEFAULT_POSITION, error: deviceError.message });
    }
  }
}
