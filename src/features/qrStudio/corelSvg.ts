function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ?? character);
}

/** One finished print card, exposed to CorelDRAW as one movable bitmap object. */
export function corelPngCardObject(
  pngSource: string,
  x: number,
  y: number,
  width: number,
  height: number,
  id: string,
  label: string,
): string {
  const embeddedPng = /^data:image\/png;base64,[a-z0-9+/=]+$/i.test(pngSource);
  const packagedPng = /^[a-z0-9][a-z0-9._/-]*\.png$/i.test(pngSource) && !pngSource.includes('..');
  if (!embeddedPng && !packagedPng) return '';
  const safeId = id.replace(/[^a-z0-9_-]+/gi, '-');
  const safeLabel = escapeXml(label);
  const safeSource = escapeXml(pngSource);
  return `<image id="${safeId}" data-object-type="qr-card" data-qr-name="${safeLabel}" aria-label="${safeLabel}" x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${width.toFixed(3)}" height="${height.toFixed(3)}" preserveAspectRatio="xMidYMid meet" style="image-rendering:optimizeQuality" xlink:href="${safeSource}" href="${safeSource}"/>`;
}
