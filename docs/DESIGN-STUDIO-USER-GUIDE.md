# Design Studio user guide

## Start from the library

Open QR Studio and search by template, category, merchant example, or tag. Filter by category or format, switch between Obsidian Ring and Porcelain Cameo previews, and use **Preview** to inspect a template before opening it.

## Edit a design

Choose **Use template**, then rename the design from the top toolbar. The left rail separates design, QR, background, typography, elements, and layers. Drag the QR, copy block, merchant signature, or brandmark directly on the canvas; corner handles resize the selected item. Use the bottom controls to fit or zoom the canvas.

The QR panel edits the owned HTTPS destination and signature style. Brand-protected properties—error correction, quiet zone, module colors, white isolation field, and central medallion rules—cannot be changed.

## Saving and conflicts

Changes autosave after a short pause. The toolbar reports **Saving changes**, **Saved to workspace**, **Saved locally**, or **Resolve save conflict**. Local saving means the server was unavailable or the session is not authenticated; the draft remains on this browser only.

If another session changes the same design first, this editor refuses to overwrite it and displays a conflict. Reload the latest design, duplicate it if both versions matter, and reapply the intended change.

## Export safely

Open the QR panel before exporting. All blocking preflight checks must be green: owned HTTPS destination, approved host, minimum 24 mm QR field, page bounds, and protected standard. SVG is the preferred print master; PNG is intended for workflows that require a raster asset.

An on-screen pass does not replace a scan proof. Print the final design at its real dimensions and scan it with at least two phone camera apps under normal indoor light before production.

## Offline and local drafts

Up to 30 local drafts are retained on the current browser. They can be reopened and exported, but they are not shared with teammates and can be lost if browser storage is cleared. Sign in and confirm **Saved to workspace** before treating a design as a team asset.
