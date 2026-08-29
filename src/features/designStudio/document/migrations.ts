import type { FixedElementLayout, StudioDesign } from '../../qrStudio/types';
import { STUDIO_SCHEMA_VERSION, type StudioDocument } from './types.js';

const clone = <T>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;

export function createStudioDocument(design: StudioDesign, layout: FixedElementLayout): StudioDocument {
  const now = new Date().toISOString();
  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    manifestVersion: design.manifestVersion,
    name: design.name,
    sourceTemplateId: design.libraryTemplateId,
    revision: design.revision ?? 1,
    variables: clone(design.variables ?? {
      merchantName: design.merchantName,
      headline: design.headline,
      cta: design.cta,
      destination: design.destination,
    }),
    brandSettings: { qrStyle: design.qrStyle, theme: design.theme },
    createdAt: now,
    updatedAt: now,
    pages: [{
      id: 'page-1',
      name: 'Front',
      sourceTemplateId: design.libraryTemplateId,
      width: design.widthMm,
      height: design.heightMm,
      unit: 'mm',
      displayUnit: design.displayUnit ?? 'mm',
      grid: clone(design.grid),
      theme: design.theme,
      qrStyle: design.qrStyle,
      qrColors: clone(design.qrColors),
      background: clone(design.background),
      typography: clone(design.typography),
      visibility: clone(design.visibility),
      customTemplate: clone(design.customTemplate),
      layout: clone(layout),
      elements: clone(design.canvasElements ?? []),
      copy: {
        merchantName: design.merchantName,
        eyebrow: design.eyebrow,
        headline: design.headline,
        descriptor: design.descriptor,
        cta: design.cta,
        destination: design.destination,
      },
      safeArea: { top: 4, right: 4, bottom: 4, left: 4 },
      bleed: { top: 3, right: 3, bottom: 3, left: 3 },
    }],
  };
}

export function readStudioDocument(value: unknown): StudioDocument | null {
  if (!value || typeof value !== 'object') return null;
  const doc = value as Partial<StudioDocument>;
  if (doc.schemaVersion !== STUDIO_SCHEMA_VERSION || !Array.isArray(doc.pages) || !doc.pages[0]) return null;
  return doc as StudioDocument;
}

export function layoutFitsCanvas(layout: FixedElementLayout | undefined, width: number, height: number): layout is FixedElementLayout {
  if (!layout || width <= 0 || height <= 0) return false;
  return (['qr', 'copy', 'merchant', 'brandmark'] as const).every((key) => {
    const rect = layout[key];
    return !!rect
      && [rect.x, rect.y, rect.w, rect.h].every(Number.isFinite)
      && rect.x >= 0
      && rect.y >= 0
      && rect.w > 0
      && rect.h > 0
      && rect.x + rect.w <= width + 0.01
      && rect.y + rect.h <= height + 0.01;
  });
}

export function designFromDocument(document: StudioDocument): Partial<StudioDesign> {
  const page = document.pages[0];
  return {
    name: document.name,
    libraryTemplateId: page.sourceTemplateId,
    manifestVersion: document.manifestVersion,
    schemaVersion: document.schemaVersion,
    revision: document.revision,
    qrStyle: page.qrStyle,
    theme: page.theme,
    widthMm: page.width,
    heightMm: page.height,
    displayUnit: page.displayUnit ?? 'mm',
    grid: clone(page.grid),
    qrColors: clone(page.qrColors),
    background: clone(page.background),
    typography: clone(page.typography),
    visibility: clone(page.visibility),
    customTemplate: clone(page.customTemplate),
    layout: clone(page.layout),
    canvasElements: clone(page.elements),
    variables: clone(document.variables),
    ...clone(page.copy),
  };
}
