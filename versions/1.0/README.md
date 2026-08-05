# Global BizJet Ops 1.0

Static V1.0 prototype for a web-based global business jet operations system.

## Scope

- Supports the official Google Maps JavaScript API renderer through `config.js`.
- Falls back to a complete local vector basemap renderer when no Google Maps API key is configured.
- Aircraft and airport data are local sample records only.
- The aircraft filter is locked to `Business Jet`.
- Google Maps mode uses native `AdvancedMarkerElement` markers for aircraft and airports, so coordinates stay locked to the map during drag, zoom, resize, and mobile gestures.
- Includes global aircraft markers, aircraft-type marker variants, moving mock positions, Google/Leaflet polyline tracks, left-side aircraft detail panel, airport coordinate points, airport detail panel, search, filters, weather overlay, and an operations panel.
- No third-party live traffic data, account data, or private API is requested.
- Production usage should use an approved Google Maps integration or licensed map source.

## Open

Open `index.html` in a browser with network access.

To enable Google Maps, edit `config.js`:

```js
window.APP_CONFIG = {
  googleMapsApiKey: "YOUR_GOOGLE_MAPS_JS_API_KEY",
  googleMapId: "YOUR_GOOGLE_MAP_ID",
  defaultMapProvider: "google"
};
```

`googleMapId` should be set in production. If left empty, the prototype uses Google's demo map id only to keep Advanced Markers available during local testing.

## Next Version Hooks

- Replace `businessJets` and `airports` in `app.js` with records from the private operations database.
- Connect realtime updates through a websocket or server-sent event feed.
- Keep the Google Maps JavaScript API integration enabled in production by setting `googleMapsApiKey`.
- Move high-volume aircraft rendering to Canvas or WebGL when visible aircraft counts grow beyond a few thousand.
