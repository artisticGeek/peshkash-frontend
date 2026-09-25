<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import axios from 'axios';
import { EXPORT_SCALE } from '../../utils/qrRenderer';
import { createZip, dataUrlBytes } from '../../utils/zip';
import { brandKitLayout, renderTemplateSvg } from '../../features/qrStudio/templateRenderer';
import { svgDataUri } from '../../features/qrStudio/qrRenderer';
import { qrManifest, type FixedElementLayout, type QrTemplateDefinition, type StudioDesign, type QrStyleId, type StudioTheme } from '../../features/qrStudio/types';
import { DYNAMIC_FIELD_OPTIONS, missingDynamicFields, requiredDynamicFields, resolveDesignBindings, type DynamicValues } from '../../features/qrStudio/dynamicFields';
import { synthesizeCustomTemplate } from '../../features/qrStudio/customTemplate';
import { designFromDocument, readStudioDocument } from '../../features/designStudio/document/migrations';
import { preflightDesign } from '../../features/designStudio/export/preflight';
import { API_BASE_URL } from '../../config';

interface QrTarget { key: string; label: string; context: string; type: string; path: string; mappingId?: number; variables?: DynamicValues }
interface QrMapping { id: number; qrHash: string; url: string; shortQrUrl: string; finalPublicUrl: string; isActive: boolean }
interface EventRow { id: number; displayName: string; name: string }
const props = defineProps<{ event: EventRow | null; targets: QrTarget[]; qrMappings: QrMapping[] }>();

const step = ref<1 | 2 | 3>(1);
const templates = ref<StudioDesign[]>([]);
const selectedTemplateId = ref<number | string | null>(null);
const selectedTargetKeys = ref<string[]>([]);
const previews = ref<Record<string, string>>({});
const previewErrors = ref<Record<string, string>>({});
const isGenerating = ref(false);
const isExporting = ref(false);
const progress = ref(0);
const progressTotal = ref(0);
const targetSearch = ref('');
const targetType = ref('all');
const templateSearch = ref('');
const templateFilter = ref<'all' | 'dynamic' | 'compatible'>('all');
const templateSort = ref<'updated' | 'name'>('updated');
const previewTargetKeys = ref<string[]>([]);
const previewFilter = ref<'all' | 'problems'>('all');
const zoomedTargetKey = ref<string | null>(null);
const showPrintSetup = ref(false);
type PaperSizeId = 'a3' | 'a4' | 'a5' | 'letter' | 'legal' | 'tabloid' | 'photo-4x6';
interface PaperSize { id: PaperSizeId; label: string; widthMm: number; heightMm: number }
const paperSizes: PaperSize[] = [
  { id: 'a3', label: 'A3', widthMm: 297, heightMm: 420 },
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'a5', label: 'A5', widthMm: 148, heightMm: 210 },
  { id: 'letter', label: 'US Letter', widthMm: 215.9, heightMm: 279.4 },
  { id: 'legal', label: 'US Legal', widthMm: 215.9, heightMm: 355.6 },
  { id: 'tabloid', label: 'Tabloid', widthMm: 279.4, heightMm: 431.8 },
  { id: 'photo-4x6', label: '4 × 6 in', widthMm: 101.6, heightMm: 152.4 },
];
const printPaperSize = ref<PaperSizeId>('a4');
const printOrientation = ref<'portrait' | 'landscape'>('portrait');
const printMarginMm = ref(10);
const printGapMm = ref(6);
const printColumns = ref(2);
const printCaptions = ref(true);
const thumbnailCache = new Map<string, string>();
const selectedTemplate = computed(() => templates.value.find(t => String(t.id) === String(selectedTemplateId.value)) ?? null);
const selectedTargets = computed(() => props.targets.filter(t => selectedTargetKeys.value.includes(t.key)));
const previewTargets = computed(() => props.targets.filter(t => previewTargetKeys.value.includes(t.key)));
const targetTypes = computed(() => [...new Set(props.targets.map(t => t.type))].sort());
const visibleTargets = computed(() => { const q = targetSearch.value.trim().toLowerCase(); return props.targets.filter(t => (targetType.value === 'all' || t.type === targetType.value) && (!q || `${t.label} ${t.context} ${t.type} ${mappingForTarget(t)?.qrHash || ''}`.toLowerCase().includes(q))); });
const unmappedTargets = computed(() => selectedTargets.value.filter(t => !mappingForTarget(t)));
const targetProblems = computed<Record<string, string>>(() => {
  const design = selectedTemplate.value; if (!design) return {};
  return Object.fromEntries(previewTargets.value.flatMap(target => { const problem = targetProblem(design, target); return problem ? [[target.key, problem]] : []; }));
});
const blockingProblems = computed(() => selectedTargets.value.filter(target => targetProblems.value[target.key] || previewErrors.value[target.key]));
const failedPreviewTargets = computed(() => previewTargets.value.filter(target => previewErrors.value[target.key]));
const filteredPreviewTargets = computed(() => previewTargets.value.filter(target => previewFilter.value === 'all' || targetProblems.value[target.key] || previewErrors.value[target.key]));
const zoomedTarget = computed(() => previewTargets.value.find(target => target.key === zoomedTargetKey.value) ?? null);
const allVisibleSelected = computed(() => visibleTargets.value.length > 0 && visibleTargets.value.every(target => selectedTargetKeys.value.includes(target.key)));
const visibleTemplates = computed(() => {
  const query = templateSearch.value.trim().toLowerCase();
  const filtered = templates.value.filter(template => {
    if (query && !`${template.name} ${template.widthMm} ${template.heightMm}`.toLowerCase().includes(query)) return false;
    if (templateFilter.value === 'dynamic' && !requiredDynamicFields(template).length) return false;
    if (templateFilter.value === 'compatible' && templateCompatibility(template).compatible !== props.targets.length) return false;
    return true;
  });
  return filtered.sort((a, b) => templateSort.value === 'name' ? a.name.localeCompare(b.name) : String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) || a.name.localeCompare(b.name));
});
const exportPixelSize = computed(() => selectedTemplate.value ? { w: Math.round(selectedTemplate.value.widthMm * EXPORT_SCALE), h: Math.round(selectedTemplate.value.heightMm * EXPORT_SCALE) } : null);
const editTemplateRoute = computed(() => typeof selectedTemplate.value?.id === 'number' ? `/dashboard/qr-templates?edit=${selectedTemplate.value.id}` : '/dashboard/qr-templates');
const zipFilename = computed(() => `${safeFilename(props.event?.displayName || 'peshkash')}-qr-assets.zip`);
const selectedPaper = computed(() => paperSizes.find(paper => paper.id === printPaperSize.value) ?? paperSizes[1]);
const printPageDimensions = computed(() => printOrientation.value === 'portrait'
  ? { widthMm: selectedPaper.value.widthMm, heightMm: selectedPaper.value.heightMm }
  : { widthMm: selectedPaper.value.heightMm, heightMm: selectedPaper.value.widthMm });
