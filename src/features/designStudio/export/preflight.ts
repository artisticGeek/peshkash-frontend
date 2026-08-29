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

export function preflightDesign(design: StudioDesign, template: QrTemplateDefinition, layout: FixedElementLayout): PreflightReport {
  const checks: PreflightCheck[] = [];
  let destination: URL | null = null;
  try { destination = new URL(design.destination); } catch { /* reported below */ }
  const destinationOk = destination?.protocol === 'https:';
  checks.push({ id: 'destination', label: 'HTTPS destination', detail: destinationOk ? design.destination : 'Enter a complete HTTPS URL.', level: destinationOk ? 'pass' : 'error' });
  const approved = !!destination && APPROVED_HOSTS.has(destination.hostname.toLowerCase());
  checks.push({ id: 'host', label: 'Peshkash short-link host', detail: approved ? destination!.hostname : 'Use a Peshkash-owned short link before export.', level: approved ? 'pass' : 'error' });

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
