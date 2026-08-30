# QR Studio integration and rendering guide

This document is the implementation contract for Peshkash QR collateral. UI work may change the surrounding interface, but it must not loosen the scan-safe rules or redraw the approved medallions.

## Source of truth

| Concern | Source |
|---|---|
| Template inventory, tags, copy, proportions, QR placement | `src/features/qrStudio/qr-template-manifest.json` |
| Runtime TypeScript contract | `src/features/qrStudio/types.ts` |
| Rounded QR, anchors, mask selection, medallion, framed P | `src/features/qrStudio/qrRenderer.ts` |
| Canonical dynamic collateral composition | `src/features/qrStudio/templateRenderer.ts` |
| Approved visual masters used by gallery cards | `public/brand/qr-templates/{Obsidian-Ring,Porcelain-Cameo}` |
| Studio library and editor | `src/pages/QrTemplatePage.vue` |

The current manifest version is `3.1.0`. Persist this value with every saved design so future manifest changes can be migrated deliberately.

## Standard QR convention

Every QR exported by the platform must use:

- error correction level `H`;
- four quiet modules on every side;
- near-black data modules (`#1A1410`) on pure white (`#FFFFFF`);
- rounded-square data modules;
- rounded-square finder anchors with circular cores;
- only the compact framed-P medallion at the center;
- a short, owned HTTPS redirect as the encoded destination;
- at least 24 mm for print and 160 px for digital use;
- at least four raster pixels per module, with 0.4 mm per module recommended for print.

Do not recolor individual QR modules, add gradients, put a bare P in the center, remove the white QR field, reduce the quiet zone, or allow users to select lower error correction.

## Approved signatures

### Obsidian Ring

- Near-black seal with brass outline and white isolation ring.
- Compact size: 12% of the complete QR field.
- Brass finder cores.
- Renderer evaluates all eight encoder masks and chooses the one with the least center-overlay damage.
- Best on premium light collateral and high-contrast dark surfaces where the QR retains its white field.

### Porcelain Cameo

- Cream medallion with warm stone edge.
- Size: 17.2% of the complete QR field.
- Near-black finder cores.
- Uses the encoder's default mask.
- Best where a softer, artisan or editorial treatment is preferred.

The user chooses between these signatures in the Studio. Templates do not silently override that choice.

## Template library behavior

The library contains 30 templates. Search matches template label, category, merchant example, and tags. Category chips are generated from `manifest.categories`; do not hard-code a second taxonomy in the UI.

When a template is selected:

1. Copy `defaultCopy`, `merchantType`, `defaultTheme`, dimensions, and sample destination into an editable design.
2. Preserve `libraryTemplateId` and `manifestVersion`.
3. Use normalized `qr.x`, `qr.y`, and `qr.size` from the manifest. `size` is relative to the shorter canvas side.
4. Render the QR from the current destination on every change.
5. Keep print width editable; derive height from the source aspect ratio.

The eight supported format families are landscape, portrait, tag, square, round, insert, ticket, and label. Layout behavior belongs in `templateRenderer.ts`; adding a template of an existing format should not require a new Vue component.

## Saved-design API contract

The canonical endpoints are `POST /api/admin/designs` and `PUT /api/admin/designs/:id`. The older `/api/admin/qr-templates` endpoints remain as backward-compatible aliases.

New clients persist a versioned `document` alongside the legacy snapshot:

```json
{
  "name": "Artist artwork tag — Mira Sen",
  "widthMm": 120,
  "heightMm": 216,
  "elements": [{ "legacyCompatibleSnapshot": true }],
  "libraryTemplateId": "artist-artwork-tag",
  "manifestVersion": "3.1.0",
  "schemaVersion": "1.0.0",
  "revision": 1,
  "qrStyle": "obsidian-ring",
  "theme": "light",
  "document": {
    "schemaVersion": "1.0.0",
    "manifestVersion": "3.1.0",
    "name": "Artist artwork tag — Mira Sen",
    "pages": [{ "id": "page-1", "widthMm": 120, "heightMm": 216 }],
    "variables": {},
    "brandSettings": { "locked": true }
  },
  "settings": {
    "merchantName": "Mira Sen",
    "eyebrow": "ORIGINAL WORK",
    "headline": "Study No. 14",
    "descriptor": "Process · provenance · available pieces",
    "cta": "MEET THE WORK",
    "destination": "https://pksh.example/06"
  }
}
```