const printSheetSummary = computed(() => `${selectedPaper.value.label} · ${printOrientation.value === 'portrait' ? 'Portrait' : 'Landscape'} · ${printColumns.value} column${printColumns.value === 1 ? '' : 's'} · ${printMarginMm.value} mm margin · ${printGapMm.value} mm gap`);

function mappingForTarget(target: QrTarget): QrMapping | null {
  if (target.mappingId) return props.qrMappings.find(m => m.id === target.mappingId) ?? null;
  const path = target.path.replace(/\/$/, '');
  return props.qrMappings.find(m => m.url.replace(/\/$/, '') === path) ?? null;
}
function displayTargetLabel(target: QrTarget): string { return target.label.replace(/\s*\(dynamic\)$/i, '').trim(); }
function targetValues(target: QrTarget, mapping: QrMapping): DynamicValues {
  return { 'target.name': target.label, 'target.type': target.type, 'qr.hash': mapping.qrHash, 'qr.shortUrl': mapping.shortQrUrl, ...target.variables };
}
function targetProblem(design: StudioDesign, target: QrTarget): string {
  const mapping = mappingForTarget(target);
  if (!mapping) return 'Permanent QR mapping required';
  const missing = missingDynamicFields(design, targetValues(target, mapping));
  if (!missing.length) return '';
  const labels = missing.map(key => DYNAMIC_FIELD_OPTIONS.find(option => option.value === key)?.label || key);
  return `Missing dynamic data: ${labels.join(', ')}`;
}
function templateCompatibility(design: StudioDesign) {
  const problems = props.targets.filter(target => targetProblem(design, target));
  return { compatible: props.targets.length - problems.length, total: props.targets.length, problems: problems.length };
}
function isDynamicTemplate(design: StudioDesign) { return requiredDynamicFields(design).length > 0; }
function templateDefinition(design: StudioDesign): QrTemplateDefinition | undefined {
  return qrManifest.templates.find(t => t.id === design.libraryTemplateId) ?? (design.customTemplate ? synthesizeCustomTemplate(design.customTemplate, { id: design.libraryTemplateId, label: design.name }) : undefined);
}
function layoutFor(design: StudioDesign, template: QrTemplateDefinition): FixedElementLayout {
  if (design.layout) return design.layout;
  const kit = brandKitLayout(template); const short = Math.min(template.canvas.width, template.canvas.height); const size = template.qr.size * short;
  return { qr: { x: template.qr.x * template.canvas.width, y: template.qr.y * template.canvas.height, w: size, h: size }, ...kit };
}
const printPreflight = computed(() => {
  const design = selectedTemplate.value; const firstTarget = selectedTargets.value.find(t => mappingForTarget(t));
  if (!design || !firstTarget) return null;
  const mapping = mappingForTarget(firstTarget)!; const definition = templateDefinition(design); if (!definition) return null;
  const isLocalPreview = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const destination = import.meta.env.DEV || isLocalPreview ? `https://peshkash.app/${mapping.qrHash}` : mapping.shortQrUrl;
  return preflightDesign({ ...resolveDesignBindings(design, targetValues(firstTarget, mapping)), destination }, definition, layoutFor(design, definition));
});
const canExport = computed(() => Boolean(selectedTemplate.value && selectedTargets.value.length && !unmappedTargets.value.length && !blockingProblems.value.length && printPreflight.value?.canExport));

