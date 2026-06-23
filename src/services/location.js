import { DEFAULT_POSITION } from '../config/constants.js';

function devicePosition(timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no disponible'));
      return;
    }
    const timeout = window.setTimeout(() => reject(new Error('Tiempo de espera agotado')), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeout);
        resolve({
          latitud: position.coords.latitude,
          longitud: position.coords.longitude,
          accuracy: position.coords.accuracy,
          label: 'tu ubicación actual',
          source: 'device'
        });
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 10 * 60 * 1000 }
    );
  });
}

async function ipPosition() {
  const endpoints = [
    'https://ip-api.com/json/?fields=status,message,lat,lon,city,regionName,country,query',
    'http://ip-api.com/json/?fields=status,message,lat,lon,city,regionName,country,query'
  ];

  let lastError = null;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      if (!response.ok || data.status !== 'success') throw new Error(data.message || 'ip-api no respondió con ubicación');
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

export async function getBestLocation() {
  try {
    return await devicePosition();
  } catch {
    try {
      return await ipPosition();
    } catch {
      return DEFAULT_POSITION;
    }
  }
}
