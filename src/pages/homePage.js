import { NEARBY_LIMIT, NEARBY_RADIUS_KM } from '../config/constants.js';
import { Api } from '../services/api.js';
import { deviceOrBestLocation, shouldAskForLocation } from '../services/location.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { DiscountStore } from '../state/discountStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { numberValue, shortPrice } from '../utils/format.js';
import { EmptyState } from '../components/emptyState.js';
import { MapView } from '../components/mapView.js';
import { PriceRadar } from '../components/priceRadar.js';
import { SearchBox } from '../components/searchBox.js';
import { SortToggle } from '../components/sortToggle.js';
import { StationList } from '../components/stationList.js';
import { TrendCard } from '../components/trendCard.js';
import { LocationGate } from '../components/locationGate.js';

function bestPrice(stations) {
  const fuel = FuelStore.current();
  const prices = stations.map((station) => numberValue(DiscountStore.effectivePrice(station.ideess, station[fuel.priceField] ?? station.precio))).filter((value) => value && value > 0);
  return prices.length ? Math.min(...prices) : null;
}

function todayTime() {
  return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

function dateNDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

export function HomePage() {
  const radarContainer = h('div', {}, loading('Calculando precios...'));
  const favoriteContainer = h('div', {}, loading('Cargando favoritos...'));
  const nearbyContainer = h('div', {}, loading('Buscando gasolineras cercanas...'));
  const mapContainer = h('div', { id: 'nearby-map' });
  const trendContainer = h('div', {}, loading('Cargando histórico...'));
  const sortContainer = h('div');
  const locationText = h('span', { class: 'muted' }, 'Detectando ubicación...');
  const retryLocationButton = h('button', { class: 'location-refresh', type: 'button', title: 'Actualizar ubicación', 'aria-label': 'Actualizar ubicación' }, '↻');
  const bestPriceValue = h('strong', {}, '—');
  const updateValue = h('strong', {}, `Hoy ${todayTime()}`);
  let nearbyStations = [];
  let currentLocation = null;
  let sortBy = 'price';

  retryLocationButton.addEventListener('click', () => loadNearby(true));

  function sortedStations() {
    const fuel = FuelStore.current();
    return [...nearbyStations].sort((a, b) => {
      if (sortBy === 'price') return (numberValue(DiscountStore.effectivePrice(a.ideess, a[fuel.priceField] ?? a.precio)) ?? 999) - (numberValue(DiscountStore.effectivePrice(b.ideess, b[fuel.priceField] ?? b.precio)) ?? 999);
      return (numberValue(a.distancia_km) ?? 999) - (numberValue(b.distancia_km) ?? 999);
    });
  }

  function locationLabel() {
    if (!currentLocation) return '';
    const suffix = currentLocation.source === 'device'
      ? 'GPS'
      : currentLocation.source === 'device-cache'
        ? 'GPS guardado'
        : currentLocation.source === 'ip'
          ? 'IP'
          : 'aprox.';
    return `${currentLocation.label || 'Cerca de ti'} · ${suffix}`;
  }

  function renderRadar() {
    clear(radarContainer);
    radarContainer.append(PriceRadar(nearbyStations, locationLabel()));
  }

  function renderStatus() {
    const fuel = FuelStore.current();
    bestPriceValue.textContent = `${shortPrice(bestPrice(nearbyStations))} €/L`;
    updateValue.textContent = `Hoy ${todayTime()}`;
    document.querySelector('[data-home-fuel-label]')?.replaceChildren(fuel.label);
  }

  function renderNearby() {
    clear(nearbyContainer);
    clear(mapContainer);
    clear(sortContainer);
    renderRadar();
    renderStatus();
    if (!nearbyStations.length) {
      nearbyContainer.append(EmptyState('No se han encontrado gasolineras cercanas.'));
      return;
    }
    sortContainer.append(SortToggle(sortBy, (next) => {
      sortBy = next;
      renderNearby();
    }));
    const sorted = sortedStations();
    nearbyContainer.append(StationList(sorted.slice(0, 8), { emptyMessage: 'No hay gasolineras cercanas.', ranked: true }));
    mapContainer.append(MapView(sorted.slice(0, 30), { center: currentLocation, small: true }));
  }

  async function loadFavorites() {
    const ids = FavoritesStore.all();
    clear(favoriteContainer);
    if (!ids.length) {
      favoriteContainer.append(h('div', { class: 'empty compact-empty' }, 'Sin favoritos todavía. Marca una gasolinera con ★ y aparecerá aquí.'));
      return;
    }
    try {
      const fuel = FuelStore.current();
      const stations = (await Api.stationsDetail(ids)).sort((a, b) => (numberValue(DiscountStore.effectivePrice(a.ideess, a[fuel.priceField] ?? a.precio)) ?? 999) - (numberValue(DiscountStore.effectivePrice(b.ideess, b[fuel.priceField] ?? b.precio)) ?? 999));
      favoriteContainer.append(StationList(stations.slice(0, 6), { onFavoriteChange: loadFavorites, ranked: true, sortByPrice: true, emptyMessage: 'No tienes favoritos guardados.' }));
    } catch (error) {
      favoriteContainer.append(errorBox(error.message));
    }
  }

  async function loadTrend() {
    clear(trendContainer);
    try {
      const response = await Api.trend({ periodo: 'dia', fecha_desde: dateNDaysAgo(6) });
      trendContainer.append(TrendCard(response?.data || []));
    } catch {
      trendContainer.append(TrendCard([]));
    }
  }

  function renderLocationGate() {
    clear(radarContainer);
    clear(nearbyContainer);
    clear(mapContainer);
    clear(sortContainer);
    locationText.textContent = 'Permiso de ubicación pendiente';
    radarContainer.append(LocationGate({
      onSearch: () => loadNearby(true),
      text: 'Pulsa el botón para permitir la ubicación y ver el radar de precios cerca de ti.'
    }));
  }

  async function loadNearby(forceFresh = false) {
    clear(nearbyContainer);
    clear(mapContainer);
    clear(radarContainer);
    if (!forceFresh && await shouldAskForLocation()) {
      renderLocationGate();
      return;
    }
    radarContainer.append(loading('Obteniendo precios cercanos...'));
    nearbyContainer.append(loading('Obteniendo ubicación...'));
    try {
      currentLocation = await deviceOrBestLocation();
      locationText.textContent = locationLabel();
      clear(nearbyContainer);
      nearbyContainer.append(loading(`Buscando cerca de ${currentLocation.label || 'ti'}...`));
      nearbyStations = await Api.nearby({
        latitud: currentLocation.latitud,
        longitud: currentLocation.longitud,
        combustible: FuelStore.get(),
        limit: NEARBY_LIMIT,
        radio_km: NEARBY_RADIUS_KM,
        order: 'precio_asc'
      });
      renderNearby();
    } catch (error) {
      clear(radarContainer);
      clear(nearbyContainer);
      const message = !Api.hasKey()
        ? 'No hay API key configurada. En local edita config.js; en GitHub Pages revisa el secret GASOLINA_API_KEY.'
        : error.message;
      radarContainer.append(errorBox(message));
      nearbyContainer.append(errorBox(message));
    }
  }

  const page = h('div', { class: 'dashboard home-radar' },
    h('section', { id: 'favorites', class: 'glass-section stations-panel favorites-panel' },
      h('div', { class: 'section-head compact-head' },
        h('h2', { class: 'section-title' }, 'Favoritos'),
        h('span', { class: 'section-subtitle' }, 'Tus estaciones')
      ),
      favoriteContainer
    ),
    h('section', { class: 'search-panel is-small' }, SearchBox(), h('button', { class: 'filter-button', type: 'button', title: 'Filtros' }, '☷')),
    radarContainer,
    h('section', { class: 'filters-row', 'aria-label': 'Filtros rápidos' },
      h('button', { class: 'filter-chip is-active', type: 'button', onClick: () => loadNearby(true), title: 'Usar mi ubicación actual' }, `⌖ ${NEARBY_RADIUS_KM} km`),
      h('span', { class: 'filter-chip' }, 'Provincia⌄'),
      h('span', { class: 'filter-chip' }, 'Municipio⌄'),
      h('span', { class: 'filter-chip' }, 'Más filtros ☷')
    ),
    h('section', { class: 'glass-section stations-panel' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Estaciones cercanas'), h('p', { class: 'section-subtitle location-inline' }, locationText, retryLocationButton)),
        sortContainer
      ),
      nearbyContainer
    ),
    mapContainer,
    trendContainer
  );

  loadFavorites();
  loadNearby(false);
  loadTrend();
  return page;
}
