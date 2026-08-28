import type { BackgroundSpec, CanvasElement, ShapeKind } from './types';

// Normalized (0..1) point sets for non-rectangular shapes — shared by the live CSS clip-path
// rendering and the SVG polygon export, so the two always match exactly. 'frame' and 'rect'/
// 'circle'/'line' aren't here — they render via native rect/ellipse/border, not a polygon.
export const SHAPE_POINTS: Partial<Record<ShapeKind, [number, number][]>> = {
  triangle: [[0.5, 0], [1, 1], [0, 1]],
  star: [
    [0.5, 0], [0.61, 0.35], [0.98, 0.35], [0.68, 0.57], [0.79, 0.91],
    [0.5, 0.7], [0.21, 0.91], [0.32, 0.57], [0.02, 0.35], [0.39, 0.35],
  ],
  tag: [[0, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0, 1]],
  hexagon: [[0.25, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0.25, 1], [0, 0.5]],
  diamond: [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]],
  arrow: [[0, 0.3], [0.55, 0.3], [0.55, 0.05], [1, 0.5], [0.55, 0.95], [0.55, 0.7], [0, 0.7]],
};
// The 'ribbon' CTA style uses its own points (double-notched banner) — kept separate from the
// shape bank since it's specific to CtaElement.style, not a ShapeKind.
export const RIBBON_POINTS: [number, number][] = [[0, 0.5], [0.06, 0], [0.94, 0], [1, 0.5], [0.94, 1], [0.06, 1]];

const OUTLINE_ONLY: Partial<Record<ShapeKind, true>> = { frame: true };
export function isOutlineShape(shape: ShapeKind): boolean { return !!OUTLINE_ONLY[shape]; }

export function clipPathFor(shape: ShapeKind): string | undefined {
  const pts = SHAPE_POINTS[shape];
  if (!pts) return undefined;
  return `polygon(${pts.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(',')})`;
}

export function svgPolygonPoints(shape: ShapeKind, x: number, y: number, w: number, h: number): string | null {
  const pts = SHAPE_POINTS[shape];
  if (!pts) return null;
  return pts.map(([px, py]) => `${(x + px * w).toFixed(1)},${(y + py * h).toFixed(1)}`).join(' ');
}

export function svgRibbonPoints(x: number, y: number, w: number, h: number): string {
  return RIBBON_POINTS.map(([px, py]) => `${(x + px * w).toFixed(1)},${(y + py * h).toFixed(1)}`).join(' ');
}

export function ribbonClipPath(): string {
  return `polygon(${RIBBON_POINTS.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(',')})`;
}

let seq = 0;
function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  seq += 1;
  return `el-${Date.now().toString(36)}-${seq}`;
}

export interface ElementPreset {
  id: string;
  label: string;
  category: 'shape' | 'cta';
  icon: string; // inline SVG, 24x24 viewBox
  build: (canvasW: number, canvasH: number) => CanvasElement;
}

const ICON_SIZE = 'width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"';

