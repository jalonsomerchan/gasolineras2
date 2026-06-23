# Gasolineras2 PWA

PWA estática en HTML, CSS y JavaScript para consultar precios de Gasolina 95, Diésel/Gasóleo A y Gasolina 98 usando la API `https://alon.one/api/gasolina2/`.

## Funcionalidades

- Selector global de combustible tipo toggle, persistido en `localStorage`.
- Portada con buscador único para provincia, municipio o gasolinera.
- Favoritos guardados en `localStorage`.
- Localización por GPS y fallback con `ip-api.com`.
- Mapa de gasolineras cercanas con Leaflet y OpenStreetMap.
- Listado de cercanas ordenable por cercanía o precio.
- Página propia para gasolinera.
- Página propia para municipio.
- Página propia para provincia.
- PWA instalable con manifest y service worker.
- Componentes y servicios separados en ficheros pequeños.

## Configurar API key

Para desarrollo local:

```bash
cp config.example.js config.js
```

Edita `config.js`:

```js
window.GASOLINA_CONFIG = {
  apiBase: 'https://alon.one/api/gasolina2',
  apiKey: 'TU_API_KEY'
};
```

Para GitHub Pages, crea el secret del repositorio:

```text
GASOLINA_API_KEY
```

El workflow `.github/workflows/deploy.yml` generará `config.js` automáticamente en el despliegue.

> Nota: al ser una PWA 100% estática en GitHub Pages, cualquier API key usada en el navegador acaba siendo visible para el usuario final. El secret evita guardarla en el repositorio, pero no la convierte en privada en runtime. Para ocultarla de verdad haría falta un proxy backend/serverless.

## Estructura

```text
src/
  app.js
  router.js
  config/
  services/
  state/
  utils/
  components/
  pages/
  styles/
```

## Ejecutar en local

Sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8080
```

Abre `http://localhost:8080`.