function blankDesign(): StudioDesign { return { name: '', libraryTemplateId: qrManifest.templates[0]?.id ?? '', manifestVersion: qrManifest.version, qrStyle: 'obsidian-ring', theme: 'light', widthMm: 120, heightMm: 70, merchantName: '', eyebrow: '', headline: '', descriptor: '', cta: '', destination: 'https://peshkash.app' }; }
function fromApi(row: Record<string, unknown>): StudioDesign {
  const settings = (row.settings || {}) as Partial<StudioDesign>;
  const legacy = Array.isArray(row.elements) && row.elements[0] && typeof row.elements[0] === 'object' ? row.elements[0] as Partial<StudioDesign> : {};
  const document = readStudioDocument(row.document);
  return { ...blankDesign(), ...legacy, ...settings, ...(document ? designFromDocument(document) : {}), id: Number(row.id), name: String(row.name || settings.name || 'Untitled design'), libraryTemplateId: String(row.libraryTemplateId || settings.libraryTemplateId || qrManifest.templates[0]?.id), manifestVersion: String(row.manifestVersion || settings.manifestVersion || qrManifest.version), qrStyle: (row.qrStyle || settings.qrStyle || 'obsidian-ring') as QrStyleId, theme: (row.theme || settings.theme || 'light') as StudioTheme, widthMm: Number(row.widthMm || settings.widthMm || 120), heightMm: Number(row.heightMm || settings.heightMm || 70), updatedAt: String(row.updatedAt || '') };
}
function builtInTemplates(): StudioDesign[] { return qrManifest.templates.slice(0, 6).map(t => ({ ...blankDesign(), id: `library:${t.id}`, name: t.label, libraryTemplateId: t.id, theme: t.defaultTheme, widthMm: 120, heightMm: 120 * (t.canvas.height / t.canvas.width), merchantName: t.merchantType, ...t.defaultCopy, destination: t.sampleDestination })); }
async function loadTemplates(): Promise<void> { try { const { data } = await axios.get<Record<string, unknown>[]>(`${API_BASE_URL}/admin/designs`); templates.value = data.length ? data.map(fromApi) : builtInTemplates(); } catch { templates.value = builtInTemplates(); } selectedTemplateId.value ??= templates.value[0]?.id ?? null; }

function templateThumbnail(design: StudioDesign): string {
  const key = String(design.id ?? design.libraryTemplateId);
  const cached = thumbnailCache.get(key); if (cached) return cached;
  const definition = templateDefinition(design); if (!definition) return '';
  const samples = Object.fromEntries(DYNAMIC_FIELD_OPTIONS.map(option => [option.value, option.sample])) as DynamicValues;
  const resolved = resolveDesignBindings(design, samples); const layout = resolved.layout; const short = Math.min(definition.canvas.width, definition.canvas.height);
  const overrides = layout ? { qr: { x: layout.qr.x / definition.canvas.width, y: layout.qr.y / definition.canvas.height, size: layout.qr.w / short }, copy: { ...layout.copy }, merchant: { ...layout.merchant }, brandmark: { ...layout.brandmark } } : {};
  const uri = svgDataUri(renderTemplateSvg(definition, resolved, overrides)); thumbnailCache.set(key, uri); return uri;
}

