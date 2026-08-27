<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import axios from 'axios';
import QRCode from 'qrcode';
import { API_BASE_URL } from '../config';
import { drawPeshkashMark, EXPORT_SCALE as _EXPORT_SCALE } from '../utils/qrRenderer';

const props = defineProps<{ embedded?: boolean }>();

// ─── Types ────────────────────────────────────────────────────────────────────

type Unit = 'mm' | 'cm' | 'in';
type ElementType = 'qr' | 'text' | 'image' | 'rect';
type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface BaseEl {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  locked: boolean;
}
interface QrEl extends BaseEl {
  type: 'qr';
  fgColor: string;
  bgColor: string;
  margin: number;
  errorLevel: 'L' | 'M' | 'Q' | 'H';
  borderRadius: number;
}
interface TextEl extends BaseEl {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  textAlign: 'left' | 'center' | 'right';
}
interface ImageEl extends BaseEl {
  type: 'image';
  src: string;
  objectFit: 'contain' | 'cover' | 'fill';
  borderRadius: number;
  opacity: number;
}
interface RectEl extends BaseEl {
  type: 'rect';
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
  opacity: number;
}
type TemplateEl = QrEl | TextEl | ImageEl | RectEl;

interface QrTemplate {
  id?: number;
  name: string;
  widthMm: number;
  heightMm: number;
  elements: TemplateEl[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: 'Business Card', w: 85, h: 54 },
  { label: 'Square 80', w: 80, h: 80 },
  { label: 'Square 60', w: 60, h: 60 },
  { label: 'Acrylic Portrait', w: 90, h: 120 },
  { label: 'Acrylic Square', w: 100, h: 100 },
  { label: 'Label', w: 50, h: 30 },
  { label: 'Custom', w: 0, h: 0 },
];

const FONTS = ['Rufina', 'Urbanist', 'Inter', 'Playfair Display', 'Georgia', 'Arial', 'Helvetica Neue', 'Times New Roman', 'Courier New'];
const BASE_SCALE = 3.78; // px per mm at 100% zoom

// Mini layout preview for the list-page preset cards
function miniElStyle(el: TemplateEl, tpl: QrTemplate): Record<string, string> {
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  const base: Record<string, string> = {
    position: 'absolute',
    left: pct(el.x, tpl.widthMm),
    top: pct(el.y, tpl.heightMm),
    width: pct(el.width, tpl.widthMm),
    height: pct(el.height, tpl.heightMm),
    boxSizing: 'border-box',
  };
  if (el.type === 'rect') {
    const r = el as RectEl;
    base.background = r.fill;
    if ((r.strokeWidth ?? 0) > 0) base.border = `1px solid ${r.stroke}`;
    if ((r.borderRadius ?? 0) > 0) base.borderRadius = '2px';
    base.opacity = String(r.opacity ?? 1);
    // Hairline bracket rects (s≈0.45mm) render sub-pixel at thumbnail scale — clamp to 1px
    base.minWidth = '1px';
    base.minHeight = '1px';
  } else if (el.type === 'qr') {
    base.background = '#e8e8e8';
    base.backgroundImage = 'repeating-conic-gradient(#c0c0c0 0% 25%, #e8e8e8 0% 50%)';
    base.backgroundSize = '5px 5px';
  } else if (el.type === 'text') {
    const t = el as TextEl;
    base.background = t.color;
    base.opacity = '0.28';
    base.borderRadius = '1px';
  } else if (el.type === 'image') {
    base.background = '#d4b07a44';
    base.borderRadius = '1px';
    base.border = '1px dashed #d4b07a';
  }
  return base;
}

// ─── Brand bracket helper ─────────────────────────────────────────────────────
// Generates the 8 rect elements that form the four L-shaped corner brackets
// — the signature Peshkash framing motif from the brand kit.
// arm   = length of each bracket arm in mm (default 7)
// margin = distance from canvas edge to bracket corner in mm (default 4)
// color  = fill color (use #C79C62 on dark bg, #BB9057 on light bg)
// s      = stroke thickness in mm (default 0.45)
function makeBrackets(
  w: number, h: number,
  arm = 7, margin = 4,
  color = '#C79C62', s = 0.45,
): RectEl[] {
  const b = (x: number, y: number, bw: number, bh: number): RectEl => ({
    id: uid(), type: 'rect' as const, name: 'Bracket',
    x, y, width: bw, height: bh,
    locked: true, fill: color, stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1,
  });
  return [
    b(margin,       margin,       arm, s  ),  // TL — horizontal arm
    b(margin,       margin,       s,   arm),  // TL — vertical arm
    b(w-margin-arm, margin,       arm, s  ),  // TR — horizontal arm
    b(w-margin-s,   margin,       s,   arm),  // TR — vertical arm
    b(margin,       h-margin-s,   arm, s  ),  // BL — horizontal arm
    b(margin,       h-margin-arm, s,   arm),  // BL — vertical arm
    b(w-margin-arm, h-margin-s,   arm, s  ),  // BR — horizontal arm
    b(w-margin-s,   h-margin-arm, s,   arm),  // BR — vertical arm
  ];
}

// ─── Preset Template Library ──────────────────────────────────────────────────

