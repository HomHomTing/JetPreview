# Version 1.14 Frozen Baseline

Snapshot captured on 2026-08-10 after finalizing the Graphite selected-detail interaction pass and selected-aircraft journey card refinements.

## Baseline

- Main map remains in live-only mode and reads aircraft, airport, route, aircraft profile, and airport detail data from the configured private API/cache.
- Selected aircraft and airport clicks open the Graphite-style left detail panel with four aircraft sections and four airport sections.
- Close button, Escape, and blank-map click now share one clear-selection behavior.
- Desktop selection pans the target into the right-side visible map area so the panel does not cover the active marker.
- In-transit aircraft map labels always show the plaintext registration number.
- Selected-aircraft journey cards separate registration and callsign, calculate total duration, keep route time zones explicit, and render unknown destinations as a friendly `N/A` state.
- Unknown destination cards keep the `到达` label visible, hide secondary IATA/ICAO/UTC/airport text, hide estimated-arrival UTC, hide total duration, and place the progress aircraft marker at the far right.
- The 1.12 ICAO-code aircraft icon control console and FR24-yellow aircraft icon assets remain the active icon baseline.
