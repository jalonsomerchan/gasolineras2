import { Api } from '../services/api.js';
import { geolocationPermissionState, devicePosition } from '../services/location.js';
import { DiscountStore } from '../state/discountStore.js';
import { FavoritesStore } from '../state/favoritesStore.js';
import { FuelStore } from '../state/fuelStore.js';
import { KNOWN_BRANDS, SettingsStore } from '../state/settingsStore.js';
import { h, loading, clear, errorBox } from '../utils/dom.js';
import { dateText, routePart, stationName } from '../utils/format.js';
import { displayFuelPrice, stationBrand } from '../utils/stationSettings.js';

function permissionLabel(state) {
  if (state === 'granted') return 'Permiso concedido';
  if (state === 'denied') return 'Permiso bloqueado';
  if (state === 'prompt') return 'Pendiente de pedir permiso';
  if (state === 'unsupported') return 'No disponible en este navegador';
  return 'Sin comprobar';
}

function brandChip(brand, mode, onChange) {
  const select = h('select', { class: 'brand-mode-select', 'aria-label': `Ajuste para ${brand}` },
    h('option', { value: 'normal', selected: mode === 'normal' }, 'Normal'),
    h('option', { value: 'favorite', selected: mode === 'favorite' }, 'Priorizar'),
    h('option', { value: 'hidden', selected: mode === 'hidden' }, 'Ocultar')
  );
  select.addEventListener('change', () => onChange(select.value));

  const discount = h('input', {
    class: 'brand-discount-input',
    type: 'number',
    min: '0',
    max: '300',
    step: '0.1',
    inputmode: 'decimal',
    placeholder: '0',
    value: DiscountStore.getBrand(brand) || '',
    'aria-label': `Descuento de ${brand} en céntimos por litro`
  });
  const save = () => DiscountStore.setBrand(brand, discount.value);
  discount.addEventListener('change', save);
  discount.addEventListener('blur', save);

  return h('article', { class: `brand-setting-chip is-${mode}` },
    h('div', { class: 'brand-setting-head' }, h('strong', {}, brand), select),
    h('label', { class: 'brand-discount-label' },
      h('span', {}, 'Descuento marca'),
      h('span', { class: 'brand-discount-row' }, discount, h('small', {}, 'c/L'))
    )
  );
}

function BrandsSettings() {
  const container = h('div', { class: 'brand-settings-grid' });
  function render() {
    clear(container);
    KNOWN_BRANDS.forEach((brand) => {
      container.append(brandChip(brand, SettingsStore.brandMode(brand), (mode) => {
        SettingsStore.setBrandMode(brand, mode);
        render();
      }));
    });
  }
  render();
  return container;
}

function TankSettings() {
  const current = SettingsStore.tankCapacityLiters();
  const input = h('input', {
    class: 'settings-input',
    type: 'number',
    min: '0',
    max: '250',
    step: '0.5',
    inputmode: 'decimal',
    placeholder: 'Ej. 50',
    value: current || ''
  });
  const status = h('p', { class: 'settings-note' }, current ? `Mostrando precios por depósito de ${current} L.` : 'Si lo dejas vacío, se mostrarán precios por litro.');

  function save() {
    const next = SettingsStore.setTankCapacityLiters(input.value);
    const liters = next.tankCapacityLiters;
    status.textContent = liters ? `Mostrando precios por depósito de ${liters} L.` : 'Si lo dejas vacío, se mostrarán precios por litro.';
  }

  input.addEventListener('change', save);
  input.addEventListener('blur', save);

  return h('div', { class: 'tank-settings' },
    h('label', {}, h('span', {}, 'Capacidad del depósito'), input),
    h('button', { class: 'btn ghost', type: 'button', onClick: () => { input.value = ''; save(); } }, 'Mostrar €/L'),
    status
  );
}

function LocationSettings() {
  const status = h('div', {}, loading('Comprobando permiso...'));
  const button = h('button', { class: 'btn primary', type: 'button' }, 'Probar ubicación');

  async function refresh() {
    clear(status).append(loading('Comprobando permiso...'));
    const state = await geolocationPermissionState();
    clear(status).append(
      h('strong', {}, permissionLabel(state)),
      h('p', { class: 'settings-note' }, state === 'denied'
        ? 'El permiso está bloqueado. Tendrás que activarlo desde los ajustes del navegador o del sistema.'
        : 'La portada y el radar solo pedirán GPS cuando lo autorices desde el botón de búsqueda cercana.'
      )
    );
  }

  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Solicitando...';
    try {
      const location = await devicePosition({ timeout: 15000 });
      clear(status).append(
        h('strong', {}, 'Ubicación detectada'),
        h('p', { class: 'settings-note' }, `${location.label || 'Mi ubicación'} · precisión aprox. ${Math.round(location.accuracy || 0)} m`)
      );
    } catch (error) {
      clear(status).append(errorBox(error.message || 'No se pudo obtener la ubicación.'));
    } finally {
      button.disabled = false;
      button.textContent = 'Probar ubicación';
    }
  });

  refresh();
  return h('div', { class: 'location-settings' }, status, button);
}