`elements` remains populated for backward compatibility. New UI code reads `document` first and migrates legacy rows in memory when needed. Updates send the last known `revision`; the API returns HTTP 409 when another session saved a newer revision.

Vendor users can read global designs plus designs owned by their workspace, but can only change their own designs. Administrators retain global access. `POST /api/admin/designs/:id/duplicate` creates an owned copy; `POST /api/admin/designs/:id/validate` runs server-side destination validation.

If the API is unavailable, the frontend stores up to 30 drafts under `peshkash_qr_studio_designs_v3`. This makes template and export work testable without PostgreSQL; it is not a replacement for authenticated workspace persistence. The toolbar always exposes whether a design is saving, saved locally, saved to the workspace, or in conflict.

## Structured document and editor behavior

`src/features/designStudio/document` owns the durable schema and migrations. The QR template adapter remains responsible for manifest-specific layout. This separation lets a future multi-page collateral editor use the same page, safe-area, bleed, variable, and brand-lock contracts without duplicating the QR renderer.

The editor persists normalized positions for the QR, copy, merchant signature, and brandmark. Approved library templates use the Brand Kit's exact eight-family geometry in `templateRenderer.ts`; the live canvas displays that renderer's SVG directly, and the SVG/PNG buttons consume the same string. Transparent interaction boxes provide selection, drag, and resize behavior without maintaining a second visual implementation that can drift from export. Pointer movement updates only local state; autosave is debounced and never issues a network request per pointer event.

Before export, `src/features/designStudio/export/preflight.ts` checks the destination scheme and approved hostname, physical QR size, page bounds, and protected QR standard. Blocking errors open the QR diagnostics panel. Physical decoder testing remains a release requirement and is intentionally reported as a warning rather than simulated by the browser.

## Export rules

- SVG is the master and remains vector.
- PNG export uses a minimum long-side target of 3000 px and never downscales the source canvas below 2×.
- The QR is regenerated from the current destination. Reference SVG files remain gallery artwork only; personalized exports are freshly generated from structured content using the same approved geometry.
- Preserve the template background. The QR's own white field is required even on dark collateral.
- Keep text as live SVG text in the browser export. A print pipeline may outline fonts later if the production vendor requires it.

## Adding a template

1. Add one manifest entry with a unique kebab-case ID and supported format.
2. Add matching reference SVGs to both signature folders using the same `file` name.
3. Add tags from `tagTaxonomy`; add a taxonomy term only when it will be reused.
4. Confirm the QR placement remains inside the canvas and does not overlap copy.
5. Test both themes and both signatures.
6. Test a short and a dense HTTPS destination with a physical phone scanner.
7. Increment the manifest version when layout or rendering semantics change.

## Release checklist

- Frontend `npm run build` passes.
- Backend `npm run build` passes.
- All 30 cards load for both signature preview folders.
- Search and every category filter return expected results.
- Library → editor → signature switch → theme switch works.
- SVG and PNG download at the correct aspect ratio.
- Saved design reloads with the same template, signature, theme, and copy.
- A stale revision produces a visible conflict instead of silently overwriting a newer design.
- Vendor ownership prevents modifying global or another vendor's design.
- Moving fixed template elements is reflected exactly in SVG and PNG exports.
- A 24 mm print proof scans from at least two phone camera apps under ordinary indoor light.
- Favicon PNGs still report an alpha channel and transparent pixels.
