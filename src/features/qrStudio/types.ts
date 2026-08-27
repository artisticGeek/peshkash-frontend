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
  updatedAt?: string;
}

export const qrManifest = rawManifest as QrTemplateManifest;