export const ELEMENT_PRESETS: ElementPreset[] = [
  {
    id: 'shape-rect', label: 'Rectangle', category: 'shape',
    icon: `<svg ${ICON_SIZE}><rect x="3" y="6" width="18" height="12" rx="1.5" stroke="currentColor" stroke-width="1.6"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      return { id: newId(), kind: 'shape', shape: 'rect', x: w * 0.35, y: h * 0.4, w: short * 0.3, h: short * 0.18, fill: '#BB9057', opacity: 0.85, radius: 4, layer: 'front' };
    },
  },
  {
    id: 'shape-circle', label: 'Circle', category: 'shape',
    icon: `<svg ${ICON_SIZE}><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      const size = short * 0.22;
      return { id: newId(), kind: 'shape', shape: 'circle', x: w * 0.4, y: h * 0.4, w: size, h: size, fill: '#BB9057', opacity: 0.85, layer: 'front' };
    },
  },
  {
    id: 'shape-line', label: 'Line', category: 'shape',
    icon: `<svg ${ICON_SIZE}><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      return { id: newId(), kind: 'shape', shape: 'line', x: w * 0.3, y: h * 0.5, w: short * 0.4, h: Math.max(2, short * 0.008), fill: '#1A1410', opacity: 0.7, layer: 'front' };
    },
  },
  {
    id: 'shape-triangle', label: 'Triangle', category: 'shape',
    icon: `<svg ${ICON_SIZE}><path d="M12 4L20 20H4L12 4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      const size = short * 0.24;
      return { id: newId(), kind: 'shape', shape: 'triangle', x: w * 0.4, y: h * 0.4, w: size, h: size, fill: '#BB9057', opacity: 0.85, layer: 'front' };
    },
  },
  {
    id: 'shape-star', label: 'Star', category: 'shape',
    icon: `<svg ${ICON_SIZE}><path d="M12 3L14.6 9.2L21 9.7L16.1 13.8L17.7 20L12 16.5L6.3 20L7.9 13.8L3 9.7L9.4 9.2L12 3Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      const size = short * 0.24;
      return { id: newId(), kind: 'shape', shape: 'star', x: w * 0.4, y: h * 0.4, w: size, h: size, fill: '#BB9057', opacity: 0.9, layer: 'front' };
    },
  },
  {
    id: 'shape-hexagon', label: 'Hexagon', category: 'shape',
    icon: `<svg ${ICON_SIZE}><path d="M8 3H16L21 12L16 21H8L3 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      const size = short * 0.26;
      return { id: newId(), kind: 'shape', shape: 'hexagon', x: w * 0.4, y: h * 0.4, w: size, h: size, fill: '#BB9057', opacity: 0.85, layer: 'front' };
    },
  },
  {
    id: 'shape-diamond', label: 'Diamond', category: 'shape',
    icon: `<svg ${ICON_SIZE}><path d="M12 3L21 12L12 21L3 12Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      const size = short * 0.24;
      return { id: newId(), kind: 'shape', shape: 'diamond', x: w * 0.4, y: h * 0.4, w: size, h: size, fill: '#BB9057', opacity: 0.85, layer: 'front' };
    },
  },
  {
    id: 'shape-arrow', label: 'Arrow', category: 'shape',
    icon: `<svg ${ICON_SIZE}><path d="M2 9.5H13V6L21 12L13 18V14.5H2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      return { id: newId(), kind: 'shape', shape: 'arrow', x: w * 0.32, y: h * 0.44, w: short * 0.34, h: short * 0.14, fill: '#BB9057', opacity: 0.9, layer: 'front' };
    },
  },
  {
    id: 'shape-frame', label: 'Frame', category: 'shape',
    icon: `<svg ${ICON_SIZE}><rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" stroke-width="1.6"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      return { id: newId(), kind: 'shape', shape: 'frame', x: w * 0.12, y: h * 0.12, w: w * 0.76, h: h * 0.76, fill: '#BB9057', opacity: 0.6, layer: 'back' };
    },
  },
  {
    id: 'cta-button', label: 'Button', category: 'cta',
    icon: `<svg ${ICON_SIZE}><rect x="2" y="8" width="20" height="8" rx="4" stroke="currentColor" stroke-width="1.6"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      return { id: newId(), kind: 'cta', style: 'button', x: w * 0.28, y: h * 0.42, w: short * 0.44, h: short * 0.11, fill: '#1A1410', textColor: '#F5F2EE', text: 'Scan to order', opacity: 1, layer: 'front' };
    },
  },
  {
    id: 'cta-tag', label: 'Tag', category: 'cta',
    icon: `<svg ${ICON_SIZE}><path d="M3 8L15 8L21 12L15 16L3 16Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      return { id: newId(), kind: 'cta', style: 'tag', x: w * 0.06, y: h * 0.06, w: short * 0.34, h: short * 0.1, fill: '#BB9057', textColor: '#1A1410', text: 'NEW', opacity: 1, layer: 'front' };
    },
  },
  {
    id: 'cta-ribbon', label: 'Ribbon', category: 'cta',
    icon: `<svg ${ICON_SIZE}><path d="M2 12L4 4H20L22 12L20 20H4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      return { id: newId(), kind: 'cta', style: 'ribbon', x: w * 0.16, y: h * 0.06, w: w * 0.68, h: short * 0.09, fill: '#1A1410', textColor: '#F5F2EE', text: '20% OFF', opacity: 1, layer: 'front' };
    },
  },
];

// ── Background palette ──────────────────────────────────────────────────────────────────────
// Curated color + pre-picked, legible ink pairs for one-click backgrounds, beyond the two base
// theme surfaces. Each pair is chosen for contrast, not just brand-adjacency.
export interface BackgroundPreset extends BackgroundSpec { label: string }
export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  { label: 'Warm cream', color: '#F5F2EE', ink: '#1A1410' },
  { label: 'Near black', color: '#1A1410', ink: '#F5F2EE' },
  { label: 'Porcelain', color: '#FFFFFF', ink: '#1A1410' },
  { label: 'Terracotta', color: '#C97C5D', ink: '#2A1610' },
  { label: 'Sage', color: '#7C8B6F', ink: '#F5F2EE' },
  { label: 'Ink blue', color: '#273449', ink: '#F0EBE4' },
  { label: 'Blush', color: '#E8D3C8', ink: '#3A241C' },
  { label: 'Olive gold', color: '#4A4632', ink: '#E8DBC0' },
];

// Simple relative-luminance check so a fully custom color still gets a legible ink color.
export function inkForBackground(hex: string): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return '#1A1410';
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => parseInt(c, 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.42 ? '#1A1410' : '#F5F2EE';
}
