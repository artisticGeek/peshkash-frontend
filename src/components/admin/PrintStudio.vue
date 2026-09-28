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
import { corelPngCardObject } from '../../features/qrStudio/corelSvg';
import { designFromDocument, readStudioDocument } from '../../features/designStudio/document/migrations';
import { preflightDesign } from '../../features/designStudio/export/preflight';
import { packSheets, type PackingGrouping } from '../../features/qrStudio/sheetPacking';
import { API_BASE_URL } from '../../config';

const COREL_EXPORT_SCALE = 600 / 25.4;

interface QrTarget { key: string; label: string; context: string; type: string; path: string; mappingId?: number; variables?: DynamicValues; sourceKey?: string }
interface QrMapping { id: number; qrHash: string; url: string; shortQrUrl: string; finalPublicUrl: string; isActive: boolean }
interface EventRow { id: number; displayName: string; name: string }
interface PrintCollectionConfiguration {
  version: 1;
  orderedTargetKeys: string[];
  selectedTemplateId: string;
  targetTemplateIds: Record<string, string>;
  objects?: Array<{ key: string; sourceKey: string; label: string }>;
  print: Record<string, string | number | boolean>;
}
interface PrintCollectionRow { id: number | string; name: string; eventId: number | null; configuration: PrintCollectionConfiguration; updatedAt?: string; local?: boolean }
const props = defineProps<{ event: EventRow | null; targets: QrTarget[]; qrMappings: QrMapping[]; vendorId?: number; collectionMode?: boolean }>();

const step = ref<1 | 2 | 3>(1);
const templates = ref<StudioDesign[]>([]);
const selectedTemplateId = ref<number | string | null>(null);
const targetTemplateIds = ref<Record<string, string>>({});
const selectedTargetKeys = ref<string[]>([]);
const collectionCopies = ref<QrTarget[]>([]);
const previews = ref<Record<string, string>>({});
const assetPreviews = ref<Record<string, string>>({});
const assetPreviewLoading = ref<string[]>([]);
const previewErrors = ref<Record<string, string>>({});
const isGenerating = ref(false);
const isExporting = ref(false);
const changingTemplateKeys = ref<string[]>([]);
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
const savedCollections = ref<PrintCollectionRow[]>([]);
const collectionName = ref('');
const activeCollectionId = ref<number | string | null>(null);
const collectionNotice = ref('');
const isSavingCollection = ref(false);
type PaperSizeId = 'a3' | 'a4' | 'a5' | 'letter' | 'legal' | 'tabloid' | 'photo-4x6' | 'custom';
type PrintUnit = 'mm' | 'cm' | 'in';
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
const printSides = ref<'single' | 'double'>('single');
const includeCutContour = ref(true);
const includeRegistrationMarks = ref(true);
const printMarginMm = ref(10);
const printGapMm = ref(6);
const cutCornerRadiusMm = ref(2);
const cutOffsetMm = ref(0);
const printUnit = ref<PrintUnit>('mm');
const customPaperWidthMm = ref(210);
const customPaperHeightMm = ref(297);
const artworkScalePercent = ref(100);
const printColumns = ref(2);
const printCaptions = ref(true);
const printGrouping = ref<PackingGrouping>('optimized');
const thumbnailCache = new Map<string, string>();
const selectedTemplate = computed(() => templates.value.find(t => String(t.id) === String(selectedTemplateId.value)) ?? null);
const availableTargets = computed(() => [...props.targets, ...collectionCopies.value]);
const targetByKey = computed(() => new Map(availableTargets.value.map(target => [target.key, target])));
const selectedTargets = computed(() => selectedTargetKeys.value.map(key => targetByKey.value.get(key)).filter((target): target is QrTarget => Boolean(target)));
const previewTargets = computed(() => previewTargetKeys.value.map(key => targetByKey.value.get(key)).filter((target): target is QrTarget => Boolean(target)));
const collectionGroups = computed(() => {
  const groups = new Map<string, { source: QrTarget; instances: QrTarget[] }>();
  selectedTargets.value.forEach(target => {
    const sourceKey = target.sourceKey || target.key; const source = props.targets.find(item => item.key === sourceKey) || target;
    const group = groups.get(sourceKey) || { source, instances: [] }; group.instances.push(target); groups.set(sourceKey, group);
  });
  return [...groups.values()];
});
const targetTypes = computed(() => [...new Set(props.targets.map(t => t.type))].sort());
const visibleTargets = computed(() => { const q = targetSearch.value.trim().toLowerCase(); return props.targets.filter(t => (targetType.value === 'all' || t.type === targetType.value) && (!q || `${t.label} ${t.context} ${t.type} ${mappingForTarget(t)?.qrHash || ''}`.toLowerCase().includes(q))); });
const unmappedTargets = computed(() => selectedTargets.value.filter(t => !mappingForTarget(t)));
const targetProblems = computed<Record<string, string>>(() => Object.fromEntries(previewTargets.value.flatMap(target => {
  const design = designForTarget(target); if (!design) return [];
  const problem = targetProblem(design, target); return problem ? [[target.key, problem]] : [];
})));
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
const editTemplateRoute = computed(() => typeof selectedTemplate.value?.id === 'number' ? `/dashboard/qr-templates?edit=${selectedTemplate.value.id}` : '/dashboard/qr-templates');
const zipFilename = computed(() => `${safeFilename(props.event?.displayName || 'peshkash')}-qr-assets.zip`);
const selectedPaper = computed<PaperSize>(() => printPaperSize.value === 'custom'
  ? { id: 'custom', label: 'Custom size', widthMm: customPaperWidthMm.value, heightMm: customPaperHeightMm.value }
  : paperSizes.find(paper => paper.id === printPaperSize.value) ?? paperSizes[1]);
const unitFactor = computed(() => printUnit.value === 'in' ? 25.4 : printUnit.value === 'cm' ? 10 : 1);
const displayUnit = computed(() => printUnit.value === 'in' ? 'in' : printUnit.value);
function mmValue(model: typeof customPaperWidthMm) { return computed<number>({ get: () => Number((model.value / unitFactor.value).toFixed(printUnit.value === 'mm' ? 1 : 2)), set: value => { model.value = Math.max(0, Number(value) || 0) * unitFactor.value; } }); }
const customPaperWidth = mmValue(customPaperWidthMm);
const customPaperHeight = mmValue(customPaperHeightMm);
const printMargin = mmValue(printMarginMm);
const printGap = mmValue(printGapMm);
const cutCornerRadius = mmValue(cutCornerRadiusMm);
const cutOffset = mmValue(cutOffsetMm);
const printPageDimensions = computed(() => printOrientation.value === 'portrait'
  ? { widthMm: selectedPaper.value.widthMm, heightMm: selectedPaper.value.heightMm }
  : { widthMm: selectedPaper.value.heightMm, heightMm: selectedPaper.value.widthMm });
interface ArtworkSize { width: number; height: number; captionHeight: number }
interface SheetPlacement extends ArtworkSize { target: QrTarget; index: number; x: number; mirroredX: number; y: number; row: number }
interface SheetPage { number: number; placements: SheetPlacement[] }
interface SheetLayout { pageWidth: number; pageHeight: number; margin: number; gap: number; columns: number; rows: number; pageCount: number; fits: boolean; pages: SheetPage[] }
function artworkSizeFor(target: QrTarget): ArtworkSize {
  const design = designForTarget(target);
  const scale = Math.max(0.05, (Number(artworkScalePercent.value) || 100) / 100);
  return {
    width: Math.max(1, (design?.widthMm || 1) * scale),
    height: Math.max(1, (design?.heightMm || 1) * scale),
    captionHeight: printCaptions.value ? 6 : 0,
  };
}
const artworkSizeSummary = computed(() => {
  const sizes = selectedTargets.value.map(artworkSizeFor);
  if (!sizes.length) return 'No artworks selected';
  const format = (value: number) => (value / unitFactor.value).toFixed(printUnit.value === 'mm' ? 1 : 2);
  const widths = sizes.map(size => size.width); const heights = sizes.map(size => size.height);
  return `${format(Math.min(...widths))}–${format(Math.max(...widths))} × ${format(Math.min(...heights))}–${format(Math.max(...heights))} ${displayUnit.value}`;
});
const sheetLayout = computed<SheetLayout>(() => {
  const { widthMm: pageWidth, heightMm: pageHeight } = printPageDimensions.value;
  const margin = Math.max(0, printMarginMm.value); const gap = Math.max(0, printGapMm.value);
  const items = selectedTargets.value.map((target, index) => {
    const size = artworkSizeFor(target);
    return { value: { target, index, ...size }, index, width: size.width, height: size.height + size.captionHeight, groupKey: targetTemplateId(target) };
  });
  const packed = packSheets(items, { pageWidth, pageHeight, margin, gap, maxPerRow: printColumns.value, grouping: printGrouping.value });
  const pages: SheetPage[] = packed.pages.map(page => ({
    number: page.number,
    placements: page.items.map(item => ({ ...item.value, x: item.x, mirroredX: pageWidth - item.x - item.value.width, y: item.y, row: item.row })),
  }));
  return { pageWidth, pageHeight, margin, gap, columns: packed.columns, rows: packed.rows, pageCount: packed.pageCount, fits: packed.fits, pages };
});
const productionCanvasCount = computed(() => sheetLayout.value.pageCount * (1 + (printSides.value === 'double' ? 1 : 0) + (includeCutContour.value ? 1 : 0)));
const groupingLabel = computed(() => ({ optimized: 'Best fit', size: 'Grouped by size', template: 'Grouped by template', order: 'Collection order' })[printGrouping.value]);
const printSheetSummary = computed(() => `${selectedPaper.value.label} · ${printOrientation.value === 'portrait' ? 'Portrait' : 'Landscape'} · ${printSides.value === 'double' ? 'Duplex' : 'Single-sided'} · ${groupingLabel.value} · ${sheetLayout.value.columns} across · ${sheetLayout.value.pageCount} sheet${sheetLayout.value.pageCount === 1 ? '' : 's'}`);
const printPreviewPages = computed(() => sheetLayout.value.pages.slice(0, 4));
const printPreviewSurfaces = computed(() => printPreviewPages.value.flatMap(page => [
  { ...page, kind: 'front' as const, label: 'Front print' },
  ...(printSides.value === 'double' ? [{ ...page, kind: 'back' as const, label: 'Back print · horizontally reversed placement' }] : []),
  ...(includeCutContour.value ? [{ ...page, kind: 'cut' as const, label: 'CutContour · plotter path' }] : []),
]));
function previewCardStyle(placement: SheetPlacement, mirrored = false, offset = 0): Record<string, string> {
  const layout = sheetLayout.value; const x = (mirrored ? placement.mirroredX : placement.x) - offset;
  return {
    left: `${(x / layout.pageWidth) * 100}%`,
    top: `${((placement.y - offset) / layout.pageHeight) * 100}%`,
    width: `${((placement.width + offset * 2) / layout.pageWidth) * 100}%`,
    height: `${((placement.height + offset * 2) / layout.pageHeight) * 100}%`,
  };
}

