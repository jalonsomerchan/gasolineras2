import { NEARBY_LIMIT, NEARBY_RADIUS_KM } from '../config/constants.js';
import { Api } from '../services/api.js';
import { getBestLocation } from '../services/location.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { numberValue } from '../utils/format.js';
import { EmptyState } from '../components/emptyState.js';
import { MapView } from '../components/mapView.js';
import { PriceRadar } from '../components/priceRadar.js';
import { SearchBox } from '../components/searchBox.js';
import { SortToggle } from '../components/sortToggle.js';
import { StationList } from '../components/stationList.js';

export function HomePage() {
  const radarContainer = h('div', {}, loading('Calculando precios...'));
  const favoriteContainer = h('div', {}, loading('Cargando favoritos...'));
  const nearbyContainer = h('div', {}, loading('Buscando gasolineras cercanas...'));
  const mapContainer = h('div');
  const sortContainer = h('div');
  const locationText = h('span', { class: 'muted' }, 'Detectando ubicación...');
  const retryLocationButton = h('button', { class: 'location-refresh', type: 'button', title: 'Actualizar ubicación' }, '↻');
  let nearbyStations = [];
  let currentLocation = null;
  let sortBy = 'price';

  retryLocationButton.addEventListener('click', () => loadNearby(true));

  function sortedStations() {
    const fuel = FuelStore.current();
    return [...nearbyStations].sort((a, b) => {
      if (sortBy === 'price') return (numberValue(a[fuel.priceField]) ?? 999) - (numberValue(b[fuel.priceField]) ?? 999);
      return (numberValue(a.distancia_km) ?? 999) - (numberValue(b.distancia_km) ?? 999);
    });
  }

  function locationLabel() {
    if (!currentLocation) return '';
    const suffix = currentLocation.source === 'device' ? 'GPS' : currentLocation.source === 'device-cache' ? 'GPS guardado' : currentLocation.source === 'ip' ? 'IP' : 'aprox.';
    return `${currentLocation.label || 'Cerca de ti'} · ${suffix}`;
  }

  function renderRadar() {
    clear(radarContainer);
    radarContainer.append(PriceRadar(nearbyStations, locationLabel()));
  }

  function renderNearby() {
    clear(nearbyContainer);
    clear(mapContainer);
    clear(sortContainer);
    renderRadar();
    if (!nearbyStations.length) {
      nearbyContainer.append(EmptyState('No se han encontrado gasolineras cercanas.'));
      return;
    }
    sortContainer.append(SortToggle(sortBy, (next) => {
      sortBy = next;
      renderNearby();
    }));
    const sorted = sortedStations();
    nearbyContainer.append(StationList(sorted.slice(0, 10), { emptyMessage: 'No hay gasolineras cercanas.', ranked: true }));
    mapContainer.append(MapView(sorted, { center: currentLocation, small: true }));
  }

  async function loadFavorites() {
    const ids = FavoritesStore.all();
    clear(favoriteContainer);
    if (!ids.length) {
      favoriteContainer.append(h('div', { class: 'empty compact-empty' }, 'Sin favoritos todavía. Marca una gasolinera con ★ y aparecerá aquí.'));
      return;
    }
    try {
      const stations = await Api.stationsDetail(ids);
      favoriteContainer.append(StationList(stations.slice(0, 8), { compact: true, onFavoriteChange: loadFavorites }));
    } catch (error) {
      favoriteContainer.append(errorBox(error.message));
    }
  }

  async function loadNearby(forceFresh = false) {
    clear(nearbyContainer);
    clear(mapContainer);
    clear(radarContainer);
    radarContainer.append(loading('Obteniendo precios cercanos...'));
    nearbyContainer.append(loading('Obteniendo ubicación...'));
    try {
      currentLocation = await getBestLocation({ preferFresh: forceFresh });
      locationText.textContent = locationLabel();
      clear(nearbyContainer);
      nearbyContainer.append(loading(`Buscando cerca de ${currentLocation.label}...`));
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

  const page = h('div', { class: 'dashboard' },
    h('section', { class: 'top-panel' },
      h('div', { class: 'headline-row' },
        h('div', {}, h('h1', {}, 'Gasolina al día'), h('p', {}, 'Encuentra el mejor precio cerca de ti.')),
        h('div', { class: 'location-chip' }, h('span', { 'aria-hidden': 'true' }, '⌖'), locationText, retryLocationButton)
      ),
      h('section', { id: 'favorites', class: 'favorites-strip glass-section' },
        h('div', { class: 'section-head compact-head' },
          h('h2', { class: 'section-title' }, 'Favoritos'),
          h('span', { class: 'section-subtitle' }, 'Local')
        ),
        favoriteContainer
      ),
      SearchBox()
    ),
    radarContainer,
    h('section', { class: 'filters-row', 'aria-label': 'Filtros rápidos' },
      h('span', { class: 'filter-chip is-active' }, `📍 ${NEARBY_RADIUS_KM} km`),
      h('span', { class: 'filter-chip' }, 'Provincia'),
      h('span', { class: 'filter-chip' }, 'Municipio'),
      h('span', { class: 'filter-chip' }, 'Más filtros')
    ),
    h('section', { class: 'glass-section' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Estaciones cercanas'), h('p', { class: 'section-subtitle' }, 'Ordenadas por precio o distancia.')),
        sortContainer
      ),
      nearbyContainer
    ),
    mapContainer
  );

  loadFavorites();
  loadNearby(false);
  return page;
}