async function renderToPng(design: StudioDesign, target: QrTarget, pixelScale: number): Promise<string> {
  const mapping = mappingForTarget(target); const definition = templateDefinition(design);
  if (!mapping || !definition) throw new Error('A permanent QR mapping or template is missing.');
  const resolved = resolveDesignBindings(design, targetValues(target, mapping)); const layout = resolved.layout; const short = Math.min(definition.canvas.width, definition.canvas.height);
  const overrides = layout ? { qr: { x: layout.qr.x / definition.canvas.width, y: layout.qr.y / definition.canvas.height, size: layout.qr.w / short }, copy: { ...layout.copy }, merchant: { ...layout.merchant }, brandmark: { ...layout.brandmark } } : {};
  const svg = renderTemplateSvg(definition, { ...resolved, destination: mapping.shortQrUrl }, overrides);
  const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The template image could not be rendered.')); image.src = svgDataUri(svg); });
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(design.widthMm * pixelScale)); canvas.height = Math.max(1, Math.round(design.heightMm * pixelScale)); canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
async function renderBatch(targets: QrTarget[], pixelScale: number, report = false): Promise<Record<string, string>> {
  if (!selectedTemplate.value) return {}; const output: Record<string, string> = {}; const errors: Record<string, string> = {}; let cursor = 0;
  if (report) { progress.value = 0; progressTotal.value = targets.length; }
  async function worker() { while (cursor < targets.length) { const target = targets[cursor++]; try { output[target.key] = await renderToPng(selectedTemplate.value!, target, pixelScale); } catch (e) { errors[target.key] = e instanceof Error ? e.message : 'Render failed'; } if (report) progress.value++; } }
  await Promise.all(Array.from({ length: Math.min(3, targets.length) }, () => worker()));
  const nextErrors = { ...previewErrors.value }; for (const target of targets) delete nextErrors[target.key]; previewErrors.value = { ...nextErrors, ...errors }; return output;
}
async function generatePreviews() { if (!selectedTemplate.value || !previewTargets.value.length) { previews.value = {}; return; } isGenerating.value = true; previewErrors.value = {}; previews.value = await renderBatch(previewTargets.value, 6, true); isGenerating.value = false; }
async function retryFailedPreviews() { if (!failedPreviewTargets.value.length) return; isGenerating.value = true; const recovered = await renderBatch(failedPreviewTargets.value, 6, true); previews.value = { ...previews.value, ...recovered }; isGenerating.value = false; }
function safeFilename(v: string) { return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'qr'; }
function uniqueFilename(t: QrTarget, i: number) { return `${String(i + 1).padStart(2, '0')}-${safeFilename(t.label)}-${safeFilename(mappingForTarget(t)?.qrHash || t.key)}.png`; }
function downloadBlob(blob: Blob, filename: string) { const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(href), 1000); }
async function exportZip() { if (!selectedTemplate.value || !canExport.value) return; isExporting.value = true; const images = await renderBatch(selectedTargets.value, EXPORT_SCALE, true); const files = selectedTargets.value.filter(t => images[t.key]).map((t, i) => ({ name: uniqueFilename(t, i), data: dataUrlBytes(images[t.key]) })); if (files.length) downloadBlob(createZip(files), zipFilename.value); isExporting.value = false; }
function escapeHtml(v: string) { return v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] ?? c); }
async function printSheet() {
  if (!selectedTemplate.value || !canExport.value) return; const win = window.open('', '_blank'); if (!win) return; win.opener = null; win.document.write('<!doctype html><title>Preparing QR print…</title><p style="font:16px sans-serif;padding:24px">Preparing print-quality QR assets…</p>'); isExporting.value = true;
  const images = await renderBatch(selectedTargets.value, EXPORT_SCALE, true);
  const cards = selectedTargets.value.map(t => images[t.key] ? `<figure><img src="${images[t.key]}" alt="${escapeHtml(t.label)}">${printCaptions.value ? `<figcaption>${escapeHtml(t.label)}</figcaption>` : ''}</figure>` : '').join('');
  const pageSize = `${printPageDimensions.value.widthMm}mm ${printPageDimensions.value.heightMm}mm`;
  win.document.open(); win.document.write(`<!doctype html><html><head><title>Peshkash QR sheet</title><style>@page{size:${pageSize};margin:${printMarginMm.value}mm}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}.sheet{display:grid;grid-template-columns:repeat(${printColumns.value},minmax(0,1fr));gap:${printGapMm.value}mm;align-items:start}figure{break-inside:avoid;margin:0;text-align:center}img{display:block;width:100%;height:auto;object-fit:contain}figcaption{font-size:8pt;margin-top:2mm}</style></head><body><main class="sheet">${cards}</main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150))<\/script></body></html>`); win.document.close(); showPrintSetup.value = false; isExporting.value = false;
}
function toggleAllVisible() { const keys = visibleTargets.value.map(t => t.key); const all = keys.length > 0 && keys.every(k => selectedTargetKeys.value.includes(k)); selectedTargetKeys.value = all ? selectedTargetKeys.value.filter(k => !keys.includes(k)) : [...new Set([...selectedTargetKeys.value, ...keys])]; }
async function nextStep() { if (step.value === 1 && selectedTemplate.value) step.value = 2; else if (step.value === 2 && selectedTargets.value.length) { previewTargetKeys.value = [...selectedTargetKeys.value]; step.value = 3; await generatePreviews(); } }
function previousStep() { if (step.value > 1) step.value = (step.value - 1) as 1 | 2; }
watch(() => props.targets, targets => { selectedTargetKeys.value = targets.map(t => t.key); }, { deep: true, immediate: true });
watch(selectedTemplateId, () => { previews.value = {}; if (step.value === 3) void generatePreviews(); });
onMounted(loadTemplates);
</script>