function mappingForTarget(target: QrTarget): QrMapping | null {
  if (target.mappingId) return props.qrMappings.find(m => m.id === target.mappingId) ?? null;
  const path = target.path.replace(/\/$/, '');
  return props.qrMappings.find(m => m.url.replace(/\/$/, '') === path) ?? null;
}
function displayTargetLabel(target: QrTarget): string { return target.label.replace(/\s*\((?:dynamic|static)\)$/i, '').trim(); }
function stripModeMarker(value: string): string { return value.replace(/(?:\s|\n)*\((?:dynamic|static)\)\s*$/i, '').trim(); }
function resolvePrintableDesign(design: StudioDesign, values: DynamicValues): StudioDesign {
  const resolved = resolveDesignBindings(design, values);
  for (const field of ['merchantName', 'eyebrow', 'headline', 'descriptor', 'cta'] as const) {
    resolved[field] = stripModeMarker(resolved[field]);
  }
  resolved.canvasElements = (resolved.canvasElements ?? []).map(element =>
    element.kind === 'text' || element.kind === 'cta'
      ? { ...element, text: stripModeMarker(element.text) }
      : element,
  );
  return resolved;
}
function targetValues(target: QrTarget, mapping: QrMapping): DynamicValues {
  const targetName = displayTargetLabel(target);
  const values: DynamicValues = {
    'target.name': targetName,
    'target.type': target.type,
    'qr.hash': mapping.qrHash,
    'qr.shortUrl': mapping.shortQrUrl,
    ...target.variables,
  };
  if (/event/i.test(target.type) && !values['menu.name']?.trim()) {
    values['menu.name'] = values['event.name']?.trim() || targetName;
  }
  if (/event/i.test(target.type) && !values['menu.description']?.trim()) {
    values['menu.description'] = values['event.description']?.trim() || values['target.description']?.trim() || '';
  }
  return values;
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
function designForTarget(target: QrTarget): StudioDesign | null {
  const override = targetTemplateIds.value[target.key];
  return templates.value.find(template => String(template.id) === String(override || selectedTemplateId.value)) ?? selectedTemplate.value;
}
function libraryDesignForTarget(target: QrTarget): StudioDesign | null {
  const assigned = targetTemplateIds.value[target.key];
  return templates.value.find(template => String(template.id) === String(assigned))
    ?? templates.value.find(template => !targetProblem(template, target))
    ?? selectedTemplate.value;
}
function targetTemplateId(target: QrTarget): string { return String(targetTemplateIds.value[target.key] || selectedTemplateId.value || ''); }
async function changeTargetTemplate(target: QrTarget, templateId: string): Promise<void> {
  const next = { ...targetTemplateIds.value };
  if (String(templateId) === String(selectedTemplateId.value)) delete next[target.key]; else next[target.key] = String(templateId);
  targetTemplateIds.value = next;
  const design = designForTarget(target); if (!design) return;
  changingTemplateKeys.value = [...new Set([...changingTemplateKeys.value, target.key])];
  const nextPreviews = { ...previews.value }; delete nextPreviews[target.key]; previews.value = nextPreviews;
  const nextErrors = { ...previewErrors.value }; delete nextErrors[target.key]; previewErrors.value = nextErrors;
  try { previews.value = { ...previews.value, [target.key]: await renderToPng(design, target, 6) }; }
  catch (error) { previewErrors.value = { ...previewErrors.value, [target.key]: error instanceof Error ? error.message : 'Render failed' }; }
  finally { changingTemplateKeys.value = changingTemplateKeys.value.filter(key => key !== target.key); }
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
  const firstTarget = selectedTargets.value.find(t => mappingForTarget(t)); const design = firstTarget ? designForTarget(firstTarget) : null;
  if (!design || !firstTarget) return null;
  const mapping = mappingForTarget(firstTarget)!; const definition = templateDefinition(design); if (!definition) return null;
  const isLocalPreview = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const destination = import.meta.env.DEV || isLocalPreview ? `https://peshkash.app/${mapping.qrHash}` : mapping.shortQrUrl;
  return preflightDesign({ ...resolvePrintableDesign(design, targetValues(firstTarget, mapping)), destination }, definition, layoutFor(design, definition));
});
const canExport = computed(() => Boolean(selectedTemplate.value && selectedTargets.value.length && !unmappedTargets.value.length && !blockingProblems.value.length && !changingTemplateKeys.value.length && printPreflight.value?.canExport));
const collectionIssue = computed(() => {
  if (!selectedTargets.value.length) return 'Add at least one QR artwork to print.';
  if (unmappedTargets.value.length) return `${unmappedTargets.value.length} artwork${unmappedTargets.value.length === 1 ? '' : 's'} need a permanent QR mapping.`;
  if (blockingProblems.value.length) return `${blockingProblems.value.length} artwork cop${blockingProblems.value.length === 1 ? 'y needs' : 'ies need'} a compatible template.`;
  if (printPreflight.value && !printPreflight.value.canExport) return printPreflight.value.errors.map(error => error.detail).join(' ');
  return '';
});

function blankDesign(): StudioDesign { return { name: '', libraryTemplateId: qrManifest.templates[0]?.id ?? '', manifestVersion: qrManifest.version, qrStyle: 'obsidian-ring', theme: 'light', widthMm: 120, heightMm: 70, merchantName: '', eyebrow: '', headline: '', descriptor: '', cta: '', destination: 'https://peshkash.app' }; }
function fromApi(row: Record<string, unknown>): StudioDesign {
  const settings = (row.settings || {}) as Partial<StudioDesign>;
  const legacy = Array.isArray(row.elements) && row.elements[0] && typeof row.elements[0] === 'object' ? row.elements[0] as Partial<StudioDesign> : {};
  const document = readStudioDocument(row.document);
  return { ...blankDesign(), ...legacy, ...settings, ...(document ? designFromDocument(document) : {}), id: Number(row.id), name: String(row.name || settings.name || 'Untitled design'), libraryTemplateId: String(row.libraryTemplateId || settings.libraryTemplateId || qrManifest.templates[0]?.id), manifestVersion: String(row.manifestVersion || settings.manifestVersion || qrManifest.version), qrStyle: (row.qrStyle || settings.qrStyle || 'obsidian-ring') as QrStyleId, theme: (row.theme || settings.theme || 'light') as StudioTheme, widthMm: Number(row.widthMm || settings.widthMm || 120), heightMm: Number(row.heightMm || settings.heightMm || 70), updatedAt: String(row.updatedAt || '') };
}
function builtInTemplates(): StudioDesign[] { return qrManifest.templates.slice(0, 6).map(t => ({ ...blankDesign(), id: `library:${t.id}`, name: t.label, libraryTemplateId: t.id, theme: t.defaultTheme, widthMm: 120, heightMm: 120 * (t.canvas.height / t.canvas.width), merchantName: t.merchantType, ...t.defaultCopy, destination: t.sampleDestination })); }
async function loadTemplates(): Promise<void> { try { const { data } = await axios.get<Record<string, unknown>[]>(`${API_BASE_URL}/admin/designs`); templates.value = data.length ? data.map(fromApi) : builtInTemplates(); } catch { templates.value = builtInTemplates(); } selectedTemplateId.value ??= templates.value[0]?.id ?? null; }
function ensureCollectionTemplateAssignments(): void {
  if (!props.collectionMode || !templates.value.length) return;
  const next = { ...targetTemplateIds.value };
  selectedTargets.value.forEach(target => {
    if (next[target.key] && templates.value.some(template => String(template.id) === String(next[target.key]))) return;
    const compatible = templates.value.find(template => !targetProblem(template, target)) || templates.value[0];
    if (compatible?.id != null) next[target.key] = String(compatible.id);
  });
  targetTemplateIds.value = next;
}

function collectionStorageKey(): string { return `peshkash:print-collections:${props.vendorId || 'workspace'}:${props.event?.id || 'all'}`; }
function readLocalCollections(): PrintCollectionRow[] {
  try { return JSON.parse(localStorage.getItem(collectionStorageKey()) || '[]') as PrintCollectionRow[]; }
  catch { return []; }
}
function writeLocalCollections(rows: PrintCollectionRow[]): void { localStorage.setItem(collectionStorageKey(), JSON.stringify(rows)); }
async function loadSavedCollections(): Promise<void> {
  if (!props.event) { savedCollections.value = []; return; }
  try {
    const { data } = await axios.get<PrintCollectionRow[]>(`${API_BASE_URL}/admin/print-collections`, { params: { eventId: props.event.id, vendorId: props.vendorId } });
    savedCollections.value = data;
  } catch {
    savedCollections.value = readLocalCollections();
  }
}
function collectionConfiguration(): PrintCollectionConfiguration {
  return {
    version: 1,
    orderedTargetKeys: [...selectedTargetKeys.value],
    selectedTemplateId: String(selectedTemplateId.value || ''),
    targetTemplateIds: { ...targetTemplateIds.value },
    objects: selectedTargets.value.map(target => ({ key: target.key, sourceKey: target.sourceKey || target.key, label: target.label })),
    print: {
      paperSize: printPaperSize.value, orientation: printOrientation.value, sides: printSides.value,
      includeCutContour: includeCutContour.value, includeRegistrationMarks: includeRegistrationMarks.value,
      marginMm: printMarginMm.value, gapMm: printGapMm.value, cutCornerRadiusMm: cutCornerRadiusMm.value,
      cutOffsetMm: cutOffsetMm.value, unit: printUnit.value, customPaperWidthMm: customPaperWidthMm.value,
      customPaperHeightMm: customPaperHeightMm.value, artworkScalePercent: artworkScalePercent.value,
      columns: printColumns.value, captions: printCaptions.value, grouping: printGrouping.value,
    },
  };
}
async function saveCollection(): Promise<void> {
  const name = collectionName.value.trim();
  if (!name || !props.event || !selectedTargetKeys.value.length) { collectionNotice.value = 'Enter a name and include at least one QR artwork.'; return; }
  isSavingCollection.value = true; collectionNotice.value = '';
  const payload = { name, eventId: props.event.id, vendorId: props.vendorId, configuration: collectionConfiguration() };
  try {
    const request = activeCollectionId.value && typeof activeCollectionId.value === 'number'
      ? axios.put<PrintCollectionRow>(`${API_BASE_URL}/admin/print-collections/${activeCollectionId.value}`, payload)
      : axios.post<PrintCollectionRow>(`${API_BASE_URL}/admin/print-collections`, payload);
    const { data } = await request;
    activeCollectionId.value = data.id;
    collectionNotice.value = `“${data.name}” is saved for this event.`;
    await loadSavedCollections();
  } catch {
    const rows = readLocalCollections();
    const id = typeof activeCollectionId.value === 'string' ? activeCollectionId.value : `local:${Date.now()}`;
    const row: PrintCollectionRow = { id, name, eventId: props.event.id || null, configuration: payload.configuration, updatedAt: new Date().toISOString(), local: true };
    const index = rows.findIndex(item => String(item.id) === String(id));
    if (index >= 0) rows[index] = row; else rows.unshift(row);
    writeLocalCollections(rows); savedCollections.value = rows; activeCollectionId.value = id;
    collectionNotice.value = `“${name}” is saved on this device. Server sync was unavailable.`;
  } finally { isSavingCollection.value = false; }
}
function startNewCollection(): void { activeCollectionId.value = null; collectionName.value = ''; collectionNotice.value = ''; }
async function newCollectionDraft(): Promise<void> {
  startNewCollection(); collectionCopies.value = []; targetTemplateIds.value = {};
  selectedTargetKeys.value = props.targets.map(target => target.key); ensureCollectionTemplateAssignments(); previewTargetKeys.value = [...selectedTargetKeys.value]; await generatePreviews();
}
function templateEditRoute(target: QrTarget): string {
  const id = designForTarget(target)?.id; return typeof id === 'number' ? `/dashboard/qr-templates?edit=${id}` : '/dashboard/qr-templates';
}
async function openCollection(collection: PrintCollectionRow): Promise<void> {
  const config = collection.configuration; const sources = new Map(props.targets.map(target => [target.key, target]));
  collectionCopies.value = (config.objects || []).flatMap(object => {
    if (object.key === object.sourceKey) return [];
    const source = sources.get(object.sourceKey); return source ? [{ ...source, key: object.key, sourceKey: object.sourceKey, label: object.label || `${source.label} (copy)` }] : [];
  });
  const available = new Set([...props.targets, ...collectionCopies.value].map(target => target.key));
  const keys = (config.orderedTargetKeys || []).filter(key => available.has(key));
  if (!keys.length) { collectionNotice.value = 'None of the saved QR artworks are available in this event.'; return; }
  selectedTargetKeys.value = keys;
  selectedTemplateId.value = templates.value.some(template => String(template.id) === String(config.selectedTemplateId)) ? config.selectedTemplateId : (templates.value[0]?.id ?? null);
  targetTemplateIds.value = Object.fromEntries(Object.entries(config.targetTemplateIds || {}).filter(([key, templateId]) => available.has(key) && templates.value.some(template => String(template.id) === String(templateId))));
  ensureCollectionTemplateAssignments();
  const settings = config.print || {};
  if (settings.paperSize) printPaperSize.value = String(settings.paperSize) as PaperSizeId;
  if (settings.orientation) printOrientation.value = String(settings.orientation) as 'portrait' | 'landscape';
  if (settings.sides) printSides.value = String(settings.sides) as 'single' | 'double';
  if (typeof settings.includeCutContour === 'boolean') includeCutContour.value = settings.includeCutContour;
  if (typeof settings.includeRegistrationMarks === 'boolean') includeRegistrationMarks.value = settings.includeRegistrationMarks;
  if (Number.isFinite(Number(settings.marginMm))) printMarginMm.value = Number(settings.marginMm);
  if (Number.isFinite(Number(settings.gapMm))) printGapMm.value = Number(settings.gapMm);
  if (Number.isFinite(Number(settings.cutCornerRadiusMm))) cutCornerRadiusMm.value = Number(settings.cutCornerRadiusMm);
  if (Number.isFinite(Number(settings.cutOffsetMm))) cutOffsetMm.value = Number(settings.cutOffsetMm);
  if (settings.unit) printUnit.value = String(settings.unit) as PrintUnit;
  if (Number.isFinite(Number(settings.customPaperWidthMm))) customPaperWidthMm.value = Number(settings.customPaperWidthMm);
  if (Number.isFinite(Number(settings.customPaperHeightMm))) customPaperHeightMm.value = Number(settings.customPaperHeightMm);
  if (Number.isFinite(Number(settings.artworkScalePercent))) artworkScalePercent.value = Number(settings.artworkScalePercent);
  if (Number.isFinite(Number(settings.columns))) printColumns.value = Number(settings.columns);
  if (typeof settings.captions === 'boolean') printCaptions.value = settings.captions;
  if (['optimized', 'size', 'template', 'order'].includes(String(settings.grouping))) printGrouping.value = String(settings.grouping) as PackingGrouping;
  activeCollectionId.value = collection.id; collectionName.value = collection.name;
  const missing = (config.orderedTargetKeys || []).length - keys.length;
  collectionNotice.value = missing ? `${missing} saved artwork${missing === 1 ? '' : 's'} no longer exists and was skipped.` : `Loaded “${collection.name}”.`;
  previewTargetKeys.value = [...keys];
  if (props.collectionMode) { step.value = 2; await generatePreviews(); }
  else { step.value = 3; await generatePreviews(); showPrintSetup.value = true; }
}

function templateThumbnail(design: StudioDesign): string {
  const key = String(design.id ?? design.libraryTemplateId);
  const cached = thumbnailCache.get(key); if (cached) return cached;
  const definition = templateDefinition(design); if (!definition) return '';
  const samples = Object.fromEntries(DYNAMIC_FIELD_OPTIONS.map(option => [option.value, option.sample])) as DynamicValues;
  const resolved = resolvePrintableDesign(design, samples); const layout = resolved.layout; const short = Math.min(definition.canvas.width, definition.canvas.height);
  const overrides = layout ? { qr: { x: layout.qr.x / definition.canvas.width, y: layout.qr.y / definition.canvas.height, size: layout.qr.w / short }, copy: { ...layout.copy }, merchant: { ...layout.merchant }, brandmark: { ...layout.brandmark } } : {};
  const uri = svgDataUri(renderTemplateSvg(definition, resolved, overrides)); thumbnailCache.set(key, uri); return uri;
}

