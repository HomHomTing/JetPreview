# Version 1.12 Frozen Baseline

Snapshot captured on 2026-08-06 after finalizing ICAO Code icon mapping, local runtime publishing, selected-aircraft icon stability, and precise aircraft marker interaction.

## Baseline

- Main map remains in live-only mode and reads aircraft, airport, route, aircraft profile, and airport detail data from the configured private API/cache.
- Aircraft marker graphics are resolved through `icaoCodeIconMap`; `icaoCode` is the primary public mapping field and `aircraftTypeCode` remains only a compatibility alias.
- The Icon ICAO console can assign ICAO codes directly from each icon card, prevent duplicate assignments, save drafts locally, and publish a runtime map configuration to browser storage.
- GL7T, GL8T, and GA7C use the dedicated ultra-long aircraft icon assets from `assets/aircraft-icons/fr24-template-shadow-fr24yellow/` in both selected and non-selected states.
- Aircraft profile details are cached by encrypted registration so realtime `513008` refreshes and selected-aircraft changes do not regress confirmed ICAO-code icon matches.
- Aircraft marker hit areas now follow the rendered icon size, labels do not capture selection clicks, and stale/aging/expired freshness states no longer make the aircraft body transparent.
- Time display helpers are included so business times can be formatted with explicit UTC or airport time-zone context rather than the device's implicit local timezone.
- Search, selected aircraft detail panels, selected airport operation panels, selected-track continuity, route focus, all-zoom icon visibility, and locked business-jet filtering remain inherited from earlier sealed versions.
- Deprecated interface `513012` remains blocked before network dispatch; no new pid was added.
