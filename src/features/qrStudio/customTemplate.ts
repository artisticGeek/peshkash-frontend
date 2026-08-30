import type { CanvasElement, CustomTemplateSpec, QrTemplateDefinition, TemplateFormat } from './types';

export interface FormatPreset {
  format: TemplateFormat;
  label: string;
  description: string;
  aspect: { w: number; h: number };
  defaultMm: { w: number; h: number };
}

// Same eight formats the library renderer already understands (templateRenderer.ts / initElPos),
// with a representative aspect ratio and a sensible default print size for each.
export const FORMAT_PRESETS: FormatPreset[] = [
  { format: 'landscape', label: 'Landscape card', description: 'Wide counter or table card', aspect: { w: 12, h: 7 }, defaultMm: { w: 120, h: 70 } },
  { format: 'portrait', label: 'Portrait card', description: 'Tall standee or menu insert', aspect: { w: 2, h: 3 }, defaultMm: { w: 90, h: 135 } },
  { format: 'square', label: 'Square card', description: 'Coaster, sticker, social tile', aspect: { w: 1, h: 1 }, defaultMm: { w: 100, h: 100 } },
  { format: 'tag', label: 'Hanging tag', description: 'Narrow product or gift tag', aspect: { w: 5, h: 9 }, defaultMm: { w: 60, h: 108 } },
  { format: 'round', label: 'Round sticker', description: 'Circular label or badge', aspect: { w: 1, h: 1 }, defaultMm: { w: 100, h: 100 } },
  { format: 'insert', label: 'Menu insert', description: 'Booklet or folder insert', aspect: { w: 4, h: 5 }, defaultMm: { w: 100, h: 125 } },
  { format: 'ticket', label: 'Ticket strip', description: 'Wide entry pass or coupon', aspect: { w: 12, h: 5 }, defaultMm: { w: 180, h: 75 } },
  { format: 'label', label: 'Shelf label', description: 'Wide product or shelf label', aspect: { w: 12, h: 7 }, defaultMm: { w: 120, h: 70 } },
];

export type LayeredStarterId = 'blank' | 'brass-frame' | 'editorial-split' | 'offer-badge';

export const LAYERED_STARTERS: Array<{ id: LayeredStarterId; label: string; description: string; icon: string }> = [
  { id: 'blank', label: 'Blank canvas', description: 'Start with protected QR and copy layers', icon: 'bi bi-bounding-box' },
  { id: 'brass-frame', label: 'Brass frame', description: 'Inset border with an editable edition label', icon: 'bi bi-square' },
  { id: 'editorial-split', label: 'Editorial split', description: 'Layered color field with a caption accent', icon: 'bi bi-layout-split' },
  { id: 'offer-badge', label: 'Offer badge', description: 'Backdrop medallion and editable CTA ribbon', icon: 'bi bi-patch-check' },
];

