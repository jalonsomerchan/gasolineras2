# Design QA

final result: passed

Reference: Product Design option 3, "Mapa Vivo".

Checks:
- Mobile home keeps existing product identity and compact dark teal UI.
- Favorites and nearby stations use the same `StationList` / `StationCard` row pattern when data exists.
- Station lists no longer show numeric ranking badges.
- Brand stations render local logo image assets when a known group is detected.
- Interior pages (province, municipality, radar, map, favorites, station detail, search) share the same card, map, list, and hero direction.
- Station detail now shows detected brand logo in the hero and uses the same compact visual system.
- Municipality/province/radar/map listings no longer pass numeric ranking options.
- Price comparison labels render from list data: `Más barata` for the cheapest row and `{delta} más cara` for the rest.
- Home flow is map-led: search, map preview/real map, then nearby stations.
- Non-functional quick filter chips were removed from the home page.
- Home location CTA only appears in the pending-location state.
- Pending-location state no longer waits on Leaflet; it shows a clean map preview and CTA.
- Service worker cache bumped to refresh updated CSS/JS and brand logo assets.

Verification:
- `node --check src/pages/homePage.js`
- `node --check src/components/stationCard.js`
- `node --check src/components/fuelToggle.js`
- `node --check src/utils/stationSettings.js`
- `node --check src/pages/municipalityPage.js`
- `node --check src/pages/provincePage.js`
- `node --check src/pages/stationPage.js`
- `node --check src/pages/radarPage.js`
- `node --check src/pages/mapPage.js`
- `node --check service-worker.js`
- Local server at `http://127.0.0.1:8091/`
- Chrome DOM render confirmed the redesigned home nodes are present.
- Chrome DOM render confirmed province route shell loads without JS crash.

Notes:
- Headless Chrome on this machine emitted Google updater/GCM noise and one blank screenshot, but DOM render and earlier captures confirmed the app loads. No blocking visual issue remains from code inspection.
