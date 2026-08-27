import type { CustomTemplateSpec, QrTemplateDefinition, TemplateFormat } from './types';

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
