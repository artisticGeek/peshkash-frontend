<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import axios from 'axios';
import { renderTemplateToCanvas, PrintTemplate, EXPORT_SCALE } from '../../utils/qrRenderer';
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

const templates = ref<PrintTemplate[]>([]);
const selectedTemplateId = ref<number | null>(null);
const previews = ref<Record<string, string>>({});
const isGenerating = ref(false);
const isDownloading = ref(false);
const downloadProgress = ref(0);

const selectedTemplate = computed(() =>
  templates.value.find(t => t.id === selectedTemplateId.value) ?? null
);

const exportPixelSize = computed(() => {
  if (!selectedTemplate.value) return null;
  return {
    w: Math.round(selectedTemplate.value.widthMm * EXPORT_SCALE),
    h: Math.round(selectedTemplate.value.heightMm * EXPORT_SCALE),
  };
});

function qrValueForTarget(target: QrTarget): string {
  const mapping = props.qrMappings.find(m => m.url === target.path || m.url === target.path + '/');
  return mapping?.shortQrUrl || (window.location.origin + target.path);
}

function qrHashForTarget(target: QrTarget): string | null {
  const mapping = props.qrMappings.find(m => m.url === target.path || m.url === target.path + '/');
  return mapping?.qrHash ?? null;
}

function safeFilename(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function loadTemplates() {
  try {
    const { data } = await axios.get<PrintTemplate[]>(`${API_BASE_URL}/admin/qr-templates`);
    templates.value = data;
    if (data.length > 0 && selectedTemplateId.value === null) {
      selectedTemplateId.value = data[0].id ?? null;
    }
  } catch { /* ignore */ }
}

async function generatePreviews() {
  if (!selectedTemplate.value || !props.targets.length) {
    previews.value = {};
    return;
  }
  isGenerating.value = true;
  previews.value = {};
  const result: Record<string, string> = {};
  for (const target of props.targets) {
    const canvas = document.createElement('canvas');
    await renderTemplateToCanvas(canvas, selectedTemplate.value, qrValueForTarget(target));
    result[target.key] = canvas.toDataURL('image/png');
  }
  previews.value = result;
  isGenerating.value = false;
}

async function downloadAll() {
  if (!selectedTemplate.value || !props.targets.length) return;
  isDownloading.value = true;
  downloadProgress.value = 0;
  for (let i = 0; i < props.targets.length; i++) {
    const target = props.targets[i];
    const canvas = document.createElement('canvas');
    await renderTemplateToCanvas(canvas, selectedTemplate.value, qrValueForTarget(target));
    const link = document.createElement('a');
    link.download = `${safeFilename(target.label)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    downloadProgress.value = Math.round(((i + 1) / props.targets.length) * 100);
    await new Promise(r => setTimeout(r, 350));
  }
  isDownloading.value = false;
}

function downloadSingle(target: QrTarget) {
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
          <select v-model.number="selectedTemplateId" class="form-select form-select-sm">
            <option :value="null" disabled>Pick a template…</option>
            <option v-for="t in templates" :key="t.id" :value="t.id">
              {{ t.name }} ({{ t.widthMm }}×{{ t.heightMm }}mm)
            </option>
          </select>
        </div>

        <RouterLink class="btn btn-outline-secondary btn-sm" to="/dashboard/qr-templates">
          <i class="bi bi-pencil-square"></i> Edit Templates
        </RouterLink>

        <button
          class="btn btn-primary btn-sm"
          :disabled="!selectedTemplate || targets.length === 0 || isDownloading || isGenerating"
          @click="downloadAll"
        >
          <template v-if="isDownloading">
            <i class="bi bi-hourglass-split"></i> {{ downloadProgress }}% …
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
  color: #9a8870;
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
  background: #fffcf7;
  border: 1px solid #e8dccb;
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
  background: #f0ece6;
  border-radius: 999px;
  color: #7a6a52;
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
  color: #7a6a52;
}

.ps-template-picker select { min-width: 200px; }

/* Size hint */
.ps-size-hint {
  align-items: center;
  background: #f5f0e8;
  border: 1px solid #e6dfd4;
  border-radius: 6px;
  color: #7a6a52;
  display: flex;
  font-size: 0.8rem;
  gap: 7px;
  margin: 0;
  padding: 8px 14px;
}

.ps-size-hint strong { color: #4a3f2e; }

/* Generating */
.ps-generating {
  align-items: center;
  color: #9a8870;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 48px 20px;
  text-align: center;
  font-size: 0.88rem;
}

.ps-generating i { font-size: 1.6rem; animation: spin 1.2s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

/* Grid */
.ps-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
}

.ps-card {
  background: #fffcf7;
  border: 1px solid #e6dfd4;
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
  background: #f5f0e8;
  border-bottom: 1px solid #e6dfd4;
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
  color: #c9a96e;
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
  color: #15191e;
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.3;
}

.ps-card-sub {
  color: #9a8870;
  font-size: 0.72rem;
}

.ps-card-hash {
  background: #f0ece6;
  border-radius: 3px;
  color: #5a4a32;
  font-size: 0.68rem;
  padding: 1px 5px;
  word-break: break-all;
}

.ps-card-direct {
  background: #f0f4ff;
  border-radius: 3px;
  color: #4a6a9a;
  font-size: 0.68rem;
  padding: 1px 5px;
}

.ps-card-dl {
  align-items: center;
  background: #fff;
  border: 0;
  border-top: 1px solid #ede8df;
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

.ps-card-dl:hover:not(:disabled) { background: #fdf5e8; }
.ps-card-dl:disabled { color: #ccc; cursor: default; }

.btn { font-size: 0.84rem; }
.btn-sm { font-size: 0.78rem; padding: 4px 10px; }
</style>
