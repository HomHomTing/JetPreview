# Global BizJet Ops 1.12

V1.12 frozen prototype for a web-based aircraft operations map, icon test system, ICAO-code icon control console, private operations database integration, normalized selected-aircraft route visualization, selected-track live continuity, selected aircraft detail panels, airport operation panels, FR24-style search interaction, all-zoom aircraft icon visibility testing, and ICAO-code-driven aircraft icon rendering.

Version 1.12 is frozen under `versions/1.12/` and is the current online/GitHub release target.

Version history is summarized in `CHANGELOG.md`. GitHub packaging and credential-handling notes are documented in `docs/github-packaging-notes.md`.

Version 1.0 is frozen under `versions/1.0/`.

Version 1.1 is frozen under `versions/1.1/`.

Version 1.2 is frozen under `versions/1.2/`.

Version 1.5 is frozen under `versions/1.5/`.

Version 1.6 is frozen under `versions/1.6/`.

Version 1.8 is frozen under `versions/1.8/`.

Version 1.9 is frozen under `versions/1.9/`.

Version 1.10 is frozen under `versions/1.10/`.

Version 1.11 is frozen under `versions/1.11/`.

Version 1.12 is frozen under `versions/1.12/`.

Version 1.2 adds a local control console in `admin.html` for icon library review, aircraft type-code mapping, validation, draft publishing, rollback snapshots, import/export, and audit logs.

Version 1.2 introduced `aircraft-icon-config.js` as the shared source for the home map and the control console. It imports the 30 icon groups and 465 aircraft type-code mappings from the aircraft icon specification, plus one local compatibility mapping for `GL7T -> LJ60`.

Version 1.3 adds `data-service.js` and connects the home map to private database interfaces:

- `513008` loads the airport list and live in-flight business aircraft.
- `513009` loads a selected trip's flight track, route, status, speed, altitude, and aircraft summary.
- `513010` loads selected airport details, weather, runway, ground, and traffic information.
- `513011` loads selected aircraft profile information by encrypted registration number.

Version 1.3 also adds the first performance pass from `docs/product-requirements-v1.3-loading-performance.md`: aircraft and airport markers are now rendered from the current viewport with zoom-based limits, airport level filtering, debounced viewport refresh, selected-object retention, and restricted non-selected trail rendering.

Version 1.4 implements the airport loading and icon requirements from `docs/airport-loading-icon-requirements-v1.3.md`: the airport layer now uses Auto / On / Off modes, fractional-zoom display thresholds, viewport-buffer filtering, three airport icon sizes, selected-airport retention, label collision reduction, and FR24-style blue airport pin visuals with hover labels.

Version 1.5 implements the aircraft loading and refresh requirements from `docs/aircraft-loading-refresh-requirements-v1.4.md`: aircraft viewport requests now include bbox, zoom, limit, business-jet category, selected aircraft retention, viewport version, TTL, dynamic refresh cadence, stale/expired data states, zoom-based aircraft render limits, label collision reduction, and marker diff updates.

Version 1.6 implements `docs/selected-aircraft-route-visual-requirements-v1.6.md`: selected routes use continuous altitude colors, deep dotted coverage-gap segments, incremental segment reconciliation, yellow route endpoints, a separate Route focus mode with fit-bounds padding, responsive focus framing, and unrelated aircraft/airport suppression.

Version 1.7 cancels aircraft ground projections and returns the map to an icon-only aircraft presentation. Google projection overlays, Leaflet projection panes, projection markers, and the projection toggle are disabled; aircraft bodies retain brighter yellow and deeper outline contrast without icon-local shadows.

Version 1.7 also trials selected routes without the dark/gray halo border. The altitude/speed-colored route core and estimated black dashed segments remain unchanged.

Version 1.7 now uses the user-provided `aircraft-icons-template-shadow-fr24yellow-20260803` asset set. The map and control console render the same 1024px transparent PNG icons with baked template shadow and FR24 original yellow `#FDB813` from `assets/aircraft-icons/fr24-template-shadow-fr24yellow/`.

Version 1.8 implements selected-aircraft track refresh continuity: `513009` historical points are merged with `513008` live snapshot tail points through a dedicated selected track store, coverage gaps and interrupted adjacent waypoints use estimated dotted connectors, and invalid-quality points remain disconnected.

Version 1.8 now enforces selected-aircraft-only route rendering: the map shows at most one live-updating route, and only while that aircraft is the active selected aircraft.

Selected route rendering now pins its final render point to the active aircraft's current map position, so switching aircraft immediately redraws the route tail at the latest visible position.

