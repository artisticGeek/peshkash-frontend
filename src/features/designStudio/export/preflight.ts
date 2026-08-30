import type { FixedElementLayout, QrTemplateDefinition, StudioDesign } from '../../qrStudio/types';

export type PreflightLevel = 'pass' | 'warning' | 'error';

export interface PreflightCheck {
  id: string;
  label: string;
  detail: string;
  level: PreflightLevel;
}

export interface PreflightReport {
  canExport: boolean;
  qrSizeMm: number;
  checks: PreflightCheck[];
  errors: PreflightCheck[];
  warnings: PreflightCheck[];
}

const APPROVED_HOSTS = new Set(['peshkash.app', 'www.peshkash.app', 'pksh.in', 'pksh.example']);

function rgb(hex: string): [number, number, number] | null {
  const value = hex.trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(value)) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number | null {
  const value = rgb(hex); if (!value) return null;
  const channels = value.map((channel) => {
    const v = channel / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(a: string, b: string): number | null {
  const la = luminance(a), lb = luminance(b);
  if (la == null || lb == null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function preflightDesign(design: StudioDesign, template: QrTemplateDefinition, layout: FixedElementLayout): PreflightReport {
  const checks: PreflightCheck[] = [];
  let destination: URL | null = null;
  try { destination = new URL(design.destination); } catch { /* reported below */ }
  const destinationOk = destination?.protocol === 'https:';
  checks.push({ id: 'destination', label: 'HTTPS destination', detail: destinationOk ? design.destination : 'Enter a complete HTTPS URL.', level: destinationOk ? 'pass' : 'error' });
  const approved = !!destination && APPROVED_HOSTS.has(destination.hostname.toLowerCase());
  checks.push({ id: 'host', label: 'Peshkash short-link host', detail: approved ? destination!.hostname : 'Use a Peshkash-owned short link before export.', level: approved ? 'pass' : 'error' });
  const placeholder = !!destination && (destination.hostname.toLowerCase().endsWith('.example') || /\/(your-link|placeholder)(\/|$)/i.test(destination.pathname));
  checks.push({ id: 'mapping', label: 'Production QR mapping', detail: placeholder ? 'Replace the sample destination with a live QR mapping.' : 'Destination is not a known placeholder.', level: placeholder ? 'error' : 'pass' });

  const qrForeground = design.qrColors?.foreground ?? '#1A1410';
  const qrBackground = design.qrColors?.transparent
    ? (design.background?.color ?? (design.theme === 'dark' ? '#1A1410' : '#F5F2EE'))
    : (design.qrColors?.background ?? '#FFFFFF');
  const contrast = contrastRatio(qrForeground, qrBackground);
  const contrastOk = contrast != null && contrast >= 4.5;
  checks.push({ id: 'contrast', label: 'QR color contrast', detail: contrast == null ? 'Use full six-digit hex colors.' : `${contrast.toFixed(1)}:1 contrast`, level: contrastOk ? 'pass' : 'error' });
  if (design.qrColors?.transparent) checks.push({ id: 'transparent', label: 'Transparent quiet zone', detail: 'Proof the QR on its final background; contrast is evaluated against the current canvas.', level: 'warning' });

  const scaleMmPerCanvasUnit = design.widthMm / template.canvas.width;
  const qrSizeMm = layout.qr.w * scaleMmPerCanvasUnit;
  checks.push({ id: 'physical-size', label: 'Physical QR size', detail: `${qrSizeMm.toFixed(1)} mm square`, level: qrSizeMm >= 24 ? 'pass' : 'error' });

  const inBounds = layout.qr.x >= 0 && layout.qr.y >= 0 && layout.qr.x + layout.qr.w <= template.canvas.width && layout.qr.y + layout.qr.h <= template.canvas.height;
  checks.push({ id: 'bounds', label: 'QR field is unclipped', detail: inBounds ? 'Complete field and quiet zone remain on the page.' : 'Move the QR fully inside the page.', level: inBounds ? 'pass' : 'error' });
  checks.push({ id: 'standard', label: 'Protected QR geometry', detail: 'H correction · 4-module quiet zone · approved framed-P medallion', level: 'pass' });

  if (design.headline.length > 72) checks.push({ id: 'headline', label: 'Headline length', detail: 'Long copy may overflow at print size.', level: 'warning' });
  if (design.descriptor.length > 86) checks.push({ id: 'descriptor', label: 'Descriptor length', detail: 'Shorten this line for more reliable print layout.', level: 'warning' });
  checks.push({ id: 'decode', label: 'Decoder proof', detail: 'Run a physical iOS and Android proof before production.', level: 'warning' });

  const errors = checks.filter((check) => check.level === 'error');
  const warnings = checks.filter((check) => check.level === 'warning');
  return { canExport: errors.length === 0, qrSizeMm, checks, errors, warnings };
}
