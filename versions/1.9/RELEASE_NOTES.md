# Version 1.9 Frozen Baseline

## Archive

This directory is a snapshot of the project root captured on 2026-08-04 before starting the 1.10 search-bar implementation.

## Baseline capabilities

- Selected aircraft and airport detail panels are available from the live-only private database flow.
- Selected-aircraft routes merge historical `513009` points with `513008` live tail updates.
- Interrupted adjacent valid route points render as estimated dotted connectors instead of leaving visible blank gaps.
- Airport detail sections cover arrivals, departures, on-ground aircraft, weather, runway, and terminal/FBO data.
- Search-bar requirements for the next iteration are documented in `docs/search-bar-interaction-requirements-v1.9.md`.
- Deprecated interface `513012` remains blocked before network dispatch; no new pid was added.

## Verification Scope

- This archive preserves the current 1.9 source files, docs, tests, and aircraft icon assets.
