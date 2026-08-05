# GitHub Packaging Notes

Current release packaging target: **1.11**.

The project root contains the 1.11 release source. Frozen historical snapshots are kept in `versions/1.0/`, `versions/1.1/`, `versions/1.2/`, `versions/1.5/`, `versions/1.6/`, `versions/1.8/`, `versions/1.9/`, `versions/1.10/`, and `versions/1.11/`.

## Repository Content

- Source pages: `index.html`, `admin.html`, `app.js`, `admin.js`, `data-service.js`, `aircraft-icon-config.js`, `styles.css`, `admin.css`.
- Current aircraft icon assets: `assets/aircraft-icons/`.
- Product and interface notes: `README.md`, `CHANGELOG.md`, `docs/`, `source/`.
- Exported image folders under `exports/` are retained, while generated `.zip` archives are ignored.
- `public-preview/` is retained locally as a generated preview/deployment workspace, but excluded from the main GitHub package because it is its own Git repository and contains generated dependencies.

## Local-Only Configuration

`config.js` is intentionally ignored because it contains local runtime credentials such as Google Maps keys and private API account identifiers.

Use `config.example.js` as the committed template:

```bash
cp config.example.js config.js
```

Then fill in:

- `googleMapsApiKey`
- `googleMapId`
- `api.baseUrl`
- `api.authorizedUser`

The shared `data-service.js` default config is credential-free; live access must come from the local `config.js`.
