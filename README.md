# Gasolina al día

PWA estática para consultar precios de gasolina 95, gasóleo A y gasolina 98 usando la API `https://alon.one/api/gasolina2`.

## Probar en local

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000`.

Crea o edita `config.js`:

```js
window.GASOLINA_CONFIG = {
  apiBase: 'https://alon.one/api/gasolina2',
  apiKey: 'TU_API_KEY_AQUI',
  API_BASE_URL: 'https://alon.one/api/gasolina2',
  API_KEY: 'TU_API_KEY_AQUI'
};
```

La aplicación acepta tanto `apiKey/apiBase` como `API_KEY/API_BASE_URL`.

## GitHub Pages + secret

1. En GitHub ve a `Settings > Secrets and variables > Actions > New repository secret`.
2. Crea `GASOLINA_API_KEY` con la clave real.
3. En `Settings > Pages`, selecciona `Build and deployment > Source: GitHub Actions`.
4. Haz push a `main` o ejecuta manualmente el workflow `Deploy PWA to GitHub Pages`.

El workflow genera `config.js` durante el despliegue. Si el secret no está disponible, el despliegue falla con un error explícito para que no se publique una app sin API key.

## Estructura

- `src/config`: constantes y combustibles.
- `src/services`: API, ubicación y carga de Leaflet.
- `src/state`: localStorage para combustible, favoritos y tema.
- `src/components`: piezas reutilizables pequeñas.
- `src/pages`: portada y páginas de gasolinera, municipio y provincia.
- `src/styles`: base, layout y componentes.

## Funcionalidades

- PWA instalable.
- Diseño light/dark con selector.
- Selector persistente de combustible.
- Buscador de municipio, provincia o gasolinera.
- Favoritos en localStorage.
- Radar de precios cercano.
- Mapa de gasolineras cercanas con Leaflet y fallback de CDN.
- Orden por precio o cercanía.
- Páginas propias para gasolinera, municipio y provincia.

## Cambios de la versión v5

- Favoritos en la portada por encima del buscador.
- Interfaz más minimalista, con menos sombras y tarjetas más limpias.
- Mapa con marcadores de precio visibles sobre cada gasolinera.
- Geolocalización reforzada: primero GPS fresco, después última ubicación guardada, después IP y por último Madrid.
- Botón circular junto a la ubicación para forzar de nuevo la detección.
- Caché PWA actualizada a `gasolineras2-v5`.
