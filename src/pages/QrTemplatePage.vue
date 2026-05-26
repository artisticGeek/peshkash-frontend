<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import axios from 'axios';
import QRCode from 'qrcode';
import { API_BASE_URL } from '../config';

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

const FONTS = ['Inter', 'Georgia', 'Arial', 'Helvetica Neue', 'Times New Roman', 'Courier New', 'Playfair Display'];
const BASE_SCALE = 3.78; // px per mm at 100% zoom

// ─── Trendy Preset Templates ──────────────────────────────────────────────────

interface PresetTemplate {
  name: string;
  icon: string;
  desc: string;
  create: () => QrTemplate;
}

const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: 'Classic Business Card',
    icon: 'bi-credit-card',
    desc: '85 × 54 mm · Warm cream · Gold border',
    create: () => ({
      name: 'Classic Business Card', widthMm: 85, heightMm: 54,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 85, height: 54, locked: true, fill: '#faf8f3', stroke: '#c9a96e', strokeWidth: 0.6, borderRadius: 2, opacity: 1 },
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 28, y: 9, width: 29, height: 29, locked: false, fgColor: '#1a1a1a', bgColor: '#faf8f3', margin: 0, errorLevel: 'M' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Venue Name', x: 5, y: 41, width: 75, height: 8, locked: false, content: 'Venue Name', fontFamily: 'Inter', fontSize: 10, fontWeight: '600', color: '#4a3f2e', textAlign: 'center' as const },
      ]
    })
  },
  {
    name: 'Dark Luxury',
    icon: 'bi-moon-stars',
    desc: '85 × 54 mm · Charcoal & gold · Upscale',
    create: () => ({
      name: 'Dark Luxury', widthMm: 85, heightMm: 54,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 85, height: 54, locked: true, fill: '#15191e', stroke: '#15191e', strokeWidth: 0, borderRadius: 2, opacity: 1 },
        { id: uid(), type: 'rect' as const, name: 'Gold Strip', x: 0, y: 44, width: 85, height: 10, locked: true, fill: '#c9a96e', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 28, y: 8, width: 29, height: 29, locked: false, fgColor: '#f5f0e8', bgColor: '#15191e', margin: 0, errorLevel: 'M' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Scan Label', x: 4, y: 46, width: 77, height: 6, locked: false, content: 'SCAN TO EXPLORE', fontFamily: 'Inter', fontSize: 7, fontWeight: '700', color: '#15191e', textAlign: 'center' as const },
      ]
    })
  },
  {
    name: 'Acrylic Portrait',
    icon: 'bi-layout-text-window',
    desc: '90 × 120 mm · Portrait stand · Bold header',
    create: () => ({
      name: 'Acrylic Portrait', widthMm: 90, heightMm: 120,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 90, height: 120, locked: true, fill: '#ffffff', stroke: '#e8dccb', strokeWidth: 0.4, borderRadius: 3, opacity: 1 },
        { id: uid(), type: 'rect' as const, name: 'Header Bar', x: 0, y: 0, width: 90, height: 22, locked: true, fill: '#1a1a1a', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'image' as const, name: 'Logo', x: 29, y: 4, width: 32, height: 14, locked: false, src: '', objectFit: 'contain' as const, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 20, y: 32, width: 50, height: 50, locked: false, fgColor: '#1a1a1a', bgColor: '#ffffff', margin: 1, errorLevel: 'M' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Event Name', x: 5, y: 87, width: 80, height: 12, locked: false, content: 'Event Name', fontFamily: 'Playfair Display', fontSize: 13, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' as const },
        { id: uid(), type: 'text' as const, name: 'Scan Hint', x: 5, y: 103, width: 80, height: 8, locked: false, content: 'Scan for menu & details', fontFamily: 'Inter', fontSize: 8, fontWeight: '400', color: '#9a8870', textAlign: 'center' as const },
      ]
    })
  },
  {
    name: 'Modern Square',
    icon: 'bi-stop-btn',
    desc: '80 × 80 mm · Minimal white · Accent stripe',
    create: () => ({
      name: 'Modern Square', widthMm: 80, heightMm: 80,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 80, height: 80, locked: true, fill: '#ffffff', stroke: '#e8e0d4', strokeWidth: 0.5, borderRadius: 2, opacity: 1 },
        { id: uid(), type: 'rect' as const, name: 'Accent Bar', x: 0, y: 0, width: 80, height: 4, locked: true, fill: '#BD945A', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 16, y: 14, width: 48, height: 48, locked: false, fgColor: '#15191e', bgColor: '#ffffff', margin: 1, errorLevel: 'M' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Venue Name', x: 5, y: 67, width: 70, height: 9, locked: false, content: 'Venue Name', fontFamily: 'Inter', fontSize: 11, fontWeight: '500', color: '#15191e', textAlign: 'center' as const },
      ]
    })
  },
  {
    name: 'Compact Label',
    icon: 'bi-tag',
    desc: '50 × 30 mm · Small format · QR + text',
    create: () => ({
      name: 'Compact Label', widthMm: 50, heightMm: 30,
      elements: [
        { id: uid(), type: 'rect' as const, name: 'Background', x: 0, y: 0, width: 50, height: 30, locked: true, fill: '#ffffff', stroke: '#d8d0c4', strokeWidth: 0.4, borderRadius: 1.5, opacity: 1 },
        { id: uid(), type: 'rect' as const, name: 'Divider', x: 29, y: 4, width: 0.5, height: 22, locked: true, fill: '#e0d8cc', stroke: '', strokeWidth: 0, borderRadius: 0, opacity: 1 },
        { id: uid(), type: 'qr' as const, name: 'QR Code', x: 3, y: 3, width: 24, height: 24, locked: false, fgColor: '#1a1a1a', bgColor: '#ffffff', margin: 0, errorLevel: 'M' as const, borderRadius: 0 },
        { id: uid(), type: 'text' as const, name: 'Scan Text', x: 31, y: 10, width: 16, height: 10, locked: false, content: 'Scan for menu', fontFamily: 'Inter', fontSize: 6, fontWeight: '500', color: '#4a3f2e', textAlign: 'left' as const },
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
    const url = await QRCode.toDataURL('peshkash-preview', {
      width: 200,
      margin: el.margin,
      color: { dark: el.fgColor, light: el.bgColor === 'transparent' ? '#ffffff' : el.bgColor },
      errorCorrectionLevel: el.errorLevel,
    });
    qrPreviews.value[el.id] = url;
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
  return { id: uid(), type: 'qr', name: 'QR Code', x: cx, y: cy, width: 30, height: 30, locked: false, fgColor: '#000000', bgColor: '#ffffff', margin: 1, errorLevel: 'M', borderRadius: 0 };
}

function makeText(): TextEl {
  return { id: uid(), type: 'text', name: 'Text', x: 5, y: tpl.heightMm - 12, width: tpl.widthMm - 10, height: 8, locked: false, content: 'Vendor Name', fontFamily: 'Inter', fontSize: 10, fontWeight: '500', color: '#1a1a1a', textAlign: 'center' };
}

function makeImage(): ImageEl {
  return { id: uid(), type: 'image', name: 'Logo', x: 3, y: 3, width: 20, height: 12, locked: false, src: '', objectFit: 'contain', borderRadius: 0, opacity: 1 };
}

function makeRect(): RectEl {
  return { id: uid(), type: 'rect', name: 'Shape', x: 0, y: 0, width: tpl.widthMm, height: tpl.heightMm, locked: false, fill: '#f5f0e8', stroke: '#d4b07a', strokeWidth: 0, borderRadius: 0, opacity: 1 };
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
  canvas.width = pw;
  canvas.height = ph;
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
        errorCorrectionLevel: q.errorLevel,
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
    }
    ctx.restore();
  }
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
    <div class="qrt-list-header">
      <div>
        <h2>Print Templates</h2>
        <p class="hint">Design print-ready layouts once — reuse for every event or vendor.</p>
      </div>
      <button class="btn btn-primary" @click="newTemplate">
        <i class="bi bi-plus-lg"></i> Blank Template
      </button>
    </div>

    <!-- Trendy presets -->
    <div class="qrt-presets-section">
      <p class="qrt-section-title"><i class="bi bi-stars"></i> Start from a preset</p>
      <div class="qrt-presets-grid">
        <div v-for="p in PRESET_TEMPLATES" :key="p.name" class="qrt-preset-card" @click="startFromPreset(p)">
          <div class="qrt-preset-thumb">
            <i :class="`bi ${p.icon}`"></i>
          </div>
          <div class="qrt-preset-info">
            <strong>{{ p.name }}</strong>
            <span>{{ p.desc }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Saved templates -->
    <div v-if="templates.length > 0" class="qrt-saved-section">
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
      <input v-model="tpl.name" class="qrt-name-input" placeholder="Template name" spellcheck="false" />
      <div class="qrt-header-actions">
        <span v-if="saveStatus === 'saved'" class="qrt-save-status saved"><i class="bi bi-check2"></i> Saved</span>
        <span v-if="saveStatus === 'error'" class="qrt-save-status error"><i class="bi bi-exclamation-triangle"></i> Error</span>
        <button class="qrt-icon-btn" title="Undo (Ctrl+Z)" :disabled="historyIndex <= 0" @click="undo"><i class="bi bi-arrow-counterclockwise"></i></button>
        <button class="qrt-icon-btn" title="Redo (Ctrl+Y)" :disabled="historyIndex >= history.length - 1" @click="redo"><i class="bi bi-arrow-clockwise"></i></button>
        <button class="btn btn-outline-secondary btn-sm" @click="openPreview"><i class="bi bi-eye"></i> Preview</button>
        <button class="btn btn-outline-secondary btn-sm" @click="() => exportPng()"><i class="bi bi-download"></i> Export PNG</button>
        <button class="btn btn-primary btn-sm" :disabled="saving" @click="saveTemplate">
          <i class="bi bi-floppy2"></i> {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </header>

    <div class="qrt-body">

      <!-- Left Sidebar: elements + layers -->
      <aside class="qrt-sidebar-left">
        <p class="qrt-sidebar-section-label">Add Element</p>
        <div class="qrt-add-grid">
          <button class="qrt-add-btn" @click="addElement('qr')"><i class="bi bi-qr-code"></i><span>QR Code</span></button>
          <button class="qrt-add-btn" @click="addElement('text')"><i class="bi bi-type"></i><span>Text</span></button>
          <button class="qrt-add-btn" @click="addElement('image')"><i class="bi bi-image"></i><span>Logo</span></button>
          <button class="qrt-add-btn" @click="addElement('rect')"><i class="bi bi-square"></i><span>Shape</span></button>
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
        </div>
      </div>

      <!-- Right Sidebar: Properties -->
      <aside class="qrt-sidebar-right">

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
        Export PNG at 300 DPI · Del to remove · Ctrl+Z undo
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
            <i class="bi bi-hourglass-split"></i> Rendering…
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
  background: #f7f4ef;
  min-height: 100vh;
  padding: 32px 40px;
}

.qrt-list-page--embedded {
  min-height: 0;
  height: 100%;
  overflow-y: auto;
}

.qrt-list-header {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  margin-bottom: 28px;
}

.qrt-list-header h2 {
  color: #15191e;
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 4px;
}

.hint {
  color: #7a6a52;
  font-size: 0.84rem;
  margin: 0;
}

.qrt-empty {
  align-items: center;
  background: #fff;
  border: 1px dashed #d4b07a;
  border-radius: 8px;
  color: #a07c4a;
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
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.qrt-card {
  background: #fff;
  border: 1px solid #e6dfd4;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: box-shadow 0.15s, transform 0.1s;
}

.qrt-card:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.qrt-card-thumb {
  background: #f5f0e8;
  border-bottom: 1px solid #e6dfd4;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.qrt-card-canvas-preview {
  background: #fff;
  border-radius: 3px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
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
  color: #15191e;
  font-size: 0.9rem;
}

.qrt-card-size {
  color: #9a8870;
  font-size: 0.78rem;
}

.qrt-card-actions {
  align-items: center;
  border-top: 1px solid #ede8df;
  display: flex;
  gap: 4px;
  justify-content: flex-end;
  padding: 8px 10px;
}

/* ─── Editor shell ────────────────────────────────────────────────────────── */
.qrt-editor {
  background: #f0ece6;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.qrt-editor--embedded {
  height: 100%;
}

/* Header */
.qrt-header {
  align-items: center;
  background: #fff;
  border-bottom: 1px solid #e6dfd4;
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  padding: 10px 16px;
  z-index: 10;
}

.qrt-back-btn {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: #15191e;
  cursor: pointer;
  display: inline-flex;
  font-size: 1rem;
  height: 34px;
  justify-content: center;
  padding: 0 8px;
}

.qrt-back-btn:hover { background: #f4f1ed; }

.qrt-name-input {
  background: transparent;
  border: 0;
  border-bottom: 1.5px solid transparent;
  border-radius: 0;
  color: #15191e;
  flex: 1;
  font-size: 0.98rem;
  font-weight: 600;
  max-width: 320px;
  outline: none;
  padding: 4px 2px;
  transition: border-color 0.15s;
}

.qrt-name-input:focus { border-bottom-color: #BD945A; }

.qrt-header-actions {
  align-items: center;
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.qrt-save-status {
  align-items: center;
  display: inline-flex;
  font-size: 0.8rem;
  gap: 4px;
}

.qrt-save-status.saved { color: #3a9c6a; }
.qrt-save-status.error { color: #c05050; }

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
  background: #fbfaf8;
  border-right: 1px solid #e6dfd4;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 14px 12px;
}

.qrt-sidebar-section-label {
  align-items: center;
  color: #a07c4a;
  display: flex;
  font-size: 0.72rem;
  font-weight: 700;
  gap: 6px;
  letter-spacing: 0.06em;
  margin: 10px 0 8px;
  text-transform: uppercase;
}

.qrt-sidebar-section-label:first-child { margin-top: 0; }

.qrt-layer-count {
  background: #ede8df;
  border-radius: 10px;
  color: #7a6a52;
  font-size: 0.7rem;
  padding: 1px 6px;
}

.qrt-add-grid {
  display: grid;
  gap: 6px;
  grid-template-columns: 1fr 1fr;
}

.qrt-add-btn {
  align-items: center;
  background: #fff;
  border: 1px solid #ddd8ce;
  border-radius: 6px;
  color: #5a4a32;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font-size: 0.76rem;
  gap: 4px;
  padding: 10px 6px;
  transition: background 0.12s, border-color 0.12s;
}

.qrt-add-btn i { font-size: 1.1rem; color: #BD945A; }
.qrt-add-btn:hover { background: #fdf5e8; border-color: #BD945A; }

.qrt-layers {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.qrt-layers-empty {
  color: #b0a090;
  font-size: 0.78rem;
  padding: 8px 4px;
  text-align: center;
}

.qrt-layer-row {
  align-items: center;
  border-radius: 5px;
  cursor: pointer;
  display: flex;
  font-size: 0.8rem;
  gap: 7px;
  padding: 5px 6px;
  transition: background 0.1s;
}

.qrt-layer-row i { color: #a07c4a; flex-shrink: 0; font-size: 0.85rem; }
.qrt-layer-row:hover { background: #f0ece6; }
.qrt-layer-row.selected { background: #fdf5e8; color: #7a5520; font-weight: 600; }

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
  color: #9a8870;
  cursor: pointer;
  font-size: 0.7rem;
  padding: 2px 4px;
}

.qrt-layer-btn:hover { background: #ede8df; }

/* Canvas area */
.qrt-canvas-area {
  align-items: center;
  display: flex;
  justify-content: center;
  overflow: auto;
  padding: 40px;
  position: relative;
  background-image: radial-gradient(circle, #c8b99a33 1px, transparent 1px);
  background-size: 20px 20px;
}

.qrt-canvas-wrap {
  position: relative;
}

.qrt-canvas {
  background: #fff;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.14);
  overflow: hidden;
}

.qrt-canvas-badge {
  background: rgba(0,0,0,0.45);
  border-radius: 0 0 4px 4px;
  color: #fff;
  font-size: 0.68rem;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
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
  background: #fbfaf8;
  border-left: 1px solid #e6dfd4;
  display: flex;
  flex-direction: column;
  gap: 0;
  overflow-y: auto;
  padding: 12px;
}

.qrt-props-group {
  border-bottom: 1px solid #ede8df;
  padding-bottom: 12px;
  margin-bottom: 12px;
}

.qrt-props-group:last-child { border-bottom: none; margin-bottom: 0; }

.qrt-props-label {
  align-items: center;
  color: #a07c4a;
  display: flex;
  font-size: 0.72rem;
  font-weight: 700;
  gap: 6px;
  letter-spacing: 0.05em;
  margin: 0 0 8px;
  text-transform: uppercase;
}

.qrt-type-badge {
  background: #f0ece6;
  border-radius: 4px;
  color: #8a7060;
  font-size: 0.65rem;
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

.qrt-prop-field span { color: #7a6a52; font-size: 0.72rem; }
.qrt-prop-field.wide { flex: 1 1 100%; }

.qrt-unit-input {
  align-items: center;
  border: 1px solid #d8d0c4;
  border-radius: 4px;
  display: flex;
  overflow: hidden;
}

.qrt-unit-input input {
  background: transparent;
  border: none;
  flex: 1;
  font-size: 0.8rem;
  min-width: 0;
  outline: none;
  padding: 3px 5px;
  width: 100%;
}

.qrt-unit-input span {
  background: #f0ece6;
  border-left: 1px solid #d8d0c4;
  color: #9a8870;
  font-size: 0.68rem;
  padding: 3px 5px;
  white-space: nowrap;
}

.qrt-color-input {
  border: 1px solid #d8d0c4;
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
  border: 1px solid #ddd8ce;
  border-radius: 4px;
  color: #7a6a52;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.82rem;
  height: 28px;
  justify-content: center;
  width: 28px;
}

.qrt-align-btns button:hover { background: #fdf5e8; border-color: #BD945A; color: #BD945A; }

.qrt-no-selection {
  align-items: center;
  color: #b0a090;
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
  color: #9a8870;
  font-size: 0.7rem;
  margin-top: 2px;
}

/* Footer toolbar */
.qrt-footer {
  align-items: center;
  background: #fff;
  border-top: 1px solid #e6dfd4;
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
  background: #f4f1ed;
  border: 0;
  border-radius: 4px;
  color: #5a4a32;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  min-width: 44px;
  padding: 3px 6px;
  text-align: center;
}

.qrt-zoom-pct:hover { background: #ede8df; }

.qrt-unit-toggle {
  align-items: center;
  display: flex;
  gap: 8px;
}

.qrt-unit-toggle > span {
  color: #9a8870;
  font-size: 0.76rem;
}

.qrt-unit-btns {
  display: flex;
  border: 1px solid #ddd8ce;
  border-radius: 5px;
  overflow: hidden;
}

.qrt-unit-btns button {
  background: transparent;
  border: none;
  color: #7a6a52;
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
  color: #b0a090;
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
  color: #5a4a32;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.9rem;
  height: 30px;
  justify-content: center;
  width: 30px;
}

.qrt-icon-btn:hover:not(:disabled) { background: #f0ece6; }
.qrt-icon-btn:disabled { color: #ccc; cursor: default; }
.qrt-icon-btn.danger { color: #c05050; }
.qrt-icon-btn.danger:hover { background: #fce8e8; }
.qrt-icon-btn.sm { height: 26px; width: 26px; font-size: 0.8rem; }

/* Reuse bootstrap btn styles */
.btn { font-size: 0.84rem; }
.btn-sm { font-size: 0.78rem; padding: 4px 10px; }

/* ─── Preset & saved sections ────────────────────────────────────────────── */
.qrt-section-title {
  align-items: center;
  color: #7a6a52;
  display: flex;
  font-size: 0.76rem;
  font-weight: 700;
  gap: 6px;
  letter-spacing: 0.05em;
  margin: 0 0 12px;
  text-transform: uppercase;
}

.qrt-presets-section {
  margin-bottom: 36px;
}

.qrt-saved-section {
  margin-bottom: 24px;
}

.qrt-presets-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
}

.qrt-preset-card {
  align-items: center;
  background: #fff;
  border: 1.5px solid #e6dfd4;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  gap: 12px;
  padding: 14px 14px;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.1s;
}

.qrt-preset-card:hover {
  border-color: #BD945A;
  box-shadow: 0 4px 16px rgba(189, 148, 90, 0.18);
  transform: translateY(-1px);
}

.qrt-preset-thumb {
  align-items: center;
  background: #f5f0e8;
  border-radius: 6px;
  display: flex;
  flex-shrink: 0;
  font-size: 1.4rem;
  height: 44px;
  justify-content: center;
  width: 44px;
  color: #BD945A;
}

.qrt-preset-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.qrt-preset-info strong {
  color: #15191e;
  font-size: 0.88rem;
  font-weight: 600;
}

.qrt-preset-info span {
  color: #9a8870;
  font-size: 0.74rem;
  line-height: 1.3;
}

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
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  max-width: 680px;
  overflow: hidden;
  width: 100%;
}

.qrt-preview-header {
  align-items: flex-start;
  border-bottom: 1px solid #e8dccb;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 16px 20px;
}

.qrt-preview-header h3 {
  color: #15191e;
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 2px;
}

.qrt-preview-qr-row {
  align-items: flex-end;
  border-bottom: 1px solid #f0ece6;
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

.qrt-preview-qr-label span { color: #7a6a52; font-weight: 500; }

.qrt-preview-canvas-area {
  align-items: center;
  background: #f5f0e8;
  background-image: radial-gradient(circle, #c8b99a44 1px, transparent 1px);
  background-size: 16px 16px;
  display: flex;
  flex: 1;
  justify-content: center;
  min-height: 200px;
  overflow: auto;
  padding: 24px;
}

.qrt-preview-loading {
  align-items: center;
  color: #9a8870;
  display: flex;
  font-size: 0.88rem;
  gap: 8px;
}

.qrt-preview-img {
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.18);
  max-height: 440px;
  max-width: 100%;
  object-fit: contain;
}

.qrt-preview-footer {
  align-items: center;
  border-top: 1px solid #e8dccb;
  display: flex;
  justify-content: space-between;
  padding: 12px 20px;
}

.qrt-preview-footer-actions {
  display: flex;
  gap: 8px;
}
</style>