async function renderToPng(design: StudioDesign, target: QrTarget, pixelScale: number): Promise<string> {
  const svg = renderToSvg(design, target);
  const image = new Image(); await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The template image could not be rendered.')); image.src = svgDataUri(svg); });
  const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(design.widthMm * pixelScale)); canvas.height = Math.max(1, Math.round(design.heightMm * pixelScale)); canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}
function renderToSvg(design: StudioDesign, target: QrTarget): string {
  const mapping = mappingForTarget(target); const definition = templateDefinition(design);
  if (!mapping || !definition) throw new Error('A permanent QR mapping or template is missing.');
  const resolved = resolvePrintableDesign(design, targetValues(target, mapping)); const layout = resolved.layout; const short = Math.min(definition.canvas.width, definition.canvas.height);
  const overrides = layout ? { qr: { x: layout.qr.x / definition.canvas.width, y: layout.qr.y / definition.canvas.height, size: layout.qr.w / short }, copy: { ...layout.copy }, merchant: { ...layout.merchant }, brandmark: { ...layout.brandmark } } : {};
  return renderTemplateSvg(definition, { ...resolved, destination: mapping.shortQrUrl }, overrides);
}
async function renderBatch(targets: QrTarget[], pixelScale: number, report = false): Promise<Record<string, string>> {
  if (!selectedTemplate.value) return {}; const output: Record<string, string> = {}; const errors: Record<string, string> = {}; let cursor = 0;
  if (report) { progress.value = 0; progressTotal.value = targets.length; }
  async function worker() { while (cursor < targets.length) { const target = targets[cursor++]; const design = designForTarget(target); try { if (!design) throw new Error('A template is missing.'); output[target.key] = await renderToPng(design, target, pixelScale); } catch (e) { errors[target.key] = e instanceof Error ? e.message : 'Render failed'; } if (report) progress.value++; } }
  await Promise.all(Array.from({ length: Math.min(3, targets.length) }, () => worker()));
  const nextErrors = { ...previewErrors.value }; for (const target of targets) delete nextErrors[target.key]; previewErrors.value = { ...nextErrors, ...errors }; return output;
}
async function ensureAssetPreviews(targets = visibleTargets.value): Promise<void> {
  if (!props.collectionMode || !templates.value.length) return;
  const pending = targets.filter(target => !assetPreviews.value[target.key] && !assetPreviewLoading.value.includes(target.key));
  if (!pending.length) return;
  assetPreviewLoading.value = [...new Set([...assetPreviewLoading.value, ...pending.map(target => target.key)])];
  const output: Record<string, string> = {}; let cursor = 0;
  async function worker() {
    while (cursor < pending.length) {
      const target = pending[cursor++]; const design = libraryDesignForTarget(target);
      try { if (design) output[target.key] = await renderToPng(design, target, 2); } catch { /* Keep the QR placeholder when a library proof cannot render. */ }
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, pending.length) }, () => worker()));
  assetPreviews.value = { ...assetPreviews.value, ...output };
  const completed = new Set(pending.map(target => target.key));
  assetPreviewLoading.value = assetPreviewLoading.value.filter(key => !completed.has(key));
}
async function generatePreviews() { if (!selectedTemplate.value || !previewTargets.value.length) { previews.value = {}; return; } isGenerating.value = true; previewErrors.value = {}; previews.value = await renderBatch(previewTargets.value, 6, true); isGenerating.value = false; }
async function retryFailedPreviews() { if (!failedPreviewTargets.value.length) return; isGenerating.value = true; const recovered = await renderBatch(failedPreviewTargets.value, 6, true); previews.value = { ...previews.value, ...recovered }; isGenerating.value = false; }
function safeFilename(v: string) { return v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'qr'; }
function uniqueFilename(t: QrTarget, i: number) { return `${String(i + 1).padStart(2, '0')}-${safeFilename(displayTargetLabel(t))}-${safeFilename(mappingForTarget(t)?.qrHash || t.key)}.png`; }
function downloadBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = href; link.download = filename; link.style.display = 'none'; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
async function exportZip() { if (!selectedTemplate.value || !canExport.value) return; isExporting.value = true; const images = await renderBatch(selectedTargets.value, EXPORT_SCALE, true); const files = selectedTargets.value.filter(t => images[t.key]).map((t, i) => ({ name: uniqueFilename(t, i), data: dataUrlBytes(images[t.key]) })); if (files.length) downloadBlob(createZip(files), zipFilename.value); isExporting.value = false; }
function escapeXml(v: string) { return v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c] ?? c); }
async function renderCorelCard(design: StudioDesign, target: QrTarget, widthMm: number, heightMm: number, captionHeightMm: number): Promise<string> {
  const svg = renderToSvg(design, target);
  const source = new Image();
  await new Promise<void>((resolve, reject) => { source.onload = () => resolve(); source.onerror = () => reject(new Error('The CorelDRAW card could not be rendered.')); source.src = svgDataUri(svg); });
  const widthPx = Math.max(1, Math.round(widthMm * COREL_EXPORT_SCALE));
  const artworkHeightPx = Math.max(1, Math.round(heightMm * COREL_EXPORT_SCALE));
  const captionHeightPx = Math.max(0, Math.round(captionHeightMm * COREL_EXPORT_SCALE));
  const canvas = document.createElement('canvas'); canvas.width = widthPx; canvas.height = artworkHeightPx + captionHeightPx;
  const context = canvas.getContext('2d')!; context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
  const sourceRatio = source.naturalWidth / source.naturalHeight; const frameRatio = widthPx / artworkHeightPx;
  const drawWidth = sourceRatio >= frameRatio ? widthPx : artworkHeightPx * sourceRatio;
  const drawHeight = sourceRatio >= frameRatio ? widthPx / sourceRatio : artworkHeightPx;
  context.drawImage(source, (widthPx - drawWidth) / 2, (artworkHeightPx - drawHeight) / 2, drawWidth, drawHeight);
  if (captionHeightPx) {
    context.fillStyle = '#2b211a'; context.font = `${Math.max(10, Math.round(3.2 * COREL_EXPORT_SCALE))}px Arial, sans-serif`; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText(displayTargetLabel(target), widthPx / 2, artworkHeightPx + (captionHeightPx / 2), widthPx - Math.round(4 * COREL_EXPORT_SCALE));
  }
  return canvas.toDataURL('image/png');
}
async function renderCorelCards(layout: typeof sheetLayout.value): Promise<Record<string, string>> {
  const images: Record<string, string> = {}; let cursor = 0; progress.value = 0; progressTotal.value = selectedTargets.value.length;
  async function worker() {
    while (cursor < selectedTargets.value.length) {
      const target = selectedTargets.value[cursor++];
      const design = designForTarget(target); if (!design) throw new Error('A template is missing.');
      const size = artworkSizeFor(target);
      images[target.key] = await renderCorelCard(design, target, size.width, size.height, size.captionHeight);
      progress.value += 1;
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, selectedTargets.value.length) }, () => worker()));
  return images;
}
type CorelSurfaceKind = 'front' | 'back' | 'cut-contour';
interface CorelSurface { sheet: number; kind: CorelSurfaceKind; svg: string }
function registrationMarksSvg(layout: typeof sheetLayout.value): string {
  if (!includeRegistrationMarks.value) return '';
  const inset = Math.max(2.5, Math.min(7, layout.margin / 2)); const arm = 2; const radius = 1.2;
  const points = [[inset, inset], [layout.pageWidth - inset, inset], [inset, layout.pageHeight - inset], [layout.pageWidth - inset, layout.pageHeight - inset]];
  return `<g id="RegistrationMarks" data-layer="registration-marks" fill="none" stroke="#000000" stroke-width="0.1" vector-effect="non-scaling-stroke">${points.map(([x, y], index) => `<g id="registration-${index + 1}"><circle cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="${radius}"/><path d="M ${(x - arm).toFixed(3)} ${y.toFixed(3)} H ${(x + arm).toFixed(3)} M ${x.toFixed(3)} ${(y - arm).toFixed(3)} V ${(y + arm).toFixed(3)}"/></g>`).join('')}</g>`;
}
function corelDrawPages(assetPaths: Record<string, string>): CorelSurface[] {
  const layout = sheetLayout.value;
  if (!layout.fits || !layout.pages.length) return [];
  const { pageWidth, pageHeight } = layout;
  const surfaces: CorelSurface[] = [];
  for (const page of layout.pages) {
    const sheet = page.number; const placements = page.placements;
    const cardObjects = (mirrored: boolean) => placements.map(({ target, index, x, mirroredX, y, width, height, captionHeight }) => {
      return corelPngCardObject(assetPaths[target.key] || '', mirrored ? mirroredX : x, y, width, height + captionHeight, `qr-card-sheet-${sheet}-${mirrored ? 'back' : 'front'}-item-${index + 1}`, displayTargetLabel(target));
    }).join('');
    const document = (title: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${pageWidth}mm" height="${pageHeight}mm" viewBox="0 0 ${pageWidth} ${pageHeight}"><title>${escapeXml(title)}</title>${body}</svg>`;
    const registrationMarks = registrationMarksSvg(layout);
    surfaces.push({ sheet, kind: 'front', svg: document(`${props.event?.displayName || 'Peshkash'} sheet ${sheet} front print`, `${cardObjects(false)}${registrationMarks}`) });
    if (printSides.value === 'double') surfaces.push({ sheet, kind: 'back', svg: document(`${props.event?.displayName || 'Peshkash'} sheet ${sheet} back print`, `${cardObjects(true)}${registrationMarks}`) });
    if (includeCutContour.value) {
      const outlines = placements.map(({ target, index, x, y, width, height }) => {
        const offset = Math.max(-Math.min(width, height) / 2 + 0.1, cutOffsetMm.value);
        const radius = Math.max(0, Math.min(cutCornerRadiusMm.value + offset, (width + offset * 2) / 2, (height + offset * 2) / 2));
        return `<rect id="cut-${sheet}-${index + 1}" data-qr-name="${escapeXml(displayTargetLabel(target))}" x="${(x - offset).toFixed(3)}" y="${(y - offset).toFixed(3)}" width="${(width + offset * 2).toFixed(3)}" height="${(height + offset * 2).toFixed(3)}" rx="${radius.toFixed(3)}" ry="${radius.toFixed(3)}"/>`;
      }).join('');
      const cutLayer = `<g id="CutContour" data-layer="cut-contour" data-spot-color="CutContour" fill="none" stroke="#FF00FF" stroke-width="0.0762" vector-effect="non-scaling-stroke">${outlines}</g>`;
      surfaces.push({ sheet, kind: 'cut-contour', svg: document(`${props.event?.displayName || 'Peshkash'} sheet ${sheet} CutContour plotter paths`, `${cutLayer}${registrationMarks}`) });
    }
  }
  return surfaces;
}
function corelBuildMacro(surfaceFiles: Array<{ name: string; label: string }>, pageWidth: number, pageHeight: number, outputName: string): string {
  const vbaArray = (values: string[]) => `Array(${values.map(value => `"${value.replace(/"/g, '""')}"`).join(', ')})`;
  return `Attribute VB_Name = "PeshkashPrintJob"\r\nOption Explicit\r\n\r\nPublic Sub BuildPeshkashPrintJob()\r\n  On Error GoTo BuildFailed\r\n  Dim folder As String\r\n  folder = ChoosePackageFolder()\r\n  If Len(folder) = 0 Then Exit Sub\r\n\r\n  Dim files As Variant, pageNames As Variant\r\n  files = ${vbaArray(surfaceFiles.map(file => file.name))}\r\n  pageNames = ${vbaArray(surfaceFiles.map(file => file.label))}\r\n\r\n  Dim job As Document, source As Document, saveOptions As New StructSaveAsOptions\r\n  Dim i As Long\r\n  Set job = OpenDocument(folder & "\\" & CStr(files(0)))\r\n  job.Unit = cdrMillimeter\r\n  job.Pages(1).SetSize ${pageWidth}, ${pageHeight}\r\n  job.Pages(1).Name = CStr(pageNames(0))\r\n\r\n  For i = 1 To UBound(files)\r\n    job.AddPagesEx 1, ${pageWidth}, ${pageHeight}\r\n    Set source = OpenDocument(folder & "\\" & CStr(files(i)))\r\n    source.ActivePage.Shapes.All.Copy\r\n    source.Close\r\n    job.Activate\r\n    job.Pages(i + 1).Activate\r\n    job.Pages(i + 1).SetSize ${pageWidth}, ${pageHeight}\r\n    job.Pages(i + 1).Name = CStr(pageNames(i))\r\n    job.ActiveLayer.Paste\r\n  Next i\r\n\r\n  saveOptions.Filter = cdrCDR\r\n  saveOptions.Overwrite = True\r\n  saveOptions.Range = cdrAllPages\r\n  saveOptions.Version = cdrCurrentVersion\r\n  job.SaveAs folder & "\\${outputName}", saveOptions\r\n  job.Pages(1).Activate\r\n  MsgBox "Created ${outputName} with " & CStr(UBound(files) + 1) & " registered pages.", vbInformation, "Peshkash print job"\r\n  Exit Sub\r\n\r\nBuildFailed:\r\n  MsgBox "CorelDRAW could not build the job: " & Err.Description, vbCritical, "Peshkash print job"\r\nEnd Sub\r\n\r\nPrivate Function ChoosePackageFolder() As String\r\n  Dim shellApp As Object, selectedFolder As Object\r\n  Set shellApp = CreateObject("Shell.Application")\r\n  Set selectedFolder = shellApp.BrowseForFolder(0, "Choose the extracted Peshkash package folder", 0, 0)\r\n  If Not selectedFolder Is Nothing Then ChoosePackageFolder = selectedFolder.Self.Path\r\nEnd Function\r\n`;
}
async function exportForCorelDraw() {
  if (!selectedTemplate.value || !canExport.value || !sheetLayout.value.fits) return;
  isExporting.value = true;
  try {
    const layout = sheetLayout.value;
    const images = await renderCorelCards(layout); const base = `${safeFilename(props.event?.displayName || 'peshkash')}-coreldraw`;
    const assetPaths = Object.fromEntries(selectedTargets.value.map((target, index) => [target.key, `assets/${uniqueFilename(target, index)}`]));
    const surfaces = corelDrawPages(images);
    const surfaceFiles = surfaces.map(surface => ({ name: `${base}-sheet-${String(surface.sheet).padStart(2, '0')}-${surface.kind}.svg`, label: `Sheet ${surface.sheet} · ${surface.kind === 'cut-contour' ? 'CutContour' : surface.kind === 'front' ? 'Front print' : 'Back print'}`, surface }));
    const cdrOutputName = `${base}-print-job.cdr`;
    const sizeLines = selectedTargets.value.map((target, index) => { const size = artworkSizeFor(target); return `${index + 1}. ${displayTargetLabel(target)}: ${size.width.toFixed(3)} x ${size.height.toFixed(3)} mm`; }).join('\r\n');
    const instructions = `PESHKASH PRINT-SHOP PACKAGE\r\n\r\nPREFERRED: BUILD ONE MULTI-PAGE CDR\r\n1. Extract this ZIP without moving or renaming its contents.\r\n2. In CorelDRAW open the Visual Basic editor (Alt+F11), import BUILD-CORELDRAW-JOB.bas, and run BuildPeshkashPrintJob.\r\n3. Choose this extracted folder. The macro creates ${cdrOutputName} with one named CorelDRAW page per production surface. This requires CorelDRAW because CDR is a proprietary native format.\r\n\r\nDIRECT SVG FALLBACK\r\n4. Open the sheet SVG files directly at their original physical dimensions. All files use one shared placement manifest and identical registration marks. Do not reposition only one page.\r\n5. FRONT files contain the print artwork. Every card is a separate named, movable top-level object.\r\n6. BACK files are included only for duplex jobs. Card positions are reflected horizontally across the sheet; artwork itself is not mirrored. Keep vertical placement unchanged and print using long-edge registration.\r\n7. CUT-CONTOUR files contain vector-only plotter paths on a layer named CutContour. The contour uses #FF00FF at 0.0762 mm. Map that named layer/color to the print shop's plotter preset if required.\r\n8. RegistrationMarks is a separate vector group repeated at exactly the same coordinates on every page. Use it to register duplex printing and the cutter, then omit it from the final cut operation if the plotter workflow requires.\r\n9. CorelDRAW may wrap an imported SVG in one container; use Ungroup once to expose separate card objects. Do not ungroup an individual card.\r\n10. Every artwork retains its assigned template dimensions and aspect ratio. The global scale is ${artworkScalePercent.value}%. Card artwork is 600 DPI.\r\n\r\nCanvas: ${layout.pageWidth} x ${layout.pageHeight} mm\r\nPrint mode: ${printSides.value === 'double' ? 'Double-sided' : 'Single-sided'}\r\nCutContour: ${includeCutContour.value ? `Included, ${cutCornerRadiusMm.value.toFixed(3)} mm corner radius, ${cutOffsetMm.value.toFixed(3)} mm offset` : 'Not included'}\r\nRegistration marks: ${includeRegistrationMarks.value ? 'Included at identical coordinates on every surface' : 'Not included'}\r\nPhysical sheets: ${layout.pageCount}\r\nCorelDRAW pages: ${surfaces.length}\r\n\r\nARTWORK SIZES\r\n${sizeLines}\r\n`;
    const files = surfaceFiles.map(file => ({ name: file.name, data: new TextEncoder().encode(file.surface.svg) }));
    const manifest = { version: 2, unit: 'mm', canvas: { width: layout.pageWidth, height: layout.pageHeight }, artworkScalePercent: artworkScalePercent.value, grouping: printGrouping.value, artworks: selectedTargets.value.map(target => { const size = artworkSizeFor(target); return { key: target.key, name: displayTargetLabel(target), templateId: targetTemplateId(target), width: size.width, height: size.height, captionHeight: size.captionHeight }; }), placements: layout.pages.map(page => ({ sheet: page.number, items: page.placements.map(({ target, x, mirroredX, y, width, height, captionHeight }) => ({ key: target.key, x, backX: mirroredX, y, width, height, captionHeight })) })), margin: layout.margin, gap: layout.gap, maxColumns: printColumns.value, printSides: printSides.value, cutContour: includeCutContour.value ? { cornerRadius: cutCornerRadiusMm.value, offset: cutOffsetMm.value, strokeWidth: 0.0762, spotColor: 'CutContour' } : null, registrationMarks: includeRegistrationMarks.value, pages: surfaceFiles.map(file => ({ file: file.name, name: file.label, sheet: file.surface.sheet, kind: file.surface.kind })) };
    files.push({ name: 'BUILD-CORELDRAW-JOB.bas', data: new TextEncoder().encode(corelBuildMacro(surfaceFiles, layout.pageWidth, layout.pageHeight, cdrOutputName)) });
    files.push({ name: 'JOB-MANIFEST.json', data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) });
    selectedTargets.value.forEach((target, index) => {
      if (!images[target.key]) return;
      const size = artworkSizeFor(target);
      files.push({ name: assetPaths[target.key], data: dataUrlBytes(images[target.key]) });
      const object = corelPngCardObject(images[target.key], 0, 0, size.width, size.height + size.captionHeight, `qr-card-${index + 1}`, displayTargetLabel(target));
      const objectSvg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size.width}mm" height="${size.height + size.captionHeight}mm" viewBox="0 0 ${size.width} ${size.height + size.captionHeight}">${object}</svg>`;
      files.push({ name: `objects/${uniqueFilename(target, index).replace(/\.png$/i, '.svg')}`, data: new TextEncoder().encode(objectSvg) });
    });
    files.push({ name: 'README.txt', data: new TextEncoder().encode(instructions) });
    downloadBlob(createZip(files), `${base}-package.zip`);
    showPrintSetup.value = false;
  } finally { isExporting.value = false; }
}
function escapeHtml(v: string) { return v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c] ?? c); }
async function printSheet() {
  if (!selectedTemplate.value || !canExport.value || !sheetLayout.value.fits) return; const win = window.open('', '_blank'); if (!win) return; win.opener = null; win.document.write('<!doctype html><title>Preparing QR print…</title><p style="font:16px sans-serif;padding:24px">Preparing print-quality QR assets…</p>'); isExporting.value = true;
  const images = await renderBatch(selectedTargets.value, EXPORT_SCALE, true);
  const layout = sheetLayout.value; const sheets: string[] = [];
  for (const page of layout.pages) {
    const placements = page.placements;
    const registrationInset = Math.max(2.5, Math.min(7, layout.margin / 2));
    const registration = includeRegistrationMarks.value ? [[registrationInset, registrationInset], [layout.pageWidth - registrationInset, registrationInset], [registrationInset, layout.pageHeight - registrationInset], [layout.pageWidth - registrationInset, layout.pageHeight - registrationInset]].map(([x, y]) => `<span class="registration" style="left:${x}mm;top:${y}mm"></span>`).join('') : '';
    const cards = (mirrored: boolean) => placements.map(({ target, x: frontX, mirroredX, y, width, height, captionHeight }) => {
      if (!images[target.key]) return '';
      const x = mirrored ? mirroredX : frontX;
      return `<figure style="left:${x}mm;top:${y}mm;width:${width}mm;height:${height + captionHeight}mm"><img style="height:${height}mm;width:${width}mm" src="${images[target.key]}" alt="${escapeHtml(target.label)}">${printCaptions.value ? `<figcaption style="height:${captionHeight}mm">${escapeHtml(displayTargetLabel(target))}</figcaption>` : ''}</figure>`;
    }).join('');
    sheets.push(`<main class="sheet front" data-surface="Front print">${cards(false)}${registration}</main>`);
    if (printSides.value === 'double') sheets.push(`<main class="sheet back" data-surface="Back print — horizontally reversed placement">${cards(true)}${registration}</main>`);
    if (includeCutContour.value) {
      const outlines = placements.map(({ x, y, width, height }) => {
        const offset = Math.max(-Math.min(width, height) / 2 + 0.1, cutOffsetMm.value);
        const radius = Math.max(0, Math.min(cutCornerRadiusMm.value + offset, (width + offset * 2) / 2, (height + offset * 2) / 2));
        return `<span class="cut" style="left:${x - offset}mm;top:${y - offset}mm;width:${width + offset * 2}mm;height:${height + offset * 2}mm;border-radius:${radius}mm"></span>`;
      }).join('');
      sheets.push(`<main class="sheet cut-sheet" data-surface="CutContour plotter paths">${outlines}${registration}</main>`);
    }
  }
  const pageSize = `${printPageDimensions.value.widthMm}mm ${printPageDimensions.value.heightMm}mm`;
  win.document.open(); win.document.write(`<!doctype html><html><head><title>Peshkash print-ready sheets</title><style>@page{size:${pageSize};margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}.sheet{height:${layout.pageHeight}mm;overflow:hidden;page-break-after:always;position:relative;width:${layout.pageWidth}mm}.sheet:last-of-type{page-break-after:auto}figure{margin:0;position:absolute;text-align:center}img{display:block;object-fit:contain}figcaption{font:8pt Arial,sans-serif;padding-top:2mm}.cut{border:.0762mm solid #ff00ff;display:block;position:absolute}.registration{border:.1mm solid #000;border-radius:50%;display:block;height:2.4mm;margin:-1.2mm 0 0 -1.2mm;position:absolute;width:2.4mm}.registration:before,.registration:after{background:#000;content:'';left:50%;position:absolute;top:50%;transform:translate(-50%,-50%)}.registration:before{height:.1mm;width:4mm}.registration:after{height:4mm;width:.1mm}</style></head><body>${sheets.join('')}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),150))<\/script></body></html>`); win.document.close(); showPrintSetup.value = false; isExporting.value = false;
}
function toggleAllVisible() { const keys = visibleTargets.value.map(t => t.key); const all = keys.length > 0 && keys.every(k => selectedTargetKeys.value.includes(k)); selectedTargetKeys.value = all ? selectedTargetKeys.value.filter(k => !keys.includes(k)) : [...new Set([...selectedTargetKeys.value, ...keys])]; }
function moveSelectedTarget(key: string, direction: -1 | 1): void {
  const from = selectedTargetKeys.value.indexOf(key); const to = from + direction;
  if (from < 0 || to < 0 || to >= selectedTargetKeys.value.length) return;
  const next = [...selectedTargetKeys.value]; [next[from], next[to]] = [next[to], next[from]]; selectedTargetKeys.value = next;
}
function duplicateCollectionObject(target: QrTarget): QrTarget {
  const sourceKey = target.sourceKey || target.key; const source = props.targets.find(item => item.key === sourceKey) || target;
  const key = `${sourceKey}::copy:${Date.now()}:${Math.random().toString(36).slice(2, 6)}`;
  const copy: QrTarget = { ...source, key, sourceKey, label: `${displayTargetLabel(source)} (copy)` };
  collectionCopies.value = [...collectionCopies.value, copy];
  const index = selectedTargetKeys.value.indexOf(target.key); const next = [...selectedTargetKeys.value]; next.splice(index + 1, 0, key); selectedTargetKeys.value = next;
  const templateId = targetTemplateIds.value[target.key]; if (templateId) targetTemplateIds.value = { ...targetTemplateIds.value, [key]: templateId };
  if (previews.value[target.key]) previews.value = { ...previews.value, [key]: previews.value[target.key] };
  return copy;
}
function removeCollectionObject(target: QrTarget): void {
  selectedTargetKeys.value = selectedTargetKeys.value.filter(key => key !== target.key);
  previewTargetKeys.value = previewTargetKeys.value.filter(key => key !== target.key);
  if (target.sourceKey) collectionCopies.value = collectionCopies.value.filter(item => item.key !== target.key);
  const nextTemplates = { ...targetTemplateIds.value }; delete nextTemplates[target.key]; targetTemplateIds.value = nextTemplates;
  const nextPreviews = { ...previews.value }; delete nextPreviews[target.key]; previews.value = nextPreviews;
}
function addCollectionAsset(target: QrTarget): void {
  if (selectedTargetKeys.value.includes(target.key)) return;
  selectedTargetKeys.value = [...selectedTargetKeys.value, target.key]; ensureCollectionTemplateAssignments(); previewTargetKeys.value = [...selectedTargetKeys.value];
  const design = designForTarget(target); if (design) void changeTargetTemplate(target, String(design.id || selectedTemplateId.value || ''));
}
function addCollectionCopy(target: QrTarget): void {
  const group = collectionGroups.value.find(item => item.source.key === target.key);
  if (!group) { addCollectionAsset(target); return; }
  duplicateCollectionObject(group.instances[group.instances.length - 1] || group.source);
}
function setCollectionQuantity(sourceKey: string, rawQuantity: number): void {
  const quantity = Math.max(0, Math.min(99, Math.round(Number(rawQuantity) || 0)));
  const group = collectionGroups.value.find(item => (item.source.sourceKey || item.source.key) === sourceKey); if (!group) return;
  while (group.instances.length < quantity) group.instances.push(duplicateCollectionObject(group.instances[group.instances.length - 1] || group.source));
  while (group.instances.length > quantity) { const removable = group.instances.pop(); if (removable) removeCollectionObject(removable); }
  previewTargetKeys.value = [...selectedTargetKeys.value];
}
async function prepareCollectionPrint(): Promise<void> {
  if (!selectedTargets.value.length) return;
  collectionNotice.value = ''; previewTargetKeys.value = [...selectedTargetKeys.value]; await generatePreviews();
  if (collectionIssue.value) { collectionNotice.value = collectionIssue.value; return; }
  optimizeCollectionLayout(); showPrintSetup.value = true;
}
function optimizeCollectionLayout(): void {
  const original = { paper: printPaperSize.value, orientation: printOrientation.value, columns: printColumns.value };
  let best: { paper: PaperSizeId; orientation: 'portrait' | 'landscape'; columns: number; score: number; pages: number } | null = null;
  for (const paper of paperSizes) for (const orientation of ['portrait', 'landscape'] as const) for (let columns = 1; columns <= 6; columns += 1) {
    printPaperSize.value = paper.id; printOrientation.value = orientation; printColumns.value = columns;
    const layout = sheetLayout.value; if (!layout.fits || !layout.pageCount) continue;
    const score = layout.pageWidth * layout.pageHeight * layout.pageCount;
    if (!best || score < best.score || (score === best.score && layout.pageCount < best.pages)) best = { paper: paper.id, orientation, columns, score, pages: layout.pageCount };
  }
  if (best) { printPaperSize.value = best.paper; printOrientation.value = best.orientation; printColumns.value = best.columns; }
  else { printPaperSize.value = original.paper; printOrientation.value = original.orientation; printColumns.value = original.columns; }
}
async function refreshCollectionEditor(): Promise<void> {
  previewTargetKeys.value = [...selectedTargetKeys.value]; await generatePreviews();
}
async function nextStep() { if (step.value === 1 && selectedTemplate.value) step.value = 2; else if (step.value === 2 && selectedTargets.value.length) { previewTargetKeys.value = [...selectedTargetKeys.value]; step.value = 3; await generatePreviews(); } }
function previousStep() { if (step.value > 1) step.value = (step.value - 1) as 1 | 2; }
watch(() => props.targets, targets => {
  const available = new Set([...targets, ...collectionCopies.value].map(target => target.key));
  const retained = selectedTargetKeys.value.filter(key => available.has(key));
  selectedTargetKeys.value = retained.length ? retained : targets.map(target => target.key);
  if (props.collectionMode && templates.value.length) { ensureCollectionTemplateAssignments(); void refreshCollectionEditor(); }
}, { deep: true, immediate: true });
watch(selectedTemplateId, () => {
  previews.value = {};
  if (step.value === 3) void generatePreviews();
});
watch(() => visibleTargets.value.map(target => target.key).join('|'), () => { void ensureAssetPreviews(); });
onMounted(async () => { await loadTemplates(); await loadSavedCollections(); if (props.collectionMode) { ensureCollectionTemplateAssignments(); await Promise.all([refreshCollectionEditor(), ensureAssetPreviews()]); } });
</script>

