# Peshkash frontend

Vue 3, TypeScript, and Vite application for Peshkash. The admin dashboard includes the manifest-backed QR Studio at `/dashboard/qr-templates`.

## Local development

```bash
npm ci
npm run dev
```

The frontend runs at `http://localhost:5173` and expects the development API at `http://localhost:4000/api`.

For a database-free local preview, start the backend with `npm run start:studio` after building it. QR Studio automatically stores drafts in browser-local storage when the API is unavailable.

## Quality check

```bash
npm run build
```

The build validates TypeScript without emitting duplicate JavaScript into `src`, creates the Vite bundle, and compiles the global Sass output.

## QR Studio

- 30 use-case templates across contact, art, hospitality, retail, services, events, and education.
- Obsidian Ring and Porcelain Cameo QR signatures.
- Locked error correction, quiet-zone, module, finder, and medallion standards.
- Live content editing and vector preview.
- SVG and high-resolution PNG export.
- Backend persistence with browser-local fallback.

See [docs/QR-STUDIO.md](docs/QR-STUDIO.md) for the UI integration contract and rendering rules.

## Brand assets

`public/brand/qr-templates` contains approved SVG references for both signatures. The public favicon family and `src/assets/peshkash-loader.js` are the transparent-background Brand Kit versions.
