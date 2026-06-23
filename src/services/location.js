import { DEFAULT_POSITION } from '../config/constants.js';

function isSecureEnough() {
  return window.isSecureContext || ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
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
      (position) => resolve({
        latitud: position.coords.latitude,
        longitud: position.coords.longitude,
        accuracy: Math.round(position.coords.accuracy || 0),
        label: 'tu ubicación actual',
        source: 'device'
      }),
      (error) => reject(new Error(geoErrorMessage(error))),
      options
    );
  });
}

async function devicePosition() {
  const tries = [
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 2 * 60 * 1000 },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 15 * 60 * 1000 }
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
  throw lastError || new Error('No se pudo obtener la ubicación del dispositivo');
}

function saveLastLocation(location) {
  try {
    window.localStorage.setItem('gasolina:last-location', JSON.stringify({ ...location, savedAt: Date.now() }));
  } catch {}
}

function lastDeviceLocation() {
  try {
    const raw = window.localStorage.getItem('gasolina:last-location');
    const saved = raw ? JSON.parse(raw) : null;
    if (!saved?.latitud || !saved?.longitud) return null;
    if (Date.now() - Number(saved.savedAt || 0) > 60 * 60 * 1000) return null;
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
    'https://ipapi.co/json/',
    'https://ipwho.is/',
    'http://ip-api.com/json/?fields=status,message,lat,lon,city,regionName,country,query'
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error('No se pudo consultar la ubicación por IP');

      if (endpoint.includes('ipapi.co')) {
        if (!data.latitude || !data.longitude) throw new Error(data.reason || 'ipapi no respondió con ubicación');
        return {
          latitud: data.latitude,
          longitud: data.longitude,
          label: [data.city, data.region].filter(Boolean).join(', ') || data.country_name || 'ubicación por IP',
          source: 'ip',
          ip: data.ip
        };
      }

      if (endpoint.includes('ipwho.is')) {
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

  if (!preferFresh && cached) return cached;

  try {
    return await devicePosition();
  } catch (deviceError) {
    if (cached) return cached;
    try {
      return await ipPosition();
    } catch {
      return { ...DEFAULT_POSITION, error: deviceError.message };
    }
  }
}
