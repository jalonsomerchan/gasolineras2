import { HomePage } from './pages/homePage.js';
import { RadarPage } from './pages/radarPage.js';
import { FavoritesPage } from './pages/favoritesPage.js';
import { SearchPage } from './pages/searchPage.js';
import { MapPage } from './pages/mapPage.js';
import { MunicipalityPage } from './pages/municipalityPage.js';
import { NotFoundPage } from './pages/notFoundPage.js';
import { ProvincePage } from './pages/provincePage.js';
import { StationPage } from './pages/stationPage.js';

function cleanHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  return raw.split('?')[0].replace(/\/+$/, '') || '/';
}

function parseRoute() {
  const path = cleanHash();
  const parts = path.split('/').filter(Boolean);

  if (path === '/') return { page: HomePage, params: {} };
  if (parts[0] === 'radar') return { page: RadarPage, params: {} };
  if (parts[0] === 'favoritos') return { page: FavoritesPage, params: {} };
  if (parts[0] === 'buscar') return { page: SearchPage, params: {} };
  if (parts[0] === 'mapa') return { page: MapPage, params: {} };
  if (parts[0] === 'gasolinera' && parts[1]) return { page: StationPage, params: { ideess: parts[1] } };
  if (parts[0] === 'municipio' && parts[1] && parts[2]) return { page: MunicipalityPage, params: { provincia: parts[1], municipio: parts.slice(2).join('/') } };
  if (parts[0] === 'provincia' && parts[1]) return { page: ProvincePage, params: { provincia: parts.slice(1).join('/') } };

  return { page: NotFoundPage, params: {} };
}

export const Router = {
  mount(root, renderShell) {
    this.root = root;
    this.renderShell = renderShell;
    window.addEventListener('hashchange', () => this.render());
    this.render();
  },
  render() {
    const { page, params } = parseRoute();
    this.root.replaceChildren(this.renderShell(page(params)));
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
};
