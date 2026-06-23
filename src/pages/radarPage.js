import { NEARBY_LIMIT, NEARBY_RADIUS_KM } from '../config/constants.js';
import { Api } from '../services/api.js';
import { getBestLocation } from '../services/location.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { numberValue } from '../utils/format.js';
import { MapView } from '../components/mapView.js';
import { PriceRadar } from '../components/priceRadar.js';
import { SortToggle } from '../components/sortToggle.js';
import { StationList } from '../components/stationList.js';
import { TrendCard } from '../components/trendCard.js';

function dateNDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function locationLabel(location) {
  if (!location) return 'Cerca de ti';
  const suffix = location.source === 'device' ? 'GPS' : location.source === 'ip' ? 'IP' : 'aprox.';
  return `${location.label || 'Cerca de ti'} · ${suffix}`;
}

export function RadarPage() {
  const radarContainer = h('div', {}, loading('Calculando radar...'));
  const mapContainer = h('div', {}, loading('Cargando mapa...'));
  const listContainer = h('div', {}, loading('Buscando gasolineras...'));
  const sortContainer = h('div');
  const trendContainer = h('div', {}, loading('Cargando histórico...'));
  const locationText = h('span', { class: 'muted' }, 'Detectando ubicación...');
  const retryButton = h('button', { class: 'location-refresh', type: 'button', title: 'Actualizar ubicación real' }, '⌖');

  let stations = [];
  let currentLocation = null;
  let sortBy = 'price';

  function sortedStations() {
    const fuel = FuelStore.current();
    return [...stations].sort((a, b) => {
      if (sortBy === 'price') return (numberValue(a[fuel.priceField]) ?? 999) - (numberValue(b[fuel.priceField]) ?? 999);
      return (numberValue(a.distancia_km) ?? 999) - (numberValue(b.distancia_km) ?? 999);
    });
  }

  function render() {
    const sorted = sortedStations();
    clear(radarContainer).append(PriceRadar(sorted, locationLabel(currentLocation)));
    clear(sortContainer).append(SortToggle(sortBy, (next) => { sortBy = next; render(); }));
    clear(mapContainer).append(MapView(sorted.slice(0, 60), { center: currentLocation, tall: true }));
    clear(listContainer).append(StationList(sorted.slice(0, 12), {
      ranked: true,
      emptyMessage: 'No se han encontrado gasolineras cercanas.'
    }));
    locationText.textContent = locationLabel(currentLocation);
  }

  async function load(forceFresh = false) {
    clear(radarContainer).append(loading('Calculando radar...'));
    clear(mapContainer).append(loading('Cargando mapa...'));
    clear(listContainer).append(loading('Obteniendo ubicación...'));
    try {
      currentLocation = await getBestLocation({ preferFresh: forceFresh });
      locationText.textContent = locationLabel(currentLocation);
      clear(listContainer).append(loading(`Buscando cerca de ${currentLocation.label || 'ti'}...`));
      stations = await Api.nearby({
        latitud: currentLocation.latitud,
        longitud: currentLocation.longitud,
        combustible: FuelStore.get(),
        limit: NEARBY_LIMIT,
        radio_km: NEARBY_RADIUS_KM,
        order: 'precio_asc'
      });
      render();
    } catch (error) {
      const message = !Api.hasKey()
        ? 'No hay API key configurada. En local edita config.js; en GitHub Pages revisa el secret GASOLINA_API_KEY.'
        : error.message;
      clear(radarContainer).append(errorBox(message));
      clear(mapContainer).append(errorBox(message));
      clear(listContainer).append(errorBox(message));
    }
  }

  retryButton.addEventListener('click', () => load(true));

  const page = h('div', { class: 'dashboard radar-page' },
    h('section', { class: 'page-title-row' },
      h('div', {}, h('span', { class: 'pill' }, 'Radar'), h('h1', {}, 'Radar de precios'), h('p', {}, 'Mapa grande con precios cerca de tu ubicación.')),
      h('p', { class: 'section-subtitle location-inline' }, locationText, retryButton)
    ),
    radarContainer,
    mapContainer,
    h('section', { class: 'glass-section stations-panel' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Estaciones cercanas'), h('p', { class: 'section-subtitle' }, `Dentro de ${NEARBY_RADIUS_KM} km.`)),
        sortContainer
      ),
      listContainer
    ),
    trendContainer
  );

  Api.trend({ periodo: 'dia', fecha_desde: dateNDaysAgo(6) })
    .then((response) => clear(trendContainer).append(TrendCard(response?.data || [])))
    .catch(() => clear(trendContainer).append(TrendCard([])));
  load(false);
  return page;
}

export const HomePage = RadarPage;
