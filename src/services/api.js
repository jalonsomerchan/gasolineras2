import { DEFAULT_API_BASE } from '../config/constants.js';

function runtimeConfig() {
  return window.GASOLINA_CONFIG || {};
}

function apiBase() {
  const config = runtimeConfig();
  return (config.apiBase || config.API_BASE_URL || DEFAULT_API_BASE).replace(/\/+$/, '');
}

function apiKey() {
  const config = runtimeConfig();
  return config.apiKey || config.API_KEY || '';
}

function authHeaders() {
  const key = apiKey();
  return key ? { Authorization: `Bearer ${key}`, 'X-API-Key': key } : {};
}

async function request(endpoint, params = {}) {
  const path = String(endpoint).replace(/^\/+/, '');
  const url = new URL(`${apiBase()}/${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  });

  const response = await fetch(url, { headers: authHeaders() });
  const data = await response.json().catch(() => null);
  if (!response.ok || data?.error) {
    throw new Error(data?.msg || `Error ${response.status} consultando la API`);
  }
  return data;
}

export const Api = {
  hasKey() {
    return Boolean(apiKey());
  },
  autocomplete(q, type = 'all', limit = 10) {
    return request('autocomplete', { q, type, limit });
  },
  nearby({ latitud, longitud, combustible, order = '', limit = 40, radio_km = 35 }) {
    return request('cercanas', { latitud, longitud, combustible, order, limit, radio_km });
  },
  gasStation(ideess) {
    return request('gasolinera', { ideess });
  },
  stations(filters = {}) {
    return request('gasolineras', filters);
  },
  stationsDetail(ids) {
    return request('gasolineras_detalle', { ideess: ids.join(',') });
  },
  provinces() {
    return request('provincias');
  },
  municipalities(filters = {}) {
    return request('municipios', filters);
  },
  ranking(filters = {}) {
    return request('ranking', filters);
  },
  stats(filters = {}) {
    return request('estadisticas', filters);
  },
  prices(filters = {}) {
    return request('precios', filters);
  },
  trend(filters = {}) {
    return request('tendencia', filters);
  },
  map(filters = {}) {
    return request('mapa', filters);
  },
  lastUpdate() {
    return request('actualizacion');
  }
};