function stationPriceText(station) {
  const fuel = FuelStore.current();
  const basePrice = station?.precio ?? station?.[fuel.priceField];
  const info = DiscountStore.priceInfo(station, basePrice);
  const display = displayFuelPrice(info.effective);
  return h('span', { class: 'settings-station-price' },
    h('strong', {}, display.main),
    info.hasDiscount ? h('small', {}, DiscountStore.discountDescription(info)) : null
  );
}

function settingsStationRow(station, actions = []) {
  return h('article', { class: 'settings-station-row' },
    h('div', { class: 'settings-station-logo' }, String(stationName(station)).slice(0, 2).toUpperCase()),
    h('div', { class: 'settings-station-main' },
      h('strong', {}, stationName(station)),
      h('span', {}, [station.direccion, station.municipio, station.provincia].filter(Boolean).join(' · ')),
      h('small', {}, [station.fecha ? dateText(station.fecha) : '', stationBrand(station)].filter(Boolean).join(' · '))
    ),
    stationPriceText(station),
    h('div', { class: 'settings-row-actions' }, actions)
  );
}

function FavoritesSettings() {
  const container = h('div', { class: 'settings-list' }, loading('Cargando favoritos...'));

  async function render() {
    const ids = FavoritesStore.all();
    clear(container);
    if (!ids.length) {
      container.append(h('p', { class: 'settings-note' }, 'Todavía no tienes gasolineras favoritas.'));
      return;
    }
    try {
      const stations = await Api.stationsDetail(ids);
      stations.forEach((station) => {
        container.append(settingsStationRow(station, [
          h('a', { class: 'btn tiny ghost', href: `#/gasolinera/${station.ideess}` }, 'Ver'),
          h('button', { class: 'btn tiny danger', type: 'button', onClick: () => { FavoritesStore.remove(station.ideess); render(); } }, 'Quitar')
        ]));
      });
    } catch (error) {
      container.append(errorBox(error.message));
    }
  }

  render();
  return container;
}

function StationDiscountsSettings() {
  const container = h('div', { class: 'settings-list' }, loading('Cargando descuentos...'));

  async function render() {
    const discounts = DiscountStore.all();
    const ids = Object.keys(discounts).filter((id) => Number(discounts[id]) > 0);
    clear(container);
    if (!ids.length) {
      container.append(h('p', { class: 'settings-note' }, 'No tienes descuentos específicos por gasolinera.'));
      return;
    }
    let stations = [];
    try {
      stations = await Api.stationsDetail(ids);
    } catch {
      stations = ids.map((ideess) => ({ ideess, rotulo: `Gasolinera ${ideess}`, nombre: `Gasolinera ${ideess}` }));
    }
    stations.forEach((station) => {
      const input = h('input', {
        class: 'station-discount-edit',
        type: 'number',
        min: '0',
        max: '300',
        step: '0.1',
        inputmode: 'decimal',
        value: DiscountStore.get(station.ideess) || '',
        'aria-label': `Descuento para ${stationName(station)}`
      });
      const save = () => { DiscountStore.set(station.ideess, input.value); render(); };
      container.append(settingsStationRow(station, [
        h('label', { class: 'discount-inline-editor' }, input, h('span', {}, 'c/L')),
        h('button', { class: 'btn tiny ghost', type: 'button', onClick: save }, 'Guardar'),
        h('button', { class: 'btn tiny danger', type: 'button', onClick: () => { DiscountStore.remove(station.ideess); render(); } }, 'Eliminar')
      ]));
    });
  }

  render();
  return container;
}

export function SettingsPage() {
  return h('div', { class: 'dashboard settings-page' },
    h('section', { class: 'page-title-row' },
      h('div', {},
        h('span', { class: 'pill' }, 'Ajustes'),
        h('h1', {}, 'Preferencias'),
        h('p', {}, 'Configura ubicación, favoritos, descuentos, marcas y cómo quieres ver los precios.')
      )
    ),
    h('section', { class: 'glass-section settings-section' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Ubicación'), h('p', { class: 'section-subtitle' }, 'Controla el permiso de GPS usado en portada y radar.'))
      ),
      LocationSettings()
    ),
    h('section', { class: 'glass-section settings-section' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Favoritos'), h('p', { class: 'section-subtitle' }, 'Gestiona tus gasolineras guardadas.'))
      ),
      FavoritesSettings()
    ),
    h('section', { class: 'glass-section settings-section' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Descuentos por gasolinera'), h('p', { class: 'section-subtitle' }, 'Edita o elimina los descuentos específicos que has guardado.'))
      ),
      StationDiscountsSettings()
    ),
    h('section', { class: 'glass-section settings-section' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Marcas'), h('p', { class: 'section-subtitle' }, 'Prioriza, oculta o aplica descuentos generales a marcas concretas.'))
      ),
      BrandsSettings()
    ),
    h('section', { class: 'glass-section settings-section' },
      h('div', { class: 'section-head' },
        h('div', {}, h('h2', { class: 'section-title' }, 'Depósito'), h('p', { class: 'section-subtitle' }, 'Si rellenas la capacidad, los listados muestran el coste del depósito en vez del precio por litro.'))
      ),
      TankSettings()
    )
  );
}