<template>
  <div v-if="!event" class="ps-empty"><i class="bi bi-calendar-x"></i><p>Open a specific event to use the Print Studio.</p></div>
  <div v-else class="ps-root">
    <ol v-if="!collectionMode" class="ps-steps"><li v-for="item in [{ n: 1, label: 'Template' }, { n: 2, label: 'QR assets' }, { n: 3, label: 'Preview & export' }]" :key="item.n" :class="{ active: step === item.n, done: step > item.n }"><span>{{ step > item.n ? '✓' : item.n }}</span><b>{{ item.label }}</b></li></ol>
    <section v-if="collectionMode" class="pc-workspace">
      <header class="pc-directory-head"><div><span>COLLECTION DIRECTORY</span><h4>Print collections</h4><p>Each row below is one physical artwork. Copies can use different templates while keeping their template-defined dimensions.</p></div><button class="btn btn-outline-secondary btn-sm" type="button" @click="newCollectionDraft"><i class="bi bi-folder-plus"></i> New collection</button></header>
      <div v-if="savedCollections.length" class="pc-folders"><button v-for="collection in savedCollections" :key="collection.id" type="button" :class="{ active: String(activeCollectionId) === String(collection.id) }" @click="openCollection(collection)"><i class="bi bi-folder2-open"></i><span><b>{{ collection.name }}</b><small>{{ collection.configuration.orderedTargetKeys.length }} physical artworks</small></span><i class="bi bi-chevron-right"></i></button></div>
      <div class="pc-editor-bar"><label><span>Collection name</span><input v-model="collectionName" type="text" maxlength="120" placeholder="Name this production collection"></label><div><button class="btn btn-outline-primary" type="button" :disabled="isSavingCollection || !collectionName.trim() || !selectedTargets.length" @click="saveCollection"><i class="bi bi-floppy"></i> {{ activeCollectionId ? 'Save changes' : 'Save collection' }}</button><button class="btn btn-primary" type="button" :disabled="isGenerating || !selectedTargets.length || changingTemplateKeys.length > 0" @click="prepareCollectionPrint"><i class="bi bi-printer"></i> {{ isGenerating ? `Rendering ${progress}/${progressTotal}` : `Print collection · ${selectedTargets.length}` }}</button></div></div>
      <p v-if="collectionNotice" class="ps-collection-notice">{{ collectionNotice }}</p>
      <div class="pc-body">
        <aside class="pc-assets"><header><b>QR asset library</b><small>Preview an asset and add as many physical copies as needed.</small></header><label class="ps-search"><i class="bi bi-search"></i><input v-model="targetSearch" type="search" placeholder="Find QR assets…"></label><div><article v-for="target in visibleTargets" :key="target.key"><figure :style="libraryDesignForTarget(target) ? { aspectRatio: `${libraryDesignForTarget(target)!.widthMm}/${libraryDesignForTarget(target)!.heightMm}` } : {}"><img v-if="previews[target.key] || assetPreviews[target.key]" :src="previews[target.key] || assetPreviews[target.key]" :alt="`Preview of ${displayTargetLabel(target)}`"><i v-else-if="assetPreviewLoading.includes(target.key)" class="bi bi-arrow-repeat spin"></i><i v-else class="bi bi-qr-code"></i></figure><span><b>{{ displayTargetLabel(target) }}</b><small>{{ target.context }}</small><em v-if="collectionGroups.some(group => group.source.key === target.key)">{{ collectionGroups.find(group => group.source.key === target.key)?.instances.length }} in collection</em></span><button type="button" :aria-label="`Add ${displayTargetLabel(target)} to collection`" @click="addCollectionCopy(target)"><i class="bi bi-plus-lg"></i> {{ collectionGroups.some(group => group.source.key === target.key) ? 'Add copy' : 'Add' }}</button></article></div></aside>
        <main class="pc-objects">
          <div v-if="isGenerating" class="ps-progress"><i class="bi bi-arrow-repeat spin"></i><span>Rendering actual QR artworks {{ progress }}/{{ progressTotal }}…</span></div>
          <section v-for="group in collectionGroups" :key="group.source.key" class="pc-group">
            <header><div><i class="bi bi-folder2"></i><span><b>{{ displayTargetLabel(group.source) }}</b><small>{{ group.source.context }} · {{ group.source.type }}</small></span></div><div class="pc-quantity"><span>Quantity</span><button type="button" :disabled="group.instances.length <= 1" :aria-label="`Reduce ${displayTargetLabel(group.source)} quantity`" @click="setCollectionQuantity(group.source.key, group.instances.length - 1)"><i class="bi bi-dash"></i></button><output>{{ group.instances.length }}</output><button type="button" :disabled="group.instances.length >= 99" :aria-label="`Increase ${displayTargetLabel(group.source)} quantity`" @click="setCollectionQuantity(group.source.key, group.instances.length + 1)"><i class="bi bi-plus"></i></button></div></header>
            <div class="pc-instance" v-for="(target, instanceIndex) in group.instances" :key="target.key" :class="{ error: targetProblems[target.key] || previewErrors[target.key] }">
              <span class="pc-instance-number">{{ selectedTargetKeys.indexOf(target.key) + 1 }}</span>
              <button class="pc-instance-preview" type="button" :disabled="!previews[target.key]" :aria-label="`Inspect preview of ${displayTargetLabel(target)}, copy ${instanceIndex + 1}`" :style="designForTarget(target) ? { aspectRatio: `${designForTarget(target)!.widthMm}/${designForTarget(target)!.heightMm}` } : {}" @click="zoomedTargetKey = target.key"><img v-if="previews[target.key]" :src="previews[target.key]" :alt="`Artwork preview for ${displayTargetLabel(target)}`"><i v-else class="bi bi-arrow-repeat spin"></i><span v-if="previews[target.key]"><i class="bi bi-arrows-fullscreen"></i></span></button>
              <div class="pc-instance-copy"><b>Copy {{ instanceIndex + 1 }}</b><small>{{ designForTarget(target)?.widthMm }} × {{ designForTarget(target)?.heightMm }} mm · size fixed by template</small><label><span>Template</span><select :value="targetTemplateId(target)" :disabled="changingTemplateKeys.includes(target.key)" @change="changeTargetTemplate(target, ($event.target as HTMLSelectElement).value)"><option v-for="template in templates" :key="template.id" :value="String(template.id)">{{ targetProblem(template, target) ? '⚠ ' : '' }}{{ template.name }}</option></select></label><p v-if="targetProblems[target.key] || previewErrors[target.key]">{{ targetProblems[target.key] || previewErrors[target.key] }}</p></div>
              <div class="pc-instance-actions"><RouterLink :to="templateEditRoute(target)" target="_blank" title="Edit assigned template"><i class="bi bi-pencil"></i></RouterLink><button type="button" title="Clone this artwork" @click="duplicateCollectionObject(target)"><i class="bi bi-copy"></i></button><button type="button" :disabled="selectedTargetKeys.indexOf(target.key) === 0" title="Move earlier" @click="moveSelectedTarget(target.key, -1)"><i class="bi bi-arrow-up"></i></button><button type="button" :disabled="selectedTargetKeys.indexOf(target.key) === selectedTargetKeys.length - 1" title="Move later" @click="moveSelectedTarget(target.key, 1)"><i class="bi bi-arrow-down"></i></button><button class="danger" type="button" title="Remove this physical artwork" @click="removeCollectionObject(target)"><i class="bi bi-trash"></i></button></div>
            </div>
          </section>
          <div v-if="!collectionGroups.length" class="ps-empty ps-empty--compact"><i class="bi bi-folder2-open"></i><p>Add QR assets from the library to build this collection.</p></div>
        </main>
      </div>
    </section>
    <section v-else-if="step === 1" class="ps-stage">
      <div class="ps-stage-heading"><div><p>Step 1 of 3</p><h4>Choose a default template</h4><small>Use one template for the batch, then override individual cards in the proofing step.</small></div><RouterLink class="btn btn-outline-secondary btn-sm" to="/dashboard/qr-templates" target="_blank"><i class="bi bi-plus-lg"></i> New template</RouterLink></div>
      <div v-if="savedCollections.length" class="ps-saved-collections"><header><div><i class="bi bi-collection"></i><span><b>Saved print collections</b><small>Open a complete job directly in print setup.</small></span></div><em>{{ savedCollections.length }}</em></header><div><button v-for="collection in savedCollections" :key="collection.id" type="button" @click="openCollection(collection)"><span><b>{{ collection.name }}</b><small>{{ collection.configuration.orderedTargetKeys.length }} cards · {{ collection.local ? 'this device' : 'workspace' }}</small></span><i class="bi bi-arrow-right"></i></button></div></div>
      <p v-if="collectionNotice" class="ps-collection-notice">{{ collectionNotice }}</p>
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
      <section v-if="selectedTargets.length" class="ps-order"><header><div><b>Collection objects</b><small>Add from the QR asset list, then arrange or duplicate every physical card.</small></div><span>{{ selectedTargets.length }} objects</span></header><ol><li v-for="(target, index) in selectedTargets" :key="target.key"><span>{{ index + 1 }}</span><div><b>{{ displayTargetLabel(target) }}</b><small>{{ target.context }}<em v-if="target.sourceKey"> · duplicate</em></small></div><div><button type="button" :disabled="index === 0" :aria-label="`Move ${displayTargetLabel(target)} earlier`" @click="moveSelectedTarget(target.key, -1)"><i class="bi bi-arrow-up"></i></button><button type="button" :disabled="index === selectedTargets.length - 1" :aria-label="`Move ${displayTargetLabel(target)} later`" @click="moveSelectedTarget(target.key, 1)"><i class="bi bi-arrow-down"></i></button><button type="button" :aria-label="`Duplicate ${displayTargetLabel(target)}`" title="Duplicate object" @click="duplicateCollectionObject(target)"><i class="bi bi-copy"></i></button><button class="danger" type="button" :aria-label="`Delete ${displayTargetLabel(target)} from collection`" title="Delete from collection" @click="removeCollectionObject(target)"><i class="bi bi-trash"></i></button></div></li></ol></section>
    </section>
    <section v-else class="ps-stage ps-stage--preview">
      <div class="ps-stage-heading"><div><p>Step 3 of 3</p><h4>Proof the rendered QRs</h4><small>Open any card at full size. Excluded cards remain here so they can be restored.</small></div><RouterLink class="btn btn-outline-secondary btn-sm" :to="editTemplateRoute" target="_blank" title="Opens in a new tab so this batch stays intact"><i class="bi bi-pencil-square"></i> Edit template <i class="bi bi-box-arrow-up-right"></i></RouterLink></div>
      <div v-if="unmappedTargets.length" class="ps-blocker"><i class="bi bi-shield-exclamation"></i><div><b>Permanent mapping required</b><p>{{ unmappedTargets.length }} selected asset{{ unmappedTargets.length === 1 ? '' : 's' }} cannot be printed yet.</p></div><RouterLink class="btn btn-outline-secondary btn-sm" to="/dashboard/qr">Open QR Bank</RouterLink></div>
      <div v-else-if="printPreflight && !printPreflight.canExport" class="ps-blocker"><i class="bi bi-shield-x"></i><div><b>Print preflight blocked</b><p>{{ printPreflight.errors.map(e => e.detail).join(' ') }}</p></div><RouterLink class="btn btn-outline-secondary btn-sm" :to="editTemplateRoute">Fix template</RouterLink></div>
      <div class="ps-proof-tools"><div><button type="button" :class="{ active: previewFilter === 'all' }" @click="previewFilter = 'all'">All {{ previewTargets.length }}</button><button type="button" :class="{ active: previewFilter === 'problems' }" @click="previewFilter = 'problems'">Problems {{ Object.keys(targetProblems).length + failedPreviewTargets.length }}</button></div><button v-if="failedPreviewTargets.length" class="btn btn-outline-secondary btn-sm" type="button" @click="retryFailedPreviews"><i class="bi bi-arrow-clockwise"></i> Retry failed</button><span v-else-if="!isGenerating"><i class="bi bi-check-circle-fill"></i> {{ previews ? Object.keys(previews).length : 0 }} previews rendered</span></div>
      <div v-if="isGenerating" class="ps-progress"><i class="bi bi-arrow-repeat spin"></i><span>Rendering {{ progress }}/{{ progressTotal }} actual previews…</span></div>
      <div v-if="filteredPreviewTargets.length" class="ps-grid">
        <article v-for="target in filteredPreviewTargets" :key="target.key" class="ps-card" :class="{ error: previewErrors[target.key] || targetProblems[target.key], excluded: !selectedTargetKeys.includes(target.key) }">
          <div class="ps-card-top"><label><input v-model="selectedTargetKeys" type="checkbox" :value="target.key"><span>{{ selectedTargetKeys.includes(target.key) ? 'Included' : 'Excluded' }}</span></label><button type="button" :disabled="!previews[target.key]" @click="zoomedTargetKey = target.key"><i class="bi bi-arrows-fullscreen"></i> Inspect</button></div>
          <button class="ps-card-preview" type="button" :style="designForTarget(target) ? { aspectRatio: `${designForTarget(target)!.widthMm}/${designForTarget(target)!.heightMm}` } : {}" :disabled="!previews[target.key]" @click="zoomedTargetKey = target.key"><img v-if="previews[target.key]" :src="previews[target.key]" :alt="`Rendered QR for ${displayTargetLabel(target)}`"><span v-else><i class="bi bi-arrow-repeat spin"></i></span></button>
          <div class="ps-card-meta"><b>{{ displayTargetLabel(target) }}</b><small>{{ target.context }} · {{ target.type }}</small><label class="ps-card-template"><span>Template</span><select :value="targetTemplateId(target)" :disabled="changingTemplateKeys.includes(target.key)" @change="changeTargetTemplate(target, ($event.target as HTMLSelectElement).value)"><option v-for="template in templates" :key="template.id" :value="String(template.id)">{{ template.name }}</option></select></label><code>{{ mappingForTarget(target)?.qrHash }}</code><p v-if="targetProblems[target.key]">{{ targetProblems[target.key] }}</p><p v-if="previewErrors[target.key]">{{ previewErrors[target.key] }}</p><em v-if="changingTemplateKeys.includes(target.key)"><i class="bi bi-arrow-repeat spin"></i> Updating actual preview…</em><em v-else-if="!targetProblems[target.key] && !previewErrors[target.key]"><i class="bi bi-check-circle"></i> Data and mapping ready</em></div>
        </article>
      </div>
      <div v-else class="ps-empty ps-empty--compact"><i class="bi bi-check-circle"></i><p>No problem cards in this batch.</p></div>
    </section>
    <footer v-if="!collectionMode" class="ps-footer"><div><button v-if="step > 1" class="btn btn-outline-secondary" type="button" :disabled="isGenerating || isExporting" @click="previousStep"><i class="bi bi-arrow-left"></i> Back</button></div><span v-if="step === 3"><b>{{ selectedTargets.length }} included</b> · {{ previewTargets.length - selectedTargets.length }} excluded · individual template dimensions preserved at 300 DPI</span><button v-if="step < 3" class="btn btn-primary" type="button" :disabled="(step === 1 && !selectedTemplate) || (step === 2 && !selectedTargets.length)" @click="nextStep">Continue <i class="bi bi-arrow-right"></i></button><div v-else class="ps-actions"><button class="btn btn-outline-primary" type="button" :disabled="!canExport || isGenerating || isExporting" @click="showPrintSetup = true"><i class="bi bi-printer"></i> Print setup</button><button class="btn btn-primary" type="button" :disabled="!canExport || isGenerating || isExporting" @click="exportZip"><i class="bi bi-file-earmark-zip"></i> {{ isExporting ? `Preparing ${progress}/${progressTotal}` : `Export ZIP (${selectedTargets.length})` }}</button></div></footer>
    <div v-if="zoomedTarget" class="ps-overlay" role="dialog" aria-modal="true" :aria-label="`Inspect ${displayTargetLabel(zoomedTarget)}`" @click.self="zoomedTargetKey = null"><div class="ps-proof-modal"><header><div><small>Actual rendered proof</small><h4>{{ displayTargetLabel(zoomedTarget) }}</h4><code>{{ mappingForTarget(zoomedTarget)?.shortQrUrl }}</code></div><button type="button" aria-label="Close proof" @click="zoomedTargetKey = null"><i class="bi bi-x-lg"></i></button></header><div class="ps-proof-image"><img :src="previews[zoomedTarget.key]" :alt="`Full proof for ${displayTargetLabel(zoomedTarget)}`"></div><footer><span><i class="bi bi-zoom-in"></i> Review copy, spacing and QR quiet zone at full size.</span><label><input v-model="selectedTargetKeys" type="checkbox" :value="zoomedTarget.key"> Include in export</label></footer></div></div>
    <div v-if="showPrintSetup" class="ps-overlay" role="dialog" aria-modal="true" aria-label="Print setup" @click.self="showPrintSetup = false">
      <div class="ps-print-modal">
        <header><div><small>Print &amp; CorelDRAW layout</small><h4>{{ selectedPaper.label }} canvas</h4></div><button type="button" aria-label="Close print setup" @click="showPrintSetup = false"><i class="bi bi-x-lg"></i></button></header>
        <div class="ps-print-body">
          <div class="ps-print-controls">
            <fieldset v-if="!collectionMode" class="ps-collection-control">
              <legend>Reusable collection</legend>
              <p>Save the ordered artworks, assigned templates, canvas, scale, and finishing settings as one print job.</p>
              <label>Collection name<input v-model="collectionName" type="text" maxlength="120" placeholder="e.g. Woven Stories · table cards"></label>
              <div><button class="btn btn-outline-secondary btn-sm" type="button" :disabled="!activeCollectionId" @click="startNewCollection"><i class="bi bi-plus-lg"></i> Save as new</button><button class="btn btn-outline-primary btn-sm" type="button" :disabled="isSavingCollection || !collectionName.trim()" @click="saveCollection"><i class="bi bi-collection"></i> {{ activeCollectionId ? 'Update collection' : 'Save collection' }}</button></div>
              <small v-if="collectionNotice">{{ collectionNotice }}</small>
            </fieldset>
            <label>Canvas size<select v-model="printPaperSize"><option v-for="paper in paperSizes" :key="paper.id" :value="paper.id">{{ paper.label }} · {{ paper.widthMm }} × {{ paper.heightMm }} mm</option><option value="custom">Custom canvas…</option></select></label>
            <label>Measurement unit<select v-model="printUnit"><option value="mm">Millimetres</option><option value="cm">Centimetres</option><option value="in">Inches</option></select></label>
            <template v-if="printPaperSize === 'custom'"><label>Canvas width<input v-model.number="customPaperWidth" type="number" min="1" step="0.1"><span>{{ displayUnit }}</span></label><label>Canvas height<input v-model.number="customPaperHeight" type="number" min="1" step="0.1"><span>{{ displayUnit }}</span></label></template>
            <label>Orientation<select v-model="printOrientation"><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label>
            <label>Print sides<select v-model="printSides"><option value="single">Single-sided</option><option value="double">Double-sided · flip on long edge</option></select></label>
            <label>Maximum cards per row<select v-model.number="printColumns"><option v-for="columns in 6" :key="columns" :value="columns">{{ columns }}</option></select></label>
            <label>Artwork arrangement<select v-model="printGrouping"><option value="optimized">Best fit · fewest sheets</option><option value="size">Group matching sizes</option><option value="template">Group matching templates</option><option value="order">Keep collection order</option></select></label>
            <fieldset class="ps-size-control">
              <legend>Artwork sizing <span><i class="bi bi-lock-fill"></i> Individual aspect ratios locked</span></legend>
              <small>Every QR uses its assigned template's physical dimensions. Scaling applies proportionally to the whole collection.</small>
              <label class="ps-scale">Collection scale<input v-model.number="artworkScalePercent" type="range" min="25" max="400" step="5"><output>{{ artworkScalePercent }}%</output></label>
              <output class="ps-size-summary">Current size range: {{ artworkSizeSummary }}</output>
            </fieldset>
            <label>Page margin<input v-model.number="printMargin" type="number" min="0" step="0.1"><span>{{ displayUnit }}</span></label>
            <label>Card gap<input v-model.number="printGap" type="number" min="0" step="0.1"><span>{{ displayUnit }}</span></label>
            <label class="ps-check"><input v-model="printCaptions" type="checkbox"> Print card names below artwork</label>
            <fieldset class="ps-production-control">
              <legend>Finishing</legend>
              <label class="ps-check"><input v-model="includeRegistrationMarks" type="checkbox"> Add identical registration marks to every production canvas</label>
              <label class="ps-check"><input v-model="includeCutContour" type="checkbox"> Add a separate CutContour canvas for a cutting plotter</label>
              <div v-if="includeCutContour" class="ps-cut-settings"><label>Cut corner radius<input v-model.number="cutCornerRadius" type="number" min="0" step="0.1"><span>{{ displayUnit }}</span></label><label>Cut path offset<input v-model.number="cutOffset" type="number" min="-2" max="3" step="0.1"><span>{{ displayUnit }}</span></label></div>
              <small>The plotter canvas shares exact coordinates with the print pages. Use a positive offset to add cutter tolerance, or a negative value to inset the cut.</small>
            </fieldset>
          </div>
          <aside class="ps-layout-preview">
            <div class="ps-layout-heading"><span>LIVE PRODUCTION PREVIEW</span><b>{{ sheetLayout.pageCount || '—' }} physical sheet{{ sheetLayout.pageCount === 1 ? '' : 's' }}</b><small>{{ collectionMode ? 'Auto-optimized standard layout · ' : '' }}{{ productionCanvasCount }} production canvas{{ productionCanvasCount === 1 ? '' : 'es' }} · individual sizes {{ artworkSizeSummary }}</small></div>
            <div v-if="!sheetLayout.fits" class="ps-layout-error"><i class="bi bi-exclamation-triangle"></i> At least one assigned template is larger than the selected canvas and margins. Reduce the collection scale or choose a larger canvas.</div>
            <div v-else class="ps-page-list">
              <article v-for="surface in printPreviewSurfaces" :key="`${surface.number}-${surface.kind}`"><header>Sheet {{ surface.number }} · {{ surface.label }} <span>{{ surface.placements.length }} QR{{ surface.placements.length === 1 ? '' : 's' }}</span></header><div class="ps-mini-page" :class="{ 'ps-mini-page--cut': surface.kind === 'cut' }" :style="{ aspectRatio: `${sheetLayout.pageWidth}/${sheetLayout.pageHeight}` }"><div v-for="placement in surface.placements" :key="placement.target.key" class="ps-mini-card" :class="{ 'ps-mini-card--cut': surface.kind === 'cut' }" :style="previewCardStyle(placement, surface.kind === 'back', surface.kind === 'cut' ? cutOffsetMm : 0)" :title="surface.kind === 'cut' ? `Cut path for ${displayTargetLabel(placement.target)}` : `${displayTargetLabel(placement.target)} · ${placement.width.toFixed(1)} × ${placement.height.toFixed(1)} mm`"><template v-if="surface.kind !== 'cut'"><img v-if="previews[placement.target.key]" :src="previews[placement.target.key]" :alt="`Placed preview for ${displayTargetLabel(placement.target)}`"><i v-else class="bi bi-qr-code"></i></template></div></div></article>
              <small v-if="sheetLayout.pageCount > printPreviewPages.length">+ {{ sheetLayout.pageCount - printPreviewPages.length }} more physical sheet{{ sheetLayout.pageCount - printPreviewPages.length === 1 ? '' : 's' }}</small>
            </div>
            <p>{{ printSheetSummary }}<br>{{ (sheetLayout.pageWidth / unitFactor).toFixed(printUnit === 'mm' ? 1 : 2) }} × {{ (sheetLayout.pageHeight / unitFactor).toFixed(printUnit === 'mm' ? 1 : 2) }} {{ displayUnit }} canvas<br>CorelDRAW package: one multi-page CDR builder · movable 600 DPI card objects · {{ printSides === 'double' ? 'front and reversed-placement back pages' : 'front page' }}{{ includeCutContour ? ' · vector CutContour page' : '' }}{{ includeRegistrationMarks ? ' · shared registration marks' : '' }}</p>
          </aside>
        </div>
        <footer><button class="btn btn-outline-secondary" type="button" @click="showPrintSetup = false">Cancel</button><div class="ps-print-actions"><button class="btn btn-outline-primary" type="button" :disabled="isExporting || !sheetLayout.fits" @click="exportForCorelDraw"><i class="bi bi-file-earmark-zip"></i> Download CorelDRAW layout · 600 DPI</button><button class="btn btn-primary" type="button" :disabled="isExporting || !sheetLayout.fits" @click="printSheet"><i class="bi bi-printer"></i> Open print preview</button></div></footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ps-root{display:flex;flex-direction:column;gap:16px;min-height:520px}.ps-steps{background:#f7f3ee;border:1px solid #e6d9cc;display:grid;grid-template-columns:repeat(3,1fr);list-style:none;margin:0;padding:0}.ps-steps li{align-items:center;color:#9a8879;display:flex;gap:9px;padding:12px 16px}.ps-steps li+li{border-left:1px solid #e6d9cc}.ps-steps span{align-items:center;border:1px solid #cfc0b2;border-radius:50%;display:flex;font-size:11px;height:24px;justify-content:center;width:24px}.ps-steps b{font-size:12px}.ps-steps li.active{background:#fff;color:#2b211a}.ps-steps li.active span,.ps-steps li.done span{background:#b98b51;border-color:#b98b51;color:#fff}.ps-stage{display:flex;flex:1;flex-direction:column;gap:14px;min-height:360px}.ps-stage--preview{min-height:480px}.ps-stage-heading{align-items:flex-start;display:flex;gap:16px;justify-content:space-between}.ps-stage-heading p{color:#ad7d43;font-size:10px;font-weight:700;letter-spacing:.12em;margin:0 0 3px;text-transform:uppercase}.ps-stage-heading h4{font:400 22px Rufina,serif;margin:0}.ps-stage-heading small{color:#827365;display:block;font-size:12px;margin-top:4px}.ps-template-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));max-height:50vh;overflow:auto;padding:2px}.ps-template-card{align-items:center;background:#fff;border:1px solid #ded3c8;display:grid;gap:12px;grid-template-columns:58px 1fr auto;padding:12px;text-align:left}.ps-template-card:hover,.ps-template-card.selected{border-color:#b98b51;box-shadow:0 0 0 1px #b98b51}.ps-template-card>i{color:#b98b51;opacity:0}.ps-template-card.selected>i{opacity:1}.ps-template-card span:nth-child(2){display:grid;gap:3px;min-width:0}.ps-template-card b{font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ps-template-card small{color:#8c7b6d;font-size:10px}.ps-template-shape{align-items:center;background:#eee7df;border:1px solid #d6c9bd;display:flex;justify-content:center;max-height:52px;width:58px}.ps-template-shape i{color:#34281f;font-size:22px}.ps-search{align-items:center;border:1px solid #dcd1c7;display:flex;gap:8px;padding:8px 11px}.ps-search input{border:0;outline:0;width:100%}.ps-target-list{border:1px solid #e1d7cd;max-height:48vh;overflow:auto}.ps-target-row{align-items:center;display:grid;gap:12px;grid-template-columns:auto 34px minmax(0,1fr) auto;padding:10px 12px}.ps-target-row+.ps-target-row{border-top:1px solid #eee7e0}.ps-target-row.selected{background:#fbf7f1}.ps-target-row>span:nth-of-type(2){display:grid}.ps-target-row b{font-size:12px}.ps-target-row small{color:#847568;font-size:10px}.ps-target-row code{color:#7a6655;font-size:10px}.ps-target-icon{align-items:center;background:#eee7df;display:flex;height:32px;justify-content:center;width:32px}.ps-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));max-height:55vh;overflow:auto;padding:2px}.ps-card{background:#fff;border:1px solid #ded4ca;display:flex;flex-direction:column;position:relative}.ps-card.error{border-color:#b8493d}.ps-card-check{align-items:center;background:rgba(255,255,255,.94);display:flex;font-size:10px;font-weight:700;gap:5px;left:7px;padding:4px 7px;position:absolute;top:7px;z-index:2}.ps-card-preview{align-items:center;background:#eae4de;display:flex;justify-content:center;overflow:hidden}.ps-card-preview img{display:block;height:100%;object-fit:contain;width:100%}.ps-card-preview>div{color:#a29284}.ps-card-meta{display:grid;gap:3px;padding:10px 11px}.ps-card-meta b{font-size:12px}.ps-card-meta small{color:#817267;font-size:10px}.ps-card-meta code{font-size:9px}.ps-card-meta p{color:#a33;font-size:10px;margin:3px 0 0}.ps-blocker{align-items:center;background:#fff7ed;border:1px solid #d7a45d;border-left-width:4px;color:#5f4322;display:grid;gap:12px;grid-template-columns:auto minmax(0,1fr) auto;padding:12px 14px}.ps-blocker>i{font-size:20px}.ps-blocker b{font-size:12px}.ps-blocker p{font-size:11px;margin:2px 0 0}.ps-progress{align-items:center;background:#f7f3ee;color:#745d48;display:flex;font-size:11px;gap:8px;padding:8px 11px}.ps-footer{align-items:center;border-top:1px solid #e3d8ce;display:grid;gap:12px;grid-template-columns:1fr auto 1fr;padding-top:14px}.ps-footer>span{color:#857466;font-size:10px;text-align:center}.ps-footer>button,.ps-actions{justify-self:end}.ps-actions{display:flex;gap:8px}.ps-empty{align-items:center;color:#8c7667;display:flex;flex-direction:column;gap:10px;justify-content:center;padding:48px;text-align:center}.ps-empty i{font-size:28px}.spin{animation:spin .9s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:720px){.ps-steps b{display:none}.ps-steps li{justify-content:center}.ps-stage-heading{flex-direction:column}.ps-footer{grid-template-columns:1fr}.ps-footer>*{justify-self:stretch!important}.ps-actions{display:grid;grid-template-columns:1fr 1fr}.ps-target-row{grid-template-columns:auto 34px minmax(0,1fr)}.ps-target-row code{display:none}}
</style>

<style scoped>
.ps-toolbar{display:grid;gap:10px;grid-template-columns:minmax(240px,1fr) 170px 170px}.ps-toolbar select,.ps-print-controls select,.ps-print-controls input{background:#fff;border:1px solid #dcd1c7;color:#352a22;min-height:40px;padding:8px 10px}.ps-toolbar--targets{grid-template-columns:minmax(260px,1fr) 220px}.ps-template-card{align-items:stretch;grid-template-columns:92px minmax(0,1fr) auto;min-height:112px;padding:10px}.ps-template-card.incompatible{border-color:#e0c9a7}.ps-template-shape{background:#e9e1d8;height:90px;max-height:90px;overflow:hidden;width:92px}.ps-template-shape img{height:100%;object-fit:contain;width:100%}.ps-template-copy{align-content:center}.ps-template-card b{line-height:1.25;overflow:visible;text-overflow:clip;white-space:normal}.ps-badges{display:flex!important;flex-wrap:wrap;gap:4px!important;margin-top:5px}.ps-badges em{background:#ede7df;color:#655548;font-size:8px;font-style:normal;font-weight:700;letter-spacing:.04em;padding:3px 5px;text-transform:uppercase}.ps-badges em.warning{background:#fff0dd;color:#895916}.ps-target-row.error{background:#fff9f2}.ps-target-row em,.ps-card-meta em{color:#55735d;font-size:9px;font-style:normal;margin-top:3px}.ps-target-row em:has(.bi-exclamation-triangle){color:#9b5f1b}.ps-proof-tools{align-items:center;display:flex;gap:10px;justify-content:space-between}.ps-proof-tools>div{background:#f3eee8;display:flex;padding:3px}.ps-proof-tools button:not(.btn){background:transparent;border:0;color:#78695d;font-size:10px;font-weight:700;padding:7px 10px}.ps-proof-tools button.active{background:#fff;color:#33271f;box-shadow:0 1px 3px #0001}.ps-proof-tools>span{color:#55735d;font-size:10px}.ps-grid{grid-template-columns:repeat(auto-fill,minmax(300px,1fr));max-height:52vh}.ps-card.excluded{opacity:.58}.ps-card.excluded .ps-card-preview{filter:grayscale(.8)}.ps-card-top{align-items:center;background:#faf7f3;display:flex;justify-content:space-between;padding:7px 9px}.ps-card-top label{align-items:center;display:flex;font-size:10px;font-weight:700;gap:6px}.ps-card-top button{background:transparent;border:0;color:#6d5948;font-size:10px}.ps-card-preview{border:0;cursor:zoom-in;padding:0;width:100%}.ps-card-preview:disabled{cursor:wait}.ps-card-preview span{color:#a29284}.ps-card-meta{grid-template-columns:minmax(0,1fr) auto}.ps-card-meta>*{grid-column:1/-1}.ps-card-meta code{overflow-wrap:anywhere}.ps-empty--compact{min-height:180px;padding:28px}.ps-overlay{align-items:center;background:rgba(27,21,17,.72);display:flex;inset:0;justify-content:center;padding:24px;position:fixed;z-index:1200}.ps-proof-modal,.ps-print-modal{background:#fdfaf6;box-shadow:0 24px 80px #0007;display:flex;flex-direction:column;max-height:94vh;max-width:1080px;width:min(94vw,1080px)}.ps-proof-modal>header,.ps-print-modal>header{align-items:flex-start;border-bottom:1px solid #dfd4ca;display:flex;justify-content:space-between;padding:18px 20px}.ps-proof-modal header small,.ps-print-modal header small{color:#ad7d43;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.ps-proof-modal h4,.ps-print-modal h4{font:400 22px Rufina,serif;margin:3px 0}.ps-proof-modal header code{font-size:10px}.ps-proof-modal header button,.ps-print-modal header button{background:transparent;border:0;font-size:18px}.ps-proof-image{align-items:center;background:#ded6ce;display:flex;justify-content:center;min-height:260px;overflow:auto;padding:24px}.ps-proof-image img{display:block;height:auto;max-height:68vh;max-width:100%;object-fit:contain}.ps-proof-modal>footer,.ps-print-modal>footer{align-items:center;border-top:1px solid #dfd4ca;display:flex;justify-content:space-between;padding:14px 20px}.ps-proof-modal footer span,.ps-proof-modal footer label{font-size:11px}.ps-print-modal{max-width:980px}.ps-print-body{display:grid;gap:24px;grid-template-columns:minmax(0,1fr) 340px;overflow:auto;padding:22px}.ps-print-controls{align-content:start;display:grid;gap:12px;grid-template-columns:1fr 1fr}.ps-print-controls label{color:#5f5146;display:grid;font-size:10px;font-weight:700;gap:5px;position:relative;text-transform:uppercase}.ps-print-controls label>span{bottom:12px;font-size:10px;position:absolute;right:10px}.ps-print-controls .ps-check{align-items:center;display:flex;grid-column:1/-1;grid-template-columns:auto 1fr;text-transform:none}.ps-print-controls .ps-check input{min-height:auto}.ps-size-control{border:1px solid #d9cdc1;display:grid;gap:10px;grid-column:1/-1;grid-template-columns:1fr 1fr;margin:2px 0;padding:12px}.ps-size-control legend{color:#4d4036;float:none;font-size:10px;font-weight:800;letter-spacing:.08em;margin:0;padding:0 4px;text-transform:uppercase;width:auto}.ps-size-control legend span{color:#8a7767;font-size:9px;font-weight:500;letter-spacing:0;margin-left:8px;text-transform:none}.ps-size-control>small,.ps-size-summary{color:#806f61;font-size:9px;grid-column:1/-1;line-height:1.45}.ps-size-summary{background:#f4eee8;padding:7px 9px;text-align:left}.ps-size-control .ps-scale{align-items:center;grid-column:1/-1;grid-template-columns:auto minmax(100px,1fr) auto}.ps-size-control .ps-scale input{min-height:auto;padding:0}.ps-size-control .ps-scale output{color:#ad7d43;font-size:11px;min-width:38px;text-align:right}.ps-layout-preview{background:#f1ebe4;display:flex;flex-direction:column;gap:12px;min-height:420px;padding:16px}.ps-layout-heading{display:grid;gap:3px}.ps-layout-heading>span{color:#ad7d43;font-size:9px;font-weight:800;letter-spacing:.12em}.ps-layout-heading b{font:400 20px Rufina,serif}.ps-layout-heading small{color:#6e5f53;font-size:10px}.ps-page-list{display:grid;gap:10px;max-height:330px;overflow:auto;padding-right:4px}.ps-page-list article{display:grid;gap:4px}.ps-page-list article>header{color:#6b5c50;display:flex;font-size:9px;font-weight:700;justify-content:space-between}.ps-mini-page{background:#fff;border:1px solid #d2c5b8;box-shadow:0 2px 8px #3b2a1d1a;position:relative;width:100%}.ps-mini-card{align-items:center;background:#241a15;border:1px solid #bc915d;color:#f4eadf;display:flex;justify-content:center;overflow:hidden;position:absolute}.ps-mini-card img{display:block;height:100%;object-fit:fill;width:100%}.ps-mini-card i{font-size:clamp(5px,1vw,10px)}.ps-layout-error{background:#fff3e4;border-left:3px solid #b66d28;color:#744819;font-size:10px;padding:10px}.ps-layout-preview>p{color:#716156;font-size:9px;line-height:1.55;margin:auto 0 0}.ps-sheet-summary{align-items:center;background:#f1ebe4;display:flex;flex-direction:column;gap:7px;justify-content:center;padding:22px;text-align:center}.ps-sheet-summary>i{font-size:38px}.ps-sheet-summary span,.ps-sheet-summary small{color:#77675b;font-size:10px}.ps-footer>span b{color:#3f332a}.ps-actions{flex-wrap:wrap}.ps-print-actions{display:flex;gap:8px}.ps-search:focus-within{border-color:#b98b51;box-shadow:0 0 0 2px rgba(185,139,81,.16)}
.ps-production-control{border:1px solid #d9cdc1;display:grid;gap:10px;grid-column:1/-1;margin:2px 0;padding:12px}.ps-production-control legend{color:#4d4036;float:none;font-size:10px;font-weight:800;letter-spacing:.08em;margin:0;padding:0 4px;text-transform:uppercase;width:auto}.ps-production-control>small{color:#806f61;font-size:9px;line-height:1.45}.ps-cut-settings{display:grid;gap:10px;grid-template-columns:1fr 1fr}.ps-mini-page--cut{background:repeating-linear-gradient(45deg,#fff,#fff 7px,#fbf7fb 7px,#fbf7fb 14px)}.ps-mini-card--cut{background:transparent;border:1px solid #ff00ff;border-radius:2px;overflow:visible}.ps-mini-card--cut::after{color:#b600b6;content:'CUT';font-size:5px;font-weight:800;left:2px;letter-spacing:.05em;position:absolute;top:1px}
.ps-card-template{align-items:center;display:grid;gap:6px;grid-column:1/-1;grid-template-columns:auto minmax(0,1fr);margin-top:4px}.ps-card-template span{color:#7b695b;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.ps-card-template select{background:#fff;border:1px solid #d7c9bc;color:#352a22;font-size:10px;min-height:34px;padding:6px 8px;width:100%}.ps-card-template select:focus{border-color:#b98b51;outline:2px solid rgba(185,139,81,.16)}
.ps-saved-collections{background:#f8f3ec;border:1px solid #dfd2c4;display:grid;gap:10px;padding:12px}.ps-saved-collections>header{align-items:center;display:flex;justify-content:space-between}.ps-saved-collections>header>div{align-items:center;display:flex;gap:9px}.ps-saved-collections header i{color:#ad7d43}.ps-saved-collections header span{display:grid}.ps-saved-collections header b{font-size:11px}.ps-saved-collections header small{color:#827365;font-size:9px}.ps-saved-collections header em{background:#ad7d43;border-radius:20px;color:#fff;font-size:9px;font-style:normal;padding:3px 7px}.ps-saved-collections>div{display:grid;gap:7px;grid-template-columns:repeat(auto-fill,minmax(190px,1fr))}.ps-saved-collections button{align-items:center;background:#fff;border:1px solid #ddd1c5;color:#352a22;display:flex;justify-content:space-between;padding:9px 10px;text-align:left}.ps-saved-collections button:hover{border-color:#b98b51}.ps-saved-collections button span{display:grid}.ps-saved-collections button b{font-size:10px}.ps-saved-collections button small{color:#827365;font-size:8px}.ps-collection-notice{background:#f2ece5;color:#665548;font-size:10px;margin:0;padding:8px 10px}.ps-order{border:1px solid #dfd4ca;display:grid;gap:0}.ps-order>header{align-items:center;background:#f5f0ea;display:flex;justify-content:space-between;padding:10px 12px}.ps-order header>div{display:grid}.ps-order header b{font-size:11px}.ps-order header small,.ps-order header span{color:#806f61;font-size:9px}.ps-order ol{display:grid;list-style:none;margin:0;max-height:210px;overflow:auto;padding:0}.ps-order li{align-items:center;display:grid;gap:10px;grid-template-columns:26px minmax(0,1fr) auto;padding:8px 10px}.ps-order li+li{border-top:1px solid #eee6df}.ps-order li>span{align-items:center;background:#eee6de;border-radius:50%;display:flex;font-size:9px;font-weight:800;height:24px;justify-content:center}.ps-order li>div:nth-child(2){display:grid}.ps-order li b{font-size:10px}.ps-order li small{color:#88786c;font-size:8px}.ps-order li>div:last-child{display:flex;gap:4px}.ps-order li button{align-items:center;background:#fff;border:1px solid #d8ccc1;color:#665548;display:flex;height:26px;justify-content:center;width:26px}.ps-order li button.danger{color:#a3443c}.ps-order li button:disabled{opacity:.3}.ps-collection-control{background:#f8f3ec;border:1px solid #d7c9bb;display:grid;gap:9px;grid-column:1/-1;padding:12px}.ps-collection-control legend{color:#4d4036;float:none;font-size:10px;font-weight:800;letter-spacing:.08em;margin:0;padding:0 4px;text-transform:uppercase;width:auto}.ps-collection-control p{color:#78685b;font-size:9px;line-height:1.45;margin:0}.ps-collection-control>div{display:flex;gap:8px;justify-content:flex-end}.ps-collection-control>small{background:#eee6dc;color:#665548;font-size:9px;padding:7px 8px}.pc-workspace{display:grid;gap:14px}.pc-directory-head{align-items:flex-start;display:flex;justify-content:space-between}.pc-directory-head>div>span{color:#ad7d43;font-size:9px;font-weight:800;letter-spacing:.14em}.pc-directory-head h4{font:400 22px Rufina,serif;margin:3px 0}.pc-directory-head p{color:#7b6a5c;font-size:10px;margin:0;max-width:680px}.pc-folders{display:flex;gap:8px;overflow:auto;padding-bottom:2px}.pc-folders>button{align-items:center;background:#f8f3ec;border:1px solid #ddd0c2;color:#5a493c;display:grid;flex:0 0 220px;gap:9px;grid-template-columns:auto 1fr auto;padding:10px;text-align:left}.pc-folders>button.active,.pc-folders>button:hover{border-color:#b98b51}.pc-folders>button>i:first-child{color:#ad7d43;font-size:20px}.pc-folders span{display:grid}.pc-folders b{font-size:10px}.pc-folders small{color:#857467;font-size:8px}.pc-editor-bar{align-items:end;background:#f2ece5;border:1px solid #ded2c6;display:flex;gap:16px;justify-content:space-between;padding:12px}.pc-editor-bar>label{display:grid;flex:1;gap:5px}.pc-editor-bar>label span{color:#68584a;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}.pc-editor-bar input,.pc-instance select{background:#fff;border:1px solid #d8cbbf;min-height:38px;padding:7px 9px}.pc-editor-bar>div{display:flex;gap:8px}.pc-body{display:grid;gap:14px;grid-template-columns:260px minmax(0,1fr)}.pc-assets{border:1px solid #ded4ca;min-width:0}.pc-assets>header{display:grid;padding:11px 12px}.pc-assets>header b{font-size:11px}.pc-assets>header small{color:#867669;font-size:9px}.pc-assets>.ps-search{margin:0 10px 10px}.pc-assets>div{max-height:62vh;overflow:auto}.pc-assets article{align-items:center;border-top:1px solid #eee7e0;display:grid;gap:8px;grid-template-columns:30px minmax(0,1fr) auto;padding:8px 10px}.pc-assets article>span:nth-child(2){display:grid;min-width:0}.pc-assets article b{font-size:9px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pc-assets article small{color:#8a796b;font-size:7px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pc-assets article button{background:#fff;border:1px solid #cdbcae;color:#6d5948;font-size:8px;padding:5px 7px}.pc-assets article em{color:#6e8069;font-size:7px;font-style:normal}.pc-objects{display:grid;gap:12px;min-width:0}.pc-group{border:1px solid #dcd1c7}.pc-group>header{align-items:center;background:#f6f1eb;display:flex;justify-content:space-between;padding:9px 11px}.pc-group>header>div{align-items:center;display:flex;gap:8px}.pc-group>header>div>i{color:#ad7d43}.pc-group>header span{display:grid}.pc-group>header b{font-size:10px}.pc-group>header small{color:#827365;font-size:8px}.pc-quantity{align-items:center!important;color:#766457;display:flex!important;font-size:8px;font-weight:800;gap:5px;text-transform:uppercase}.pc-quantity button{align-items:center;background:#fff;border:1px solid #d0c2b5;color:#655447;display:flex;height:28px;justify-content:center;width:28px}.pc-quantity output{background:#fff;border-bottom:1px solid #d0c2b5;border-top:1px solid #d0c2b5;font-size:10px;line-height:26px;margin:0 -5px;min-width:34px;text-align:center}.pc-quantity button:disabled{opacity:.35}.pc-instance{align-items:center;display:grid;gap:10px;grid-template-columns:24px 74px minmax(0,1fr) auto;padding:9px 10px}.pc-instance+.pc-instance{border-top:1px solid #eee6de}.pc-instance-number{align-items:center;background:#ede5dc;border-radius:50%;display:flex;font-size:8px;font-weight:800;height:22px;justify-content:center}.pc-instance figure{align-items:center;background:#e9e2db;display:flex;justify-content:center;margin:0;max-height:82px;overflow:hidden;width:74px}.pc-instance figure img{height:100%;object-fit:contain;width:100%}.pc-instance-copy{display:grid;gap:3px}.pc-instance-copy>b{font-size:10px}.pc-instance-copy>small{color:#857568;font-size:8px}.pc-instance-copy label{align-items:center;display:grid;gap:7px;grid-template-columns:auto minmax(140px,1fr)}.pc-instance-copy label span{color:#806e60;font-size:8px;font-weight:800;text-transform:uppercase}.pc-instance-copy select{font-size:9px;min-height:32px;width:100%}.pc-instance-actions{display:flex;gap:4px}.pc-instance-actions a,.pc-instance-actions button{align-items:center;background:#fff;border:1px solid #d6c9bd;color:#665548;display:flex;height:28px;justify-content:center;padding:0;width:28px}.pc-instance-actions .danger{color:#a3443c}.pc-instance-actions button:disabled{opacity:.3}
@media(max-width:850px){.ps-toolbar,.ps-toolbar--targets{grid-template-columns:1fr}.ps-template-card{grid-template-columns:76px minmax(0,1fr) auto}.ps-template-shape{height:74px;width:76px}.ps-print-body{grid-template-columns:1fr}.ps-grid{grid-template-columns:1fr}.pc-editor-bar,.pc-directory-head{align-items:stretch;flex-direction:column}.pc-editor-bar>div{display:grid;grid-template-columns:1fr 1fr}.pc-body{grid-template-columns:1fr}.pc-assets>div{max-height:260px}.pc-instance{grid-template-columns:24px 60px minmax(0,1fr)}.pc-instance figure{width:60px}.pc-instance-actions{grid-column:2/-1;justify-content:flex-end}}
.pc-instance.error{background:#fff8ef;border-left:3px solid #b66d28}.pc-instance-copy>p{color:#9b5f1b;font-size:8px;margin:2px 0 0}
.pc-body{grid-template-columns:330px minmax(0,1fr)}
.pc-assets article{gap:9px;grid-template-columns:64px minmax(0,1fr) auto;padding:9px 10px}
.pc-assets article figure{align-items:center;background:#e9e2db;border:1px solid #ddd1c6;display:flex;height:58px;justify-content:center;margin:0;overflow:hidden;width:64px}
.pc-assets article figure img{height:100%;object-fit:contain;width:100%}
.pc-assets article figure i{color:#9a8878}
.pc-assets article>span{display:grid;gap:2px;min-width:0}
.pc-assets article button{padding:6px 8px;white-space:nowrap}
.pc-assets article button:hover{border-color:#ad7d43;color:#8a5a24}
.pc-instance{gap:12px;grid-template-columns:24px 118px minmax(0,1fr) auto;padding:10px}
.pc-instance-preview{align-items:center;background:#e9e2db;border:1px solid #d8cabe;display:flex;justify-content:center;margin:0;max-height:112px;overflow:hidden;padding:0;position:relative;width:118px}
.pc-instance-preview img{height:100%;object-fit:contain;width:100%}
.pc-instance-preview>span{align-items:center;background:#2d211bb8;bottom:5px;color:#fff;display:flex;height:22px;justify-content:center;position:absolute;right:5px;width:22px}
.pc-instance-preview:disabled{cursor:wait}
@media(max-width:850px){.pc-assets>div{max-height:300px}.pc-instance{grid-template-columns:24px 84px minmax(0,1fr)}.pc-instance-preview{width:84px}}
</style>
