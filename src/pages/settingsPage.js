import { geolocationPermissionState, devicePosition } from '../services/location.js';
import { KNOWN_BRANDS, SettingsStore } from '../state/settingsStore.js';
import { h, loading, clear, errorBox } from '../utils/dom.js';

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
  return h('label', { class: `brand-setting-chip is-${mode}` },
    h('span', {}, brand),
    select
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

export function SettingsPage() {
  return h('div', { class: 'dashboard settings-page' },
    h('section', { class: 'page-title-row' },
      h('div', {},
        h('span', { class: 'pill' }, 'Ajustes'),
        h('h1', {}, 'Preferencias'),
        h('p', {}, 'Configura ubicación, marcas y cómo quieres ver los precios.')
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
        h('div', {}, h('h2', { class: 'section-title' }, 'Marcas'), h('p', { class: 'section-subtitle' }, 'Prioriza tus marcas favoritas u oculta las que no quieras ver.'))
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
