import { circleCurvePath, roundedBoxCurvePath } from './vectorGeometry.js';

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
      const objectName = objectType === 'qr-code' ? 'Editable QR vector curves' : 'Embedded vector artwork';
      return `<g data-object-type="${objectType}" data-object-name="${objectName}" transform="translate(${x.toFixed(3)} ${y.toFixed(3)})"><title>${objectName}</title><g transform="scale(${scaleX.toFixed(8)} ${scaleY.toFixed(8)})"><g transform="translate(${(-viewX || 0).toFixed(3)} ${(-viewY || 0).toFixed(3)})">${nested[2]}</g></g></g>`;
    } catch { return _match; }
  });
}

function numericAttribute(attributes: string, name: string): number | null {
  const raw = attributes.match(new RegExp(`\\b${name}="([+-]?(?:\\d+\\.?\\d*|\\.\\d+))"`, 'i'))?.[1];
  const value = raw == null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : null;
}

function withoutGeometry(attributes: string, names: string[]): string {
  return names.reduce((result, name) => result.replace(new RegExp(`\\s*\\b${name}="[^"]*"`, 'gi'), ''), attributes).replace(/\/\s*$/, '').trim();
}

/** Convert shape primitives that CorelDRAW may reinterpret into explicit curves. */
export function normaliseCorelGeometry(svgBody: string): string {
  const roundedRects = svgBody.replace(/<rect\b([^>]*\b(?:rx|ry)="[^"]+"[^>]*)\/?\s*>/gi, (match, attributes: string) => {
    const x = numericAttribute(attributes, 'x') ?? 0; const y = numericAttribute(attributes, 'y') ?? 0;
    const width = numericAttribute(attributes, 'width'); const height = numericAttribute(attributes, 'height');
    const radius = numericAttribute(attributes, 'rx') ?? numericAttribute(attributes, 'ry');
    if (width == null || height == null || radius == null) return match;
    const presentation = withoutGeometry(attributes, ['x', 'y', 'width', 'height', 'rx', 'ry']);
    return `<path d="${roundedBoxCurvePath(x, y, width, height, radius)}"${presentation ? ` ${presentation}` : ''}/>`;
  });
  return roundedRects.replace(/<circle\b([^>]*)\/?\s*>/gi, (match, attributes: string) => {
    const cx = numericAttribute(attributes, 'cx') ?? 0; const cy = numericAttribute(attributes, 'cy') ?? 0; const radius = numericAttribute(attributes, 'r');
    if (radius == null) return match;
    const presentation = withoutGeometry(attributes, ['cx', 'cy', 'r']);
    return `<path d="${circleCurvePath(cx, cy, radius)}"${presentation ? ` ${presentation}` : ''}/>`;
  });
}
