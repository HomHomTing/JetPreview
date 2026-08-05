# Version 1.11 Frozen Baseline

Snapshot captured on 2026-08-05 after finalizing all-zoom aircraft icon visibility and ICAO-code-driven aircraft icon rendering.

## Baseline

- Main map remains in live-only mode and reads aircraft, airport, route, aircraft profile, and airport detail data from the configured private API/cache.
- All loaded business-jet aircraft icons are rendered at every zoom level for full-map icon visibility testing.
- Aircraft marker graphics are resolved from Aircraft Type Code only; Aircraft Type Code is sourced from aircraft `icaoCode`, especially `513011.planeInfo.icaoCode`.
- GL7T, GL8T, and GA7C use the dedicated ultra-long aircraft icon assets from `assets/aircraft-icons/fr24-template-shadow-fr24yellow/`.
- Aircraft profile details are cached by encrypted registration so realtime `513008` refreshes and selected-aircraft changes do not regress GA7C, GL7T, or GL8T back to generic LJ60.
- Search, selected aircraft detail panels, selected airport operation panels, selected-track continuity, route focus, and locked business-jet filtering remain inherited from earlier sealed versions.
- Deprecated interface `513012` remains blocked before network dispatch; no new pid was added.