When `513008` and `513009` disagree by an impossible implied speed, the selected aircraft position now prefers the latest `513009` track endpoint to avoid drawing an interrupted connector back to a stale snapshot point.

Version 1.9 implements the selected aircraft detail panel and selected airport operation panel requirements from `docs/selected-aircraft-detail-panel-requirements-v1.8.md` and `docs/airport-selected-panel-requirements-v1.9.md`. The panels rematch available fields from `513008`, `513009`, `513010`, and `513011`; unmatched fields render as `N/A`.

Version 1.10 implements the search bar interaction requirements from `docs/search-bar-interaction-requirements-v1.9.md`: grouped results, route parsing, shortcuts, nearby search, operator and country indexes, expandable result actions, and keyboard navigation.

Version 1.11 changes aircraft icon visibility for testing: all loaded business-jet aircraft icons are rendered at every zoom level, without client-side zoom-tier truncation or viewport-only aircraft icon filtering.

Version 1.11 also finalizes the aircraft icon selection contract: the map derives Aircraft Type Code from aircraft `icaoCode` only, then resolves the marker graphic through `aircraft-icon-config.js`. This prevents `513008` generic `BIZ/LJ60` snapshot values, model series, or cached icon keys from overriding `513011.planeInfo.icaoCode` values such as `GA7C`, `GL7T`, and `GL8T`.

Version 1.12 implements the ICAO Code icon mapping iteration from `docs/aircraft-icon-display-mapping-requirements-v1.12.md`: the homepage prefers `icaoCodeIconMap`, the control console can manage the ICAO Code list assigned to each icon, and publishing writes a runtime config to browser storage for the map page to consume after refresh.

Icon interaction guidance for version 1.1 is documented in `docs/fr24-icon-interaction-spec-v1.1.md`.

Product requirements for version 1.1 are documented in `docs/product-requirements-v1.1.md`.

Aircraft icon mapping for version 1.1 is documented in `docs/aircraft-icon-mapping-v1.1.md`.

Current icon mappings are centralized in `aircraft-icon-config.js`.

Route drawing requirements for version 1.2 are documented in `docs/route-drawing-requirements-v1.2.md`.

Airport loading and airport icon requirements for version 1.3 are documented in `docs/airport-loading-icon-requirements-v1.3.md`.

Aircraft loading and refresh requirements for version 1.4 are documented in `docs/aircraft-loading-refresh-requirements-v1.4.md`.

Selected aircraft route visual requirements for version 1.6 are documented in `docs/selected-aircraft-route-visual-requirements-v1.6.md`.

Aircraft track refresh and continuity requirements implemented in version 1.8 are documented in `docs/aircraft-track-refresh-continuity-requirements-v1.6.md`.

Selected aircraft detail-panel requirements for version 1.8 are documented in `docs/selected-aircraft-detail-panel-requirements-v1.8.md`.

Aircraft ground shadow projection requirements for version 1.7 are documented in `docs/aircraft-ground-shadow-projection-requirements-v1.7.md`.

Aircraft dynamic track line types, zoom-dependent widths, data-quality semantics, and rendering acceptance criteria are documented in `docs/aircraft-dynamic-track-line-style-standard-v1.5.md`.

Airport selected-panel requirements for version 1.9 are documented in `docs/airport-selected-panel-requirements-v1.9.md`.

Search bar interaction requirements for version 1.9 are documented in `docs/search-bar-interaction-requirements-v1.9.md`.

## Scope

