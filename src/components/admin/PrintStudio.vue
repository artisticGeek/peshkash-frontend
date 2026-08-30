<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import axios from 'axios';
import { EXPORT_SCALE } from '../../utils/qrRenderer';
import { brandKitLayout, renderTemplateSvg } from '../../features/qrStudio/templateRenderer';
import { svgDataUri } from '../../features/qrStudio/qrRenderer';
import { qrManifest, type FixedElementLayout, type QrTemplateDefinition, type StudioDesign, type QrStyleId, type StudioTheme } from '../../features/qrStudio/types';
import { synthesizeCustomTemplate } from '../../features/qrStudio/customTemplate';
import { designFromDocument, readStudioDocument } from '../../features/designStudio/document/migrations';
import { preflightDesign } from '../../features/designStudio/export/preflight';
import { API_BASE_URL } from '../../config';

interface QrTarget {
  key: string;
  label: string;
  context: string;
  type: string;
  path: string;
}

interface QrMapping {
  id: number;
  qrHash: string;
  url: string;
  shortQrUrl: string;
  finalPublicUrl: string;
  isActive: boolean;
}

interface EventRow {
  id: number;
  displayName: string;
  name: string;
}

const props = defineProps<{
  event: EventRow | null;
  targets: QrTarget[];
  qrMappings: QrMapping[];
}>();

const templates = ref<StudioDesign[]>([]);
const selectedTemplateId = ref<number | string | null>(null);
const previews = ref<Record<string, string>>({});
const isGenerating = ref(false);
const isDownloading = ref(false);
const downloadProgress = ref(0);
const downloadTotal = ref(0);
const selectedTargetKeys = ref<string[]>([]);

const selectedTemplate = computed(() =>
  templates.value.find(t => String(t.id) === String(selectedTemplateId.value)) ?? null
);

const exportPixelSize = computed(() => {
  if (!selectedTemplate.value) return null;
  return {
    w: Math.round(selectedTemplate.value.widthMm * EXPORT_SCALE),
    h: Math.round(selectedTemplate.value.heightMm * EXPORT_SCALE),
  };
});

// Deep-links directly into the editor for the currently selected design
const editTemplateRoute = computed(() =>
  typeof selectedTemplate.value?.id === 'number'
    ? `/dashboard/qr-templates?edit=${selectedTemplate.value.id}`
    : '/dashboard/qr-templates'
);

function mappingForTarget(target: QrTarget): QrMapping | null {
  return props.qrMappings.find(m => m.url === target.path || m.url === target.path + '/') ?? null;
}

function qrValueForTarget(target: QrTarget): string | null {
  return mappingForTarget(target)?.shortQrUrl ?? null;
}

function qrHashForTarget(target: QrTarget): string | null {
  return mappingForTarget(target)?.qrHash ?? null;
}

const selectedTargets = computed(() => props.targets.filter(target => selectedTargetKeys.value.includes(target.key)));
const unmappedTargets = computed(() => selectedTargets.value.filter(target => !mappingForTarget(target)));

function templateDefinition(design: StudioDesign): QrTemplateDefinition | undefined {
  return qrManifest.templates.find(t => t.id === design.libraryTemplateId)
    ?? (design.customTemplate ? synthesizeCustomTemplate(design.customTemplate, { id: design.libraryTemplateId, label: design.name }) : undefined);
}

function layoutFor(design: StudioDesign, template: QrTemplateDefinition): FixedElementLayout {
  if (design.layout) return design.layout;
  const kit = brandKitLayout(template);
  const short = Math.min(template.canvas.width, template.canvas.height);
  const qrSize = template.qr.size * short;
  return {
    qr: { x: template.qr.x * template.canvas.width, y: template.qr.y * template.canvas.height, w: qrSize, h: qrSize },
    ...kit,
  };
}

const printPreflight = computed(() => {
  const design = selectedTemplate.value;
  const firstMapping = selectedTargets.value.map(mappingForTarget).find((mapping): mapping is QrMapping => Boolean(mapping));
  if (!design || !firstMapping) return null;
  const definition = templateDefinition(design);
  if (!definition) return null;
  // Local development still validates the production short-link shape; the rendered
  // preview keeps the local URL so scan testing remains useful.
  const destination = import.meta.env.DEV
    ? `https://peshkash.app/${firstMapping.qrHash}`
    : firstMapping.shortQrUrl;
  return preflightDesign({ ...design, destination }, definition, layoutFor(design, definition));
});

