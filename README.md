# Gasolineras 2

PWA estática en HTML, CSS y JavaScript para consultar precios de gasolina 95, diésel y gasolina 98 usando `https://alon.one/api/gasolina2`.

## Funcionalidades

- Selector global de combustible con persistencia en `localStorage`.
- Buscador único por provincia, municipio o gasolinera con autocompletado.
- Favoritos guardados en `localStorage`.
- Mapa de gasolineras cercanas usando ubicación del dispositivo y fallback por IP con `ip-api.com`.
- Listado cercano ordenable por cercanía o precio.
- Páginas SPA para provincia, municipio y gasolinera.
- PWA con manifest, service worker y caché de shell.
- Código modular en ficheros pequeños y componentes reutilizables.

## Configuración local

Copia el fichero de ejemplo:

```bash
cp config.example.js config.js
```

Edita `config.js` y pon tu API key local.

Después sirve la carpeta con cualquier servidor estático:

```bash
python3 -m http.server 8080
```

## GitHub Pages y API key

El workflow `.github/workflows/pages.yml` genera `config.js` en el despliegue desde el secret `GASOLINA_API_KEY`.

Crea este secret en el repositorio:

- `GASOLINA_API_KEY`: clave para la API.

Opcionalmente puedes añadir una variable o secret `GASOLINA_API_BASE` si quieres cambiar el endpoint base.

> Importante: al ser una PWA estática, cualquier clave usada por el navegador acaba siendo visible en el cliente. El secret evita subirla al repositorio, pero no la convierte en privada frente a usuarios del sitio desplegado.
