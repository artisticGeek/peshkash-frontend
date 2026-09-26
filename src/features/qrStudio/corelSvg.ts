function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ?? character);
}

/** One finished print card, exposed to CorelDRAW as one movable bitmap object. */
export function corelPngCardObject(
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
  id: string,
  label: string,
): string {
  if (!/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(dataUrl)) return '';
  const safeId = id.replace(/[^a-z0-9_-]+/gi, '-');
  const safeLabel = escapeXml(label);
  return `<image id="${safeId}" data-object-type="qr-card" data-qr-name="${safeLabel}" x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${width.toFixed(3)}" height="${height.toFixed(3)}" preserveAspectRatio="none" href="${dataUrl}"><title>${safeLabel}</title></image>`;
}