interface PresetTemplate {
  name: string;
  icon: string;
  desc: string;
  create: () => QrTemplate;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  // ── Business Card format (85 × 54 mm) ──────────────────────────────────────
  {
    name: 'Dark Card',
    icon: 'bi-moon-stars-fill',
    desc: '85 × 54 mm · Near-black · Gold brackets · Cream QR',
    create: () => ({
      name: 'Dark Card', widthMm: 85, heightMm: 54,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 85, height: 54, locked: true, fill: '#1A1410', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        ...makeBrackets(85, 54, 6.5, 3.5, '#C79C62'),
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 29.5, y: 10, width: 26, height: 26, locked: false, fgColor: '#F5F2EE', bgColor: '#1A1410', margin: 0, errorLevel: 'H' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Vendor Name', x: 10, y: 39, width: 65, height: 7, locked: false, content: 'Vendor Name', fontFamily: 'Urbanist', fontSize: 9, fontWeight: '600', color: '#F5F2EE', textAlign: 'center' as const },
        { id: uid(), type: 'text' as const, name: 'Scan Hint', x: 10, y: 46, width: 65, height: 5, locked: false, content: 'Scan to explore', fontFamily: 'Urbanist', fontSize: 6, fontWeight: '400', color: '#8C7667', textAlign: 'center' as const },
      ]
    })
  },
  {
    name: 'Cream Card',
    icon: 'bi-credit-card',
    desc: '85 × 54 mm · Cream · Gold brackets · Dark QR',
    create: () => ({
      name: 'Cream Card', widthMm: 85, heightMm: 54,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 85, height: 54, locked: true, fill: '#F5F2EE', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        ...makeBrackets(85, 54, 6.5, 3.5, '#BB9057'),
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 29.5, y: 10, width: 26, height: 26, locked: false, fgColor: '#1A1410', bgColor: '#F5F2EE', margin: 0, errorLevel: 'H' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Vendor Name', x: 10, y: 39, width: 65, height: 7, locked: false, content: 'Vendor Name', fontFamily: 'Urbanist', fontSize: 9, fontWeight: '600', color: '#1A1410', textAlign: 'center' as const },
        { id: uid(), type: 'text' as const, name: 'Scan Hint', x: 10, y: 46, width: 65, height: 5, locked: false, content: 'Scan to explore', fontFamily: 'Urbanist', fontSize: 6, fontWeight: '400', color: '#8C7667', textAlign: 'center' as const },
      ]
    })
  },
  {
    name: 'Gold Strip Card',
    icon: 'bi-stripe',
    desc: '85 × 54 mm · Cream · Solid gold footer strip',
    create: () => ({
      name: 'Gold Strip Card', widthMm: 85, heightMm: 54,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 85, height: 54, locked: true, fill: '#F5F2EE', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'rect' as const, name: 'Gold Footer', x: 0, y: 43, width: 85, height: 11, locked: true, fill: '#BD945A', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        ...makeBrackets(85, 43, 6, 3.5, '#1A1410'),
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 29.5, y: 9, width: 26, height: 26, locked: false, fgColor: '#1A1410', bgColor: '#F5F2EE', margin: 0, errorLevel: 'H' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Vendor Name', x: 5, y: 37.5, width: 75, height: 4.5, locked: false, content: 'Vendor Name', fontFamily: 'Urbanist', fontSize: 6, fontWeight: '600', color: '#8C7667', textAlign: 'center' as const },
        { id: uid(), type: 'text' as const, name: 'Scan Label', x: 5, y: 45.5, width: 75, height: 6, locked: false, content: 'SCAN TO EXPLORE', fontFamily: 'Urbanist', fontSize: 7, fontWeight: '700', color: '#1A1410', textAlign: 'center' as const },
      ]
    })
  },

  // ── Square format (80 × 80 mm) ─────────────────────────────────────────────
  {
    name: 'Dark Square',
    icon: 'bi-moon-fill',
    desc: '80 × 80 mm · Near-black · Gold brackets · Cream QR',
    create: () => ({
      name: 'Dark Square', widthMm: 80, heightMm: 80,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 80, height: 80, locked: true, fill: '#1A1410', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        ...makeBrackets(80, 80, 7, 4, '#C79C62'),
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 15, y: 14, width: 50, height: 50, locked: false, fgColor: '#F5F2EE', bgColor: '#1A1410', margin: 0, errorLevel: 'H' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Vendor Name', x: 5, y: 67, width: 70, height: 8, locked: false, content: 'Vendor Name', fontFamily: 'Urbanist', fontSize: 9, fontWeight: '500', color: '#F5F2EE', textAlign: 'center' as const },
      ]
    })
  },
  {
    name: 'Cream Square',
    icon: 'bi-square',
    desc: '80 × 80 mm · Cream · Gold brackets · Dark QR',
    create: () => ({
      name: 'Cream Square', widthMm: 80, heightMm: 80,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 80, height: 80, locked: true, fill: '#F5F2EE', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        ...makeBrackets(80, 80, 7, 4, '#BB9057'),
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 15, y: 14, width: 50, height: 50, locked: false, fgColor: '#1A1410', bgColor: '#F5F2EE', margin: 0, errorLevel: 'H' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Vendor Name', x: 5, y: 67, width: 70, height: 8, locked: false, content: 'Vendor Name', fontFamily: 'Urbanist', fontSize: 9, fontWeight: '500', color: '#1A1410', textAlign: 'center' as const },
      ]
    })
  },

  // ── Portrait Stand (90 × 120 mm) ────────────────────────────────────────────
  {
    name: 'Dark Portrait Stand',
    icon: 'bi-phone-fill',
    desc: '90 × 120 mm · Near-black · Dark header · Logo slot',
    create: () => ({
      name: 'Dark Portrait Stand', widthMm: 90, heightMm: 120,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 90, height: 120, locked: true, fill: '#1A1410', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'rect' as const, name: 'Gold Header Rule', x: 0, y: 22, width: 90, height: 0.5, locked: true, fill: '#C79C62', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        ...makeBrackets(90, 120, 8, 5, '#C79C62'),
        { id: uid(), type: 'image' as const, name: 'Logo (paste URL)', x: 29, y: 5, width: 32, height: 13, locked: false, src: '', objectFit: 'contain' as const, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 17.5, y: 27, width: 55, height: 55, locked: false, fgColor: '#F5F2EE', bgColor: '#1A1410', margin: 0, errorLevel: 'H' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Event Name', x: 5, y: 86, width: 80, height: 12, locked: false, content: 'Event Name', fontFamily: 'Rufina', fontSize: 14, fontWeight: '700', color: '#F5F2EE', textAlign: 'center' as const },
        { id: uid(), type: 'text' as const, name: 'Scan Hint', x: 5, y: 101, width: 80, height: 8, locked: false, content: 'Scan for menu & details', fontFamily: 'Urbanist', fontSize: 8, fontWeight: '400', color: '#8C7667', textAlign: 'center' as const },
      ]
    })
  },
  {
    name: 'Cream Portrait Stand',
    icon: 'bi-phone',
    desc: '90 × 120 mm · Cream · Dark header · Logo slot',
    create: () => ({
      name: 'Cream Portrait Stand', widthMm: 90, heightMm: 120,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 90, height: 120, locked: true, fill: '#F5F2EE', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'rect' as const, name: 'Dark Header', x: 0, y: 0, width: 90, height: 22, locked: true, fill: '#1A1410', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'rect' as const, name: 'Gold Header Rule', x: 0, y: 22, width: 90, height: 0.5, locked: true, fill: '#BB9057', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        ...makeBrackets(90, 120, 8, 5, '#BB9057'),
        { id: uid(), type: 'image' as const, name: 'Logo (paste URL)', x: 29, y: 5, width: 32, height: 13, locked: false, src: '', objectFit: 'contain' as const, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 17.5, y: 27, width: 55, height: 55, locked: false, fgColor: '#1A1410', bgColor: '#F5F2EE', margin: 0, errorLevel: 'H' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Event Name', x: 5, y: 86, width: 80, height: 12, locked: false, content: 'Event Name', fontFamily: 'Rufina', fontSize: 14, fontWeight: '700', color: '#1A1410', textAlign: 'center' as const },
        { id: uid(), type: 'text' as const, name: 'Scan Hint', x: 5, y: 101, width: 80, height: 8, locked: false, content: 'Scan for menu & details', fontFamily: 'Urbanist', fontSize: 8, fontWeight: '400', color: '#8C7667', textAlign: 'center' as const },
      ]
    })
  },

  // ── Mini Square (60 × 60 mm) ───────────────────────────────────────────────
  {
    name: 'Dark Mini',
    icon: 'bi-aspect-ratio-fill',
    desc: '60 × 60 mm · Near-black · Compact acrylic',
    create: () => ({
      name: 'Dark Mini', widthMm: 60, heightMm: 60,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 60, height: 60, locked: true, fill: '#1A1410', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        ...makeBrackets(60, 60, 6, 3.5, '#C79C62'),
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 11, y: 11, width: 38, height: 38, locked: false, fgColor: '#F5F2EE', bgColor: '#1A1410', margin: 0, errorLevel: 'H' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Vendor Name', x: 3, y: 51.5, width: 54, height: 6, locked: false, content: 'Vendor Name', fontFamily: 'Urbanist', fontSize: 7.5, fontWeight: '500', color: '#F5F2EE', textAlign: 'center' as const },
      ]
    })
  },

  // ── Label / Sticker (70 × 30 mm) ───────────────────────────────────────────
  {
    name: 'Cream Label',
    icon: 'bi-tag-fill',
    desc: '70 × 30 mm · Cream · QR left · Name right',
    create: () => ({
      name: 'Cream Label', widthMm: 70, heightMm: 30,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 70, height: 30, locked: true, fill: '#F5F2EE', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        ...makeBrackets(70, 30, 5, 3, '#BB9057', 0.4),
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 4, y: 5, width: 20, height: 20, locked: false, fgColor: '#1A1410', bgColor: '#F5F2EE', margin: 0, errorLevel: 'H' as const, borderRadius: 0 },
        { id: uid(), type: 'rect' as const, name: 'Gold Divider', x: 27, y: 4, width: 0.4, height: 22, locked: true, fill: '#BB9057', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'text' as const, name: 'Vendor Name', x: 29.5, y: 7.5, width: 36, height: 8, locked: false, content: 'Vendor Name', fontFamily: 'Urbanist', fontSize: 8, fontWeight: '600', color: '#1A1410', textAlign: 'left' as const },
        { id: uid(), type: 'text' as const, name: 'Scan Text', x: 29.5, y: 17, width: 36, height: 6, locked: false, content: 'Scan for menu', fontFamily: 'Urbanist', fontSize: 6.5, fontWeight: '400', color: '#8C7667', textAlign: 'left' as const },
      ]
    })
  },

  // ── Large Display (100 × 140 mm) ────────────────────────────────────────────
  {
    name: 'Dark Display',
    icon: 'bi-display-fill',
    desc: '100 × 140 mm · Near-black · Large event display',
    create: () => ({
      name: 'Dark Display', widthMm: 100, heightMm: 140,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 100, height: 140, locked: true, fill: '#1A1410', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'rect' as const, name: 'Gold Header Rule', x: 0, y: 28, width: 100, height: 0.6, locked: true, fill: '#C79C62', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'rect' as const, name: 'Gold Footer Rule', x: 0, y: 131.4, width: 100, height: 0.6, locked: true, fill: '#C79C62', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        ...makeBrackets(100, 140, 9, 5.5, '#C79C62'),
        { id: uid(), type: 'image' as const, name: 'Logo (paste URL)', x: 33, y: 7.5, width: 34, height: 14, locked: false, src: '', objectFit: 'contain' as const, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 17.5, y: 34, width: 65, height: 65, locked: false, fgColor: '#F5F2EE', bgColor: '#1A1410', margin: 0, errorLevel: 'H' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Event Name', x: 6, y: 103, width: 88, height: 16, locked: false, content: 'Event Name', fontFamily: 'Rufina', fontSize: 17, fontWeight: '700', color: '#F5F2EE', textAlign: 'center' as const },
        { id: uid(), type: 'text' as const, name: 'Scan Hint', x: 6, y: 121, width: 88, height: 8, locked: false, content: 'Scan for menu & details', fontFamily: 'Urbanist', fontSize: 8.5, fontWeight: '400', color: '#8C7667', textAlign: 'center' as const },
      ]
    })
  },
];
const EXPORT_DPI = 300;
const EXPORT_SCALE = EXPORT_DPI / 25.4; // px per mm for export (~11.81)
const HANDLE_SIZE = 8;

function uid() { return Math.random().toString(36).slice(2, 9); }

function adminUrl(path: string) { return `${API_BASE_URL}/admin${path}`; }

// ─── State ────────────────────────────────────────────────────────────────────

const view = ref<'list' | 'editor'>('list');
const templates = ref<QrTemplate[]>([]);
const saving = ref(false);
const leftPanelOpen = ref(true);
const rightPanelOpen = ref(true);
const saveStatus = ref<'' | 'saved' | 'error'>('');
const zoom = ref(1.0);
const unit = ref<Unit>('mm');
const selectedId = ref<string | null>(null);
const qrPreviews = ref<Record<string, string>>({});

const tpl = reactive<QrTemplate>({
  name: 'New Template',
  widthMm: 85,
  heightMm: 54,
  elements: [],
});

// Undo history
const history = ref<string[]>([]);
const historyIndex = ref(-1);

// Preview modal state
const showPreview = ref(false);
const previewQrValue = ref('https://peshkash.com');
const previewDataUrl = ref('');
const previewRendering = ref(false);

// Drag state
let dragEl: TemplateEl | null = null;
let dragStartClient = { x: 0, y: 0 };
let dragOrigPos = { x: 0, y: 0 };

// Resize state
let resizeEl: TemplateEl | null = null;
let resizeHandle: ResizeHandle | null = null;
let resizeStartClient = { x: 0, y: 0 };
let resizeOrig = { x: 0, y: 0, w: 0, h: 0 };

// ─── Computed ─────────────────────────────────────────────────────────────────

const displayScale = computed(() => BASE_SCALE * zoom.value);

const selectedEl = computed(() =>
  selectedId.value ? tpl.elements.find(e => e.id === selectedId.value) ?? null : null
);

const canvasStyle = computed(() => ({
  width: `${tpl.widthMm * displayScale.value}px`,
  height: `${tpl.heightMm * displayScale.value}px`,
  position: 'relative' as const,
}));

// ─── Unit helpers ─────────────────────────────────────────────────────────────

function fromMm(mm: number): string {
  if (unit.value === 'cm') return (mm / 10).toFixed(1);
  if (unit.value === 'in') return (mm / 25.4).toFixed(2);
  return mm.toFixed(1);
}

function toMm(val: string | number): number {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n) || n < 0) return 0;
  if (unit.value === 'cm') return n * 10;
  if (unit.value === 'in') return n * 25.4;
  return n;
}

function unitLabel() { return unit.value; }

// ─── History ──────────────────────────────────────────────────────────────────

function pushHistory() {
  const snap = JSON.stringify(tpl.elements);
  history.value = history.value.slice(0, historyIndex.value + 1);
  history.value.push(snap);
  if (history.value.length > 40) history.value.shift();
  historyIndex.value = history.value.length - 1;
}

function undo() {
  if (historyIndex.value > 0) {
    historyIndex.value--;
    tpl.elements = JSON.parse(history.value[historyIndex.value]);
    selectedId.value = null;
  }
}

function redo() {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++;
    tpl.elements = JSON.parse(history.value[historyIndex.value]);
    selectedId.value = null;
  }
}

// ─── QR Preview ───────────────────────────────────────────────────────────────

async function generateQrPreview(el: QrEl) {
  try {
    const previewSize = 200;
    const qCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qCanvas, 'peshkash-preview', {
      width: previewSize,
      margin: el.margin,
      color: { dark: el.fgColor, light: el.bgColor === 'transparent' ? '#ffffff' : el.bgColor },
      errorCorrectionLevel: 'H', // always H so logo fits
    });
    // Overlay Peshkash mark (non-editable)
    const ctx = qCanvas.getContext('2d')!;
    drawPeshkashMark(ctx, previewSize / 2, previewSize / 2, previewSize * 0.22);
    qrPreviews.value[el.id] = qCanvas.toDataURL('image/png');
  } catch { /* ignore */ }
}

watch(
  () => tpl.elements.filter(e => e.type === 'qr') as QrEl[],
  (qrEls) => { qrEls.forEach(generateQrPreview); },
  { deep: true, immediate: true }
);

// ─── Element factory ──────────────────────────────────────────────────────────

