import { Router } from './router.js';
import { AppShell } from './components/appShell.js';
import { FuelStore } from './state/fuelStore.js';

const root = document.getElementById('app');
Router.mount(root, AppShell);

FuelStore.subscribe(() => Router.render());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // Silent: the app remains usable without offline cache.
    });
  });
}
