import { NEARBY_LIMIT, NEARBY_RADIUS_KM } from '../config/constants.js';
import { Api } from '../services/api.js';
import { getBestLocation } from '../services/location.js';
import { FuelStore } from '../state/fuelStore.js';
import { h, loading, errorBox, clear } from '../utils/dom.js';
import { StationList } from '../components/stationList.js';
import { MapView } from '../components/mapView.js';

function labelFor(location) {
  if (!location) return 'Moviendo el mapa puedes buscar en otra zona.';
  return `${location.label || 'Zona seleccionada'} · ${location.source === 'ip' ? 'IP' : location.source === 'device' ? 'GPS' : 'aprox.'}`;
}

export function MapPage() {
  const mapContainer = h('div', {}, loading('Cargando mapa...'));
  const listContainer = h('div', {}, loading('Buscando gasolineras...'));
  const locationLabel = h('span', { class: 'muted' }, 'Detectando zona...');
  let currentLocation = null;
  let stations = [];

  function render() {
    clear(mapContainer).append(MapView(stations.slice(0, 120), {
      center: currentLocation,
      tall: true,
      searchHere: true,
      onSearchHere: (center) => loadAt(center)
    }));
    clear(listContainer).append(StationList(stations.slice(0, 15), {
      ranked: true,
      sortByPrice: true,
      emptyMessage: 'No hay gasolineras en esta zona.'
    }));
    locationLabel.textContent = labelFor(currentLocation);
  }

  async function loadAt(location) {
    currentLocation = {
      latitud: location.latitud,
      longitud: location.longitud,
      label: location.label || 'Zona del mapa',
      source: location.source || 'map'
    };
    locationLabel.textContent = labelFor(currentLocation);
    clear(listContainer).append(loading('Buscando en esta localización...'));
    try {
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
      clear(listContainer).append(errorBox(error.message));
    }
  }

  async function loadInitial() {
    clear(mapContainer).append(loading('Cargando mapa...'));
    clear(listContainer).append(loading('Obteniendo zona inicial...'));
    try {
      const location = await getBestLocation();
      await loadAt(location);
    } catch (error) {
      clear(mapContainer).append(errorBox(error.message));
      clear(listContainer).append(errorBox(error.message));
    }
  }

  const page = h('div', { class: 'dashboard map-page' },
    h('section', { class: 'page-title-row' },
      h('div', {}, h('span', { class: 'pill' }, 'Mapa'), h('h1', {}, 'Mapa de precios'), h('p', {}, locationLabel))
    ),
    mapContainer,
    h('section', { class: 'glass-section stations-panel' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Gasolineras en el mapa'), h('p', { class: 'section-subtitle' }, 'Mueve el mapa y pulsa “Buscar en esta localización”.'))
      ),
      listContainer
    )
  );

  loadInitial();
  return page;
}