const canExport = computed(() => Boolean(
  selectedTemplate.value
  && selectedTargets.value.length
  && unmappedTargets.value.length === 0
  && printPreflight.value?.canExport
));

function safeFilename(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function blankDesign(): StudioDesign {
  return {
    name: '',
    libraryTemplateId: qrManifest.templates[0]?.id ?? '',
    manifestVersion: qrManifest.version,
    qrStyle: 'obsidian-ring',
    theme: 'light',
    widthMm: 120,
    heightMm: 70,
    merchantName: '',
    eyebrow: '',
    headline: '',
    descriptor: '',
    cta: '',
    destination: 'https://peshkash.app',
  };
}

function fromApi(row: Record<string, unknown>): StudioDesign {
  const settings = (row.settings || {}) as Partial<StudioDesign>;
  const elements = Array.isArray(row.elements) && row.elements[0] && typeof row.elements[0] === 'object'
    ? row.elements[0] as Partial<StudioDesign>
    : {};
  const document = readStudioDocument(row.document);
  const documentDesign = document ? designFromDocument(document) : {};
  return {
    ...blankDesign(),
    ...elements,
    ...settings,
    ...documentDesign,
    id: row.id as number,
    name: String(row.name || settings.name || 'Untitled design'),
    libraryTemplateId: String(row.libraryTemplateId || settings.libraryTemplateId || qrManifest.templates[0]?.id),
    manifestVersion: String(row.manifestVersion || settings.manifestVersion || qrManifest.version),
    qrStyle: (row.qrStyle || settings.qrStyle || 'obsidian-ring') as QrStyleId,
    theme: (row.theme || settings.theme || 'light') as StudioTheme,
    widthMm: Number(row.widthMm || settings.widthMm || 120),
    heightMm: Number(row.heightMm || settings.heightMm || 70),
    updatedAt: String(row.updatedAt || ''),
  };
}

function builtInTemplates(): StudioDesign[] {
  return qrManifest.templates.slice(0, 6).map((template) => ({
    ...blankDesign(),
    id: `library:${template.id}`,
    name: template.label,
    libraryTemplateId: template.id,
    theme: template.defaultTheme,
    widthMm: 120,
    heightMm: 120 * (template.canvas.height / template.canvas.width),
    merchantName: template.merchantType,
    ...template.defaultCopy,
    destination: template.sampleDestination,
  }));
}

async function loadTemplates(): Promise<void> {
  try {
    const { data } = await axios.get<Record<string, unknown>[]>(`${API_BASE_URL}/admin/designs`);
    templates.value = data.length ? data.map(fromApi) : builtInTemplates();
    if (templates.value.length > 0 && selectedTemplateId.value === null) {
      selectedTemplateId.value = templates.value[0].id ?? null;
    }
  } catch {
    templates.value = builtInTemplates();
    selectedTemplateId.value = templates.value[0]?.id ?? null;
  }
}

// Renders a StudioDesign to a PNG data URL at 300 DPI.
// destinationOverride replaces design.destination so the QR encodes the
// target's actual shortQrUrl, not the URL the designer typed when saving.
async function renderToPng(design: StudioDesign, destinationOverride: string): Promise<string> {
  const def = templateDefinition(design);
  if (!def) return '';

  const layout = design.layout;
  const short = Math.min(def.canvas.width, def.canvas.height);
  const overrides = layout ? {
    qr: { x: layout.qr.x / def.canvas.width, y: layout.qr.y / def.canvas.height, size: layout.qr.w / short },
    copy: { ...layout.copy }, merchant: { ...layout.merchant }, brandmark: { ...layout.brandmark },
  } : {};
  const svg = renderTemplateSvg(def, { ...design, destination: destinationOverride }, overrides);
  const uri = svgDataUri(svg);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = uri;
  });

  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(design.widthMm * EXPORT_SCALE);
  canvas.height = Math.round(design.heightMm * EXPORT_SCALE);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

async function generatePreviews(): Promise<void> {
  if (!selectedTemplate.value || !selectedTargets.value.length) {
    previews.value = {};
    return;
  }
  isGenerating.value = true;
  previews.value = {};
  const result: Record<string, string> = {};
  for (const target of selectedTargets.value) {
    const destination = qrValueForTarget(target);
    if (!destination) continue;
    result[target.key] = await renderToPng(selectedTemplate.value, destination);
  }
  previews.value = result;
  isGenerating.value = false;
}

