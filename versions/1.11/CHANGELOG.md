# Version History

## 1.11

- Frozen under `versions/1.11/`.
- Renders all loaded business-jet aircraft icons at every zoom level for full-map icon visibility testing.
- Keeps label collision and label zoom rules, while removing aircraft icon viewport-only display restrictions.
- Uses aircraft `icaoCode` as the only source for Aircraft Type Code in marker icon rendering.
- Keeps aircraft profile details cached by encrypted registration so GA7C, GL7T, and GL8T icons survive selection changes and realtime `513008` snapshot refreshes.

## 1.10

- Frozen under `versions/1.10/`.
- Added FR24-style search interaction requirements: grouped results, route parsing, shortcuts, nearby search, operator/country indexes, expandable actions, and keyboard navigation.

## 1.9

- Frozen under `versions/1.9/`.
- Added selected aircraft detail panel and selected airport operation panel requirements.
- Added aircraft header/media/route/progress modules, speed-altitude graph, data-source states, recent-flight empty states, airport Arrivals/Departures/On ground tabs, weather, runway, and terminal/FBO sections.

## 1.8

- Frozen under `versions/1.8/`.
- Added selected-aircraft track refresh continuity.
- Merges `513009` historical points with `513008` live tail snapshots and keeps at most one selected-aircraft route visible.
- Pins the selected route endpoint to the active aircraft's latest rendered position and guards against impossible `513008` / `513009` endpoint mismatches.

## 1.7

- No separate frozen directory; included in later snapshots.
- Removed aircraft ground projections and returned aircraft display to icon-only presentation.
- Switched to the user-provided `aircraft-icons-template-shadow-fr24yellow-20260803` asset set.

## 1.6

- Frozen under `versions/1.6/`.
- Added selected route focus mode, altitude-colored route rendering, yellow endpoint pins, estimated gap styling, fit-bounds padding, and selected-route incremental updates.

## 1.5

- Frozen under `versions/1.5/`.
- Switched the home map to live-only private API data and removed demo records from the main operations layer.
- Added aircraft viewport requests, business-jet category filtering, selected aircraft retention, dynamic refresh cadence, stale/expired states, render limits, label collision reduction, and marker diff updates.

## 1.4

- No separate frozen directory; included in later snapshots.
- Added airport loading controls, airport icon display thresholds, viewport-buffer filtering, label collision reduction, selected-airport retention, and FR24-style airport pin visuals.

## 1.3

- No separate frozen directory; included in later snapshots.
- Connected private database interfaces through `data-service.js`: `513008`, `513009`, `513010`, and `513011`.
- Added first performance pass for viewport-based aircraft and airport marker rendering.

## 1.2

- Frozen under `versions/1.2/`.
- Added `admin.html` mapping console for icon library review, aircraft type-code mapping, validation, draft publishing, rollback snapshots, import/export, and audit logs.
- Centralized icon mappings in `aircraft-icon-config.js`.

## 1.1

- Frozen under `versions/1.1/`.
- Added map drag bounds, smooth fractional wheel zoom, FR24-style type-code icon key mapping, zoom-responsive icon sizing, and selected aircraft/airport states.

## 1.0

- Frozen under `versions/1.0/`.
- Initial static prototype for the aircraft operations map without live dynamic data.
