# Version 1.16 Frozen Baseline

Snapshot captured on 2026-08-12 after finalizing the map layer, route endpoint airport reuse, selected-aircraft click latency, and airport hover stability pass.

## Baseline

- Main map remains in live-only mode and reads aircraft, airport, route, aircraft profile, and airport detail data from the configured private API/cache.
- Fixed marker layer bands separate ordinary airports, aircraft, route endpoint airports, selected airport popups, current hover popups, and selected aircraft markers.
- Selected aircraft origin/destination airports reuse the original airport icons instead of drawing duplicate endpoint pins.
- Route endpoint airports suppress hover popups while preserving the previous airport zoom, level, and layer visibility rules.
- Selected aircraft click latency is improved through airport/aircraft lookup indexes, cached selected route endpoint mapping, in-flight detail request reuse, and independent `513009` / `513011` detail UI updates.
- Airport hover popups survive selected-aircraft refreshes and marker rerenders.
- Incomplete code-only airport hover popups stay hidden until the full display content is ready.
- Route and track drawing behavior remains inherited from the 1.15 selected-track optimization baseline.

## Verification

- `node --check app.js`
- `for test_file in tests/*.cjs; do node "$test_file"; done`
- Local browser QA confirmed that airport hover does not flash code-only popups and remains stable after refresh cycles.

## Not Included

- 1.17 data-field interaction planning.
- 1.18 airport density / scale-layer planning.