async function downloadAll(): Promise<void> {
  if (!selectedTemplate.value || !canExport.value) return;
  isDownloading.value = true;
  downloadProgress.value = 0;
  downloadTotal.value = selectedTargets.value.length;
  for (let i = 0; i < selectedTargets.value.length; i++) {
    const target = selectedTargets.value[i];
    const destination = qrValueForTarget(target);
    if (!destination) continue;
    const png = await renderToPng(selectedTemplate.value, destination);
    const link = document.createElement('a');
    link.download = `${safeFilename(target.label)}.png`;
    link.href = png;
    link.click();
    downloadProgress.value = i + 1;
    await new Promise(r => setTimeout(r, 350));
  }
  isDownloading.value = false;
}

function downloadSingle(target: QrTarget): void {
  const src = previews.value[target.key];
  if (!src) return;
  const link = document.createElement('a');
  link.download = `${safeFilename(target.label)}.png`;
  link.href = src;
  link.click();
}

function toggleAllTargets(): void {
  selectedTargetKeys.value = selectedTargetKeys.value.length === props.targets.length
    ? []
    : props.targets.map(target => target.key);
}

function escapeHtml(value: string): string {
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return value.replace(/[&<>"']/g, character => entities[character] ?? character);
}

async function printSelected(): Promise<void> {
  if (!canExport.value) return;
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.opener = null;
  await generatePreviews();
  const widthMm = selectedTemplate.value!.widthMm;
  const pages = selectedTargets.value.map(target => {
    const src = previews.value[target.key];
    return src ? `<figure><img src="${src}" alt="${escapeHtml(target.label)}"><figcaption>${escapeHtml(target.label)}</figcaption></figure>` : '';
  }).join('');
  printWindow.document.write(`<!doctype html><html><head><title>Peshkash QR print</title><style>@page{margin:10mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.sheet{display:flex;flex-wrap:wrap;align-items:flex-start;gap:8mm}figure{break-inside:avoid;margin:0;text-align:center;width:${widthMm}mm}img{display:block;height:auto;width:100%;margin:auto}figcaption{font-size:9pt;margin-top:3mm}</style></head><body><main class="sheet">${pages}</main><script>window.addEventListener('load',()=>window.print())<\/script></body></html>`);
  printWindow.document.close();
}

watch(selectedTemplate, () => { generatePreviews(); });
watch(selectedTargetKeys, () => { generatePreviews(); }, { deep: true });
watch(() => props.targets, (targets) => {
  selectedTargetKeys.value = targets.map(target => target.key);
}, { deep: true, immediate: true });
onMounted(() => { loadTemplates(); });
</script>

<template>
  <!-- No event state -->
  <div v-if="!event" class="ps-empty">
    <i class="bi bi-calendar-x"></i>
    <p>Open a specific event to use the Print Studio.</p>
  </div>

  <!-- No templates state -->
  <div v-else-if="!isGenerating && templates.length === 0" class="ps-empty">
    <i class="bi bi-layout-wtf"></i>
    <p>No print templates yet. Design one in Print Templates, then come back here.</p>
    <RouterLink class="btn btn-primary btn-sm" to="/dashboard/qr-templates">
      <i class="bi bi-plus-lg"></i> Create Template
    </RouterLink>
  </div>

  <!-- Main Print Studio -->
  <div v-else class="ps-root">

    <!-- Sticky Topbar -->
    <div class="ps-topbar">
      <div class="ps-event-pill">
        <i class="bi bi-calendar2-event"></i>
        <strong>{{ event.displayName }}</strong>
        <span class="ps-count-badge">{{ selectedTargets.length }}/{{ targets.length }} selected</span>
      </div>

      <div class="ps-controls">
        <div class="ps-template-picker">
          <span>Template</span>
          <select v-model="selectedTemplateId" class="form-select form-select-sm">
            <option :value="null" disabled>Pick a template…</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">
              {{ t.name }} ({{ t.widthMm }}×{{ t.heightMm }}mm)
            </option>
          </select>
        </div>

        <!-- Deep-links to the editor for the selected design, not the library root -->
        <RouterLink class="btn btn-outline-secondary btn-sm" :to="editTemplateRoute">
          <i class="bi bi-pencil-square"></i> Edit Template
        </RouterLink>

        <button class="btn btn-outline-secondary btn-sm" type="button" @click="toggleAllTargets">
          <i class="bi bi-check2-square"></i> {{ selectedTargetKeys.length === targets.length ? 'Clear all' : 'Select all' }}
        </button>

        <button class="btn btn-outline-primary btn-sm" :disabled="!canExport || isGenerating" type="button" @click="printSelected">
          <i class="bi bi-printer"></i> Print selection
        </button>

        <button
          class="btn btn-primary btn-sm"
          :disabled="!canExport || isDownloading || isGenerating"
          @click="downloadAll"
        >
          <template v-if="isDownloading">
            <i class="bi bi-hourglass-split spin"></i>
            {{ downloadProgress }}/{{ downloadTotal }} …
          </template>
          <template v-else-if="isGenerating">
            <i class="bi bi-hourglass-split spin"></i> Preparing…
          </template>
          <template v-else>
            <i class="bi bi-download"></i> Export PNGs ({{ selectedTargets.length }})
          </template>
        </button>
      </div>
    </div>

    <!-- Size hint -->
    <p v-if="selectedTemplate && exportPixelSize" class="ps-size-hint">
      <i class="bi bi-rulers"></i>
      Each PNG will be <strong>{{ selectedTemplate.widthMm }} × {{ selectedTemplate.heightMm }} mm</strong>
      at 300 DPI — <strong>{{ exportPixelSize.w }} × {{ exportPixelSize.h }} px</strong>
    </p>

    <div v-if="unmappedTargets.length" class="ps-production-blocker" role="alert">
      <i class="bi bi-shield-exclamation"></i>
      <div>
        <strong>Permanent QR mapping required</strong>
        <p>{{ unmappedTargets.length }} target{{ unmappedTargets.length === 1 ? '' : 's' }} would otherwise become a non-remappable direct link. Create the assets in QR Bank before printing.</p>
      </div>
      <RouterLink class="btn btn-outline-secondary btn-sm" to="/dashboard/qr">Open QR Bank</RouterLink>
    </div>

    <div v-else-if="printPreflight && !printPreflight.canExport" class="ps-production-blocker" role="alert">
      <i class="bi bi-shield-x"></i>
      <div>
        <strong>Print preflight blocked</strong>
        <p>{{ printPreflight.errors.map(error => error.detail).join(' ') }}</p>
      </div>
      <RouterLink class="btn btn-outline-secondary btn-sm" :to="editTemplateRoute">Fix template</RouterLink>
    </div>

    <!-- No targets -->
    <div v-if="targets.length === 0" class="ps-empty ps-empty--inline">
      <i class="bi bi-qr-code"></i>
      <p>No QR targets yet. Attach menus, link items, or select QR Bank assets first.</p>
    </div>

    <!-- Generating spinner -->
    <div v-else-if="isGenerating" class="ps-generating">
      <i class="bi bi-hourglass-split"></i>
      <p>Rendering previews at 300 DPI…</p>
    </div>

    <!-- QR Grid -->
    <div v-else class="ps-grid">
      <div v-for="target in targets" :key="target.key" class="ps-card" :class="{ 'ps-card--selected': selectedTargetKeys.includes(target.key) }">
        <label class="ps-card-select">
          <input v-model="selectedTargetKeys" type="checkbox" :value="target.key" :aria-label="`Select ${target.label}`" />
          <span>{{ selectedTargetKeys.includes(target.key) ? 'Selected' : 'Select' }}</span>
        </label>
        <!-- Template preview -->
        <div class="ps-card-preview" :style="selectedTemplate ? { aspectRatio: `${selectedTemplate.widthMm} / ${selectedTemplate.heightMm}` } : {}">
          <img
            v-if="previews[target.key]"
            :src="previews[target.key]"
            :alt="target.label"
            class="ps-preview-img"
          />
          <div v-else class="ps-preview-placeholder">
            <i class="bi bi-qr-code"></i>
          </div>
        </div>

        <!-- Info -->
        <div class="ps-card-meta">
          <strong class="ps-card-label">{{ target.label }}</strong>
          <span class="ps-card-sub">{{ target.context }} · {{ target.type }}</span>
          <code v-if="qrHashForTarget(target)" class="ps-card-hash">{{ qrHashForTarget(target) }}</code>
          <span v-else class="ps-card-direct" title="Create a permanent QR Bank mapping before printing">mapping required</span>
        </div>

        <!-- Download -->
        <button
          class="ps-card-dl"
          :disabled="!previews[target.key]"
          title="Download this QR as PNG"
          @click="downloadSingle(target)"
        >
          <i class="bi bi-download"></i>
        </button>
      </div>
    </div>

  </div>
</template>

<style scoped>
.ps-empty {
  align-items: center;
  color: #8C7667;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 60px 20px;
  text-align: center;
}

.ps-empty i { font-size: 2.4rem; opacity: 0.45; }
.ps-empty p { margin: 0; font-size: 0.9rem; }
.ps-empty--inline { padding: 40px 20px; }

.ps-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ps-production-blocker {
  align-items: center;
  background: #fff7ed;
  border: 1px solid #d7a45d;
  border-left-width: 4px;
  color: #5f4322;
  display: grid;
  gap: 12px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 12px 14px;
}

.ps-production-blocker > i { font-size: 1.35rem; }
.ps-production-blocker strong { display: block; font-size: 0.86rem; }
.ps-production-blocker p { font-size: 0.78rem; margin: 2px 0 0; }

/* Topbar */
.ps-topbar {
  align-items: center;
  background: #F5F2EE;
  border: 1px solid #E8DBCE;
  border-radius: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  padding: 12px 16px;
}

.ps-event-pill {
  align-items: center;
  display: flex;
  gap: 8px;
  font-size: 0.9rem;
}

.ps-event-pill i { color: #BD945A; }

.ps-count-badge {
  background: #F5F2EE;
  border-radius: 999px;
  color: #8C7667;
  font-size: 0.72rem;
  padding: 1px 8px;
}

.ps-controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ps-template-picker {
  align-items: center;
  display: flex;
  gap: 6px;
  font-size: 0.82rem;
  color: #8C7667;
}

.ps-template-picker select { min-width: 200px; }

/* Size hint */
.ps-size-hint {
  align-items: center;
  background: #F5F2EE;
  border: 1px solid #E8DBCE;
  border-radius: 6px;
  color: #8C7667;
  display: flex;
  font-size: 0.8rem;
  gap: 7px;
  margin: 0;
  padding: 8px 14px;
}

.ps-size-hint strong { color: #1A1410; }

/* Generating */
.ps-generating {
  align-items: center;
  color: #8C7667;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 48px 20px;
  text-align: center;
  font-size: 0.88rem;
}

.ps-generating i { font-size: 1.6rem; animation: spin 1.2s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1.2s linear infinite; display: inline-block; }

/* Grid */
.ps-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.ps-card {
  background: #F5F2EE;
  border: 1px solid #E8DBCE;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: box-shadow 0.14s, transform 0.1s;
}

.ps-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.09);
  transform: translateY(-1px);
}

.ps-card--selected { border-color: #BD945A; box-shadow: 0 0 0 1px rgba(189, 148, 90, 0.22); }
.ps-card-select {
  align-items: center;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #E8DBCE;
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.67rem;
  font-weight: 700;
  gap: 5px;
  left: 8px;
  padding: 3px 7px;
  position: absolute;
  top: 8px;
  z-index: 2;
}
.ps-card-select input { accent-color: #BD945A; }

.ps-card-preview {
  background: #F5F2EE;
  border-bottom: 1px solid #E8DBCE;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 12px;
}

.ps-preview-img {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  display: block;
  max-height: 160px;
  max-width: 100%;
  object-fit: contain;
}

.ps-preview-placeholder {
  align-items: center;
  color: #BD945A;
  display: flex;
  font-size: 2.4rem;
  height: 100px;
  justify-content: center;
  opacity: 0.4;
  width: 100%;
}

.ps-card-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px 8px;
}

.ps-card-label {
  color: #1A1410;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
}

.ps-card-sub {
  color: #8C7667;
  font-size: 0.72rem;
}

.ps-card-hash {
  background: #F5F2EE;
  border-radius: 3px;
  color: #1A1410;
  font-size: 0.68rem;
  padding: 1px 5px;
  word-break: break-all;
}

.ps-card-direct {
  background: rgba(189, 148, 90, 0.08);
  border-radius: 3px;
  color: #8C7667;
  font-size: 0.68rem;
  padding: 1px 5px;
}

.ps-card-dl {
  align-items: center;
  background: #F5F2EE;
  border: 0;
  border-top: 1px solid #E8DBCE;
  color: #BD945A;
  cursor: pointer;
  display: flex;
  font-size: 0.82rem;
  gap: 5px;
  justify-content: center;
  padding: 7px;
  transition: background 0.12s;
  width: 100%;
}

.ps-card-dl:hover:not(:disabled) { background: #EDE7DF; }
.ps-card-dl:disabled { color: #ccc; cursor: default; }

.btn { font-size: 0.84rem; }
.btn-sm { font-size: 0.78rem; padding: 4px 10px; }

@media (max-width: 720px) {
  .ps-production-blocker { grid-template-columns: auto minmax(0, 1fr); }
  .ps-production-blocker .btn { grid-column: 1 / -1; }
}
</style>
