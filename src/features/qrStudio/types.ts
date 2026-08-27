import rawManifest from './qr-template-manifest.json';

export type QrStyleId = 'obsidian-ring' | 'porcelain-cameo';
export type StudioTheme = 'light' | 'dark';
export type TemplateFormat = 'landscape' | 'portrait' | 'tag' | 'square' | 'round' | 'insert' | 'ticket' | 'label';

export interface QrStyleDefinition {
  label: string;
  folder: string;
  medallion: string;
  moduleRadiusCells: number;
  finderRadiusCells: number;
  medallionFill: string;
  medallionStroke: string;
  medallionRatio: number;
  medallionIconRatio: number;
  isolationInnerRatio?: number;
  finderCore: string;
  maskPolicy: string;
  required: boolean;
}

export interface QrTemplateDefinition {
  id: string;
  index: number;
  label: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  format: TemplateFormat;
  file: string;
  canvas: { width: number; height: number };
  ratio: string;
  defaultTheme: StudioTheme;
  merchantType: string;
  defaultCopy: {
    eyebrow: string;
    headline: string;
    descriptor: string;
    cta: string;
  };
  sampleDestination: string;
  qr: { x: number; y: number; size: number };
}

export interface QrTemplateManifest {
  version: string;
  librarySize: number;
  coordinateSystem: string;
  sizeReference: string;
  qrStandard: {
    quietZoneModules: number;
    foreground: string;
    background: string;
    errorCorrection: string;
    moduleShape: string;
    finderShape: string;
    approvedLogoOverlay: string;
    minimumPrintSizeMm: number;
    minimumDigitalSizePx: number;
    minimumRasterModulePixels: number;
    recommendedPrintModuleMm: number;
    destinationPolicy: string;
  };
  qrStyles: Record<QrStyleId, QrStyleDefinition>;
  categories: Record<string, string>;
  tagTaxonomy: string[];
  templates: QrTemplateDefinition[];
}

export interface StudioContent {
  merchantName: string;
  eyebrow: string;
  headline: string;
  descriptor: string;
  cta: string;
  destination: string;
}

export type ElementKey = 'eyebrow' | 'headline' | 'descriptor' | 'cta' | 'merchantName' | 'brandmark';
export type ElementVisibility = Partial<Record<ElementKey, boolean>>;

// Layout backbone for a template built with the template creator (not part of the fixed
// manifest library). Saved alongside the design so it can be reconstructed identically on reload.
export interface CustomTemplateSpec {
  format: TemplateFormat;
  canvas: { width: number; height: number };
  qr: { x: number; y: number; size: number };
  ratio: string;
}

// ── Freeform element bank: shapes and CTA badges the user drops onto the canvas ────────────────
// Geometry (x/y/w/h) lives in the same canvas-px coordinate space as the fixed elements' elPos.
export type ShapeKind = 'rect' | 'circle' | 'line' | 'triangle' | 'star' | 'tag';

export interface CanvasElementBase {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity?: number;
}

export interface ShapeElement extends CanvasElementBase {
  kind: 'shape';
  shape: ShapeKind;
  fill: string;
  radius?: number; // corner radius, 'rect' only
}

export interface CtaElement extends CanvasElementBase {
  kind: 'cta';
  style: 'button' | 'tag';
  text: string;
  fill: string;
  textColor: string;
}

export type CanvasElement = ShapeElement | CtaElement;

export interface StudioDesign extends StudioContent {
  id?: number | string;
  name: string;
  libraryTemplateId: string;
  manifestVersion: string;
  qrStyle: QrStyleId;
  theme: StudioTheme;
  widthMm: number;
  heightMm: number;
  visibility?: ElementVisibility;
  customTemplate?: CustomTemplateSpec;
  canvasElements?: CanvasElement[];
  updatedAt?: string;
}

export const qrManifest = rawManifest as QrTemplateManifest;