<template>
  <div v-if="!event" class="ps-empty"><i class="bi bi-calendar-x"></i><p>Open a specific event to use the Print Studio.</p></div>
  <div v-else class="ps-root">
    <ol class="ps-steps"><li v-for="item in [{ n: 1, label: 'Template' }, { n: 2, label: 'QR assets' }, { n: 3, label: 'Preview & export' }]" :key="item.n" :class="{ active: step === item.n, done: step > item.n }"><span>{{ step > item.n ? '✓' : item.n }}</span><b>{{ item.label }}</b></li></ol>
    <section v-if="step === 1" class="ps-stage">
      <div class="ps-stage-heading"><div><p>Step 1 of 3</p><h4>Choose a print template</h4><small>Templates are checked against every QR in this batch.</small></div><RouterLink class="btn btn-outline-secondary btn-sm" to="/dashboard/qr-templates" target="_blank"><i class="bi bi-plus-lg"></i> New template</RouterLink></div>
      <div class="ps-toolbar">
        <label class="ps-search"><i class="bi bi-search"></i><input v-model="templateSearch" type="search" placeholder="Search templates…"></label>
        <select v-model="templateFilter" aria-label="Filter templates"><option value="all">All templates</option><option value="dynamic">Dynamic fields</option><option value="compatible">Fully compatible</option></select>
        <select v-model="templateSort" aria-label="Sort templates"><option value="updated">Recently updated</option><option value="name">Name A–Z</option></select>
      </div>
      <div v-if="!templates.length" class="ps-empty"><i class="bi bi-layout-wtf"></i><p>Loading templates…</p></div>
      <div v-else-if="visibleTemplates.length" class="ps-template-grid"><button v-for="t in visibleTemplates" :key="t.id" type="button" class="ps-template-card" :class="{ selected: String(selectedTemplateId) === String(t.id), incompatible: templateCompatibility(t).problems > 0 }" :aria-pressed="String(selectedTemplateId) === String(t.id)" @click="selectedTemplateId = t.id ?? null"><span class="ps-template-shape" :style="{ aspectRatio: `${t.widthMm}/${t.heightMm}` }"><img :src="templateThumbnail(t)" alt=""></span><span class="ps-template-copy"><b :title="t.name">{{ t.name }}</b><small>{{ t.widthMm }} × {{ t.heightMm }} mm</small><span class="ps-badges"><em v-if="isDynamicTemplate(t)">Dynamic</em><em :class="{ warning: templateCompatibility(t).problems }">{{ templateCompatibility(t).compatible }}/{{ templateCompatibility(t).total }} compatible</em></span></span><i class="bi bi-check-circle-fill"></i></button></div>
      <div v-else class="ps-empty ps-empty--compact"><i class="bi bi-search"></i><p>No templates match these filters.</p></div>
    </section>
    <section v-else-if="step === 2" class="ps-stage">
      <div class="ps-stage-heading"><div><p>Step 2 of 3</p><h4>Select QR assets</h4><small>{{ selectedTargets.length }} of {{ targets.length }} selected.</small></div><button class="btn btn-outline-secondary btn-sm" type="button" @click="toggleAllVisible"><i class="bi bi-check2-square"></i> {{ allVisibleSelected ? 'Clear visible results' : 'Select all visible results' }}</button></div>
      <div class="ps-toolbar ps-toolbar--targets"><label class="ps-search"><i class="bi bi-search"></i><input v-model="targetSearch" type="search" placeholder="Search name, type or QR hash…"></label><select v-model="targetType" aria-label="Filter QR type"><option value="all">All QR types</option><option v-for="type in targetTypes" :key="type" :value="type">{{ type }}</option></select></div>
      <div class="ps-target-list"><label v-for="target in visibleTargets" :key="target.key" class="ps-target-row" :class="{ selected: selectedTargetKeys.includes(target.key), error: selectedTemplate && targetProblem(selectedTemplate, target) }"><input v-model="selectedTargetKeys" type="checkbox" :value="target.key"><span class="ps-target-icon"><i class="bi bi-qr-code"></i></span><span><b>{{ displayTargetLabel(target) }}</b><small>{{ target.context }} · {{ target.type }}</small><em v-if="selectedTemplate && targetProblem(selectedTemplate, target)"><i class="bi bi-exclamation-triangle"></i> {{ targetProblem(selectedTemplate, target) }}</em><em v-else><i class="bi bi-check-circle"></i> Ready for this template</em></span><code>{{ mappingForTarget(target)?.qrHash || 'mapping required' }}</code></label></div>
    </section>
    <section v-else class="ps-stage ps-stage--preview">
      <div class="ps-stage-heading"><div><p>Step 3 of 3</p><h4>Proof the rendered QRs</h4><small>Open any card at full size. Excluded cards remain here so they can be restored.</small></div><RouterLink class="btn btn-outline-secondary btn-sm" :to="editTemplateRoute" target="_blank" title="Opens in a new tab so this batch stays intact"><i class="bi bi-pencil-square"></i> Edit template <i class="bi bi-box-arrow-up-right"></i></RouterLink></div>
      <div v-if="unmappedTargets.length" class="ps-blocker"><i class="bi bi-shield-exclamation"></i><div><b>Permanent mapping required</b><p>{{ unmappedTargets.length }} selected asset{{ unmappedTargets.length === 1 ? '' : 's' }} cannot be printed yet.</p></div><RouterLink class="btn btn-outline-secondary btn-sm" to="/dashboard/qr">Open QR Bank</RouterLink></div>
      <div v-else-if="printPreflight && !printPreflight.canExport" class="ps-blocker"><i class="bi bi-shield-x"></i><div><b>Print preflight blocked</b><p>{{ printPreflight.errors.map(e => e.detail).join(' ') }}</p></div><RouterLink class="btn btn-outline-secondary btn-sm" :to="editTemplateRoute">Fix template</RouterLink></div>
      <div class="ps-proof-tools"><div><button type="button" :class="{ active: previewFilter === 'all' }" @click="previewFilter = 'all'">All {{ previewTargets.length }}</button><button type="button" :class="{ active: previewFilter === 'problems' }" @click="previewFilter = 'problems'">Problems {{ Object.keys(targetProblems).length + failedPreviewTargets.length }}</button></div><button v-if="failedPreviewTargets.length" class="btn btn-outline-secondary btn-sm" type="button" @click="retryFailedPreviews"><i class="bi bi-arrow-clockwise"></i> Retry failed</button><span v-else-if="!isGenerating"><i class="bi bi-check-circle-fill"></i> {{ previews ? Object.keys(previews).length : 0 }} previews rendered</span></div>
      <div v-if="isGenerating" class="ps-progress"><i class="bi bi-arrow-repeat spin"></i><span>Rendering {{ progress }}/{{ progressTotal }} actual previews…</span></div>
      <div v-if="filteredPreviewTargets.length" class="ps-grid"><article v-for="target in filteredPreviewTargets" :key="target.key" class="ps-card" :class="{ error: previewErrors[target.key] || targetProblems[target.key], excluded: !selectedTargetKeys.includes(target.key) }"><div class="ps-card-top"><label><input v-model="selectedTargetKeys" type="checkbox" :value="target.key"><span>{{ selectedTargetKeys.includes(target.key) ? 'Included' : 'Excluded' }}</span></label><button type="button" :disabled="!previews[target.key]" @click="zoomedTargetKey = target.key"><i class="bi bi-arrows-fullscreen"></i> Inspect</button></div><button class="ps-card-preview" type="button" :style="selectedTemplate ? { aspectRatio: `${selectedTemplate.widthMm}/${selectedTemplate.heightMm}` } : {}" :disabled="!previews[target.key]" @click="zoomedTargetKey = target.key"><img v-if="previews[target.key]" :src="previews[target.key]" :alt="`Rendered QR for ${displayTargetLabel(target)}`"><span v-else><i class="bi bi-hourglass-split"></i></span></button><div class="ps-card-meta"><b>{{ displayTargetLabel(target) }}</b><small>{{ target.context }} · {{ target.type }}</small><code>{{ mappingForTarget(target)?.qrHash }}</code><p v-if="targetProblems[target.key]">{{ targetProblems[target.key] }}</p><p v-if="previewErrors[target.key]">{{ previewErrors[target.key] }}</p><em v-if="!targetProblems[target.key] && !previewErrors[target.key]"><i class="bi bi-check-circle"></i> Data and mapping ready</em></div></article></div>
      <div v-else class="ps-empty ps-empty--compact"><i class="bi bi-check-circle"></i><p>No problem cards in this batch.</p></div>
    </section>
    <footer class="ps-footer"><div><button v-if="step > 1" class="btn btn-outline-secondary" type="button" :disabled="isGenerating || isExporting" @click="previousStep"><i class="bi bi-arrow-left"></i> Back</button></div><span v-if="step === 3 && exportPixelSize"><b>{{ selectedTargets.length }} included</b> · {{ previewTargets.length - selectedTargets.length }} excluded · {{ exportPixelSize.w }} × {{ exportPixelSize.h }} px at 300 DPI</span><button v-if="step < 3" class="btn btn-primary" type="button" :disabled="(step === 1 && !selectedTemplate) || (step === 2 && !selectedTargets.length)" @click="nextStep">Continue <i class="bi bi-arrow-right"></i></button><div v-else class="ps-actions"><button class="btn btn-outline-primary" type="button" :disabled="!canExport || isGenerating || isExporting" @click="showPrintSetup = true"><i class="bi bi-printer"></i> Print setup</button><button class="btn btn-primary" type="button" :disabled="!canExport || isGenerating || isExporting" @click="exportZip"><i class="bi bi-file-earmark-zip"></i> {{ isExporting ? `Preparing ${progress}/${progressTotal}` : `Export ZIP (${selectedTargets.length})` }}</button></div></footer>
    <div v-if="zoomedTarget" class="ps-overlay" role="dialog" aria-modal="true" :aria-label="`Inspect ${displayTargetLabel(zoomedTarget)}`" @click.self="zoomedTargetKey = null"><div class="ps-proof-modal"><header><div><small>Actual rendered proof</small><h4>{{ displayTargetLabel(zoomedTarget) }}</h4><code>{{ mappingForTarget(zoomedTarget)?.shortQrUrl }}</code></div><button type="button" aria-label="Close proof" @click="zoomedTargetKey = null"><i class="bi bi-x-lg"></i></button></header><div class="ps-proof-image"><img :src="previews[zoomedTarget.key]" :alt="`Full proof for ${displayTargetLabel(zoomedTarget)}`"></div><footer><span><i class="bi bi-zoom-in"></i> Review copy, spacing and QR quiet zone at full size.</span><label><input v-model="selectedTargetKeys" type="checkbox" :value="zoomedTarget.key"> Include in export</label></footer></div></div>
    <div v-if="showPrintSetup" class="ps-overlay" role="dialog" aria-modal="true" aria-label="Print setup" @click.self="showPrintSetup = false"><div class="ps-print-modal"><header><div><small>Print setup</small><h4>{{ selectedPaper.label }} sheet</h4></div><button type="button" aria-label="Close print setup" @click="showPrintSetup = false"><i class="bi bi-x-lg"></i></button></header><div class="ps-print-body"><div class="ps-print-controls"><label>Paper size<select v-model="printPaperSize"><option v-for="paper in paperSizes" :key="paper.id" :value="paper.id">{{ paper.label }} · {{ paper.widthMm }} × {{ paper.heightMm }} mm</option></select></label><label>Orientation<select v-model="printOrientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><label>Cards per row<select v-model.number="printColumns"><option v-for="columns in 6" :key="columns" :value="columns">{{ columns }}</option></select></label><label>Page margin<input v-model.number="printMarginMm" type="number" min="0" max="30"><span>mm</span></label><label>Card gap<input v-model.number="printGapMm" type="number" min="0" max="20"><span>mm</span></label><label class="ps-check"><input v-model="printCaptions" type="checkbox"> Print card names below artwork</label></div><div class="ps-sheet-summary" :style="{ '--sheet-ratio': `${printPageDimensions.widthMm}/${printPageDimensions.heightMm}` }"><i class="bi bi-file-earmark-text"></i><b>{{ selectedTargets.length }} cards</b><span>{{ printSheetSummary }}</span><small>{{ printPageDimensions.widthMm }} × {{ printPageDimensions.heightMm }} mm. The system print dialog opens next for printer and copy settings.</small></div></div><footer><button class="btn btn-outline-secondary" type="button" @click="showPrintSetup = false">Cancel</button><button class="btn btn-primary" type="button" @click="printSheet"><i class="bi bi-printer"></i> Open print preview</button></footer></div></div>
  </div>