function makeQr(): QrEl {
  const cx = tpl.widthMm / 2 - 15;
  const cy = tpl.heightMm / 2 - 15;
  return { id: uid(), type: 'qr', name: 'QR Code', x: cx, y: cy, width: 30, height: 30, locked: false, fgColor: '#1A1410', bgColor: '#F5F2EE', margin: 1, errorLevel: 'H', borderRadius: 0 };
}

function makeText(): TextEl {
  return { id: uid(), type: 'text', name: 'Text', x: 5, y: tpl.heightMm - 12, width: tpl.widthMm - 10, height: 8, locked: false, content: 'Vendor Name', fontFamily: 'Urbanist', fontSize: 10, fontWeight: '500', color: '#1A1410', textAlign: 'center' };
}

function makeImage(): ImageEl {
  return { id: uid(), type: 'image', name: 'Logo', x: 3, y: 3, width: 20, height: 12, locked: false, src: '', objectFit: 'contain', borderRadius: 0, opacity: 1 };
}

function makeRect(): RectEl {
  return { id: uid(), type: 'rect', name: 'Shape', x: 0, y: 0, width: tpl.widthMm, height: tpl.heightMm, locked: false, fill: '#F5F2EE', stroke: '#BD945A', strokeWidth: 0, borderRadius: 0, opacity: 1 };
}

function addElement(type: ElementType) {
  let el: TemplateEl;
  if (type === 'qr') el = makeQr();
  else if (type === 'text') el = makeText();
  else if (type === 'image') el = makeImage();
  else el = makeRect();
  tpl.elements.push(el);
  selectedId.value = el.id;
  if (type === 'qr') generateQrPreview(el as QrEl);
  pushHistory();
}

function deleteSelected() {
  if (!selectedId.value) return;
  const idx = tpl.elements.findIndex(e => e.id === selectedId.value);
  if (idx >= 0) {
    tpl.elements.splice(idx, 1);
    selectedId.value = null;
    pushHistory();
  }
}

function moveLayer(id: string, dir: -1 | 1) {
  const idx = tpl.elements.findIndex(e => e.id === id);
  const target = idx + dir;
  if (target < 0 || target >= tpl.elements.length) return;
  const tmp = tpl.elements[idx];
  tpl.elements[idx] = tpl.elements[target];
  tpl.elements[target] = tmp;
  pushHistory();
}

// ─── Drag ─────────────────────────────────────────────────────────────────────

function startDrag(e: PointerEvent, el: TemplateEl) {
  if (el.locked) { selectedId.value = el.id; return; }
  e.preventDefault();
  selectedId.value = el.id;
  dragEl = el;
  dragStartClient = { x: e.clientX, y: e.clientY };
  dragOrigPos = { x: el.x, y: el.y };
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragEnd, { once: true });
}

function onDragMove(e: PointerEvent) {
  if (!dragEl) return;
  const dx = (e.clientX - dragStartClient.x) / displayScale.value;
  const dy = (e.clientY - dragStartClient.y) / displayScale.value;
  dragEl.x = Math.max(0, Math.min(tpl.widthMm - dragEl.width, dragOrigPos.x + dx));
  dragEl.y = Math.max(0, Math.min(tpl.heightMm - dragEl.height, dragOrigPos.y + dy));
}

function onDragEnd() {
  window.removeEventListener('pointermove', onDragMove);
  if (dragEl) pushHistory();
  dragEl = null;
}

// ─── Resize ───────────────────────────────────────────────────────────────────

function startResize(e: PointerEvent, el: TemplateEl, handle: ResizeHandle) {
  e.preventDefault();
  e.stopPropagation();
  resizeEl = el;
  resizeHandle = handle;
  resizeStartClient = { x: e.clientX, y: e.clientY };
  resizeOrig = { x: el.x, y: el.y, w: el.width, h: el.height };
  window.addEventListener('pointermove', onResizeMove);
  window.addEventListener('pointerup', onResizeEnd, { once: true });
}

function onResizeMove(e: PointerEvent) {
  if (!resizeEl || !resizeHandle) return;
  const dx = (e.clientX - resizeStartClient.x) / displayScale.value;
  const dy = (e.clientY - resizeStartClient.y) / displayScale.value;
  const MIN = 5;
  let { x, y, w, h } = resizeOrig;

  if (resizeHandle.includes('e')) w = Math.max(MIN, w + dx);
  if (resizeHandle.includes('s')) h = Math.max(MIN, h + dy);
  if (resizeHandle.includes('w')) { const nw = Math.max(MIN, w - dx); x = x + (w - nw); w = nw; }
  if (resizeHandle.includes('n')) { const nh = Math.max(MIN, h - dy); y = y + (h - nh); h = nh; }

  resizeEl.x = Math.max(0, x);
  resizeEl.y = Math.max(0, y);
  resizeEl.width = w;
  resizeEl.height = h;
}

function onResizeEnd() {
  window.removeEventListener('pointermove', onResizeMove);
  if (resizeEl) pushHistory();
  resizeEl = null;
  resizeHandle = null;
}

// ─── Element style for canvas ─────────────────────────────────────────────────

function elStyle(el: TemplateEl): Record<string, string> {
  const s = displayScale.value;
  const base: Record<string, string> = {
    position: 'absolute',
    left: `${el.x * s}px`,
    top: `${el.y * s}px`,
    width: `${el.width * s}px`,
    height: `${el.height * s}px`,
    boxSizing: 'border-box',
    userSelect: 'none',
    cursor: el.locked ? 'default' : 'move',
  };
  if (el.type === 'rect') {
    const r = el as RectEl;
    base.background = r.fill;
    base.borderRadius = `${r.borderRadius * s}px`;
    base.opacity = String(r.opacity);
    if (r.strokeWidth > 0) base.border = `${r.strokeWidth * s}px solid ${r.stroke}`;
  }
  if (el.type === 'text') {
    const t = el as TextEl;
    base.color = t.color;
    base.fontFamily = t.fontFamily;
    base.fontSize = `${t.fontSize * (s / BASE_SCALE)}px`;
    base.fontWeight = t.fontWeight;
    base.textAlign = t.textAlign;
    base.display = 'flex';
    base.alignItems = 'center';
    base.overflow = 'hidden';
    base.whiteSpace = 'pre-wrap';
    base.wordBreak = 'break-word';
    base.justifyContent = t.textAlign === 'right' ? 'flex-end' : t.textAlign === 'center' ? 'center' : 'flex-start';
  }
  if (el.type === 'image') {
    const img = el as ImageEl;
    base.borderRadius = `${img.borderRadius * s}px`;
    base.opacity = String(img.opacity);
    base.overflow = 'hidden';
  }
  if (el.type === 'qr') {
    const q = el as QrEl;
    base.borderRadius = `${q.borderRadius * s}px`;
    base.overflow = 'hidden';
    base.background = q.bgColor;
  }
  return base;
}

// ─── Save / Load ──────────────────────────────────────────────────────────────

async function loadTemplates() {
  const { data } = await axios.get<QrTemplate[]>(adminUrl('/qr-templates'));
  templates.value = data;
}

async function saveTemplate() {
  saving.value = true;
  saveStatus.value = '';
  try {
    const payload = { name: tpl.name, widthMm: tpl.widthMm, heightMm: tpl.heightMm, elements: tpl.elements };
    if (tpl.id) {
      const { data } = await axios.put<QrTemplate>(adminUrl(`/qr-templates/${tpl.id}`), payload);
      tpl.id = data.id;
    } else {
      const { data } = await axios.post<QrTemplate>(adminUrl('/qr-templates'), payload);
      tpl.id = data.id;
    }
    saveStatus.value = 'saved';
    setTimeout(() => { saveStatus.value = ''; }, 2200);
    await loadTemplates();
  } catch {
    saveStatus.value = 'error';
  } finally {
    saving.value = false;
  }
}

async function deleteTemplate(id: number) {
  if (!confirm('Delete this template?')) return;
  await axios.delete(adminUrl(`/qr-templates/${id}`));
  await loadTemplates();
}

function openTemplate(t: QrTemplate) {
  Object.assign(tpl, { id: t.id, name: t.name, widthMm: t.widthMm, heightMm: t.heightMm, elements: JSON.parse(JSON.stringify(t.elements)) });
  selectedId.value = null;
  history.value = [JSON.stringify(tpl.elements)];
  historyIndex.value = 0;
  fitZoom();
  view.value = 'editor';
}

function newTemplate() {
  Object.assign(tpl, { id: undefined, name: 'New Template', widthMm: 85, heightMm: 54, elements: [] });
  const qr = makeQr();
  // center the QR on the default canvas
  qr.x = (85 - 30) / 2;
  qr.y = (54 - 30) / 2;
  tpl.elements.push(qr);
  generateQrPreview(qr);
  selectedId.value = null;
  history.value = [JSON.stringify(tpl.elements)];
  historyIndex.value = 0;
  fitZoom();
  view.value = 'editor';
}

function backToList() {
  view.value = 'list';
  loadTemplates();
}

function startFromPreset(preset: PresetTemplate) {
  const t = preset.create();
  Object.assign(tpl, { id: undefined, name: t.name, widthMm: t.widthMm, heightMm: t.heightMm, elements: t.elements });
  selectedId.value = null;
  history.value = [JSON.stringify(tpl.elements)];
  historyIndex.value = 0;
  tpl.elements.filter(e => e.type === 'qr').forEach(e => generateQrPreview(e as QrEl));
  fitZoom();
  view.value = 'editor';
}

// ─── Zoom ─────────────────────────────────────────────────────────────────────

const canvasAreaRef = ref<HTMLElement | null>(null);

function fitZoom() {
  nextTick(() => {
    const el = canvasAreaRef.value;
    if (!el) return;
    const aw = el.clientWidth - 80;
    const ah = el.clientHeight - 80;
    const sw = aw / (tpl.widthMm * BASE_SCALE);
    const sh = ah / (tpl.heightMm * BASE_SCALE);
    zoom.value = Math.min(1, Math.round(Math.min(sw, sh) * 20) / 20);
  });
}

function setZoom(z: number) {
  zoom.value = Math.max(0.25, Math.min(3, z));
}

function applyPreset(p: typeof PRESETS[0]) {
  if (!p.w) return;
  tpl.widthMm = p.w;
  tpl.heightMm = p.h;
  fitZoom();
}

// ─── Render / Export ─────────────────────────────────────────────────────────

