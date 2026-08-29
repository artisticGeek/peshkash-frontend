# Peshkash Design Studio architecture

## Purpose

The Design Studio is the durable editing platform behind Template Studio and QR Studio. It consolidates the former manifest-driven QR editor and the legacy raw-element QR Bank without weakening the approved brand or scan rules.

## Layer boundaries

| Layer | Responsibility |
|---|---|
| `features/designStudio/document` | Versioned document types, safe areas, bleed, variables, and migration from persisted data |
| `features/designStudio/export` | Deterministic preflight checks that gate export |
| `features/qrStudio/qr-template-manifest.json` | Approved template inventory, copy, dimensions, taxonomy, and normalized QR placement |
| `features/qrStudio/qrRenderer.ts` | Protected QR construction and signature treatment |
| `features/qrStudio/templateRenderer.ts` | Canonical SVG composition used by the canvas and export |
| `pages/QrTemplatePage.vue` | Library, editing interaction, local drafts, autosave, conflict feedback, and export controls |
| Backend `/api/admin/designs` | Ownership-scoped persistence, revision checks, duplication, validation, and legacy aliases |

The renderer is canonical. The UI stores normalized layout overrides and passes them to the renderer; it does not recreate an independent export layout.

## Document lifecycle

1. A manifest template becomes a `StudioDesign` working model.
2. `createStudioDocument` serializes that model as schema `1.0.0` with pages, settings, variables, brand locks, safe area, and bleed.
3. The API stores both `document` and a legacy `elements`/`settings` snapshot during the migration period.
4. `readStudioDocument` validates and migrates persisted JSON before it reaches the editor.
5. `designFromDocument` adapts the durable document back to the QR renderer model.

Schema migrations must be sequential, deterministic, and side-effect free. Increment `STUDIO_SCHEMA_VERSION` only when the persisted contract changes, not for ordinary UI work.

## Persistence and concurrency

Autosave is debounced by 1.4 seconds. New or offline designs are kept in `peshkash_qr_studio_designs_v3`; authenticated saves go to `/api/admin/designs`. Every stored row carries an integer `revision`. Updates must include the last revision and fail with HTTP 409 when stale, preventing silent last-write-wins data loss.

Rows with `vendorId = null` are global library designs. Vendor actors can list global plus owned rows and can mutate owned rows only. Admin actors can manage every row. Custom design IDs use the `custom-` prefix; manifest IDs continue to be validated against the checked-in inventory.

## Export and scan safety

SVG is the master artifact. PNG is rasterized from the same SVG at production resolution. Export is blocked when the destination is not owned HTTPS, when the computed physical QR field is below 24 mm, when it leaves the page, or when protected settings are altered. Error correction H, four quiet modules, white isolation field, and approved signatures are renderer constants rather than user options.

Browser preflight cannot prove real camera decoding. Release QA still requires a 24 mm physical proof scanned by at least two camera apps in ordinary indoor light.

## Extension rules

- Add templates to the manifest, not to page-specific conditionals.
- Add new document fields as optional first, then migrate existing documents before making them required.
- Keep network I/O out of pointer-move handlers.
- Keep brand-protected QR attributes outside generic property controls.
- Add multi-page and reusable section UI against `StudioDocument.pages`; do not create another persisted shape.
- Remove the legacy QR Bank editor only after all stored rows have been migrated and its routes have redirected to this studio.
