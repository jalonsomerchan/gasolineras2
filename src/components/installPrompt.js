import { h } from '../utils/dom.js';

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  window.dispatchEvent(new CustomEvent('gasolina:pwa-install-ready'));
});

function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || '');
}

export function InstallPrompt() {
  if (isStandalone()) return h('div', {});
  const status = h('p', { class: 'install-status' }, isIOS()
    ? 'En iPhone: comparte la página y elige “Añadir a pantalla de inicio”.'
    : 'Instálala para abrirla como app y consultar favoritos más rápido.');
  const installButton = h('button', {
    class: 'btn install-button',
    type: 'button',
    onClick: async () => {
      if (!deferredPrompt) {
        status.textContent = isIOS()
          ? 'En Safari pulsa Compartir → Añadir a pantalla de inicio.'
          : 'Usa el menú del navegador y elige Instalar aplicación.';
        return;
      }
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => null);
      deferredPrompt = null;
      status.textContent = 'Listo. Si la has instalado, aparecerá en tu pantalla de inicio.';
    }
  }, isIOS() ? 'Instalar en iPhone' : 'Instalar app');

  window.addEventListener('gasolina:pwa-install-ready', () => {
    installButton.textContent = 'Instalar app';
    status.textContent = 'Disponible para instalar en este dispositivo.';
  }, { once: true });

  return h('section', { class: 'install-banner' },
    h('div', {},
      h('span', { class: 'summary-kicker' }, 'PWA'),
      h('h2', { class: 'section-title' }, isIOS() ? 'Instalar en iPhone' : 'Instalar en Android'),
      status
    ),
    h('ul', { class: 'install-benefits' },
      h('li', {}, 'Favoritos siempre a mano'),
      h('li', {}, 'Precios rápidos'),
      h('li', {}, 'Modo app')
    ),
    installButton
  );
}
