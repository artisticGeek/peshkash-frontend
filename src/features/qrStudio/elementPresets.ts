import type { CanvasElement, ShapeKind } from './types';

// Normalized (0..1) point sets for non-rectangular shapes — shared by the live CSS clip-path
// rendering and the SVG polygon export, so the two always match exactly.
export const SHAPE_POINTS: Partial<Record<ShapeKind, [number, number][]>> = {
  triangle: [[0.5, 0], [1, 1], [0, 1]],
  star: [
    [0.5, 0], [0.61, 0.35], [0.98, 0.35], [0.68, 0.57], [0.79, 0.91],
    [0.5, 0.7], [0.21, 0.91], [0.32, 0.57], [0.02, 0.35], [0.39, 0.35],
  ],
  tag: [[0, 0], [0.75, 0], [1, 0.5], [0.75, 1], [0, 1]],
};

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
      return { id: newId(), kind: 'shape', shape: 'rect', x: w * 0.35, y: h * 0.4, w: short * 0.3, h: short * 0.18, fill: '#BB9057', opacity: 0.85, radius: 4 };
    },
  },
  {
    id: 'shape-circle', label: 'Circle', category: 'shape',
    icon: `<svg ${ICON_SIZE}><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      const size = short * 0.22;
      return { id: newId(), kind: 'shape', shape: 'circle', x: w * 0.4, y: h * 0.4, w: size, h: size, fill: '#BB9057', opacity: 0.85 };
    },
  },
  {
    id: 'shape-line', label: 'Line', category: 'shape',
    icon: `<svg ${ICON_SIZE}><line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      return { id: newId(), kind: 'shape', shape: 'line', x: w * 0.3, y: h * 0.5, w: short * 0.4, h: Math.max(2, short * 0.008), fill: '#1A1410', opacity: 0.7 };
    },
  },
  {
    id: 'shape-triangle', label: 'Triangle', category: 'shape',
    icon: `<svg ${ICON_SIZE}><path d="M12 4L20 20H4L12 4Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      const size = short * 0.24;
      return { id: newId(), kind: 'shape', shape: 'triangle', x: w * 0.4, y: h * 0.4, w: size, h: size, fill: '#BB9057', opacity: 0.85 };
    },
  },
  {
    id: 'shape-star', label: 'Star', category: 'shape',
    icon: `<svg ${ICON_SIZE}><path d="M12 3L14.6 9.2L21 9.7L16.1 13.8L17.7 20L12 16.5L6.3 20L7.9 13.8L3 9.7L9.4 9.2L12 3Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      const size = short * 0.24;
      return { id: newId(), kind: 'shape', shape: 'star', x: w * 0.4, y: h * 0.4, w: size, h: size, fill: '#BB9057', opacity: 0.9 };
    },
  },
  {
    id: 'cta-button', label: 'Button', category: 'cta',
    icon: `<svg ${ICON_SIZE}><rect x="2" y="8" width="20" height="8" rx="4" stroke="currentColor" stroke-width="1.6"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      return { id: newId(), kind: 'cta', style: 'button', x: w * 0.28, y: h * 0.42, w: short * 0.44, h: short * 0.11, fill: '#1A1410', textColor: '#F5F2EE', text: 'Scan to order', opacity: 1 };
    },
  },
  {
    id: 'cta-tag', label: 'Tag', category: 'cta',
    icon: `<svg ${ICON_SIZE}><path d="M3 8L15 8L21 12L15 16L3 16Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    build: (w, h) => {
      const short = Math.min(w, h);
      return { id: newId(), kind: 'cta', style: 'tag', x: w * 0.06, y: h * 0.06, w: short * 0.34, h: short * 0.1, fill: '#BB9057', textColor: '#1A1410', text: 'NEW', opacity: 1 };
    },
  },
];
