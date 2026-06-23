import { Router } from './router.js';
import { AppShell } from './components/appShell.js';
import { FuelStore } from './state/fuelStore.js';
import { ThemeStore } from './state/themeStore.js';

ThemeStore.init();

const root = document.getElementById('app');
Router.mount(root, AppShell);

FuelStore.subscribe(() => Router.render());
ThemeStore.subscribe(() => Router.render());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // La aplicación sigue funcionando sin caché offline.
    });
  });
}
