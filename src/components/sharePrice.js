import { FuelStore } from '../state/fuelStore.js';
import { DiscountStore } from '../state/discountStore.js';
import { h } from '../utils/dom.js';
import { stationName } from '../utils/format.js';
import { displayFuelPrice } from '../utils/stationSettings.js';

function shareText(station) {
  const fuel = FuelStore.current();
  const info = DiscountStore.priceInfo(station, station[fuel.priceField]);
  const display = displayFuelPrice(info.effective).main;
  return `${fuel.label} a ${display} en ${stationName(station)}, ${station.municipio || station.provincia || ''}`.trim();
}

function pageUrl(station) {
  const url = new URL(window.location.href);
  url.hash = `#/gasolinera/${station.ideess}`;
  return url.toString();
}

export function SharePrice(station) {
  const feedback = h('p', { class: 'share-feedback', 'aria-live': 'polite' }, '');
  const text = shareText(station);
  const url = pageUrl(station);
  const encoded = encodeURIComponent(`${text}\n${url}`);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      feedback.textContent = 'Enlace copiado.';
    } catch {
      feedback.textContent = 'No se pudo copiar automáticamente.';
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: stationName(station), text, url });
      feedback.textContent = 'Compartido.';
    } catch {
      feedback.textContent = '';
    }
  }

  return h('section', { class: 'card share-card station-wide-card' },
    h('div', { class: 'share-head' },
      h('div', {},
        h('span', { class: 'summary-kicker' }, 'Compartir'),
        h('h2', { class: 'section-title' }, 'Compartir precio'),
        h('p', { class: 'section-subtitle' }, text)
      )
    ),
    h('div', { class: 'share-actions' },
      h('button', { class: 'btn', type: 'button', onClick: copyLink }, 'Copiar enlace'),
      h('button', { class: 'btn ghost', type: 'button', onClick: nativeShare }, 'Compartir'),
      h('a', { class: 'btn ghost', href: `https://wa.me/?text=${encoded}`, target: '_blank', rel: 'noopener' }, 'WhatsApp'),
      h('a', { class: 'btn ghost', href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, target: '_blank', rel: 'noopener' }, 'Telegram')
    ),
    feedback
  );
}
