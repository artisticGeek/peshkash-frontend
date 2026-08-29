<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import axios from 'axios';
import { EXPORT_SCALE } from '../../utils/qrRenderer';
import { renderTemplateSvg } from '../../features/qrStudio/templateRenderer';
import { svgDataUri } from '../../features/qrStudio/qrRenderer';
import { qrManifest, type StudioDesign, type QrStyleId, type StudioTheme } from '../../features/qrStudio/types';
import { synthesizeCustomTemplate } from '../../features/qrStudio/customTemplate';
import { designFromDocument, readStudioDocument } from '../../features/designStudio/document/migrations';
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
  selectedTemplate.value?.id
    ? `/dashboard/qr-templates?edit=${selectedTemplate.value.id}`
    : '/dashboard/qr-templates'
);

function qrValueForTarget(target: QrTarget): string {
  const mapping = props.qrMappings.find(m => m.url === target.path || m.url === target.path + '/');
  return mapping?.shortQrUrl || (window.location.origin + target.path);
}

function qrHashForTarget(target: QrTarget): string | null {
  const mapping = props.qrMappings.find(m => m.url === target.path || m.url === target.path + '/');
  return mapping?.qrHash ?? null;
}

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

async function loadTemplates(): Promise<void> {
  try {
    const { data } = await axios.get<Record<string, unknown>[]>(`${API_BASE_URL}/admin/designs`);
    templates.value = data.map(fromApi);
    if (templates.value.length > 0 && selectedTemplateId.value === null) {
      selectedTemplateId.value = templates.value[0].id ?? null;
    }
  } catch { /* ignore */ }
}

// Renders a StudioDesign to a PNG data URL at 300 DPI.
// destinationOverride replaces design.destination so the QR encodes the
// target's actual shortQrUrl, not the URL the designer typed when saving.
async function renderToPng(design: StudioDesign, destinationOverride: string): Promise<string> {
  const def = qrManifest.templates.find(t => t.id === design.libraryTemplateId)
    ?? (design.customTemplate ? synthesizeCustomTemplate(design.customTemplate, { id: design.libraryTemplateId, label: design.name }) : undefined);
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
  if (!selectedTemplate.value || !props.targets.length) {
    previews.value = {};
    return;
  }
  isGenerating.value = true;
  previews.value = {};
  const result: Record<string, string> = {};
  for (const target of props.targets) {
    result[target.key] = await renderToPng(selectedTemplate.value, qrValueForTarget(target));
  }
  previews.value = result;
  isGenerating.value = false;
}

async function downloadAll(): Promise<void> {
  if (!selectedTemplate.value || !props.targets.length) return;
  isDownloading.value = true;
  downloadProgress.value = 0;
  downloadTotal.value = props.targets.length;
  for (let i = 0; i < props.targets.length; i++) {
    const target = props.targets[i];
    const png = await renderToPng(selectedTemplate.value, qrValueForTarget(target));
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

watch(selectedTemplate, () => { generatePreviews(); });
watch(() => props.targets, () => { generatePreviews(); }, { deep: true });
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
        <span class="ps-count-badge">{{ targets.length }} QR{{ targets.length !== 1 ? 's' : '' }}</span>
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

        <button
          class="btn btn-primary btn-sm"
          :disabled="!selectedTemplate || targets.length === 0 || isDownloading || isGenerating"
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
            <i class="bi bi-download"></i> Download All ({{ targets.length }})
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

    <!-- No targets -->
    <div v-if="targets.length === 0" class="ps-empty ps-empty--inline">
      <i class="bi bi-qr-code"></i>
      <p>No QR targets for this event yet. Attach menus or link items first.</p>
    </div>

    <!-- Generating spinner -->
    <div v-else-if="isGenerating" class="ps-generating">
      <i class="bi bi-hourglass-split"></i>
      <p>Rendering previews at 300 DPI…</p>
    </div>

    <!-- QR Grid -->
    <div v-else class="ps-grid">
      <div v-for="target in targets" :key="target.key" class="ps-card">
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
          <span v-else class="ps-card-direct" title="No QR Bank entry — encodes the full path URL">direct link</span>
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
</style>
