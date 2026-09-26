function numberAttribute(attributes: string, name: string, fallback: number): number {
  const value = attributes.match(new RegExp(`\\b${name}="([^"]+)"`, 'i'))?.[1];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Expand nested SVG data images into vector groups that CorelDRAW can import. */
export function inlineSvgImages(svgBody: string): string {
  return svgBody.replace(/<image\b([^>]*?)href="data:image\/svg\+xml;charset=utf-8,([^"]+)"([^>]*)\/?\s*>/gi, (_match, before: string, encoded: string, after: string) => {
    try {
      const decoded = decodeURIComponent(encoded); const nested = decoded.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i);
      if (!nested) return _match;
      const attributes = `${before} ${after}`; const nestedAttributes = nested[1];
      const viewBox = nestedAttributes.match(/viewBox="([^"]+)"/i)?.[1] || `0 0 ${numberAttribute(nestedAttributes, 'width', 1000)} ${numberAttribute(nestedAttributes, 'height', 1000)}`;
      const [viewX, viewY, viewWidth, viewHeight] = viewBox.split(/[ ,]+/).map(Number);
      const x = numberAttribute(attributes, 'x', 0); const y = numberAttribute(attributes, 'y', 0);
      const width = numberAttribute(attributes, 'width', viewWidth || 1000); const height = numberAttribute(attributes, 'height', viewHeight || 1000);
      const scaleX = width / (viewWidth || 1000); const scaleY = height / (viewHeight || 1000);
      const objectType = /aria-label="[^"]*QR code/i.test(nestedAttributes) ? 'qr-code' : 'embedded-vector';
      return `<g data-object-type="${objectType}" transform="translate(${x.toFixed(3)} ${y.toFixed(3)})"><g transform="scale(${scaleX.toFixed(8)} ${scaleY.toFixed(8)})"><g transform="translate(${(-viewX || 0).toFixed(3)} ${(-viewY || 0).toFixed(3)})">${nested[2]}</g></g></g>`;
    } catch { return _match; }
  });
}
