import { NEARBY_LIMIT, NEARBY_RADIUS_KM } from '../config/constants.js';
import { Api } from '../services/api.js';
import { getBestLocation } from '../services/location.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { numberValue } from '../utils/format.js';
import { EmptyState } from '../components/emptyState.js';
import { MapView } from '../components/mapView.js';
import { SearchBox } from '../components/searchBox.js';
import { SortToggle } from '../components/sortToggle.js';
import { StationList } from '../components/stationList.js';

export function HomePage() {
  const favoriteContainer = h('div', {}, loading('Cargando favoritos...'));
  const nearbyContainer = h('div', {}, loading('Buscando gasolineras cercanas...'));
  const sortContainer = h('div');
  let nearbyStations = [];
  let currentLocation = null;
  let sortBy = 'distance';

  function sortedStations() {
    const fuel = FuelStore.current();
    return [...nearbyStations].sort((a, b) => {
      if (sortBy === 'price') return (numberValue(a[fuel.priceField]) ?? 999) - (numberValue(b[fuel.priceField]) ?? 999);
      return (numberValue(a.distancia_km) ?? 999) - (numberValue(b.distancia_km) ?? 999);
    });
  }

  function renderNearby() {
    clear(nearbyContainer);
    clear(sortContainer);
    if (!nearbyStations.length) {
      nearbyContainer.append(EmptyState('No se han encontrado gasolineras cercanas.'));
      return;
    }
    sortContainer.append(SortToggle(sortBy, (next) => {
      sortBy = next;
      renderNearby();
    }));
    const sorted = sortedStations();
    nearbyContainer.append(
      MapView(sorted, { center: currentLocation }),
      StationList(sorted, { emptyMessage: 'No hay gasolineras cercanas.' })
    );
  }

  async function loadFavorites() {
    const ids = FavoritesStore.all();
    clear(favoriteContainer);
    if (!ids.length) {
      favoriteContainer.append(EmptyState('Aún no tienes favoritos. Marca una gasolinera con la estrella para verla aquí.'));
      return;
    }
    try {
      const stations = await Api.stationsDetail(ids);
      favoriteContainer.append(StationList(stations, { onFavoriteChange: loadFavorites }));
    } catch (error) {
      favoriteContainer.append(errorBox(error.message));
    }
  }

  async function loadNearby() {
    clear(nearbyContainer);
    nearbyContainer.append(loading('Obteniendo ubicación...'));
    try {
      currentLocation = await getBestLocation();
      clear(nearbyContainer);
      nearbyContainer.append(loading(`Buscando cerca de ${currentLocation.label}...`));
      nearbyStations = await Api.nearby({
        latitud: currentLocation.latitud,
        longitud: currentLocation.longitud,
        combustible: FuelStore.get(),
        limit: NEARBY_LIMIT,
        radio_km: NEARBY_RADIUS_KM
      });
      renderNearby();
    } catch (error) {
      clear(nearbyContainer);
      nearbyContainer.append(errorBox(error.message));
    }
  }

  const page = h('div', { class: 'stack' },
    h('section', { class: 'hero' },
      h('h1', {}, 'Encuentra el mejor precio cerca de ti'),
      h('p', {}, 'Busca por municipio, provincia o gasolinera y compara precios actuales según el combustible seleccionado.'),
      SearchBox()
    ),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Mis favoritos'), h('p', { class: 'section-subtitle' }, 'Guardados solo en este dispositivo.'))
      ),
      favoriteContainer
    ),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Gasolineras cercanas'), h('p', { class: 'section-subtitle' }, 'Primero intentamos usar la ubicación del dispositivo; si falla, usamos ubicación por IP.')),
        sortContainer
      ),
      nearbyContainer
    )
  );

  loadFavorites();
  loadNearby();
  return page;
}
