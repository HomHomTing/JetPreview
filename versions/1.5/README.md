# Global BizJet Ops 1.5

V1.5 prototype for a web-based aircraft operations map, icon test system, aircraft type-code icon control console, private operations database integration, zoom-aware airport rendering, and FR24-style aircraft viewport loading.

Version 1.0 is frozen under `versions/1.0/`.

Version 1.1 is frozen under `versions/1.1/`.

Version 1.2 is frozen under `versions/1.2/`.

Version 1.5 is frozen under `versions/1.5/`.

Version 1.2 adds a local control console in `admin.html` for icon library review, aircraft type-code mapping, validation, draft publishing, rollback snapshots, import/export, and audit logs.

Version 1.2 now uses `aircraft-icon-config.js` as the shared source for the home map and the control console. It imports the 30 icon groups and 465 aircraft type-code mappings from the aircraft icon specification, plus one local compatibility mapping for `GL7T -> LJ60`. The map and console render transparent, 2048px FR24-yellow PNG icons with dark edge contrast from `assets/aircraft-icons/fr24-hd/`.

Version 1.3 adds `data-service.js` and connects the home map to private database interfaces:

- `513008` loads the airport list and live in-flight business aircraft.
- `513009` loads a selected trip's flight track, route, status, speed, altitude, and aircraft summary.
- `513010` loads selected airport details, weather, runway, ground, and traffic information.
- `513011` loads selected aircraft profile information by encrypted registration number.

Version 1.3 also adds the first performance pass from `docs/product-requirements-v1.3-loading-performance.md`: aircraft and airport markers are now rendered from the current viewport with zoom-based limits, airport level filtering, debounced viewport refresh, selected-object retention, and restricted non-selected trail rendering.

Version 1.4 implements the airport loading and icon requirements from `docs/airport-loading-icon-requirements-v1.3.md`: the airport layer now uses Auto / On / Off modes, fractional-zoom display thresholds, viewport-buffer filtering, three airport icon sizes, selected-airport retention, label collision reduction, and FR24-style blue airport pin visuals with hover labels.

Version 1.5 implements the aircraft loading and refresh requirements from `docs/aircraft-loading-refresh-requirements-v1.4.md`: aircraft viewport requests now include bbox, zoom, limit, business-jet category, selected aircraft retention, viewport version, TTL, dynamic refresh cadence, stale/expired data states, zoom-based aircraft render limits, label collision reduction, and marker diff updates.

Icon interaction guidance for version 1.1 is documented in `docs/fr24-icon-interaction-spec-v1.1.md`.

Product requirements for version 1.1 are documented in `docs/product-requirements-v1.1.md`.

Aircraft icon mapping for version 1.1 is documented in `docs/aircraft-icon-mapping-v1.1.md`.

Current icon mappings are centralized in `aircraft-icon-config.js`.

Route drawing requirements for version 1.2 are documented in `docs/route-drawing-requirements-v1.2.md`.

Airport loading and airport icon requirements for version 1.3 are documented in `docs/airport-loading-icon-requirements-v1.3.md`.

Aircraft loading and refresh requirements for version 1.4 are documented in `docs/aircraft-loading-refresh-requirements-v1.4.md`.

Selected aircraft route visual requirements for version 1.6 are documented in `docs/selected-aircraft-route-visual-requirements-v1.6.md`.

## Scope

- Supports the official Google Maps JavaScript API renderer through `config.js`.
- Falls back to a complete local vector basemap renderer when no Google Maps API key is configured.
- Version 1.5 runs the home map in live-only mode: aircraft, airport, and detail panels render data from the configured private database only.
- Version 1.5 uses the provided `513008` snapshot endpoint for aircraft and airport loading. Optional viewport parameters are sent to `513008`; no extra pid request is made.
- Requests to deprecated interface `513012` are blocked at the shared data-service boundary before any network request is sent.
- If the private API is unavailable, the home map stays in an empty API-unavailable state instead of displaying local demonstration records.
- The aircraft filter is locked to business jets. Icon-lab sample records remain available only for mapping/admin review and are not shown in the main operations layer.
- The home map and `admin.html` read the same icon key, SVG silhouette, and aircraft type-code mapping configuration.
- Google Maps mode uses native `AdvancedMarkerElement` markers for aircraft and airports, so coordinates stay locked to the map during drag, zoom, resize, and mobile gestures.
- Route trails reuse the 1.2 drawing specification: altitude-colored segments by default, optional speed-color mode, selected trails retain color semantics, and estimated gaps use dark dashed segments.
- Version 1.1 adds top/bottom map drag bounds, smooth fractional wheel zoom, marker contrast shadows, FR24-style type-code icon key mapping, zoom-responsive aircraft icon sizing, and distinct selected aircraft/airport states.
- Version 1.5 adds selected-aircraft 2.5s refresh, foreground 3-5s refresh, low-zoom 6.5s refresh, high-zoom airport 3s refresh, background-tab 22s refresh, API failure backoff, stale icon states, and label collision limits.
- Includes global aircraft markers, aircraft-type marker variants, API-driven position refresh, Google/Leaflet polyline tracks, left-side aircraft detail panel, airport coordinate points, airport detail panel, search, filters, weather overlay, and an operations panel.
- Transparent aircraft icon PNG assets for business jets, widebody jets, narrowbody jets, regional jets, turboprops, light aircraft, helicopters, balloons, drones, military aircraft, ground vehicles, and spacecraft are stored under `assets/aircraft-icons/fr24-hd/`.
- No third-party live traffic data is requested; the home map reads from the configured private API account.
- Production usage should use an approved Google Maps integration or licensed map source.

## Open

Open `index.html` in a browser with network access.

Open `admin.html` to manage aircraft icon mappings in the 1.2 control console.

To enable Google Maps, edit `config.js`:

```js
window.APP_CONFIG = {
  googleMapsApiKey: "YOUR_GOOGLE_MAPS_JS_API_KEY",
  googleMapId: "YOUR_GOOGLE_MAP_ID",
  mapZoomRange: { min: 2, max: 12 },
  mapVerticalBounds: { north: 85, south: -85 },
  defaultMapProvider: "google",
  airportLayerMode: "auto",
  dataMode: "live",
  performance: {
    viewportDebounceMs: 360,
    viewportPaddingRatio: 0.25,
    aircraftLimitByZoom: [
      { zoom: 3.5, limit: 800 },
      { zoom: 4.5, limit: 1200 },
      { zoom: 5.5, limit: 1600 },
      { zoom: 6.5, limit: 2200 },
      { zoom: 7.5, limit: 3000 },
      { zoom: 8.5, limit: 3500 },
      { zoom: 9.5, limit: 4000 },
      { zoom: 12, limit: 5000 }
    ],
    aircraftRefresh: {
      selectedMs: 2500,
      normalMs: 4200,
      globalMs: 6500,
      airportMs: 3000,
      hiddenMs: 22000
    }
  },
  api: {
    enabled: true,
    snapshotPid: "513008",
    airportRefreshMs: 300000,
    requireLiveData: true,
    useMockOnError: false
  }
};
```

`googleMapId` should be set in production. If left empty, the prototype uses Google's demo map id only to keep Advanced Markers available during local testing.

## Next Version Hooks

- Replace `window.APP_CONFIG.api.authorizedUser` in `config.js` with the production authorized user when moving from the documented account to the final database account.
- Connect realtime updates through a websocket or server-sent event feed.
- Keep the Google Maps JavaScript API integration enabled in production by setting `googleMapsApiKey`.
- Move high-volume aircraft rendering to Canvas or WebGL when visible aircraft counts grow beyond a few thousand.