let starterSequence = 0;
function starterId(prefix: string): string {
  starterSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${starterSequence}`;
}

/** Layer-native starter compositions. Every decoration is an ordinary editable studio element. */
export function buildLayeredStarter(starter: LayeredStarterId, canvas: { width: number; height: number }): CanvasElement[] {
  const { width: w, height: h } = canvas;
  const short = Math.min(w, h);
  if (starter === 'brass-frame') return [
    { id: starterId('frame'), kind: 'shape', shape: 'frame', x: w * 0.045, y: h * 0.065, w: w * 0.91, h: h * 0.87, fill: '#BB9057', opacity: 0.72, radius: short * 0.012, layer: 'back', name: 'Brass frame' },
    { id: starterId('edition'), kind: 'text', x: w * 0.07, y: h * 0.07, w: w * 0.36, h: short * 0.08, text: 'LIMITED EDITION', color: '#BB9057', fontFamily: 'Urbanist, Arial, sans-serif', fontSize: Math.round(short * 0.026), fontWeight: '700', align: 'left', layer: 'front', name: 'Edition label' },
  ];
  if (starter === 'editorial-split') return [
    { id: starterId('field'), kind: 'shape', shape: 'rect', x: w * 0.56, y: 0, w: w * 0.44, h, fill: '#D9C4AE', opacity: 0.72, radius: 0, layer: 'back', name: 'Editorial color field' },
    { id: starterId('rule'), kind: 'shape', shape: 'line', x: w * 0.08, y: h * 0.84, w: w * 0.28, h: Math.max(3, short * 0.006), fill: '#BB9057', opacity: 1, layer: 'front', name: 'Caption rule' },
    { id: starterId('caption'), kind: 'text', x: w * 0.08, y: h * 0.865, w: w * 0.38, h: short * 0.07, text: 'MADE WITH INTENTION', color: '#1A1410', fontFamily: 'Urbanist, Arial, sans-serif', fontSize: Math.round(short * 0.024), fontWeight: '700', align: 'left', layer: 'front', name: 'Editorial caption' },
  ];
  if (starter === 'offer-badge') return [
    { id: starterId('medallion'), kind: 'shape', shape: 'circle', x: w * 0.67, y: h * 0.06, w: short * 0.24, h: short * 0.24, fill: '#BB9057', opacity: 0.18, layer: 'back', name: 'Offer medallion' },
    { id: starterId('ribbon'), kind: 'cta', style: 'ribbon', x: w * 0.57, y: h * 0.12, w: w * 0.36, h: short * 0.09, fill: '#1A1410', textColor: '#F5F2EE', text: 'SPECIAL EDITION', opacity: 1, layer: 'front', name: 'Offer ribbon' },
  ];
  return [];
}

// Logical canvas px baseline shared with the built-in manifest templates, so type scale
// (which is relative to the short side) reads at the same size as the library.
const SHORT_SIDE = 900;

function defaultQrFraction(format: TemplateFormat, width: number, height: number): { x: number; y: number; size: number } {
  const short = Math.min(width, height);
  const horizontal = format === 'landscape' || format === 'ticket' || format === 'label';
  if (horizontal) {
    const size = short * 0.46;
    const x = width * 0.07;
    const y = (height - size) / 2;
    return { x: x / width, y: y / height, size: size / short };
  }
  if (format === 'round') {
    const size = short * 0.42;
    const x = (width - size) / 2;
    const y = height * 0.15;
    return { x: x / width, y: y / height, size: size / short };
  }
  const size = short * 0.5;
  const x = (width - size) / 2;
  const y = height * 0.12;
  return { x: x / width, y: y / height, size: size / short };
}

export function buildCustomTemplateSpec(format: TemplateFormat): CustomTemplateSpec {
  const preset = FORMAT_PRESETS.find((p) => p.format === format) ?? FORMAT_PRESETS[0];
  const { w: arW, h: arH } = preset.aspect;
  const long = Math.round(SHORT_SIDE * (Math.max(arW, arH) / Math.min(arW, arH)));
  const width = arW >= arH ? long : SHORT_SIDE;
  const height = arH >= arW ? long : SHORT_SIDE;
  return { format, canvas: { width, height }, qr: defaultQrFraction(format, width, height), ratio: `${arW}:${arH}` };
}

// Reconstructs a full QrTemplateDefinition from a saved CustomTemplateSpec — used both when the
// creator hands off to the editor for the first time, and when a saved custom design is reopened.
export function synthesizeCustomTemplate(
  spec: CustomTemplateSpec,
  opts: { id: string; label: string; merchantType?: string },
): QrTemplateDefinition {
  return {
    id: opts.id,
    index: -1,
    label: opts.label,
    category: 'custom',
    categoryLabel: 'Custom',
    tags: ['custom'],
    format: spec.format,
    file: '',
    canvas: spec.canvas,
    ratio: spec.ratio,
    defaultTheme: 'light',
    merchantType: opts.merchantType || 'Custom',
    defaultCopy: {
      eyebrow: 'YOUR EYEBROW',
      headline: 'Your headline',
      descriptor: 'A short line of supporting detail',
      cta: 'Scan to explore',
    },
    sampleDestination: 'https://pksh.in/your-link',
    qr: spec.qr,
  };
}