async function renderToCanvas(canvas: HTMLCanvasElement, qrValue: string): Promise<void> {
  const pw = Math.round(tpl.widthMm * EXPORT_SCALE);
  const ph = Math.round(tpl.heightMm * EXPORT_SCALE);
  const FOOTER_H = Math.round(6 * EXPORT_SCALE); // 6 mm branded footer

  canvas.width = pw;
  canvas.height = ph + FOOTER_H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, pw, ph);

  for (const el of tpl.elements) {
    if (!el) continue;
    const ex = el.x * EXPORT_SCALE;
    const ey = el.y * EXPORT_SCALE;
    const ew = el.width * EXPORT_SCALE;
    const eh = el.height * EXPORT_SCALE;

    ctx.save();
    ctx.globalAlpha = ('opacity' in el && typeof el.opacity === 'number') ? (el.opacity as number) : 1;

    if (el.type === 'rect') {
      const r = el as RectEl;
      const br = r.borderRadius * EXPORT_SCALE;
      ctx.beginPath();
      ctx.roundRect(ex, ey, ew, eh, br);
      ctx.fillStyle = r.fill;
      ctx.fill();
      if (r.strokeWidth > 0) {
        ctx.strokeStyle = r.stroke;
        ctx.lineWidth = r.strokeWidth * EXPORT_SCALE;
        ctx.stroke();
      }
    } else if (el.type === 'text') {
      const t = el as TextEl;
      const fs = t.fontSize * (EXPORT_SCALE / BASE_SCALE);
      ctx.font = `${t.fontWeight} ${fs}px ${t.fontFamily}, sans-serif`;
      ctx.fillStyle = t.color;
      ctx.textAlign = t.textAlign;
      ctx.textBaseline = 'middle';
      const tx = t.textAlign === 'center' ? ex + ew / 2 : t.textAlign === 'right' ? ex + ew : ex;
      ctx.fillText(t.content, tx, ey + eh / 2, ew);
    } else if (el.type === 'image') {
      const img = el as ImageEl;
      if (img.src) {
        await new Promise<void>(resolve => {
          const i = new Image();
          i.crossOrigin = 'anonymous';
          i.onload = () => { ctx.drawImage(i, ex, ey, ew, eh); resolve(); };
          i.onerror = () => resolve();
          i.src = img.src;
        });
      }
    } else if (el.type === 'qr') {
      const q = el as QrEl;
      const qCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qCanvas, qrValue, {
        width: ew,
        margin: q.margin,
        color: { dark: q.fgColor, light: q.bgColor === 'transparent' ? '#ffffff' : q.bgColor },
        errorCorrectionLevel: 'H', // always H to allow logo overlay
      });
      const br = q.borderRadius * EXPORT_SCALE;
      if (br > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(ex, ey, ew, eh, br);
        ctx.clip();
      }
      ctx.drawImage(qCanvas, ex, ey, ew, eh);
      if (br > 0) ctx.restore();
      // Non-editable Peshkash mark centred on QR
      ctx.globalAlpha = 1;
      drawPeshkashMark(ctx, ex + ew / 2, ey + eh / 2, ew * 0.22);
    }
    ctx.restore();
  }

  // ── Branded footer strip ──────────────────────────────────────────────────
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#f5f1eb';
  ctx.fillRect(0, ph, pw, FOOTER_H);
  ctx.fillStyle = '#e0d4be';
  ctx.fillRect(0, ph, pw, Math.ceil(EXPORT_SCALE * 0.2));

  const markH = FOOTER_H * 0.52;
  const markCX = FOOTER_H * 0.72;
  const markCY = ph + FOOTER_H / 2;
  drawPeshkashMark(ctx, markCX, markCY, markH);

  const textX = markCX + markH * 0.65;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = `400 ${Math.round(FOOTER_H * 0.24)}px Arial, sans-serif`;
  ctx.fillStyle = '#9a8870';
  ctx.fillText('powered by', textX, ph + FOOTER_H * 0.42);
  ctx.font = `600 ${Math.round(FOOTER_H * 0.38)}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = '#BD945A';
  ctx.fillText('peshkash', textX, ph + FOOTER_H * 0.78);
}

async function exportPng(qrValue = 'https://peshkash.com') {
  const canvas = document.createElement('canvas');
  await renderToCanvas(canvas, qrValue);
  const link = document.createElement('a');
  link.download = `${tpl.name.replace(/\s+/g, '-').toLowerCase()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ─── Preview ──────────────────────────────────────────────────────────────────

async function openPreview() {
  showPreview.value = true;
  await renderPreview();
}

async function renderPreview() {
  previewRendering.value = true;
  try {
    const canvas = document.createElement('canvas');
    await renderToCanvas(canvas, previewQrValue.value || 'https://peshkash.com');
    previewDataUrl.value = canvas.toDataURL('image/png');
  } finally {
    previewRendering.value = false;
  }
}

function downloadPreview() {
  const link = document.createElement('a');
  link.download = `${tpl.name.replace(/\s+/g, '-').toLowerCase()}-preview.png`;
  link.href = previewDataUrl.value;
  link.click();
}

// ─── Keyboard ─────────────────────────────────────────────────────────────────

function onKeydown(e: KeyboardEvent) {
  if (view.value !== 'editor') return;
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

  if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveTemplate(); }
  if (e.key === 'Escape') selectedId.value = null;
}

onMounted(() => {
  loadTemplates();
  window.addEventListener('keydown', onKeydown);
});
onUnmounted(() => { window.removeEventListener('keydown', onKeydown); });
</script>

