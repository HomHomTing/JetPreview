# Version 1.5 Release Notes

## Scope

Version 1.5 implements the aircraft loading and refresh requirements from `docs/aircraft-loading-refresh-requirements-v1.4.md`.

## Changes

- Added zoom-based aircraft render limits from global to airport-scale map views.
- Added aircraft label limits and collision reduction, with selected aircraft labels always retained.
- Added viewport request parameters for bbox, zoom, limit, business-jet category `J`, selected aircraft, TTL, and viewport version.
- Uses the provided `513008` endpoint for aircraft and airport snapshots. Optional viewport parameters are sent to `513008`; no extra pid is requested.
- Blocks deprecated interface `513012` at the shared request boundary so it cannot reach the network.
- Added aircraft cache merge behavior for new, updated, removed, stale, and selected aircraft.
- Added dynamic refresh cadence: selected aircraft, normal foreground, low zoom, airport zoom, hidden tab, and API failure backoff.
- Added position interpolation and limited dead-reckoning between live updates.
- Added stale, expired, alert, and fade-out visual states for aircraft markers.
- Added deterministic static business-jet fleet samples so viewport rules can be tested without live data.
- Locked the main aircraft layer, rail list, and search to business jets only.

## Verification

- `node --check app.js`
- `node --check data-service.js`
- `node --check config.js`
- Browser render test on `http://127.0.0.1:8095/`
- Confirmed Google Maps loaded, aircraft markers rendered, global labels hidden, selected aircraft retained at high zoom, selected label visible, and no browser console errors.
