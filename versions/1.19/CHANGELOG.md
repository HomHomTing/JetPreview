# Version History

## 1.19

- Frozen under `versions/1.19/` and published as the current online/GitHub release target.
- Implements the aircraft Journey tab history timeline from `docs/aircraft-history-timeline-design-spec-v1.22.md`.
- Replaces the legacy six-row recent flight list with a 365-day timeline: history summary, annual activity bars, range/status/airport filters, month/date grouping, expandable flight cards, and a 40-card mounted window.
- Adds a B-8202 static one-year history sample for local/product validation while preserving 513013 as the live history source when available.
- Splits 513013 schedule/actual/estimated timestamps into independent `TimeRef` fields so planned and actual times no longer overwrite each other.
- Keeps landed rows muted; uses Graphite mint only for live, amber for delayed, and coral for cancelled states.
- Refines the Journey tab history list into a compact table-style flow with invisible tab scrollers, stable user scroll preservation, and default anchoring to the current live/ground status card instead of the historical rows.

## 1.18

- Frozen under `versions/1.18/` and published as the current online/GitHub release target.
- Connects the updated private interface fields into live aircraft, selected flight track, aircraft profile, airport base, airport ground, airport dynamic, and recent journey interactions.
- Normalizes flight number display from `callsign` / `callSign` while keeping registration-equivalent values as a fallback when no better flight number exists.
- Adds an owner-only API debug console for local/private preview, including persistent request logs, selected-control raw/adapted payload inspection, and callsign return diagnostics.
- Keeps the public online build free of the debug console by default, with a runtime host guard that blocks public domains unless explicitly overridden.
- Adds a token-protected iPad/LAN preview server for checking local changes on tablet devices.
- Preserves the established aircraft and airport icon loading rules.

## 1.17

- Frozen under `versions/1.17/` and published as the current online/GitHub release target.
- Replaces airport zoom/count tables with effective-scale bands calibrated from observed FR24 map scale behavior.
- Hides ordinary airports in far Auto views, shows L1 airports in the first airport tier, and shows L1-L4 airports at near scale.
- Removes client-side airport count slicing while keeping API requests and rendering constrained to the current padded viewport.
- Normalizes backend airport priority values to the L1-L4 contract and supports `displayLevel`, `airportLevel`, `airportTier`, and `level` aliases.
- Adds a bounded 15-minute viewport airport cache so panning does not discard previously loaded airport records immediately.
- Preserves selected, hovered, and selected-aircraft route endpoint airports across scale filtering, viewport updates, and airport-layer-off mode.
- Marks known departure and arrival airports as selected route endpoints without opening airport detail panels or drawing duplicate pins.
- Uses scale-based pin/code/full airport label tiers and keeps aircraft markers above airport markers.
- Archives the Chinese 1.17-1.20 product requirement documents; the implemented airport baseline is `docs/fr24-airport-loading-rules-simplified-v1.20.md`.

## 1.16

- Frozen under `versions/1.16/` and published as the current online/GitHub release target.
- Adds a fixed map marker layer scheme for ordinary airports, ordinary aircraft, airport hover, selected route endpoint airports, selected airport popups, current hover popups, and selected aircraft markers.
- Reuses original airport icons for selected aircraft origin/destination endpoints instead of drawing extra route endpoint pins.
- Keeps selected aircraft endpoint airports visible in Route focus and airport-layer-off states, while suppressing airport hover popups for those endpoint airports.
- Keeps airport hover popups stable through selected-aircraft refreshes and marker rerenders.
- Suppresses incomplete code-only airport hover popups until full display content is ready.
- Optimizes selected aircraft click latency with lookup indexes, cached route endpoint mapping, in-flight detail request reuse, and independent `513009` / `513011` detail updates.
- Leaves route and track drawing logic unchanged from the 1.15 track optimization baseline.

## 1.14

- Frozen under `versions/1.14/` and published as the current online/GitHub release target.
- Starts the selected aircraft / airport interaction refresh from the Graphite detail-panel specification.
- Replaces the old Flight / Aircraft double tab with four working aircraft sections: overview, track, airframe, and data.
- Replaces the airport detail tabs with dynamic, airport, weather, and FBO sections; the airport summary counts now act as the all / inbound / outbound / ground filter.
- Makes close button, Escape, and blank-map click equivalent: all clear selected state, route focus, follow mode, hidden-aircraft mode, and map marker highlights.
- Adds mint selected halos and dims non-selected aircraft/airport markers to 45% opacity while preserving the confirmed FR24-yellow aircraft icon assets.
- Pans selected aircraft and airport targets to the right-side visible area on desktop so the left panel does not cover the selected marker.
- Refines selected-aircraft journey cards: registration/callsign separation, route airport layout, timezone-safe time rendering, total-duration calculation, unknown-destination `N/A` handling, and progress marker placement.
- Keeps in-transit aircraft map labels pinned to the plaintext registration number.

## 1.13

- Adds timezone-safe panel time formatting so route times use airport-local time zones while API and track timestamps remain explicit UTC/local values.

## 1.12

- Frozen under `versions/1.12/` and published as the current online/GitHub release target.
- Adds a unified `icaoCode` icon resolver for map aircraft markers, selected state rendering, ground projection graphics, and diagnostics.
- Adds local runtime icon configuration through `aircraft-icon-runtime-config.js` plus browser localStorage key `aircraft-icon-runtime-config:v1.12`.
- Adds a lightweight aircraft profile type-code cache so refreshed map markers can use the last confirmed `icaoCode` before selected-aircraft details are fetched again.
- Tightens aircraft marker hit areas to the rendered icon size and keeps aircraft bodies fully opaque when selection moves between nearby aircraft.
- Updates the icon control console to manage ICAO Code assignments from each icon card, with chip editing, duplicate prevention, draft publishing, JSON/CSV export, and local runtime publishing.
- Preserves current 1.12 local icon plans on refresh and only applies forced GL7T / GL8T / GA7C seed fixes while migrating legacy console storage.
- Keeps legacy `aircraftTypeCode` / `typeCodeIconMap` compatibility while making `icaoCode` / `icaoCodeIconMap` the primary configuration contract.

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
