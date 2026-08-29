import type {
  BackgroundSpec,
  FixedElementLayout,
  StudioDesign,
  StudioTheme,
  TypographySpec,
  QrStyleId,
  CanvasElement,
  ElementVisibility,
  CustomTemplateSpec,
} from '../../qrStudio/types';

export const STUDIO_SCHEMA_VERSION = '1.0.0';

export interface StudioInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface StudioPageDocument {
  id: string;
  name: string;
  sourceTemplateId: string;
  width: number;
  height: number;
  unit: 'mm';
  theme: StudioTheme;
  qrStyle: QrStyleId;
  background?: BackgroundSpec;
  typography?: TypographySpec;
  visibility?: ElementVisibility;
  customTemplate?: CustomTemplateSpec;
  layout: FixedElementLayout;
  elements: CanvasElement[];
  copy: Pick<StudioDesign, 'merchantName' | 'eyebrow' | 'headline' | 'descriptor' | 'cta' | 'destination'>;
  safeArea: StudioInsets;
  bleed: StudioInsets;
}

export interface StudioDocument {
  schemaVersion: typeof STUDIO_SCHEMA_VERSION;
  manifestVersion: string;
  name: string;
  sourceTemplateId?: string;
  revision: number;
  pages: StudioPageDocument[];
  variables: Record<string, string>;
  brandSettings: { qrStyle: QrStyleId; theme: StudioTheme };
  createdAt: string;
  updatedAt: string;
}
