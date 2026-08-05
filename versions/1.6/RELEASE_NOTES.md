# Version 1.6 Frozen Baseline

## Archive

This directory is a read-only snapshot of the project root captured on 2026-08-03 immediately before the current 1.7 projection-distance, projection-visibility, and aircraft-contrast iteration.

Shared aircraft image assets remain under the project-level `assets/` directory, matching the convention used by earlier frozen versions.

## Baseline capabilities

- Selected-aircraft route rendering from the 1.6 route visual requirements.
- Independent aircraft ground-projection layers for Google Maps and Leaflet.
- Physical low-altitude projection plus the initial all-altitude visual fallback.
- Live-only aircraft and airport loading through the configured private API.
- Deprecated interface `513012` blocked before network dispatch.

## Verification at archive time

- JavaScript syntax checks passed for `app.js`, `data-service.js`, `config.js`, and `ground-projection-core.js`.
- Ground-projection core unit tests passed.
- Google Maps and Leaflet both rendered the projection layer.