</template>

<style scoped>
.ps-root{display:flex;flex-direction:column;gap:16px;min-height:520px}.ps-steps{background:#f7f3ee;border:1px solid #e6d9cc;display:grid;grid-template-columns:repeat(3,1fr);list-style:none;margin:0;padding:0}.ps-steps li{align-items:center;color:#9a8879;display:flex;gap:9px;padding:12px 16px}.ps-steps li+li{border-left:1px solid #e6d9cc}.ps-steps span{align-items:center;border:1px solid #cfc0b2;border-radius:50%;display:flex;font-size:11px;height:24px;justify-content:center;width:24px}.ps-steps b{font-size:12px}.ps-steps li.active{background:#fff;color:#2b211a}.ps-steps li.active span,.ps-steps li.done span{background:#b98b51;border-color:#b98b51;color:#fff}.ps-stage{display:flex;flex:1;flex-direction:column;gap:14px;min-height:360px}.ps-stage--preview{min-height:480px}.ps-stage-heading{align-items:flex-start;display:flex;gap:16px;justify-content:space-between}.ps-stage-heading p{color:#ad7d43;font-size:10px;font-weight:700;letter-spacing:.12em;margin:0 0 3px;text-transform:uppercase}.ps-stage-heading h4{font:400 22px Rufina,serif;margin:0}.ps-stage-heading small{color:#827365;display:block;font-size:12px;margin-top:4px}.ps-template-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));max-height:50vh;overflow:auto;padding:2px}.ps-template-card{align-items:center;background:#fff;border:1px solid #ded3c8;display:grid;gap:12px;grid-template-columns:58px 1fr auto;padding:12px;text-align:left}.ps-template-card:hover,.ps-template-card.selected{border-color:#b98b51;box-shadow:0 0 0 1px #b98b51}.ps-template-card>i{color:#b98b51;opacity:0}.ps-template-card.selected>i{opacity:1}.ps-template-card span:nth-child(2){display:grid;gap:3px;min-width:0}.ps-template-card b{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ps-template-card small{color:#8c7b6d;font-size:10px}.ps-template-shape{align-items:center;background:#eee7df;border:1px solid #d6c9bd;display:flex;justify-content:center;max-height:52px;width:58px}.ps-template-shape i{color:#34281f;font-size:22px}.ps-search{align-items:center;border:1px solid #dcd1c7;display:flex;gap:8px;padding:8px 11px}.ps-search input{border:0;outline:0;width:100%}.ps-target-list{border:1px solid #e1d7cd;max-height:48vh;overflow:auto}.ps-target-row{align-items:center;display:grid;gap:12px;grid-template-columns:auto 34px minmax(0,1fr) auto;padding:10px 12px}.ps-target-row+.ps-target-row{border-top:1px solid #eee7e0}.ps-target-row.selected{background:#fbf7f1}.ps-target-row>span:nth-of-type(2){display:grid}.ps-target-row b{font-size:12px}.ps-target-row small{color:#847568;font-size:10px}.ps-target-row code{color:#7a6655;font-size:10px}.ps-target-icon{align-items:center;background:#eee7df;display:flex;height:32px;justify-content:center;width:32px}.ps-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));max-height:55vh;overflow:auto;padding:2px}.ps-card{background:#fff;border:1px solid #ded4ca;display:flex;flex-direction:column;position:relative}.ps-card.error{border-color:#b8493d}.ps-card-check{align-items:center;background:rgba(255,255,255,.94);display:flex;font-size:10px;font-weight:700;gap:5px;left:7px;padding:4px 7px;position:absolute;top:7px;z-index:2}.ps-card-preview{align-items:center;background:#eae4de;display:flex;justify-content:center;overflow:hidden}.ps-card-preview img{display:block;height:100%;object-fit:contain;width:100%}.ps-card-preview>div{color:#a29284}.ps-card-meta{display:grid;gap:3px;padding:10px 11px}.ps-card-meta b{font-size:12px}.ps-card-meta small{color:#817267;font-size:10px}.ps-card-meta code{font-size:9px}.ps-card-meta p{color:#a33;font-size:10px;margin:3px 0 0}.ps-blocker{align-items:center;background:#fff7ed;border:1px solid #d7a45d;border-left-width:4px;color:#5f4322;display:grid;gap:12px;grid-template-columns:auto minmax(0,1fr) auto;padding:12px 14px}.ps-blocker>i{font-size:20px}.ps-blocker b{font-size:12px}.ps-blocker p{font-size:11px;margin:2px 0 0}.ps-progress{align-items:center;background:#f7f3ee;color:#745d48;display:flex;font-size:11px;gap:8px;padding:8px 11px}.ps-footer{align-items:center;border-top:1px solid #e3d8ce;display:grid;gap:12px;grid-template-columns:1fr auto 1fr;padding-top:14px}.ps-footer>span{color:#857466;font-size:10px;text-align:center}.ps-footer>button,.ps-actions{justify-self:end}.ps-actions{display:flex;gap:8px}.ps-empty{align-items:center;color:#8c7667;display:flex;flex-direction:column;gap:10px;justify-content:center;padding:48px;text-align:center}.ps-empty i{font-size:28px}.spin{animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:720px){.ps-steps b{display:none}.ps-steps li{justify-content:center}.ps-stage-heading{flex-direction:column}.ps-footer{grid-template-columns:1fr}.ps-footer>*{justify-self:stretch!important}.ps-actions{display:grid;grid-template-columns:1fr 1fr}.ps-target-row{grid-template-columns:auto 34px minmax(0,1fr)}.ps-target-row code{display:none}}
</style>

<style scoped>
.ps-toolbar{display:grid;gap:10px;grid-template-columns:minmax(240px,1fr) 170px 170px}.ps-toolbar select,.ps-print-controls select,.ps-print-controls input{background:#fff;border:1px solid #dcd1c7;color:#352a22;min-height:40px;padding:8px 10px}.ps-toolbar--targets{grid-template-columns:minmax(260px,1fr) 220px}.ps-template-card{align-items:stretch;grid-template-columns:92px minmax(0,1fr) auto;min-height:112px;padding:10px}.ps-template-card.incompatible{border-color:#e0c9a7}.ps-template-shape{background:#e9e1d8;height:90px;max-height:90px;overflow:hidden;width:92px}.ps-template-shape img{height:100%;object-fit:contain;width:100%}.ps-template-copy{align-content:center}.ps-template-card b{line-height:1.25;overflow:visible;text-overflow:clip;white-space:normal}.ps-badges{display:flex!important;flex-wrap:wrap;gap:4px!important;margin-top:5px}.ps-badges em{background:#ede7df;color:#655548;font-size:8px;font-style:normal;font-weight:700;letter-spacing:.04em;padding:3px 5px;text-transform:uppercase}.ps-badges em.warning{background:#fff0dd;color:#895916}.ps-target-row.error{background:#fff9f2}.ps-target-row em,.ps-card-meta em{color:#55735d;font-size:9px;font-style:normal;margin-top:3px}.ps-target-row em:has(.bi-exclamation-triangle){color:#9b5f1b}.ps-proof-tools{align-items:center;display:flex;gap:10px;justify-content:space-between}.ps-proof-tools>div{background:#f3eee8;display:flex;padding:3px}.ps-proof-tools button:not(.btn){background:transparent;border:0;color:#78695d;font-size:10px;font-weight:700;padding:7px 10px}.ps-proof-tools button.active{background:#fff;color:#33271f;box-shadow:0 1px 3px #0001}.ps-proof-tools>span{color:#55735d;font-size:10px}.ps-grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr));max-height:52vh}.ps-card.excluded{opacity:.58}.ps-card.excluded .ps-card-preview{filter:grayscale(.8)}.ps-card-top{align-items:center;background:#faf7f3;display:flex;justify-content:space-between;padding:7px 9px}.ps-card-top label{align-items:center;display:flex;font-size:10px;font-weight:700;gap:6px}.ps-card-top button{background:transparent;border:0;color:#6d5948;font-size:10px}.ps-card-preview{border:0;cursor:zoom-in;padding:0;width:100%}.ps-card-preview:disabled{cursor:wait}.ps-card-preview span{color:#a29284}.ps-card-meta{grid-template-columns:minmax(0,1fr) auto}.ps-card-meta>*{grid-column:1/-1}.ps-card-meta code{overflow-wrap:anywhere}.ps-empty--compact{min-height:180px;padding:28px}.ps-overlay{align-items:center;background:rgba(27,21,17,.72);display:flex;inset:0;justify-content:center;padding:24px;position:fixed;z-index:1200}.ps-proof-modal,.ps-print-modal{background:#fdfaf6;box-shadow:0 24px 80px #0007;display:flex;flex-direction:column;max-height:94vh;max-width:1080px;width:min(94vw,1080px)}.ps-proof-modal>header,.ps-print-modal>header{align-items:flex-start;border-bottom:1px solid #dfd4ca;display:flex;justify-content:space-between;padding:18px 20px}.ps-proof-modal header small,.ps-print-modal header small{color:#ad7d43;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.ps-proof-modal h4,.ps-print-modal h4{font:400 22px Rufina,serif;margin:3px 0}.ps-proof-modal header code{font-size:10px}.ps-proof-modal header button,.ps-print-modal header button{background:transparent;border:0;font-size:18px}.ps-proof-image{align-items:center;background:#ded6ce;display:flex;justify-content:center;min-height:260px;overflow:auto;padding:24px}.ps-proof-image img{display:block;height:auto;max-height:68vh;max-width:100%;object-fit:contain}.ps-proof-modal>footer,.ps-print-modal>footer{align-items:center;border-top:1px solid #dfd4ca;display:flex;justify-content:space-between;padding:14px 20px}.ps-proof-modal footer span,.ps-proof-modal footer label{font-size:11px}.ps-print-modal{max-width:720px}.ps-print-body{display:grid;gap:24px;grid-template-columns:minmax(0,1fr) 230px;padding:22px}.ps-print-controls{display:grid;gap:12px;grid-template-columns:1fr 1fr}.ps-print-controls label{color:#5f5146;display:grid;font-size:10px;font-weight:700;gap:5px;position:relative;text-transform:uppercase}.ps-print-controls label>span{bottom:12px;font-size:10px;position:absolute;right:10px}.ps-print-controls .ps-check{align-items:center;display:flex;grid-column:1/-1;grid-template-columns:auto 1fr;text-transform:none}.ps-print-controls .ps-check input{min-height:auto}.ps-sheet-summary{align-items:center;background:#f1ebe4;display:flex;flex-direction:column;gap:7px;justify-content:center;padding:22px;text-align:center}.ps-sheet-summary>i{font-size:38px}.ps-sheet-summary span,.ps-sheet-summary small{color:#77675b;font-size:10px}.ps-footer>span b{color:#3f332a}.ps-actions{flex-wrap:wrap}.ps-search:focus-within{border-color:#b98b51;box-shadow:0 0 0 2px rgba(185,139,81,.16)}
@media(max-width:850px){.ps-toolbar,.ps-toolbar--targets{grid-template-columns:1fr}.ps-template-card{grid-template-columns:76px minmax(0,1fr) auto}.ps-template-shape{height:74px;width:76px}.ps-print-body{grid-template-columns:1fr}.ps-grid{grid-template-columns:1fr}}
</style>