- Supports the official Google Maps JavaScript API renderer through `config.js`.
- Falls back to a complete local vector basemap renderer when no Google Maps API key is configured.
- Version 1.11 keeps the home map in live-only mode: aircraft, airport, route, detail panels, and search render data from the configured private database/cache only.
- Version 1.11 continues using the provided `513008` snapshot endpoint for aircraft and airport loading. Optional viewport parameters are sent to `513008`; no extra pid request is made.
- Version 1.11 sets `showAllAircraftIconsAtAllZooms: true`: aircraft icon rendering no longer uses zoom-tier client limits, `513008` receives a global aircraft bounds request with a fixed high `aircraftLimit`, and the renderer no longer filters aircraft icons to the current viewport before drawing.
- Version 1.11 resolves aircraft marker graphics from Aircraft Type Code only; Aircraft Type Code is sourced from aircraft `icaoCode`, and selected-profile details are cached by encrypted registration so refreshed flights keep their matched icon.
- `513008.flyingPlanes[].tailNoClear` is used as the primary aircraft registration display value; encrypted `tailNo` remains detail-query input only.
- Requests to deprecated interface `513012` are blocked at the shared data-service boundary before any network request is sent.
- If the private API is unavailable, the home map stays in an empty API-unavailable state instead of displaying local demonstration records.
- The aircraft filter is locked to business jets. Icon-lab sample records remain available only for mapping/admin review and are not shown in the main operations layer.
- The home map and `admin.html` read the same icon key, SVG silhouette, and aircraft type-code mapping configuration.
- Google Maps mode uses native `AdvancedMarkerElement` markers for aircraft and airports, so coordinates stay locked to the map during drag, zoom, resize, and mobile gestures.
- Route trails reuse the 1.2 drawing specification: altitude-colored segments by default, optional speed-color mode, selected trails retain color semantics, and estimated/interrupted gaps use dark dashed segments.
- Version 1.1 added top/bottom map drag bounds, smooth fractional wheel zoom, FR24-style type-code icon key mapping, zoom-responsive aircraft icon sizing, and distinct selected aircraft/airport states; its aircraft-local shadow rules are superseded by 1.7.
- Version 1.5 adds selected-aircraft 2.5s refresh, foreground 3-5s refresh, low-zoom 6.5s refresh, high-zoom airport 3s refresh, background-tab 22s refresh, API failure backoff, stale icon states, and label collision limits.
- Version 1.6 adds selected route focus, endpoint pins, continuous altitude interpolation, explicit estimated-segment styling, 1000-point selected-route support, and incremental route updates synchronized with the live aircraft position.
- Version 1.7 adds sun-directed physical projection below 500m AGL, a visible map-projection fallback for other airborne aircraft, dedicated Google/Leaflet projection layers, no-shadow aircraft keylines, projection density protection, and a persisted projection visibility control.
- Version 1.8 adds `selectedTrackStore`, `513008` live-tail appending after `513009` history load, provisional-point replacement, configurable `120s` coverage-gap continuity, valid-waypoint interrupted gap connectors, and exported continuity diagnostics.
- Version 1.9 adds selected aircraft header/media/route/progress modules, speed-altitude graph rendering, aircraft data-source and recent-flight empty states, airport Arrivals/Departures/On ground tabs, airport summary metrics, weather, runway, and terminal/FBO detail sections.
- Version 1.10 search implements grouped Live aircraft / Trips / Airports / Routes / Operators / Aircraft profiles / Countries results, no-match shortcuts, Flight by route, Operator, Airports by country, Nearby, result expansion, keyboard navigation, and explicit Show on map actions.
- Version 1.11 renders all loaded aircraft icons globally at every zoom level; labels still use the existing zoom/collision rules for readability.
- Version 1.11 uses `513011.planeInfo.icaoCode` as the authoritative Aircraft Type Code for icon mapping and keeps GL7T, GL8T, and GA7C on their dedicated ultra-long icons after selection changes or realtime refreshes.
- Version 1.12 makes `icaoCode` the primary public mapping field, keeps `aircraftTypeCode` as a compatibility alias, lets `admin.html` publish a local `icaoCodeIconMap`, and tightens aircraft marker hit areas to the rendered icon size.
- Includes global aircraft markers, aircraft-type marker variants, API-driven position refresh, Google/Leaflet polyline tracks, left-side aircraft detail panel, airport coordinate points, airport detail panel, search, filters, weather overlay, and an operations panel.
- Transparent aircraft icon PNG assets for business jets, widebody jets, narrowbody jets, regional jets, turboprops, light aircraft, helicopters, balloons, drones, military aircraft, ground vehicles, and spacecraft are stored under `assets/aircraft-icons/fr24-template-shadow-fr24yellow/`.
- No third-party live traffic data is requested; the home map reads from the configured private API account.
- Production usage should use an approved Google Maps integration or licensed map source.

## Open

Open `index.html` in a browser with network access.

Open `admin.html` to manage aircraft icon mappings in the 1.12 control console.

To enable Google Maps and the private API locally, copy the template first:

```bash
cp config.example.js config.js
```

Then edit `config.js`:

```js
window.APP_CONFIG = {
  googleMapsApiKey: "YOUR_GOOGLE_MAPS_JS_API_KEY",
  googleMapId: "YOUR_GOOGLE_MAP_ID",
  mapZoomRange: { min: 2, max: 12 },
  initialMapZoom: 4,
  initialMapUseUserLocation: true,
  initialMapLocationTimeoutMs: 6000,
  mapVerticalBounds: { north: 85, south: -85 },
  defaultMapProvider: "google",
  airportLayerMode: "auto",
  dataMode: "live",
  performance: {
    viewportDebounceMs: 360,
    viewportPaddingRatio: 0.25,
    showAllAircraftIconsAtAllZooms: true,
    allAircraftIconRequestLimit: 50000,
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