<template>
  <!-- ── LIST VIEW ─────────────────────────────────────────── -->
  <div v-if="view === 'list'" class="qrt-list-page" :class="{ 'qrt-list-page--embedded': props.embedded }">

    <!-- Hero banner -->
    <div class="qrt-hero">
      <!-- Decorative corner brackets -->
      <svg class="qrt-hero-bracket qrt-hero-bracket--tl" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M2 16 L2 2 L16 2" stroke="#C79C62" stroke-width="1.8" fill="none" stroke-linecap="square" stroke-linejoin="miter"/></svg>
      <svg class="qrt-hero-bracket qrt-hero-bracket--tr" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M16 2 L30 2 L30 16" stroke="#C79C62" stroke-width="1.8" fill="none" stroke-linecap="square" stroke-linejoin="miter"/></svg>
      <svg class="qrt-hero-bracket qrt-hero-bracket--bl" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M2 16 L2 30 L16 30" stroke="#C79C62" stroke-width="1.8" fill="none" stroke-linecap="square" stroke-linejoin="miter"/></svg>
      <svg class="qrt-hero-bracket qrt-hero-bracket--br" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="32" height="32"><path d="M16 30 L30 30 L30 16" stroke="#C79C62" stroke-width="1.8" fill="none" stroke-linecap="square" stroke-linejoin="miter"/></svg>

      <div class="qrt-hero-mark">
        <svg viewBox="235 95 360 380" xmlns="http://www.w3.org/2000/svg" height="64" width="46">
          <polygon points="391.5,164 471,164 516,205 391.5,276.5" fill="#E8DBCE"/>
          <polygon points="516,205 516,262.5 470.5,310 391.5,276.5" fill="#C5AF9D"/>
          <polygon points="391.5,276.5 470.5,310 391.5,310" fill="#8C7667"/>
          <polygon points="335,164 392,164 392,415 364,389 335,415" fill="#BB9057"/>
        </svg>
      </div>
      <div class="qrt-hero-text">
        <div class="qrt-hero-eyebrow">QR Template Studio</div>
        <h2>Design once.<br>Print everywhere.</h2>
        <p>Every template ships with the Peshkash brand mark — 300 DPI, print-ready. The only thing vendors get from you physically, should look the part.</p>
      </div>
      <button class="btn btn-primary qrt-hero-cta" @click="newTemplate">
        <i class="bi bi-plus-lg"></i> Blank Canvas
      </button>
    </div>

    <!-- Presets -->
    <div class="qrt-presets-section">
      <div class="qrt-section-header">
        <div>
          <p class="qrt-section-title">Template Library</p>
          <p class="qrt-section-sub">{{ PRESET_TEMPLATES.length }} print-ready designs — all brand-framed with corner brackets at 300 DPI</p>
        </div>
      </div>
      <div class="qrt-presets-grid">
        <div v-for="p in PRESET_TEMPLATES" :key="p.name" class="qrt-preset-card" @click="startFromPreset(p)">
          <!-- Real layout preview thumbnail -->
          <div class="qrt-preset-visual-wrap">
            <div
              class="qrt-preset-visual"
              :style="{ aspectRatio: `${p.create().widthMm} / ${p.create().heightMm}` }"
            >
              <div v-for="el in p.create().elements" :key="el.id" :style="miniElStyle(el, p.create())"></div>
            </div>
          </div>
          <div class="qrt-preset-info">
            <strong>{{ p.name }}</strong>
            <span>{{ p.desc }}</span>
          </div>
          <div class="qrt-preset-cta">
            <i class="bi bi-pencil-square"></i> Customise
          </div>
        </div>
      </div>
    </div>

    <!-- Saved templates -->
    <div v-if="templates.length > 0" class="qrt-saved-section" style="padding: 0 40px;">
      <p class="qrt-section-title"><i class="bi bi-folder2-open"></i> Your templates</p>
      <div class="qrt-grid">
        <div v-for="t in templates" :key="t.id" class="qrt-card" @click="openTemplate(t)">
          <div class="qrt-card-thumb">
            <div class="qrt-card-canvas-preview" :style="{ aspectRatio: `${t.widthMm} / ${t.heightMm}` }">
              <i class="bi bi-qr-code qrt-thumb-icon"></i>
            </div>
          </div>
          <div class="qrt-card-info">
            <strong>{{ t.name }}</strong>
            <span class="qrt-card-size">{{ t.widthMm }} × {{ t.heightMm }} mm · {{ (t.elements ?? []).length }} element{{ (t.elements ?? []).length !== 1 ? 's' : '' }}</span>
          </div>
          <div class="qrt-card-actions">
            <button class="qrt-icon-btn" title="Open" @click.stop="openTemplate(t)"><i class="bi bi-pencil"></i></button>
            <button class="qrt-icon-btn danger" title="Delete" @click.stop="deleteTemplate(t.id!)"><i class="bi bi-trash3"></i></button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── EDITOR VIEW ────────────────────────────────────────── -->
  <div v-else class="qrt-editor" :class="{ 'qrt-editor--embedded': props.embedded }">

    <!-- Header -->
    <header class="qrt-header">
      <button class="qrt-back-btn" @click="backToList"><i class="bi bi-arrow-left"></i></button>
      <div class="qrt-header-brand">
        <svg viewBox="235 95 360 380" xmlns="http://www.w3.org/2000/svg" height="18" width="13">
          <polygon points="391.5,164 471,164 516,205 391.5,276.5" fill="#E8DBCE"/>
          <polygon points="516,205 516,262.5 470.5,310 391.5,276.5" fill="#C5AF9D"/>
          <polygon points="391.5,276.5 470.5,310 391.5,310" fill="#8C7667"/>
          <polygon points="335,164 392,164 392,415 364,389 335,415" fill="#BB9057"/>
        </svg>
      </div>
      <input v-model="tpl.name" class="qrt-name-input" placeholder="Design name" spellcheck="false" />
      <div class="qrt-header-actions">
        <!-- Panel toggles (visible on tablet/mobile only) -->
        <button class="qrt-icon-btn qrt-panel-btn" :class="{ active: leftPanelOpen }" title="Toggle layers panel" @click="leftPanelOpen = !leftPanelOpen"><i class="bi bi-layout-sidebar"></i></button>
        <button class="qrt-icon-btn qrt-panel-btn" :class="{ active: rightPanelOpen }" title="Toggle properties panel" @click="rightPanelOpen = !rightPanelOpen"><i class="bi bi-layout-sidebar-reverse"></i></button>
        <span v-if="saveStatus === 'saved'" class="qrt-save-status saved"><i class="bi bi-check2"></i> Saved</span>
        <span v-if="saveStatus === 'error'" class="qrt-save-status error"><i class="bi bi-exclamation-triangle"></i> Error</span>
        <button class="qrt-icon-btn" title="Undo (Ctrl+Z)" :disabled="historyIndex <= 0" @click="undo"><i class="bi bi-arrow-counterclockwise"></i></button>
        <button class="qrt-icon-btn" title="Redo (Ctrl+Y)" :disabled="historyIndex >= history.length - 1" @click="redo"><i class="bi bi-arrow-clockwise"></i></button>
        <button class="btn btn-outline-secondary btn-sm" @click="openPreview"><i class="bi bi-eye"></i> Preview</button>
        <button class="btn btn-outline-secondary btn-sm qrt-desktop-btn" @click="() => exportPng()"><i class="bi bi-download"></i> Export PNG</button>
        <button class="btn btn-primary btn-sm" :disabled="saving" @click="saveTemplate">
          <i class="bi bi-floppy2"></i> {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </header>

    <div class="qrt-body">

      <!-- Left Sidebar: elements + layers -->
      <aside class="qrt-sidebar-left" :class="{ 'panel-hidden': !leftPanelOpen }">
        <p class="qrt-sidebar-section-label">Add Element</p>
        <div class="qrt-add-grid">
          <button class="qrt-add-btn" @click="addElement('qr')"><i class="bi bi-qr-code"></i><span>QR Code</span><span class="qrt-add-hint">scannable</span></button>
          <button class="qrt-add-btn" @click="addElement('text')"><i class="bi bi-type"></i><span>Text</span><span class="qrt-add-hint">label</span></button>
          <button class="qrt-add-btn" @click="addElement('image')"><i class="bi bi-image"></i><span>Logo</span><span class="qrt-add-hint">url</span></button>
          <button class="qrt-add-btn" @click="addElement('rect')"><i class="bi bi-square"></i><span>Shape</span><span class="qrt-add-hint">block</span></button>
        </div>

        <p class="qrt-sidebar-section-label">Layers <span class="qrt-layer-count">{{ tpl.elements.length }}</span></p>
        <div class="qrt-layers">
          <div
            v-for="(el, idx) in [...tpl.elements].reverse()"
            :key="el.id"
            class="qrt-layer-row"
            :class="{ selected: selectedId === el.id }"
            @click="selectedId = el.id"
          >
            <i :class="{ 'bi bi-qr-code': el.type === 'qr', 'bi bi-type': el.type === 'text', 'bi bi-image': el.type === 'image', 'bi bi-square': el.type === 'rect' }"></i>
            <span class="qrt-layer-name">{{ el.name }}</span>
            <div class="qrt-layer-btns">
              <button class="qrt-layer-btn" title="Move up" @click.stop="moveLayer(el.id, 1)"><i class="bi bi-chevron-up"></i></button>
              <button class="qrt-layer-btn" title="Move down" @click.stop="moveLayer(el.id, -1)"><i class="bi bi-chevron-down"></i></button>
            </div>
          </div>
          <div v-if="tpl.elements.length === 0" class="qrt-layers-empty">No elements yet</div>
        </div>
      </aside>

      <!-- Canvas Area -->
      <div ref="canvasAreaRef" class="qrt-canvas-area" @pointerdown.self="selectedId = null">
        <div class="qrt-canvas-wrap">
          <div class="qrt-canvas" :style="canvasStyle" @pointerdown.self="selectedId = null">

            <!-- Render elements -->
            <div
              v-for="el in tpl.elements"
              :key="el.id"
              class="qrt-el"
              :class="{ 'qrt-el--selected': selectedId === el.id }"
              :style="elStyle(el)"
              @pointerdown.stop="startDrag($event, el)"
            >
              <!-- QR preview -->
              <img
                v-if="el.type === 'qr'"
                :src="qrPreviews[el.id]"
                draggable="false"
                style="width:100%;height:100%;object-fit:contain;display:block;pointer-events:none"
              />
              <!-- Text -->
              <span v-else-if="el.type === 'text'" style="pointer-events:none;padding:2px 4px;width:100%">
                {{ (el as any).content }}
              </span>
              <!-- Image -->
              <img
                v-else-if="el.type === 'image' && (el as any).src"
                :src="(el as any).src"
                :style="{ width: '100%', height: '100%', objectFit: (el as any).objectFit, display: 'block', pointerEvents: 'none' }"
                draggable="false"
              />
              <div
                v-else-if="el.type === 'image' && !(el as any).src"
                style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border:1.5px dashed #c9a96e;border-radius:3px;color:#c9a96e;font-size:0.75rem;pointer-events:none"
              >
                <i class="bi bi-image"></i>
              </div>

              <!-- Resize handles (selected only) -->
              <template v-if="selectedId === el.id && !el.locked">
                <div v-for="h in ['nw','n','ne','e','se','s','sw','w'] as ResizeHandle[]" :key="h"
                  class="qrt-handle"
                  :class="`qrt-handle--${h}`"
                  @pointerdown.stop="startResize($event, el, h)"
                ></div>
              </template>
            </div>

          </div>
          <!-- Canvas size badge -->
          <div class="qrt-canvas-badge">{{ tpl.widthMm }} × {{ tpl.heightMm }} mm</div>

          <!-- Non-editable Peshkash footer preview (matches export output) -->
          <div class="qrt-brand-footer" :style="{ width: `${tpl.widthMm * displayScale}px` }">
            <div class="qrt-brand-footer-mark">
              <svg viewBox="235 95 360 380" xmlns="http://www.w3.org/2000/svg" height="100%" width="auto" style="display:block">
                <polygon points="391.5,164 471,164 516,205 391.5,276.5" fill="#E8DBCE"/>
                <polygon points="516,205 516,262.5 470.5,310 391.5,276.5" fill="#C5AF9D"/>
                <polygon points="391.5,276.5 470.5,310 391.5,310" fill="#8C7667"/>
                <polygon points="335,164 392,164 392,415 364,389 335,415" fill="#BB9057"/>
              </svg>
            </div>
            <div class="qrt-brand-footer-text">
              <span class="qrt-brand-powered">powered by</span>
              <span class="qrt-brand-name">peshkash</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Sidebar: Properties -->
      <aside class="qrt-sidebar-right" :class="{ 'panel-hidden': !rightPanelOpen }">

        <!-- Canvas settings (always visible at top) -->
        <div class="qrt-props-group">
          <p class="qrt-props-label">Canvas</p>
          <div class="qrt-props-row">
            <label class="qrt-prop-field">
              <span>Width</span>
              <div class="qrt-unit-input">
                <input type="number" :value="fromMm(tpl.widthMm)" min="10" max="500" step="0.5"
                  @change="tpl.widthMm = toMm(($event.target as HTMLInputElement).value); fitZoom()" />
                <span>{{ unitLabel() }}</span>
              </div>
            </label>
            <label class="qrt-prop-field">
              <span>Height</span>
              <div class="qrt-unit-input">
                <input type="number" :value="fromMm(tpl.heightMm)" min="10" max="500" step="0.5"
                  @change="tpl.heightMm = toMm(($event.target as HTMLInputElement).value); fitZoom()" />
                <span>{{ unitLabel() }}</span>
              </div>
            </label>
          </div>
          <div class="qrt-props-row">
            <label class="qrt-prop-field wide">
              <span>Preset</span>
              <select class="form-control form-control-sm" @change="applyPreset(PRESETS[+($event.target as HTMLSelectElement).value])">
                <option v-for="(p, i) in PRESETS" :key="i" :value="i">{{ p.label }}</option>
              </select>
            </label>
          </div>
        </div>

        <!-- Element properties -->
        <template v-if="selectedEl">

          <!-- Common -->
          <div class="qrt-props-group">
            <p class="qrt-props-label">{{ selectedEl.name }} <span class="qrt-type-badge">{{ selectedEl.type }}</span></p>
            <div class="qrt-props-row">
              <label class="qrt-prop-field"><span>Name</span><input type="text" v-model="selectedEl.name" class="form-control form-control-sm" /></label>
            </div>
            <div class="qrt-props-row">
              <label class="qrt-prop-field">
                <span>X</span>
                <div class="qrt-unit-input">
                  <input type="number" :value="fromMm(selectedEl.x)" step="0.5"
                    @change="selectedEl!.x = toMm(($event.target as HTMLInputElement).value)" />
                  <span>{{ unitLabel() }}</span>
                </div>
              </label>
              <label class="qrt-prop-field">
                <span>Y</span>
                <div class="qrt-unit-input">
                  <input type="number" :value="fromMm(selectedEl.y)" step="0.5"
                    @change="selectedEl!.y = toMm(($event.target as HTMLInputElement).value)" />
                  <span>{{ unitLabel() }}</span>
                </div>
              </label>
            </div>
            <div class="qrt-props-row">
              <label class="qrt-prop-field">
                <span>Width</span>
                <div class="qrt-unit-input">
                  <input type="number" :value="fromMm(selectedEl.width)" min="2" step="0.5"
                    @change="selectedEl!.width = toMm(($event.target as HTMLInputElement).value)" />
                  <span>{{ unitLabel() }}</span>
                </div>
              </label>
              <label class="qrt-prop-field">
                <span>Height</span>
                <div class="qrt-unit-input">
                  <input type="number" :value="fromMm(selectedEl.height)" min="2" step="0.5"
                    @change="selectedEl!.height = toMm(($event.target as HTMLInputElement).value)" />
                  <span>{{ unitLabel() }}</span>
                </div>
              </label>
            </div>
            <div class="qrt-props-row">
              <label class="qrt-prop-field wide">
                <span>Lock position</span>
                <input type="checkbox" v-model="selectedEl.locked" />
              </label>
            </div>
          </div>

          <!-- Alignment quick actions -->
          <div class="qrt-props-group">
            <p class="qrt-props-label">Align on canvas</p>
            <div class="qrt-align-btns">
              <button title="Left" @click="selectedEl!.x = 0"><i class="bi bi-align-start"></i></button>
              <button title="Center H" @click="selectedEl!.x = (tpl.widthMm - selectedEl!.width) / 2"><i class="bi bi-align-center"></i></button>
              <button title="Right" @click="selectedEl!.x = tpl.widthMm - selectedEl!.width"><i class="bi bi-align-end"></i></button>
              <button title="Top" @click="selectedEl!.y = 0"><i class="bi bi-align-top"></i></button>
              <button title="Center V" @click="selectedEl!.y = (tpl.heightMm - selectedEl!.height) / 2"><i class="bi bi-align-middle"></i></button>
              <button title="Bottom" @click="selectedEl!.y = tpl.heightMm - selectedEl!.height"><i class="bi bi-align-bottom"></i></button>
            </div>
          </div>

          <!-- QR-specific -->
          <div v-if="selectedEl.type === 'qr'" class="qrt-props-group">
            <p class="qrt-props-label">QR Style</p>
            <div class="qrt-props-row">
              <label class="qrt-prop-field">
                <span>Foreground</span>
                <input type="color" :value="(selectedEl as QrEl).fgColor" @input="(selectedEl as QrEl).fgColor = ($event.target as HTMLInputElement).value" class="qrt-color-input" />
              </label>
              <label class="qrt-prop-field">
                <span>Background</span>
                <input type="color" :value="(selectedEl as QrEl).bgColor" @input="(selectedEl as QrEl).bgColor = ($event.target as HTMLInputElement).value" class="qrt-color-input" />
              </label>
            </div>
            <div class="qrt-props-row">
              <label class="qrt-prop-field">
                <span>Quiet zone (mm)</span>
                <input type="number" v-model.number="(selectedEl as QrEl).margin" min="0" max="10" step="0.5" class="form-control form-control-sm" />
              </label>
              <label class="qrt-prop-field">
                <span>Corner radius</span>
                <input type="number" v-model.number="(selectedEl as QrEl).borderRadius" min="0" max="20" step="0.5" class="form-control form-control-sm" />
              </label>
            </div>
            <div class="qrt-props-row">
              <label class="qrt-prop-field wide">
                <span>Error correction</span>
                <select v-model="(selectedEl as QrEl).errorLevel" class="form-control form-control-sm">
                  <option value="L">L — Low (7%)</option>
                  <option value="M">M — Medium (15%)</option>
                  <option value="Q">Q — Quartile (25%)</option>
                  <option value="H">H — High (30%)</option>
                </select>
              </label>
            </div>
          </div>

          <!-- Text-specific -->
          <div v-else-if="selectedEl.type === 'text'" class="qrt-props-group">
            <p class="qrt-props-label">Text</p>
            <label class="qrt-prop-field wide" style="margin-bottom:8px">
              <span>Content</span>
              <textarea v-model="(selectedEl as TextEl).content" class="form-control form-control-sm" rows="2"></textarea>
              <span class="input-hint">Use {{'{'}}{{'{'}}vendorName{{'}'}}{{'}'}}, {{'{'}}{{'{'}}eventName{{'}'}}{{'}'}} as placeholders</span>
            </label>
            <div class="qrt-props-row">
              <label class="qrt-prop-field wide">
                <span>Font</span>
                <select v-model="(selectedEl as TextEl).fontFamily" class="form-control form-control-sm">
                  <option v-for="f in FONTS" :key="f" :value="f">{{ f }}</option>
                </select>
              </label>
            </div>
            <div class="qrt-props-row">
              <label class="qrt-prop-field">
                <span>Size (pt)</span>
                <input type="number" v-model.number="(selectedEl as TextEl).fontSize" min="4" max="120" step="1" class="form-control form-control-sm" />
              </label>
              <label class="qrt-prop-field">
                <span>Color</span>
                <input type="color" :value="(selectedEl as TextEl).color" @input="(selectedEl as TextEl).color = ($event.target as HTMLInputElement).value" class="qrt-color-input" />
              </label>
            </div>
            <div class="qrt-props-row">
              <label class="qrt-prop-field">
                <span>Weight</span>
                <select v-model="(selectedEl as TextEl).fontWeight" class="form-control form-control-sm">
                  <option value="300">Light</option>
                  <option value="400">Regular</option>
                  <option value="500">Medium</option>
                  <option value="600">Semibold</option>
                  <option value="700">Bold</option>
                </select>
              </label>
              <label class="qrt-prop-field">
                <span>Align</span>
                <select v-model="(selectedEl as TextEl).textAlign" class="form-control form-control-sm">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
          </div>

          <!-- Image-specific -->
          <div v-else-if="selectedEl.type === 'image'" class="qrt-props-group">
            <p class="qrt-props-label">Image</p>
            <label class="qrt-prop-field wide" style="margin-bottom:8px">
              <span>Image URL</span>
              <input type="text" v-model="(selectedEl as ImageEl).src" class="form-control form-control-sm" placeholder="https://…" />
            </label>
            <div class="qrt-props-row">
              <label class="qrt-prop-field">
                <span>Fit</span>
                <select v-model="(selectedEl as ImageEl).objectFit" class="form-control form-control-sm">
                  <option value="contain">Contain</option>
                  <option value="cover">Cover</option>
                  <option value="fill">Fill</option>
                </select>
              </label>
              <label class="qrt-prop-field">
                <span>Radius (mm)</span>
                <input type="number" v-model.number="(selectedEl as ImageEl).borderRadius" min="0" max="50" step="0.5" class="form-control form-control-sm" />
              </label>
            </div>
            <div class="qrt-props-row">
              <label class="qrt-prop-field wide">
                <span>Opacity</span>
                <input type="range" v-model.number="(selectedEl as ImageEl).opacity" min="0" max="1" step="0.05" style="width:100%" />
              </label>
            </div>
          </div>

          <!-- Rect-specific -->
          <div v-else-if="selectedEl.type === 'rect'" class="qrt-props-group">
            <p class="qrt-props-label">Shape</p>
            <div class="qrt-props-row">
              <label class="qrt-prop-field">
                <span>Fill</span>
                <input type="color" :value="(selectedEl as RectEl).fill" @input="(selectedEl as RectEl).fill = ($event.target as HTMLInputElement).value" class="qrt-color-input" />
              </label>
              <label class="qrt-prop-field">
                <span>Stroke</span>
                <input type="color" :value="(selectedEl as RectEl).stroke" @input="(selectedEl as RectEl).stroke = ($event.target as HTMLInputElement).value" class="qrt-color-input" />
              </label>
            </div>
            <div class="qrt-props-row">
              <label class="qrt-prop-field">
                <span>Stroke (mm)</span>
                <input type="number" v-model.number="(selectedEl as RectEl).strokeWidth" min="0" max="10" step="0.1" class="form-control form-control-sm" />
              </label>
              <label class="qrt-prop-field">
                <span>Radius (mm)</span>
                <input type="number" v-model.number="(selectedEl as RectEl).borderRadius" min="0" max="50" step="0.5" class="form-control form-control-sm" />
              </label>
            </div>
            <div class="qrt-props-row">
              <label class="qrt-prop-field wide">
                <span>Opacity</span>
                <input type="range" v-model.number="(selectedEl as RectEl).opacity" min="0" max="1" step="0.05" style="width:100%" />
              </label>
            </div>
          </div>

          <div class="qrt-props-group">
            <button class="btn btn-sm" style="color:#c05050;border:1px solid #e8c0c0;background:transparent;width:100%" @click="deleteSelected">
              <i class="bi bi-trash3"></i> Remove element
            </button>
          </div>

        </template>

        <div v-else class="qrt-no-selection">
          <i class="bi bi-cursor-text"></i>
          <p>Click an element to edit its properties</p>
        </div>

      </aside>
    </div>

    <!-- Footer toolbar -->
    <footer class="qrt-footer">
      <div class="qrt-zoom-controls">
        <button class="qrt-icon-btn sm" @click="setZoom(zoom - 0.1)"><i class="bi bi-dash"></i></button>
        <button class="qrt-zoom-pct" @click="fitZoom">{{ Math.round(zoom * 100) }}%</button>
        <button class="qrt-icon-btn sm" @click="setZoom(zoom + 0.1)"><i class="bi bi-plus"></i></button>
        <button class="qrt-icon-btn sm" title="Fit to window" @click="fitZoom"><i class="bi bi-fullscreen-exit"></i></button>
      </div>
      <div class="qrt-unit-toggle">
        <span>Unit</span>
        <div class="qrt-unit-btns">
          <button :class="{ active: unit === 'mm' }" @click="unit = 'mm'">mm</button>
          <button :class="{ active: unit === 'cm' }" @click="unit = 'cm'">cm</button>
          <button :class="{ active: unit === 'in' }" @click="unit = 'in'">in</button>
        </div>
      </div>
      <div class="qrt-footer-hint">
        <i class="bi bi-info-circle"></i>
        300 DPI export · Peshkash mark auto-added · Del removes · Ctrl+Z undo
      </div>
    </footer>

  </div>

  <!-- ── PREVIEW MODAL ───────────────────────────────────────── -->
  <Teleport to="body">
    <div v-if="showPreview" class="qrt-preview-backdrop" @click.self="showPreview = false">
      <div class="qrt-preview-modal">
        <div class="qrt-preview-header">
          <div>
            <h3>Preview — {{ tpl.name }}</h3>
            <p class="hint">Rendered at 300 DPI. Actual print quality.</p>
          </div>
          <button class="qrt-icon-btn" @click="showPreview = false"><i class="bi bi-x-lg"></i></button>
        </div>

        <div class="qrt-preview-qr-row">
          <label class="qrt-preview-qr-label">
            <span>QR Value to preview</span>
            <input
              v-model="previewQrValue"
              class="form-control form-control-sm"
              placeholder="https://peshkash.com/your-hash"
              @change="renderPreview"
            />
          </label>
          <button class="btn btn-outline-secondary btn-sm" :disabled="previewRendering" @click="renderPreview">
            <i class="bi bi-arrow-clockwise"></i> Re-render
          </button>
        </div>

        <div class="qrt-preview-canvas-area">
          <div v-if="previewRendering" class="qrt-preview-loading">
            <peshkash-loader size="80" theme="dark" label="Rendering preview" />
          </div>
          <img v-else-if="previewDataUrl" :src="previewDataUrl" class="qrt-preview-img" :alt="`Preview of ${tpl.name}`" />
        </div>

        <div class="qrt-preview-footer">
          <span class="hint">{{ tpl.widthMm }} × {{ tpl.heightMm }} mm · {{ tpl.elements.length }} element{{ tpl.elements.length !== 1 ? 's' : '' }}</span>
          <div class="qrt-preview-footer-actions">
            <button class="btn btn-outline-secondary btn-sm" @click="showPreview = false">Close</button>
            <button class="btn btn-primary btn-sm" :disabled="!previewDataUrl" @click="downloadPreview">
              <i class="bi bi-download"></i> Download PNG
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* ─── List page ─────────────────────────────────────────────────────────────── */
.qrt-list-page {
  background: #EDE8E0;
  min-height: 100vh;
  padding: 0 0 64px;
}

.qrt-list-page--embedded {
  min-height: 0;
  height: 100%;
  overflow-y: auto;
}

/* Hero banner */
.qrt-hero {
  align-items: center;
  background: #1A1410;
  display: flex;
  gap: 28px;
  padding: 40px 48px;
  flex-wrap: wrap;
  position: relative;
  overflow: hidden;
}

/* Decorative corner brackets on the hero */
.qrt-hero-bracket {
  opacity: 0.6;
  pointer-events: none;
  position: absolute;
}
.qrt-hero-bracket--tl { top: 16px; left: 16px; }
.qrt-hero-bracket--tr { top: 16px; right: 16px; }
.qrt-hero-bracket--bl { bottom: 16px; left: 16px; }
.qrt-hero-bracket--br { bottom: 16px; right: 16px; }

.qrt-hero-mark {
  flex-shrink: 0;
  opacity: 1;
}

.qrt-hero-text {
  flex: 1;
  min-width: 0;
}

.qrt-hero-eyebrow {
  color: #BD945A;
  font-family: 'Urbanist', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.qrt-hero-text h2 {
  color: #F5F2EE;
  font-family: 'Rufina', Georgia, serif;
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.2;
  margin: 0 0 10px;
}

.qrt-hero-text p {
  color: #8C7667;
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0;
  max-width: 460px;
}

.qrt-hero-cta {
  flex-shrink: 0;
}

.hint {
  color: #8C7667;
  font-size: 0.82rem;
  margin: 0;
}

.qrt-empty {
  align-items: center;
  background: #F5F2EE;
  border: 1px dashed #E8DBCE;
  border-radius: 8px;
  color: #8C7667;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 60px 20px;
  text-align: center;
}

.qrt-empty i {
  font-size: 2.5rem;
  opacity: 0.5;
}

.qrt-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.qrt-card {
  background: #F5F2EE;
  border: 1px solid #E8DBCE;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: box-shadow 0.15s, transform 0.12s, border-color 0.15s;
}

.qrt-card:hover {
  border-color: #BD945A;
  box-shadow: 0 8px 28px rgba(189, 148, 90, 0.18);
  transform: translateY(-2px);
}

.qrt-card-thumb {
  background: #E8DBCE;
  border-bottom: 1px solid #E8DBCE;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.qrt-card-canvas-preview {
  background: #F5F2EE;
  border-radius: 3px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 90px;
  max-width: 100%;
}

.qrt-thumb-icon {
  color: #BD945A;
  font-size: 2rem;
  opacity: 0.6;
}

.qrt-card-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px 10px;
}

.qrt-card-info strong {
  color: #1A1410;
  font-size: 0.9rem;
}

.qrt-card-size {
  color: #8C7667;
  font-size: 0.78rem;
}

.qrt-card-actions {
  align-items: center;
  border-top: 1px solid #E8DBCE;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  padding: 8px 10px;
}

/* ─── Editor shell ────────────────────────────────────────────────────────── */
.qrt-editor {
  background: #E8DBCE;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.qrt-editor--embedded {
  height: 100%;
}

/* Header — dark, branded */
.qrt-header {
  align-items: center;
  background: #1A1410;
  border-bottom: 1px solid #2E241C;
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  padding: 9px 14px;
  z-index: 10;
}

.qrt-back-btn {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: #C5AF9D;
  cursor: pointer;
  display: inline-flex;
  font-size: 1rem;
  height: 32px;
  justify-content: center;
  padding: 0 8px;
  transition: background 0.12s, color 0.12s;
}

.qrt-back-btn:hover { background: rgba(197,175,157,0.12); color: #F5F2EE; }

.qrt-header-brand {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  opacity: 1;
}

.qrt-name-input {
  background: transparent;
  border: 0;
  border-bottom: 1.5px solid rgba(197,175,157,0.25);
  border-radius: 0;
  color: #F5F2EE;
  flex: 1;
  font-size: 0.95rem;
  font-weight: 600;
  max-width: 300px;
  outline: none;
  padding: 4px 2px;
  transition: border-color 0.15s;
}

.qrt-name-input::placeholder { color: #4A3F2E; }
.qrt-name-input:focus { border-bottom-color: #BD945A; }

.qrt-header-actions {
  align-items: center;
  display: flex;
  gap: 7px;
  margin-left: auto;
}

/* Override icon buttons and Bootstrap buttons for dark header */
.qrt-header .qrt-icon-btn { color: #C5AF9D; }
.qrt-header .qrt-icon-btn:hover:not(:disabled) { background: rgba(197,175,157,0.12); color: #F5F2EE; }
.qrt-header .qrt-icon-btn:disabled { color: #3A2E24; cursor: default; }

.qrt-header .btn-outline-secondary {
  --bs-btn-color: #C5AF9D;
  --bs-btn-border-color: #3A2E24;
  --bs-btn-hover-bg: rgba(197,175,157,0.1);
  --bs-btn-hover-border-color: #8C7667;
  --bs-btn-hover-color: #F5F2EE;
  --bs-btn-active-bg: rgba(197,175,157,0.15);
  --bs-btn-active-color: #F5F2EE;
}

.qrt-save-status {
  align-items: center;
  display: inline-flex;
  font-size: 0.78rem;
  gap: 4px;
}

.qrt-save-status.saved { color: #6BBF8C; }
.qrt-save-status.error { color: #E07070; }

/* Body */
.qrt-body {
  display: grid;
  flex: 1;
  grid-template-columns: 200px 1fr 220px;
  min-height: 0;
  overflow: hidden;
}

/* Left sidebar */
.qrt-sidebar-left {
  background: #F5F2EE;
  border-right: 1px solid #E8DBCE;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 14px 10px;
}

.qrt-sidebar-section-label {
  align-items: center;
  color: #8C7667;
  display: flex;
  font-size: 0.68rem;
  font-weight: 700;
  gap: 6px;
  letter-spacing: 0.08em;
  margin: 14px 0 7px;
  text-transform: uppercase;
}

.qrt-sidebar-section-label:first-child { margin-top: 0; }

.qrt-layer-count {
  background: #E8DBCE;
  border-radius: 10px;
  color: #8C7667;
  font-size: 0.67rem;
  padding: 1px 6px;
}

.qrt-add-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.qrt-add-btn {
  align-items: center;
  background: #fff;
  border: 1px solid #E8DBCE;
  border-radius: 6px;
  color: #1A1410;
  cursor: pointer;
  display: flex;
  flex-direction: row;
  font-size: 0.8rem;
  font-weight: 500;
  gap: 9px;
  padding: 8px 10px;
  text-align: left;
  transition: background 0.1s, border-color 0.12s;
}

.qrt-add-btn i { color: #BD945A; flex-shrink: 0; font-size: 1rem; }
.qrt-add-hint { color: #C5AF9D; font-size: 0.68rem; font-weight: 400; margin-left: auto; }
.qrt-add-btn:hover { background: #fff; border-color: #BD945A; }
.qrt-add-btn:hover .qrt-add-hint { color: #BD945A; }

.qrt-layers {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.qrt-layers-empty {
  color: #C5AF9D;
  font-size: 0.78rem;
  padding: 10px 4px;
  text-align: center;
}

.qrt-layer-row {
  align-items: center;
  border-left: 2px solid transparent;
  border-radius: 0 5px 5px 0;
  cursor: pointer;
  display: flex;
  font-size: 0.79rem;
  gap: 7px;
  padding: 5px 6px 5px 5px;
  transition: background 0.1s, border-color 0.1s;
}

.qrt-layer-row i { color: #BD945A; flex-shrink: 0; font-size: 0.82rem; }
.qrt-layer-row:hover { background: #E8DBCE; }
.qrt-layer-row.selected { background: rgba(189,148,90,0.10); border-left-color: #BD945A; color: #1A1410; font-weight: 600; }

.qrt-layer-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qrt-layer-btns {
  display: flex;
  gap: 1px;
  opacity: 0;
  transition: opacity 0.1s;
}

.qrt-layer-row:hover .qrt-layer-btns,
.qrt-layer-row.selected .qrt-layer-btns { opacity: 1; }

.qrt-layer-btn {
  background: transparent;
  border: 0;
  border-radius: 3px;
  color: #8C7667;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 2px 4px;
}

.qrt-layer-btn:hover { background: #E8DBCE; }

/* Canvas area */
.qrt-canvas-area {
  align-items: center;
  background-color: #D6CEBC;
  background-image: radial-gradient(circle, rgba(26,20,16,0.18) 1px, transparent 1px);
  background-size: 20px 20px;
  display: flex;
  justify-content: center;
  overflow: auto;
  padding: 48px;
  position: relative;
}

.qrt-canvas-wrap {
  position: relative;
}

.qrt-canvas {
  background: #fff;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.22), 0 2px 8px rgba(0,0,0,0.1);
  overflow: hidden;
}

.qrt-canvas-badge {
  background: rgba(26,20,16,0.60);
  border-radius: 0 0 5px 5px;
  color: #E8DBCE;
  font-size: 0.67rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  padding: 3px 10px;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}

/* Non-editable brand footer strip below the canvas */
.qrt-brand-footer {
  align-items: center;
  background: #f5f1eb;
  border-top: 1px solid #e0d4be;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.14);
  display: flex;
  gap: 6px;
  height: 24px;
  padding: 0 8px;
  pointer-events: none;
  user-select: none;
}

.qrt-brand-footer-mark {
  display: flex;
  align-items: center;
  height: 14px;
  width: 10px;
  flex-shrink: 0;
}

.qrt-brand-footer-text {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.qrt-brand-powered {
  color: #9a8870;
  font-size: 0.5rem;
  font-weight: 400;
  letter-spacing: 0.02em;
}

.qrt-brand-name {
  color: #BD945A;
  font-family: 'Rufina', Georgia, 'Times New Roman', serif;
  font-size: 0.72rem;
  font-weight: 600;
}

/* Elements */
.qrt-el {
  outline: none;
}

.qrt-el--selected {
  outline: 2px solid #BD945A;
  outline-offset: 0px;
  z-index: 100 !important;
}

/* Resize handles */
.qrt-handle {
  background: #fff;
  border: 2px solid #BD945A;
  border-radius: 2px;
  cursor: nwse-resize;
  height: 8px;
  position: absolute;
  width: 8px;
  z-index: 200;
}

.qrt-handle--nw { cursor: nwse-resize; left: -5px; top: -5px; }
.qrt-handle--n  { cursor: ns-resize;   left: calc(50% - 4px); top: -5px; }
.qrt-handle--ne { cursor: nesw-resize; right: -5px; top: -5px; }
.qrt-handle--e  { cursor: ew-resize;   right: -5px; top: calc(50% - 4px); }
.qrt-handle--se { cursor: nwse-resize; right: -5px; bottom: -5px; }
.qrt-handle--s  { cursor: ns-resize;   left: calc(50% - 4px); bottom: -5px; }
.qrt-handle--sw { cursor: nesw-resize; left: -5px; bottom: -5px; }
.qrt-handle--w  { cursor: ew-resize;   left: -5px; top: calc(50% - 4px); }

/* Right sidebar */
.qrt-sidebar-right {
  background: #F5F2EE;
  border-left: 1px solid #E8DBCE;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  padding: 12px;
}

.qrt-props-group {
  border-bottom: 1px solid #E8DBCE;
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.qrt-props-group:last-child { border-bottom: none; margin-bottom: 0; }

.qrt-props-label {
  align-items: center;
  color: #8C7667;
  display: flex;
  font-size: 0.68rem;
  font-weight: 700;
  gap: 6px;
  letter-spacing: 0.07em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.qrt-type-badge {
  background: #E8DBCE;
  border-radius: 4px;
  color: #8C7667;
  font-size: 0.64rem;
  font-weight: 500;
  padding: 1px 5px;
  text-transform: none;
  letter-spacing: 0;
}

.qrt-props-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.qrt-props-row:last-child { margin-bottom: 0; }

.qrt-prop-field {
  display: flex;
  flex-direction: column;
  flex: 1;
  font-size: 0.75rem;
  gap: 3px;
  min-width: 0;
}

.qrt-prop-field span { color: #8C7667; font-size: 0.71rem; }
.qrt-prop-field.wide { flex: 1 1 100%; }

.qrt-unit-input {
  align-items: center;
  background: #fff;
  border: 1px solid #E8DBCE;
  border-radius: 4px;
  display: flex;
  overflow: hidden;
}

.qrt-unit-input input {
  background: transparent;
  border: none;
  flex: 1;
  font-size: 0.79rem;
  min-width: 0;
  outline: none;
  padding: 4px 5px;
  width: 100%;
}

.qrt-unit-input span {
  background: #F5F2EE;
  border-left: 1px solid #E8DBCE;
  color: #8C7667;
  font-size: 0.67rem;
  padding: 4px 6px;
  white-space: nowrap;
}

.qrt-color-input {
  border: 1px solid #E8DBCE;
  border-radius: 4px;
  cursor: pointer;
  height: 28px;
  padding: 1px 2px;
  width: 100%;
}

.qrt-align-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.qrt-align-btns button {
  align-items: center;
  background: #fff;
  border: 1px solid #E8DBCE;
  border-radius: 4px;
  color: #8C7667;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.82rem;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.qrt-align-btns button:hover { background: rgba(189,148,90,0.08); border-color: #BD945A; color: #BD945A; }

.qrt-no-selection {
  align-items: center;
  color: #C5AF9D;
  display: flex;
  flex-direction: column;
  font-size: 0.8rem;
  gap: 8px;
  margin-top: 20px;
  text-align: center;
}

.qrt-no-selection i { font-size: 1.8rem; opacity: 0.5; }
.qrt-no-selection p { margin: 0; }

.input-hint {
  color: #8C7667;
  font-size: 0.69rem;
  margin-top: 2px;
}

/* Footer toolbar */
.qrt-footer {
  align-items: center;
  background: #F5F2EE;
  border-top: 1px solid #E8DBCE;
  display: flex;
  flex-shrink: 0;
  gap: 20px;
  padding: 7px 16px;
  z-index: 10;
}

.qrt-zoom-controls {
  align-items: center;
  display: flex;
  gap: 4px;
}

.qrt-zoom-pct {
  background: #E8DBCE;
  border: 0;
  border-radius: 4px;
  color: #1A1410;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  min-width: 44px;
  padding: 3px 6px;
  text-align: center;
}

.qrt-zoom-pct:hover { background: #C5AF9D; color: #1A1410; }

.qrt-unit-toggle {
  align-items: center;
  display: flex;
  gap: 8px;
}

.qrt-unit-toggle > span {
  color: #8C7667;
  font-size: 0.76rem;
}

.qrt-unit-btns {
  display: flex;
  border: 1px solid #E8DBCE;
  border-radius: 5px;
  overflow: hidden;
}

.qrt-unit-btns button {
  background: transparent;
  border: none;
  color: #8C7667;
  cursor: pointer;
  font-size: 0.74rem;
  padding: 3px 9px;
}

.qrt-unit-btns button.active {
  background: #BD945A;
  color: #fff;
  font-weight: 600;
}

.qrt-footer-hint {
  align-items: center;
  color: #C5AF9D;
  display: flex;
  font-size: 0.72rem;
  gap: 5px;
  margin-left: auto;
}

/* Shared icon button */
.qrt-icon-btn {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: #1A1410;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.9rem;
  height: 30px;
  justify-content: center;
  width: 30px;
  transition: background 0.1s, color 0.1s;
}

.qrt-icon-btn:hover:not(:disabled) { background: #E8DBCE; }
.qrt-icon-btn:disabled { color: #C5AF9D; cursor: default; }
.qrt-icon-btn.danger { color: #c05050; }
.qrt-icon-btn.danger:hover { background: rgba(192,80,80,0.08); }
.qrt-icon-btn.sm { height: 26px; width: 26px; font-size: 0.8rem; }

/* Reuse bootstrap btn styles */
.btn { font-size: 0.84rem; }
.btn-sm { font-size: 0.78rem; padding: 4px 10px; }

/* ─── Preset & saved sections ────────────────────────────────────────────── */
.qrt-section-header {
  align-items: flex-end;
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.qrt-section-title {
  color: #1A1410;
  font-family: 'Rufina', Georgia, serif;
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 3px;
}

.qrt-section-sub {
  color: #8C7667;
  font-size: 0.78rem;
  margin: 0;
}

.qrt-presets-section {
  margin-bottom: 48px;
  padding: 40px 48px 0;
}

.qrt-saved-section {
  margin-bottom: 24px;
  padding: 0 48px;
}

.qrt-presets-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
}

/* Preset card */
.qrt-preset-card {
  background: #F5F2EE;
  border: 1.5px solid #E8DBCE;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.12s;
}

.qrt-preset-card:hover {
  border-color: #BD945A;
  box-shadow: 0 10px 32px rgba(189, 148, 90, 0.22);
  transform: translateY(-3px);
}

/* Layout preview area */
.qrt-preset-visual-wrap {
  align-items: center;
  background: #D6CEBC;
  background-image: radial-gradient(circle, rgba(26,20,16,0.18) 1px, transparent 1px);
  background-size: 8px 8px;
  display: flex;
  justify-content: center;
  min-height: 130px;
  padding: 20px;
}

.qrt-preset-visual {
  box-shadow: 0 3px 16px rgba(0,0,0,0.22);
  max-height: 100px;
  max-width: 100%;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.qrt-preset-info {
  border-top: 1px solid #E8DBCE;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px 6px;
}

.qrt-preset-info strong {
  color: #1A1410;
  font-size: 0.86rem;
  font-weight: 600;
}

.qrt-preset-info span {
  color: #8C7667;
  font-size: 0.71rem;
  line-height: 1.35;
}

.qrt-preset-cta {
  align-items: center;
  border-top: 1px solid #E8DBCE;
  color: #BD945A;
  display: flex;
  font-size: 0.75rem;
  font-weight: 600;
  gap: 6px;
  letter-spacing: 0.01em;
  opacity: 0;
  padding: 7px 12px 9px;
  transition: opacity 0.15s;
}

.qrt-preset-card:hover .qrt-preset-cta { opacity: 1; }

/* ─── Preview modal ──────────────────────────────────────────────────────── */
.qrt-preview-backdrop {
  align-items: center;
  background: rgba(15, 12, 8, 0.65);
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  padding: 24px;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 1000;
}

.qrt-preview-modal {
  background: #F5F2EE;
  border-radius: 12px;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  max-width: 700px;
  overflow: hidden;
  width: 100%;
}

.qrt-preview-header {
  align-items: flex-start;
  background: #1A1410;
  border-bottom: 1px solid #2E241C;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 14px 20px;
}

.qrt-preview-header h3 {
  color: #F5F2EE;
  font-family: 'Rufina', Georgia, serif;
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 2px;
}

.qrt-preview-header .qrt-icon-btn { color: #C5AF9D; }
.qrt-preview-header .qrt-icon-btn:hover { background: rgba(197,175,157,0.12); color: #F5F2EE; }

.qrt-preview-qr-row {
  align-items: flex-end;
  border-bottom: 1px solid #E8DBCE;
  display: flex;
  gap: 10px;
  padding: 12px 20px;
}

.qrt-preview-qr-label {
  display: flex;
  flex: 1;
  flex-direction: column;
  font-size: 0.78rem;
  gap: 4px;
}

.qrt-preview-qr-label span { color: #8C7667; font-weight: 500; }

.qrt-preview-canvas-area {
  align-items: center;
  background-color: #D6CEBC;
  background-image: radial-gradient(circle, rgba(26,20,16,0.18) 1px, transparent 1px);
  background-size: 16px 16px;
  display: flex;
  flex: 1;
  justify-content: center;
  min-height: 200px;
  overflow: auto;
  padding: 32px;
}

.qrt-preview-loading {
  align-items: center;
  color: #8C7667;
  display: flex;
  font-size: 0.88rem;
  gap: 8px;
}

.qrt-preview-img {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  max-height: 440px;
  max-width: 100%;
  object-fit: contain;
}

.qrt-preview-footer {
  align-items: center;
  background: #F5F2EE;
  border-top: 1px solid #E8DBCE;
  display: flex;
  justify-content: space-between;
  padding: 12px 20px;
}

.qrt-preview-footer .hint { color: #8C7667; font-size: 0.82rem; }

.qrt-preview-footer-actions {
  display: flex;
  gap: 8px;
}

/* ─── Panel toggle buttons (hidden on desktop, shown on tablet) ───────────── */
.qrt-panel-btn { display: none; }

/* ─── Tablet layout (< 1100px) ─────────────────────────────────────────────── */
@media (max-width: 1099px) {
  .qrt-panel-btn { display: inline-flex; }
  .qrt-panel-btn.active { background: rgba(197,175,157,0.16); color: #BD945A; }

  .qrt-body {
    grid-template-columns: 1fr;
    position: relative;
  }

  .qrt-sidebar-left,
  .qrt-sidebar-right {
    bottom: 0;
    height: 100%;
    position: absolute;
    top: 0;
    transition: transform 0.22s ease;
    width: 220px;
    z-index: 50;
    box-shadow: 0 0 32px rgba(0,0,0,0.18);
  }
  .qrt-sidebar-left {
    left: 0;
    transform: translateX(0);
    border-right: 1px solid #E8DBCE;
  }
  .qrt-sidebar-right {
    right: 0;
    transform: translateX(0);
    border-left: 1px solid #E8DBCE;
  }
  .qrt-sidebar-left.panel-hidden { transform: translateX(-100%); }
  .qrt-sidebar-right.panel-hidden { transform: translateX(100%); }

  .qrt-canvas-area { padding: 24px; }
  .qrt-header-actions { gap: 5px; }
}

/* ─── Mobile (< 768px) ───────────────────────────────────────────────────── */
@media (max-width: 767px) {
  .qrt-header { flex-wrap: wrap; gap: 6px; }
  .qrt-name-input { max-width: 160px; }
  .qrt-desktop-btn { display: none; }
  .qrt-canvas-area { padding: 16px; }

  .qrt-sidebar-left,
  .qrt-sidebar-right { width: 200px; }

  .qrt-hero { padding: 24px 20px; }
  .qrt-hero-text h2 { font-size: 1.3rem; }
  .qrt-presets-section { padding: 24px 20px 0; }
  .qrt-saved-section { padding: 0 20px !important; }
  .qrt-presets-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
}
</style>
