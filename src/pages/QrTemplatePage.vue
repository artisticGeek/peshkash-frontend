<template>
  <div class="studio" :class="{ 'studio--embedded': embedded }">
    <template v-if="mode === 'library'">
      <section v-if="savedDesigns.length" class="saved-section">
        <div class="section-heading">
          <div><p class="eyebrow">YOUR WORK</p><h2>Saved designs</h2></div>
          <span>{{ savedDesigns.length }} design{{ savedDesigns.length === 1 ? '' : 's' }}</span>
        </div>
        <div class="saved-strip">
          <div v-for="saved in savedDesigns" :key="saved.id" class="saved-card">
            <button class="saved-card-body" @click="editSaved(saved)">
              <span class="saved-monogram">{{ saved.name.slice(0, 1).toUpperCase() }}</span>
              <span><b>{{ saved.name }}</b><small>{{ templateLabelFor(saved) }}</small></span>
              <i class="bi bi-arrow-up-right"></i>
            </button>
            <button class="saved-delete" :disabled="deleting === saved.id" @click.stop="deleteDesign(saved.id!)" title="Delete design"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </section>

      <section class="library-section">
        <div class="library-heading">
          <div><p class="eyebrow">THE LIBRARY</p><h2>Choose by purpose, not dimensions.</h2></div>
          <div class="library-count"><strong>{{ filteredTemplates.length }}</strong><span>of {{ qrManifest.librarySize }}<br>templates</span></div>
        </div>
        <div class="library-toolbar">
          <label class="search-box"><i class="bi bi-search"></i><input v-model="search" type="search" placeholder="Search artist, table menu, product tag…"></label>
        </div>
        <div class="category-list" aria-label="Template categories">
          <button :class="{ active: activeCategory === 'all' }" @click="activeCategory = 'all'">All use cases</button>
          <button v-for="(label, id) in qrManifest.categories" :key="id" :class="{ active: activeCategory === id }" @click="activeCategory = id">{{ label }}</button>
        </div>
        <button class="create-template-cta" @click="showCreator = true">
          <span class="cta-icon"><i class="bi bi-plus-lg"></i></span>
          <span class="cta-text"><b>Create a custom template</b><small>Pick a shape and size — it works just like the library, start to finish.</small></span>
          <i class="bi bi-arrow-up-right"></i>
        </button>
        <div v-if="filteredTemplates.length" class="template-grid">
          <article v-for="template in filteredTemplates" :key="template.id" class="template-card">
            <button class="template-preview" @click="startWithTemplate(template)">
              <img :src="assetPath(template)" :alt="template.label">
              <span class="use-template">Use template <i class="bi bi-arrow-up-right"></i></span>
            </button>
            <div class="template-meta">
              <div><p>{{ template.categoryLabel }}</p><h3>{{ template.label }}</h3></div>
              <span class="format-pill">{{ template.format }}</span>
            </div>
            <div class="tag-row"><span v-for="tag in template.tags.slice(0, 3)" :key="tag">{{ tag }}</span></div>
          </article>
        </div>
        <div v-else class="empty-state"><i class="bi bi-search"></i><h3>No matching template</h3><p>Try a broader use case or clear the search.</p></div>
      </section>
    </template>

    <template v-else-if="activeTemplate">
      <header class="editor-bar">
        <button class="back-button" @click="closeEditor"><i class="bi bi-arrow-left"></i><span>Template library</span></button>
        <div class="editor-title"><span>Editing</span><b>{{ activeTemplate.label }}</b></div>
        <div class="editor-actions">
          <button class="secondary-action" @click="downloadSvg"><i class="bi bi-filetype-svg"></i> SVG</button>
          <button class="secondary-action" @click="downloadPng"><i class="bi bi-download"></i> PNG</button>
          <button class="primary-action compact" :disabled="saving" @click="saveDesign">{{ saving ? 'Saving…' : 'Save design' }}</button>
        </div>
      </header>
      <main class="editor-shell">

        <!-- ── Interactive canvas stage ─────────────────────── -->
        <section class="canvas-stage" ref="stageRef">
          <div class="stage-ruler">
            <span>{{ activeTemplate.ratio }}</span>
            <span>{{ Math.round(design.widthMm) }} × {{ Math.round(design.heightMm) }} mm</span>
          </div>
          <div class="canvas-wrap" ref="canvasWrapRef" :class="{ 'is-dragging': isDragging }">
            <div class="canvas-root"
                 :style="{ width: displayW + 'px', height: displayH + 'px' }"
                 @click.self="selectedEl = null">

              <!-- Background layers (pointer-events:none) -->
              <div class="canvas-bg" :style="{ background: bgColor }"></div>
              <div class="canvas-inner" :style="innerBgStyle"></div>

              <!-- Scan corners SVG (pointer-events:none) -->
              <svg class="canvas-corners"
                   :width="displayW" :height="displayH"
                   :viewBox="`0 0 ${displayW} ${displayH}`"
                   style="pointer-events:none">
                <g fill="none" stroke="#BB9057" :stroke-width="cornerSw" opacity=".8">
                  <path v-for="(d, i) in cornerPaths" :key="i" :d="d"/>
                </g>
              </svg>

              <!-- QR Code element: full element is draggable -->
              <div class="canvas-el el--qr"
                   :class="{ selected: selectedEl === 'qr' }"
                   :style="qrElStyle"
                   @pointerdown.stop="startQrDrag"
                   @click.stop="selectedEl = 'qr'">
                <img :src="qrDataUri" style="width:100%;height:100%;display:block">
                <template v-if="selectedEl === 'qr'">
                  <div class="sel-ring"></div>
                  <div class="resize-handle"
                       @pointerdown.stop="startQrResize"
                       title="Drag to resize"></div>
                  <button class="qr-reset-btn" v-if="qrWasEdited" @click.stop="resetQrPos" title="Reset position"><i class="bi bi-arrow-counterclockwise"></i></button>
                </template>
              </div>

              <!-- Copy block: grab anywhere to drag (Canva-style); double-click a line to edit it -->
              <div class="canvas-el el--copy"
                   :class="{ selected: selectedEl === 'copy', 'is-editing-text': editingKey }"
                   :style="copyElStyle"
                   @pointerdown="onBlockPointerDown('copy', $event)"
                   @click.stop="selectedEl = 'copy'">
                <div v-if="vis.eyebrow"
                     class="t-line t-eyebrow"
                     :style="eyebrowStyle"
                     :key="'ey-' + designKey"
                     ref="eyebrowEl"
                     :contenteditable="editingKey === 'eyebrow'"
                     spellcheck="false"
                     @dblclick.stop="startTextEdit('eyebrow', $event)"
                     @blur="endTextEdit"
                     @keydown.escape="($event.target as HTMLElement).blur()"
                     @input="design.eyebrow = ($event.target as HTMLElement).innerText"
                >{{ design.eyebrow }}</div>
                <div v-if="vis.headline"
                     class="t-line t-headline"
                     :style="headlineStyle"
                     :key="'hl-' + designKey"
                     ref="headlineEl"
                     :contenteditable="editingKey === 'headline'"
                     spellcheck="false"
                     @dblclick.stop="startTextEdit('headline', $event)"
                     @blur="endTextEdit"
                     @keydown.escape="($event.target as HTMLElement).blur()"
                     @input="design.headline = ($event.target as HTMLElement).innerText"
                >{{ design.headline }}</div>
                <div v-if="vis.descriptor"
                     class="t-line t-descriptor"
                     :style="descriptorStyle"
                     :key="'ds-' + designKey"
                     ref="descriptorEl"
                     :contenteditable="editingKey === 'descriptor'"
                     spellcheck="false"
                     @dblclick.stop="startTextEdit('descriptor', $event)"
                     @blur="endTextEdit"
                     @keydown.escape="($event.target as HTMLElement).blur()"
                     @input="design.descriptor = ($event.target as HTMLElement).innerText"
                >{{ design.descriptor }}</div>
                <div v-if="vis.cta"
                     class="t-line t-cta"
                     :style="ctaStyle"
                     :key="'ct-' + designKey"
                     ref="ctaEl"
                     :contenteditable="editingKey === 'cta'"
                     spellcheck="false"
                     @dblclick.stop="startTextEdit('cta', $event)"
                     @blur="endTextEdit"
                     @keydown.escape="($event.target as HTMLElement).blur()"
                     @input="design.cta = ($event.target as HTMLElement).innerText"
                >{{ design.cta }}</div>
                <div v-if="selectedEl === 'copy'" class="sel-ring"></div>
                <div v-if="selectedEl === 'copy'"
                     class="resize-handle resize-handle--h"
                     @pointerdown.stop="startElResize('copy', $event)"
                     title="Drag to resize width"></div>
              </div>

              <!-- Merchant name element -->
              <div v-if="vis.merchantName"
                   class="canvas-el el--merchant"
                   :class="{ selected: selectedEl === 'merchant', 'is-editing-text': editingKey === 'merchantName' }"
                   :style="merchantElStyle"
                   @pointerdown="onBlockPointerDown('merchant', $event)"
                   @click.stop="selectedEl = 'merchant'">
                <div class="t-line t-merchant"
                     :style="merchantTextStyle"
                     :key="'mn-' + designKey"
                     ref="merchantEl"
                     :contenteditable="editingKey === 'merchantName'"
                     spellcheck="false"
                     @dblclick.stop="startTextEdit('merchantName', $event)"
                     @blur="endTextEdit"
                     @keydown.escape="($event.target as HTMLElement).blur()"
                     @input="design.merchantName = ($event.target as HTMLElement).innerText"
                >{{ design.merchantName }}</div>
                <div v-if="selectedEl === 'merchant'" class="sel-ring"></div>
                <div v-if="selectedEl === 'merchant'"
                     class="resize-handle resize-handle--h"
                     @pointerdown.stop="startElResize('merchant', $event)"
                     title="Drag to resize width"></div>
              </div>

              <!-- Brand mark: locked, not interactive -->
              <div v-if="vis.brandmark" class="canvas-el el--brandmark" :style="bmContainerStyle">
                <img
                  :src="dark ? '/brand/peshkash-logo-dark.svg' : '/brand/peshkash-logo-light.svg'"
                  :style="bmImgStyle"
                  draggable="false">
              </div>

              <!-- Canva-style center snap guides -->
              <div v-if="snapGuides.centerX" class="snap-guide snap-guide--v" :style="{ left: (displayW / 2) + 'px' }"></div>
              <div v-if="snapGuides.centerY" class="snap-guide snap-guide--h" :style="{ top: (displayH / 2) + 'px' }"></div>

            </div><!-- /canvas-root -->
          </div><!-- /canvas-wrap -->
          <div class="preview-caption"><span class="live-dot"></span> Drag any element to move it, snaps to center · Double-click text to edit · Arrow keys to nudge, Shift for bigger steps</div>
        </section>

        <!-- ── Properties panel ───────────────────────────── -->
        <aside class="properties-panel" @click.stop>

          <!-- Default: global design settings -->
          <template v-if="!selectedEl">
            <section>
              <p class="panel-kicker">DESIGN</p>
              <label>Design name<input v-model="design.name" maxlength="80"></label>
              <label>Scan destination<input v-model="design.destination" inputmode="url" placeholder="https://pksh.in/your-link"></label>
              <p :class="['field-note', { invalid: !destinationValid }]">
                <i :class="destinationValid ? 'bi bi-shield-check' : 'bi bi-exclamation-circle'"></i>
                {{ destinationValid ? 'Short HTTPS link ready to encode.' : 'Use a complete https:// URL.' }}
              </p>
            </section>
            <section>
              <p class="panel-kicker">SURFACE</p>
              <div class="theme-options">
                <button :class="{ active: design.theme === 'light' }" @click="design.theme = 'light'"><span class="surface surface--light"></span>Warm cream</button>
                <button :class="{ active: design.theme === 'dark' }" @click="design.theme = 'dark'"><span class="surface surface--dark"></span>Near black</button>
              </div>
            </section>
            <section>
              <p class="panel-kicker">OUTPUT</p>
              <label>Print width (mm)<input v-model.number="design.widthMm" type="number" min="24" max="1000" step="1" @change="syncHeight"></label>
              <div class="standard-card">
                <div><i class="bi bi-patch-check-fill"></i><b>Scan-safe standard</b></div>
                <ul><li>Error correction H</li><li>4-module quiet zone</li><li>Rounded modules + anchors</li><li>Peshkash brand mark</li></ul>
              </div>
            </section>
            <section>
              <p class="panel-kicker">ELEMENTS</p>
              <div class="vis-toggles">
                <button :class="['vis-btn', { active: vis.brandmark }]" @click="toggleVis('brandmark')">
                  <i :class="vis.brandmark ? 'bi bi-eye' : 'bi bi-eye-slash'"></i>
                  Peshkash mark
                </button>
              </div>
            </section>
            <div class="zone-hint"><i class="bi bi-cursor"></i> Click any element on the canvas to select and edit it</div>
          </template>

          <!-- QR Code selected -->
          <template v-else-if="selectedEl === 'qr'">
            <div class="panel-back-row">
              <button class="back-to-props" @click="selectedEl = null"><i class="bi bi-arrow-left"></i></button>
              <p class="panel-kicker">QR SIGNATURE</p>
            </div>
            <button v-for="(style, id) in qrManifest.qrStyles" :key="id" class="signature-card" :class="{ active: design.qrStyle === id }" @click="design.qrStyle = id as QrStyleId">
              <img :src="signaturePreview(id as QrStyleId)" alt="">
              <span><b>{{ style.label }}</b><small>{{ style.medallion }}</small></span>
              <i class="bi bi-check-circle-fill"></i>
            </button>
            <p class="panel-kicker" style="margin-top:18px">POSITION &amp; SIZE</p>
            <p class="field-hint">Drag the QR code on the canvas to reposition — it snaps to center. Drag the <b>bottom-right corner</b> to resize, or use arrow keys to nudge.</p>
            <button v-if="qrWasEdited" class="reset-btn" @click="resetQrPos"><i class="bi bi-arrow-counterclockwise"></i> Reset to template default</button>
          </template>

          <!-- Copy block selected -->
          <template v-else-if="selectedEl === 'copy'">
            <div class="panel-back-row">
              <button class="back-to-props" @click="selectedEl = null"><i class="bi bi-arrow-left"></i></button>
              <p class="panel-kicker">COPY BLOCK</p>
            </div>
            <p class="canvas-edit-hint"><i class="bi bi-pencil"></i> Drag the block to move it (snaps to center) or use arrow keys to nudge. Drag its right edge to resize width. Double-click any line to edit it directly.</p>
            <section>
              <p class="panel-kicker" style="margin-bottom:10px">ELEMENTS</p>
              <div class="vis-toggles">
                <button v-for="key in (['eyebrow','headline','descriptor','cta'] as ElementKey[])" :key="key"
                        :class="['vis-btn', { active: vis[key] }]"
                        @click="toggleVis(key)" :title="vis[key] ? 'Hide ' + key : 'Show ' + key">
                  <i :class="vis[key] ? 'bi bi-eye' : 'bi bi-eye-slash'"></i>
                  {{ key.charAt(0).toUpperCase() + key.slice(1) }}
                </button>
              </div>
            </section>
            <section>
              <label>Eyebrow<input v-model="design.eyebrow" maxlength="40" placeholder="e.g. ORIGINAL WORK" :disabled="!vis.eyebrow"></label>
              <label>Headline<textarea v-model="design.headline" rows="2" maxlength="90" placeholder="e.g. Study No. 14" :disabled="!vis.headline"></textarea></label>
              <label>Descriptor<input v-model="design.descriptor" maxlength="100" placeholder="e.g. Process · provenance · available pieces" :disabled="!vis.descriptor"></label>
              <label>Call to action<input v-model="design.cta" maxlength="40" placeholder="e.g. Scan to explore" :disabled="!vis.cta"></label>
            </section>
          </template>

          <!-- Brand / Merchant selected -->
          <template v-else-if="selectedEl === 'merchant'">
            <div class="panel-back-row">
              <button class="back-to-props" @click="selectedEl = null"><i class="bi bi-arrow-left"></i></button>
              <p class="panel-kicker">BRAND NAME</p>
            </div>
            <p class="canvas-edit-hint"><i class="bi bi-pencil"></i> Drag the name to move it (snaps to center) or use arrow keys to nudge. Drag its right edge to resize width. Double-click it to edit directly.</p>
            <section>
              <div class="vis-toggles" style="margin-bottom:14px">
                <button :class="['vis-btn', { active: vis.merchantName }]" @click="toggleVis('merchantName')">
                  <i :class="vis.merchantName ? 'bi bi-eye' : 'bi bi-eye-slash'"></i>
                  Show name
                </button>
              </div>
              <label>Business or maker<input v-model="design.merchantName" maxlength="80" placeholder="e.g. The Craft Studio" :disabled="!vis.merchantName"></label>
            </section>
          </template>

        </aside>
      </main>
    </template>

    <div v-if="notice" class="notice" role="status"><i class="bi bi-check2-circle"></i>{{ notice }}</div>

    <!-- ── Template creator ─────────────────────────────── -->
    <div v-if="showCreator" class="creator-overlay" @click.self="showCreator = false">
      <div class="creator-modal">
        <div class="creator-head">
          <div><p class="eyebrow">NEW TEMPLATE</p><h3>Design a custom template</h3></div>
          <button class="creator-close" @click="showCreator = false" title="Close"><i class="bi bi-x-lg"></i></button>
        </div>
        <label class="creator-name-field">Template name
          <input v-model="creatorName" maxlength="60" placeholder="e.g. Rooftop Bar Table Tent">
        </label>
        <p class="creator-sub">Choose a shape</p>
        <div class="format-grid">
          <button v-for="preset in FORMAT_PRESETS" :key="preset.format"
                  :class="['format-option', { active: creatorFormat === preset.format }]"
                  @click="creatorFormat = preset.format">
            <span class="format-swatch" :class="{ round: preset.format === 'round' }" :style="{ aspectRatio: `${preset.aspect.w} / ${preset.aspect.h}` }"></span>
            <b>{{ preset.label }}</b>
            <small>{{ preset.description }}</small>
          </button>
        </div>
        <div class="creator-actions">
          <button class="secondary-action" @click="showCreator = false">Cancel</button>
          <button class="primary-action" @click="startCustomTemplate">Create template <i class="bi bi-arrow-right"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { renderBrandedQrSvg, svgDataUri } from '../features/qrStudio/qrRenderer';
import { renderTemplateSvg } from '../features/qrStudio/templateRenderer';
import { qrManifest, type QrStyleId, type QrTemplateDefinition, type StudioDesign, type ElementKey, type TemplateFormat, type CustomTemplateSpec } from '../features/qrStudio/types';
import { FORMAT_PRESETS, buildCustomTemplateSpec, synthesizeCustomTemplate } from '../features/qrStudio/customTemplate';
import '../features/qrStudio/qr-template-tokens.css';

// Brand kit logo: SVG content spans x:[335,1312] y:[164,415] in a 1536×512 viewBox
const LOGO_SVG_W = 1536, LOGO_SVG_H = 512;
const LOGO_CX1 = 335, LOGO_CX2 = 1312, LOGO_CY1 = 164, LOGO_CY2 = 415;

const props = withDefaults(defineProps<{
  embedded?: boolean;
  vendorId?: number;
  vendorName?: string;
}>(), { embedded: false });
const embedded = computed(() => props.embedded);
const route = useRoute();
const mode = ref<'library' | 'editor'>('library');
const search = ref('');
const activeCategory = ref('all');
const activeTemplate = ref<QrTemplateDefinition | null>(null);
const savedDesigns = ref<StudioDesign[]>([]);
const saving = ref(false);
const deleting = ref<number | string | null>(null);
const notice = ref('');
// Set from ?destination query param when opened from a QR asset "Design" button
const destinationHint = ref('');

// ── Template creator (build a template from scratch, compatible with the library) ────────────
const showCreator = ref(false);
const creatorFormat = ref<TemplateFormat>('landscape');
const creatorName = ref('');

// ── Canvas state ──────────────────────────────────────────────────────────────
const stageRef = ref<HTMLElement>();
const canvasWrapRef = ref<HTMLElement>();
const canvasScale = ref(0.5);
const designKey = ref(0);
const selectedEl = ref<'qr' | 'copy' | 'merchant' | null>(null);
// Which text line is currently in edit mode (contenteditable) — null means every element on the
// canvas is plain drag-anywhere, Canva-style; double-clicking a line enters edit mode for it alone.
const editingKey = ref<ElementKey | null>(null);

interface ElRect { x: number; y: number; w: number; h: number }
const elPos = ref({
  qr: { x: 0, y: 0, w: 0, h: 0 } as ElRect,
  copy: { x: 0, y: 0, w: 0, h: 0 } as ElRect,
  merchant: { x: 0, y: 0, w: 0, h: 0 } as ElRect,
  brandmark: { x: 0, y: 0, w: 0, h: 0 } as ElRect,
});
const elPosDefault = ref({ qr: { x: 0, y: 0, w: 0, h: 0 } as ElRect });
const qrWasEdited = computed(() => {
  const q = elPos.value.qr; const d = elPosDefault.value.qr;
  return Math.abs(q.x - d.x) > 0.5 || Math.abs(q.y - d.y) > 0.5 || Math.abs(q.w - d.w) > 0.5;
});

interface DragState { id: string; startCX: number; startCY: number; origX: number; origY: number }
const dragState = ref<DragState | null>(null);
// axis 'square' resizes both dimensions equally (QR); 'width' resizes only width (text blocks,
// whose height is driven by content)
interface ResizeState { id: 'qr' | 'copy' | 'merchant'; axis: 'square' | 'width'; startCX: number; startCY: number; origW: number; origH: number }
const resizeState = ref<ResizeState | null>(null);
const isDragging = ref(false);
// Canva-style center snap guides — which axis the dragged element is currently snapped to
const snapGuides = ref({ centerX: false, centerY: false });
const SNAP_FRAC = 0.006; // snap tolerance as a fraction of the canvas short side

// RAF-throttled pointer tracking — avoids flooding Vue's reactivity on every mousemove
let _rafId: number | null = null;
let _lastMoveEvent: PointerEvent | null = null;

// Text element refs for DOM sync
const eyebrowEl = ref<HTMLElement>();
const headlineEl = ref<HTMLElement>();
const descriptorEl = ref<HTMLElement>();
const ctaEl = ref<HTMLElement>();
const merchantEl = ref<HTMLElement>();

// ── Canvas computed values ────────────────────────────────────────────────────
const canvasW = computed(() => activeTemplate.value?.canvas.width ?? 800);
const canvasH = computed(() => activeTemplate.value?.canvas.height ?? 600);
const displayW = computed(() => Math.round(canvasW.value * canvasScale.value));
const displayH = computed(() => Math.round(canvasH.value * canvasScale.value));
const displayShort = computed(() => Math.min(displayW.value, displayH.value));

const dark = computed(() => design.theme === 'dark');
const bgColor = computed(() => dark.value ? '#1A1410' : '#F5F2EE');
const inkColor = computed(() => dark.value ? '#F5F2EE' : '#1A1410');

const innerBgStyle = computed((): Record<string, string> => {
  const t = activeTemplate.value; if (!t) return {};
  const sh = displayShort.value;
  const p = sh * 0.055; const surface = dark.value ? '#241C17' : '#FFFFFF';
  const radius = t.format === 'tag' ? sh * 0.045 : sh * 0.018;
  return { position: 'absolute', inset: `${p}px`, background: surface, opacity: dark.value ? '0.42' : '0.68', borderRadius: `${radius}px`, pointerEvents: 'none' };
});

const cornerSw = computed(() => Math.max(1.5, displayShort.value * 0.006));
const cornerPaths = computed(() => {
  const w = displayW.value, h = displayH.value, s = displayShort.value;
  const inset = s * 0.055, arm = s * 0.08;
  return [
    `M${inset + arm} ${inset}H${inset}V${inset + arm}`,
    `M${w - inset - arm} ${inset}H${w - inset}V${inset + arm}`,
    `M${inset} ${h - inset - arm}V${h - inset}H${inset + arm}`,
    `M${w - inset - arm} ${h - inset}H${w - inset}V${h - inset - arm}`,
  ];
});

// QR element display style
const qrElStyle = computed((): Record<string, string> => {
  const { x, y, w, h } = elPos.value.qr; const s = canvasScale.value;
  return { position: 'absolute', left: `${x * s}px`, top: `${y * s}px`, width: `${w * s}px`, height: `${h * s}px`, cursor: 'move' };
});

// Copy block display style
const copyElStyle = computed((): Record<string, string> => {
  const { x, y, w, h } = elPos.value.copy; const s = canvasScale.value;
  return { position: 'absolute', left: `${x * s}px`, top: `${y * s}px`, width: `${w * s}px`, height: `${h * s}px`, overflow: 'hidden' };
});

// Merchant display style
const merchantElStyle = computed((): Record<string, string> => {
  const { x, y, w, h } = elPos.value.merchant; const s = canvasScale.value;
  return { position: 'absolute', left: `${x * s}px`, top: `${y * s}px`, width: `${w * s}px`, height: `${h * s}px`, overflow: 'hidden' };
});

// Typography styles (in display px, matching SVG renderer proportions)
const eyebrowStyle = computed(() => ({
  fontFamily: 'Urbanist, Arial, sans-serif', fontWeight: '700',
  fontSize: `${Math.round(displayShort.value * 0.027)}px`,
  letterSpacing: `${Math.round(displayShort.value * 0.006)}px`,
  color: inkColor.value, textTransform: 'uppercase' as const,
  marginBottom: `${Math.round(displayShort.value * 0.022)}px`,
  display: 'block', outline: 'none', whiteSpace: 'nowrap' as const,
}));
const headlineStyle = computed(() => ({
  fontFamily: 'Rufina, Georgia, serif', fontWeight: '400',
  fontSize: `${Math.round(displayShort.value * 0.071)}px`,
  lineHeight: '1.1', color: inkColor.value,
  marginBottom: `${Math.round(displayShort.value * 0.012)}px`,
  display: 'block', outline: 'none',
}));
const descriptorStyle = computed(() => ({
  fontFamily: 'Urbanist, Arial, sans-serif', fontWeight: '400',
  fontSize: `${Math.round(displayShort.value * 0.032)}px`,
  color: inkColor.value, opacity: '0.72',
  marginBottom: `${Math.round(displayShort.value * 0.014)}px`,
  display: 'block', outline: 'none', whiteSpace: 'nowrap' as const,
}));
const ctaStyle = computed(() => ({
  fontFamily: 'Urbanist, Arial, sans-serif', fontWeight: '700',
  fontSize: `${Math.round(displayShort.value * 0.026)}px`,
  letterSpacing: `${Math.round(displayShort.value * 0.004)}px`,
  color: '#BB9057', textTransform: 'uppercase' as const,
  display: 'block', outline: 'none', whiteSpace: 'nowrap' as const,
}));
const merchantTextStyle = computed(() => ({
  fontFamily: 'Rufina, Georgia, serif', fontWeight: '400',
  fontSize: `${Math.round(displayShort.value * 0.034)}px`,
  color: inkColor.value, display: 'block', outline: 'none', whiteSpace: 'nowrap' as const,
}));

// Brand mark: position the logo so its visual content (x:[335,1312] y:[164,415]) renders correctly
const bmContainerStyle = computed((): Record<string, string> => {
  const { x, y, w, h } = elPos.value.brandmark; const s = canvasScale.value;
  return { position: 'absolute', left: `${x * s}px`, top: `${y * s}px`, width: `${w * s}px`, height: `${h * s}px`, overflow: 'hidden', pointerEvents: 'none' };
});
const bmImgStyle = computed((): Record<string, string> => {
  const { w: contentW, h: contentH } = elPos.value.brandmark; const s = canvasScale.value;
  // Reverse the content crop: full SVG image is larger, positioned so content aligns to container
  const contentFracW = (LOGO_CX2 - LOGO_CX1) / LOGO_SVG_W;
  const contentFracH = (LOGO_CY2 - LOGO_CY1) / LOGO_SVG_H;
  const imgW = (contentW / contentFracW) * s;
  const imgH = (contentH / contentFracH) * s;
  const offsetX = -(LOGO_CX1 / LOGO_SVG_W) * imgW;
  const offsetY = -(LOGO_CY1 / LOGO_SVG_H) * imgH;
  return { position: 'absolute', left: `${offsetX}px`, top: `${offsetY}px`, width: `${imgW}px`, height: `${imgH}px` };
});

// QR data URI for canvas display
const qrDataUri = computed(() => svgDataUri(renderBrandedQrSvg(design.destination || 'https://peshkash.app', design.qrStyle, 600)));

// Rendered SVG for export (uses current elPos)
const renderedSvg = computed(() => {
  const t = activeTemplate.value; if (!t) return '';
  const sh = Math.min(t.canvas.width, t.canvas.height);
  const { x, y, w } = elPos.value.qr;
  return renderTemplateSvg(t, design, { qr: { x: x / t.canvas.width, y: y / t.canvas.height, size: w / sh } });
});
const renderedDataUri = computed(() => svgDataUri(renderedSvg.value));

// ── Canvas init ───────────────────────────────────────────────────────────────
function initElPos(t: QrTemplateDefinition): void {
  const { width, height } = t.canvas;
  const sh = Math.min(width, height);
  const q = t.qr;
  const qrSize = q.size * sh;
  const qrX = q.x * width;
  const qrY = q.y * height;
  const padding = sh * 0.09;
  const horizontal = ['landscape', 'ticket', 'label'].includes(t.format);
  const qrOnLeft = qrX < width / 2;

  let cx: number, cy: number, cw: number, ch: number;
  if (horizontal) {
    cx = qrOnLeft ? Math.max(width * 0.47, qrX + qrSize + padding) : padding * 1.2;
    cy = height * 0.14;
    cw = qrOnLeft ? width - cx - padding : qrX - cx - padding;
    ch = height * 0.75;
  } else {
    const above = qrY > height * 0.35;
    cy = above ? height * 0.08 : Math.min(height * 0.58, qrY + qrSize + sh * 0.04);
    cx = width * 0.08;
    cw = width * 0.84;
    ch = height * 0.35;
  }

  const markBaseY = height - padding * 0.22;

  // Brand mark: compute content size to position the SVG correctly
  const logoH = sh * 0.055; // desired content height in canvas units
  const contentFracH = (LOGO_CY2 - LOGO_CY1) / LOGO_SVG_H;
  const contentFracW = (LOGO_CX2 - LOGO_CX1) / LOGO_SVG_W;
  const logoImgH = logoH / contentFracH;
  const logoImgW = logoImgH * (LOGO_SVG_W / LOGO_SVG_H);
  const logoContentW = contentFracW * logoImgW;
  const bx = width - padding * 0.5 - logoContentW;
  const by = markBaseY - logoH;

  const qrRect = { x: qrX, y: qrY, w: qrSize, h: qrSize };
  elPos.value = {
    qr: { ...qrRect },
    copy: { x: cx, y: cy, w: cw, h: ch },
    merchant: { x: padding, y: markBaseY - sh * 0.05, w: width * 0.46, h: sh * 0.06 },
    brandmark: { x: bx, y: by, w: logoContentW, h: logoH },
  };
  elPosDefault.value = { qr: { ...qrRect } };
}

function updateCanvasScale(): void {
  const wrap = canvasWrapRef.value; const t = activeTemplate.value;
  if (!wrap || !t) return;
  const usableW = wrap.clientWidth - 20;
  const usableH = wrap.clientHeight - 20;
  if (usableW < 10 || usableH < 10) return;
  const scaleW = usableW / t.canvas.width;
  const scaleH = usableH / t.canvas.height;
  canvasScale.value = Math.max(0.08, Math.min(scaleW, scaleH, 1));
}

function resetQrPos(): void {
  elPos.value.qr = { ...elPosDefault.value.qr };
}

// ── Drag & Resize ─────────────────────────────────────────────────────────────
function startDragListeners(): void {
  isDragging.value = true;
  window.addEventListener('pointermove', onWindowMove, { passive: true });
  window.addEventListener('pointerup', onWindowUp);
  window.addEventListener('pointercancel', onWindowUp);
}
// Pointer capture is a best-effort enhancement (keeps receiving events if the pointer leaves the
// element); it can throw NotFoundError in some environments. A throw here must never abort the
// rest of drag setup — window-level listeners are what actually drive the drag.
function safeSetPointerCapture(el: Element | null, pointerId: number): void {
  try { el?.setPointerCapture(pointerId); } catch { /* capture is optional */ }
}
function startQrDrag(e: PointerEvent): void {
  if (resizeState.value) return;
  selectedEl.value = 'qr';
  dragState.value = { id: 'qr', startCX: e.clientX, startCY: e.clientY, origX: elPos.value.qr.x, origY: elPos.value.qr.y };
  safeSetPointerCapture(e.currentTarget as Element, e.pointerId);
  startDragListeners();
}
function startQrResize(e: PointerEvent): void {
  resizeState.value = { id: 'qr', axis: 'square', startCX: e.clientX, startCY: e.clientY, origW: elPos.value.qr.w, origH: elPos.value.qr.h };
  safeSetPointerCapture(e.currentTarget as Element, e.pointerId);
  startDragListeners();
}
function startElDrag(id: 'copy' | 'merchant', e: PointerEvent): void {
  selectedEl.value = id;
  const { x, y } = elPos.value[id];
  dragState.value = { id, startCX: e.clientX, startCY: e.clientY, origX: x, origY: y };
  safeSetPointerCapture(e.currentTarget as Element, e.pointerId);
  startDragListeners();
}
// Width-only resize handle for the text blocks — their height is driven by content, not a drag.
function startElResize(id: 'copy' | 'merchant', e: PointerEvent): void {
  const { w, h } = elPos.value[id];
  resizeState.value = { id, axis: 'width', startCX: e.clientX, startCY: e.clientY, origW: w, origH: h };
  safeSetPointerCapture(e.currentTarget as Element, e.pointerId);
  startDragListeners();
}
// Grab-anywhere drag for the copy block / merchant name — Canva-style: pointerdown on the block
// body starts a drag immediately, unless it landed on the one line currently in text-edit mode
// (isContentEditable), in which case native cursor placement/selection takes over instead.
function onBlockPointerDown(id: 'copy' | 'merchant', e: PointerEvent): void {
  if ((e.target as HTMLElement).isContentEditable) return;
  startElDrag(id, e);
}
function textElFor(key: ElementKey): HTMLElement | undefined {
  switch (key) {
    case 'eyebrow': return eyebrowEl.value;
    case 'headline': return headlineEl.value;
    case 'descriptor': return descriptorEl.value;
    case 'cta': return ctaEl.value;
    case 'merchantName': return merchantEl.value;
    default: return undefined;
  }
}
function startTextEdit(key: ElementKey, e: MouseEvent): void {
  editingKey.value = key;
  const clientX = e.clientX, clientY = e.clientY;
  nextTick(() => {
    const el = textElFor(key);
    if (!el) return;
    el.focus();
    placeCaretAt(el, clientX, clientY);
  });
}
function endTextEdit(): void { editingKey.value = null; }
function placeCaretAt(el: HTMLElement, x: number, y: number): void {
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  };
  let range: Range | null = null;
  if (doc.caretRangeFromPoint) {
    range = doc.caretRangeFromPoint(x, y);
  } else if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); }
  }
  if (range && el.contains(range.startContainer)) {
    const sel = window.getSelection();
    sel?.removeAllRanges();
    range.collapse(true);
    sel?.addRange(range);
  }
}
function applyMove(e: PointerEvent): void {
  const t = activeTemplate.value; if (!t) return;
  const s = canvasScale.value;
  if (dragState.value) {
    const { id, startCX, startCY, origX, origY } = dragState.value;
    const el = elPos.value[id as 'qr' | 'copy' | 'merchant'];
    const maxX = t.canvas.width - el.w;
    const maxY = t.canvas.height - el.h;
    let nx = Math.max(0, Math.min(maxX, origX + (e.clientX - startCX) / s));
    let ny = Math.max(0, Math.min(maxY, origY + (e.clientY - startCY) / s));

    // Canva-style center snapping — snap the element's center to the canvas center on each axis
    // independently, within a small tolerance, and surface which axis snapped for the guide lines.
    const sh = Math.min(t.canvas.width, t.canvas.height);
    const tol = sh * SNAP_FRAC;
    const canvasCX = t.canvas.width / 2, canvasCY = t.canvas.height / 2;
    const snapX = Math.abs(nx + el.w / 2 - canvasCX) < tol;
    const snapY = Math.abs(ny + el.h / 2 - canvasCY) < tol;
    if (snapX) nx = canvasCX - el.w / 2;
    if (snapY) ny = canvasCY - el.h / 2;
    snapGuides.value = { centerX: snapX, centerY: snapY };

    el.x = nx;
    el.y = ny;
  }
  if (resizeState.value) {
    const rs = resizeState.value;
    const el = elPos.value[rs.id];
    if (rs.axis === 'square') {
      const sh = Math.min(t.canvas.width, t.canvas.height);
      const dCanvas = (e.clientX - rs.startCX) / s;
      const newW = Math.max(sh * 0.08, Math.min(sh * 0.72, rs.origW + dCanvas));
      el.w = newW;
      el.h = newW;
    } else {
      const dCanvas = (e.clientX - rs.startCX) / s;
      const maxW = t.canvas.width - el.x;
      const newW = Math.max(t.canvas.width * 0.12, Math.min(maxW, rs.origW + dCanvas));
      el.w = newW;
    }
  }
}
function onWindowMove(e: PointerEvent): void {
  _lastMoveEvent = e;
  if (_rafId === null) {
    _rafId = requestAnimationFrame(() => {
      _rafId = null;
      if (_lastMoveEvent) applyMove(_lastMoveEvent);
    });
  }
}
function onWindowUp(): void {
  if (_rafId !== null) { cancelAnimationFrame(_rafId); _rafId = null; }
  if (_lastMoveEvent) { applyMove(_lastMoveEvent); _lastMoveEvent = null; }
  isDragging.value = false;
  dragState.value = null;
  resizeState.value = null;
  snapGuides.value = { centerX: false, centerY: false };
  window.removeEventListener('pointermove', onWindowMove);
  window.removeEventListener('pointerup', onWindowUp);
  window.removeEventListener('pointercancel', onWindowUp);
}

// ── Keyboard nudge — arrow keys move the selected element by a small step, Shift for a bigger one
function onCanvasKeydown(e: KeyboardEvent): void {
  if (mode.value !== 'editor' || editingKey.value || !selectedEl.value) return;
  const active = document.activeElement as HTMLElement | null;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
  const delta: Record<string, [number, number]> = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  };
  const d = delta[e.key];
  if (!d) return;
  const t = activeTemplate.value; if (!t) return;
  e.preventDefault();
  const sh = Math.min(t.canvas.width, t.canvas.height);
  const step = sh * (e.shiftKey ? 0.02 : 0.004);
  const el = elPos.value[selectedEl.value];
  const maxX = t.canvas.width - el.w, maxY = t.canvas.height - el.h;
  el.x = Math.max(0, Math.min(maxX, el.x + d[0] * step));
  el.y = Math.max(0, Math.min(maxY, el.y + d[1] * step));
}

// ── Design state (must be before watches) ────────────────────────────────────
const blankDesign = (): StudioDesign => ({
  name: '', libraryTemplateId: '', manifestVersion: qrManifest.version,
  qrStyle: 'obsidian-ring', theme: 'light', widthMm: 120, heightMm: 70,
  merchantName: '', eyebrow: '', headline: '', descriptor: '', cta: '', destination: 'https://peshkash.app',
  visibility: {},
});
const design = reactive<StudioDesign>(blankDesign());

// Helper: true = visible (default), false = hidden
const vis = computed(() => ({
  eyebrow:      design.visibility?.eyebrow      !== false,
  headline:     design.visibility?.headline     !== false,
  descriptor:   design.visibility?.descriptor   !== false,
  cta:          design.visibility?.cta          !== false,
  merchantName: design.visibility?.merchantName !== false,
  brandmark:    design.visibility?.brandmark    !== false,
}));

function toggleVis(key: ElementKey): void {
  if (!design.visibility) design.visibility = {};
  design.visibility[key] = design.visibility[key] === false ? true : false;
}

// ── Sync panel text fields → canvas contenteditable ──────────────────────────
function syncToCanvas(elRef: Ref<HTMLElement | undefined>, val: string): void {
  const el = elRef.value;
  if (el && document.activeElement !== el) el.innerText = val;
}
watch(() => design.eyebrow, (v) => syncToCanvas(eyebrowEl, v));
watch(() => design.headline, (v) => syncToCanvas(headlineEl, v));
watch(() => design.descriptor, (v) => syncToCanvas(descriptorEl, v));
watch(() => design.cta, (v) => syncToCanvas(ctaEl, v));
watch(() => design.merchantName, (v) => syncToCanvas(merchantEl, v));
const filteredTemplates = computed(() => {
  const query = search.value.trim().toLowerCase();
  return qrManifest.templates.filter((t) => {
    if (activeCategory.value !== 'all' && t.category !== activeCategory.value) return false;
    return !query || [t.label, t.categoryLabel, t.merchantType, ...t.tags].join(' ').toLowerCase().includes(query);
  });
});
const destinationValid = computed(() => { try { return new URL(design.destination).protocol === 'https:'; } catch { return false; } });

function templateById(id: string): QrTemplateDefinition | undefined { return qrManifest.templates.find((t) => t.id === id); }
function assetPath(template: QrTemplateDefinition): string { return `/brand/qr-templates/${qrManifest.qrStyles['obsidian-ring'].folder}/${template.file}`; }
function signaturePreview(id: QrStyleId): string { return svgDataUri(renderBrandedQrSvg('https://peshkash.app/scan', id, 480)); }

// Resolves a design's template definition — from the fixed library, or reconstructed from a
// saved CustomTemplateSpec when the design was built with the template creator.
function resolveTemplate(d: StudioDesign): QrTemplateDefinition {
  const fromLibrary = templateById(d.libraryTemplateId);
  if (fromLibrary) return fromLibrary;
  if (d.customTemplate) {
    return synthesizeCustomTemplate(d.customTemplate, { id: d.libraryTemplateId || 'custom', label: d.name || 'Custom template' });
  }
  return qrManifest.templates[0];
}
function templateLabelFor(saved: StudioDesign): string {
  const fromLibrary = templateById(saved.libraryTemplateId);
  if (fromLibrary) return fromLibrary.label;
  return saved.customTemplate ? 'Custom template' : 'Library template';
}

function applyDesign(next: StudioDesign): void {
  Object.assign(design, blankDesign(), next);
  activeTemplate.value = resolveTemplate(design);
  mode.value = 'editor';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function startWithTemplate(template: QrTemplateDefinition): void {
  designKey.value++;
  selectedEl.value = null;
  const vendorLabel = props.vendorName || template.merchantType;
  applyDesign({
    ...blankDesign(),
    name: `${vendorLabel} — ${template.label}`,
    libraryTemplateId: template.id, theme: template.defaultTheme,
    widthMm: 120, heightMm: 120 * (template.canvas.height / template.canvas.width),
    merchantName: props.vendorName || template.merchantType,
    ...template.defaultCopy,
    destination: destinationHint.value || template.sampleDestination,
  });
  initElPos(template);
  nextTick(updateCanvasScale);
}
function startCustomTemplate(): void {
  const preset = FORMAT_PRESETS.find((p) => p.format === creatorFormat.value) ?? FORMAT_PRESETS[0];
  const spec: CustomTemplateSpec = buildCustomTemplateSpec(creatorFormat.value);
  const id = `custom-${Date.now().toString(36)}`;
  const label = creatorName.value.trim() || 'Custom template';
  const template = synthesizeCustomTemplate(spec, { id, label, merchantType: props.vendorName });
  designKey.value++;
  selectedEl.value = null;
  applyDesign({
    ...blankDesign(),
    name: label,
    libraryTemplateId: id,
    customTemplate: spec,
    theme: template.defaultTheme,
    widthMm: preset.defaultMm.w,
    heightMm: preset.defaultMm.h,
    merchantName: props.vendorName || '',
    ...template.defaultCopy,
    destination: destinationHint.value || template.sampleDestination,
  });
  initElPos(template);
  nextTick(updateCanvasScale);
  showCreator.value = false;
  creatorName.value = '';
}
function editSaved(saved: StudioDesign): void {
  designKey.value++;
  selectedEl.value = null;
  applyDesign(saved);
  if (activeTemplate.value) initElPos(activeTemplate.value);
  nextTick(updateCanvasScale);
}
function closeEditor(): void { mode.value = 'library'; activeTemplate.value = null; selectedEl.value = null; }
function syncHeight(): void {
  if (!activeTemplate.value) return;
  design.widthMm = Math.max(24, Math.min(1000, Number(design.widthMm) || 120));
  design.heightMm = design.widthMm * (activeTemplate.value.canvas.height / activeTemplate.value.canvas.width);
}
function fromApi(row: Record<string, unknown>): StudioDesign & { vendorId?: number } {
  const settings = (row.settings || {}) as Partial<StudioDesign>;
  const elements = Array.isArray(row.elements) && row.elements[0] && typeof row.elements[0] === 'object' ? row.elements[0] as Partial<StudioDesign> : {};
  return { ...blankDesign(), ...elements, ...settings, id: row.id as number,
    vendorId: row.vendorId ? Number(row.vendorId) : undefined,
    name: String(row.name || settings.name || 'Untitled design'),
    libraryTemplateId: String(row.libraryTemplateId || settings.libraryTemplateId || qrManifest.templates[0].id),
    manifestVersion: String(row.manifestVersion || settings.manifestVersion || qrManifest.version),
    qrStyle: (row.qrStyle || settings.qrStyle || 'obsidian-ring') as QrStyleId,
    theme: (row.theme || settings.theme || 'light') as StudioDesign['theme'], widthMm: Number(row.widthMm || settings.widthMm || 120),
    heightMm: Number(row.heightMm || settings.heightMm || 70), updatedAt: String(row.updatedAt || '') };
}
async function loadDesigns(): Promise<void> {
  try {
    const { data } = await axios.get<Record<string, unknown>[]>(`${API_BASE_URL}/admin/qr-templates`);
    const all = data.map(fromApi);
    savedDesigns.value = props.vendorId ? all.filter((d) => d.vendorId === props.vendorId) : all;
  } catch { savedDesigns.value = []; }
}
async function saveDesign(): Promise<void> {
  if (!destinationValid.value || !activeTemplate.value) return;
  saving.value = true;
  const payload = { name: design.name || activeTemplate.value.label, widthMm: design.widthMm, heightMm: design.heightMm,
    vendorId: props.vendorId,
    elements: [{ ...design }], libraryTemplateId: activeTemplate.value.id, manifestVersion: qrManifest.version,
    qrStyle: design.qrStyle, theme: design.theme, settings: { ...design } };
  try {
    const isRemote = typeof design.id === 'number';
    const { data } = await axios.request<Record<string, unknown>>({ url: `${API_BASE_URL}/admin/qr-templates${isRemote ? `/${design.id}` : ''}`, method: isRemote ? 'PUT' : 'POST', data: payload });
    Object.assign(design, fromApi(data)); notice.value = 'Design saved to your Peshkash workspace.';
  } catch {
    notice.value = 'Couldn\'t save — check your connection and try again.';
  }
  finally { saving.value = false; await loadDesigns(); window.setTimeout(() => { notice.value = ''; }, 4000); }
}
async function deleteDesign(id: number | string): Promise<void> {
  deleting.value = id;
  try {
    await axios.delete(`${API_BASE_URL}/admin/qr-templates/${id}`);
    await loadDesigns();
    notice.value = 'Design deleted.';
    window.setTimeout(() => { notice.value = ''; }, 3000);
  } catch { notice.value = 'Couldn\'t delete — try again.'; }
  finally { deleting.value = null; }
}
function safeFilename(ext: string): string { return `${(design.name || 'peshkash-qr').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.${ext}`; }
function triggerDownload(href: string, name: string): void { const a = document.createElement('a'); a.href = href; a.download = name; a.click(); }
function downloadSvg(): void { const blob = new Blob([renderedSvg.value], { type: 'image/svg+xml;charset=utf-8' }); const url = URL.createObjectURL(blob); triggerDownload(url, safeFilename('svg')); URL.revokeObjectURL(url); }
async function downloadPng(): Promise<void> {
  if (!activeTemplate.value) return;
  const img = new Image(); const loaded = new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });
  img.src = renderedDataUri.value; await loaded;
  const scale = Math.max(2, 3000 / activeTemplate.value.canvas.width); const canvas = document.createElement('canvas');
  canvas.width = Math.round(activeTemplate.value.canvas.width * scale); canvas.height = Math.round(activeTemplate.value.canvas.height * scale);
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height); triggerDownload(canvas.toDataURL('image/png'), safeFilename('png'));
}

watch(activeTemplate, () => { if (activeTemplate.value) { initElPos(activeTemplate.value); nextTick(updateCanvasScale); } });
onMounted(async () => {
  window.addEventListener('resize', updateCanvasScale);
  window.addEventListener('keydown', onCanvasKeydown);
  // ?destination=:url — opened from a QR asset "Design" button: pre-set destination
  if (route.query.destination) destinationHint.value = String(route.query.destination);
  await loadDesigns();
  // ?edit=:id — opened from Print Studio "Edit Template" button: jump straight to editor
  const editId = route.query.edit;
  if (editId) {
    const target = savedDesigns.value.find((d) => String(d.id) === String(editId));
    if (target) editSaved(target);
  }
});
onUnmounted(() => {
  window.removeEventListener('resize', updateCanvasScale);
  window.removeEventListener('keydown', onCanvasKeydown);
  onWindowUp();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Rufina:wght@400;700&family=Urbanist:wght@400;500;600;700&display=swap');

/* ── Base ── */
.studio{--ink:#1a1410;--cream:#f5f2ee;--gold:#bd945a;--muted:#6d6256;background:var(--cream);color:var(--ink);font-family:Urbanist,Arial,sans-serif}
.studio *{box-sizing:border-box}
.studio button,.studio input,.studio textarea{font:inherit}
.studio button{color:inherit}

/* ── Library ── */
.eyebrow{font-size:11px;font-weight:700;letter-spacing:.19em;color:var(--gold);margin:0 0 14px}
.saved-section,.library-section{padding:48px clamp(24px,6vw,90px)}
.saved-section{background:#eee8e1;padding-bottom:36px}
.section-heading,.library-heading{display:flex;align-items:end;justify-content:space-between;gap:30px;margin-bottom:22px}
.section-heading h2,.library-heading h2{font:400 clamp(28px,3vw,40px)/1.15 Rufina,serif;margin:0}
.section-heading>span{font-size:12px;color:var(--muted)}
.saved-strip{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.saved-card{border:1px solid #d9d0c7;background:#f9f6f2;display:flex;align-items:stretch}
.saved-card:hover{border-color:var(--gold)}
.saved-card-body{border:0;background:transparent;text-align:left;padding:13px;display:flex;align-items:center;gap:11px;cursor:pointer;flex:1;min-width:0}
.saved-monogram{width:42px;height:42px;background:var(--ink);color:var(--gold);display:grid;place-items:center;font:700 20px Rufina,serif;flex-shrink:0}
.saved-card-body span:nth-child(2){display:grid;gap:3px;flex:1;min-width:0}
.saved-card b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.saved-card small{color:var(--muted);font-size:10px}
.saved-delete{border:0;border-left:1px solid #e4ddd6;background:transparent;padding:0 13px;cursor:pointer;color:var(--muted);font-size:13px;flex-shrink:0}
.saved-delete:hover:not(:disabled){color:#a44c41;background:#fdf5f4}
.saved-delete:disabled{opacity:.4;cursor:default}
.library-count{display:flex;align-items:center;gap:9px}
.library-count strong{font:400 44px Rufina,serif}
.library-count span{font-size:11px;color:var(--muted);line-height:1.3}
.library-toolbar{display:flex;justify-content:space-between;gap:18px;margin-bottom:18px}
.search-box{height:44px;min-width:min(400px,100%);display:flex;align-items:center;gap:10px;border-bottom:1px solid #c8bdb2}
.search-box input{border:0;background:transparent;outline:0;flex:1;color:var(--ink)}
.category-list{display:flex;gap:6px;overflow:auto;padding-bottom:14px;margin-bottom:20px}
.category-list button{white-space:nowrap;border:1px solid #d4cbc2;background:transparent;padding:7px 11px;font-size:11px;letter-spacing:.04em;cursor:pointer}
.category-list button.active{background:var(--ink);border-color:var(--ink);color:var(--cream)}
.template-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:34px 20px}
.template-card{min-width:0}
.template-preview{width:100%;aspect-ratio:1.32;border:1px solid #ded6cf;background:#e9e3dd;padding:20px;display:grid;place-items:center;overflow:hidden;position:relative;cursor:pointer}
.template-preview img{width:100%;height:100%;object-fit:contain;transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.template-preview:hover img{transform:scale(1.035)}
.use-template{position:absolute;right:11px;bottom:11px;background:var(--ink);color:var(--cream);padding:8px 10px;font-size:11px;opacity:0;transform:translateY(4px);transition:.2s}
.template-preview:hover .use-template{opacity:1;transform:none}
.template-meta{display:flex;align-items:start;justify-content:space-between;margin-top:12px;gap:10px}
.template-meta p{margin:0 0 3px;color:var(--gold);font-size:10px;text-transform:uppercase;letter-spacing:.12em}
.template-meta h3{font:400 19px Rufina,serif;margin:0}
.format-pill{font-size:9px;text-transform:uppercase;letter-spacing:.1em;border:1px solid #d7cec5;padding:4px 6px;white-space:nowrap}
.tag-row{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}
.tag-row span{font-size:10px;color:var(--muted);background:#eee8e1;padding:3px 6px}
.empty-state{text-align:center;padding:72px;border:1px dashed #cfc3b8}
.empty-state i{font-size:30px;color:var(--gold)}
.empty-state h3{font:400 26px Rufina,serif;margin:12px 0 4px}
.empty-state p{color:var(--muted)}

/* ── Create-template CTA ── */
.create-template-cta{width:100%;display:flex;align-items:center;gap:16px;border:1.5px dashed #c8bdb2;background:#f6f2ed;padding:16px 18px;margin-bottom:28px;cursor:pointer;text-align:left;transition:border-color .15s,background .15s}
.create-template-cta:hover{border-color:var(--gold);background:#fbf7f0}
.create-template-cta .cta-icon{width:38px;height:38px;flex-shrink:0;border-radius:50%;background:var(--ink);color:var(--gold);display:grid;place-items:center;font-size:14px}
.create-template-cta .cta-text{flex:1;display:grid;gap:2px}
.create-template-cta .cta-text b{font-size:14px}
.create-template-cta .cta-text small{font-size:11px;color:var(--muted)}
.create-template-cta>i{color:var(--gold);font-size:14px;flex-shrink:0}

/* ── Template creator modal ── */
.creator-overlay{position:fixed;inset:0;background:rgba(26,20,16,.5);display:grid;place-items:center;z-index:60;padding:24px}
.creator-modal{background:#fbf9f6;width:min(640px,100%);max-height:88vh;overflow-y:auto;padding:28px 30px;box-shadow:0 24px 60px rgba(26,20,16,.3)}
.creator-head{display:flex;align-items:start;justify-content:space-between;gap:16px;margin-bottom:20px}
.creator-head h3{font:400 24px Rufina,serif;margin:0}
.creator-close{border:0;background:transparent;color:var(--muted);cursor:pointer;font-size:15px;padding:4px}
.creator-close:hover{color:var(--ink)}
.creator-name-field{display:grid;gap:6px;font-size:11px;color:var(--muted);margin-bottom:22px}
.creator-name-field input{border:1px solid #d9d0c7;background:#fff;padding:10px 12px;outline:0;color:var(--ink);font-size:14px}
.creator-name-field input:focus{border-color:var(--gold)}
.creator-sub{font-size:9px;font-weight:700;letter-spacing:.19em;color:var(--gold);margin:0 0 12px}
.format-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:26px}
.format-option{border:1.5px solid #ddd4cc;background:#fff;padding:14px 12px;cursor:pointer;text-align:left;display:grid;gap:8px;justify-items:start}
.format-option:hover{border-color:var(--gold)}
.format-option.active{border-color:var(--gold);background:#fdf8f2}
.format-option .format-swatch{width:34px;background:#e4dcd2;border:1px solid #cfc3b8;display:block}
.format-option .format-swatch.round{border-radius:50%}
.format-option b{font-size:12px}
.format-option small{font-size:10px;color:var(--muted);line-height:1.4}
.creator-actions{display:flex;justify-content:flex-end;gap:10px}

/* ── Editor bar ── */
.editor-bar{height:64px;background:var(--ink);color:var(--cream);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 22px;position:sticky;top:0;z-index:20}
.back-button,.secondary-action{border:0;background:transparent;color:inherit;cursor:pointer}
.back-button{justify-self:start;display:flex;align-items:center;gap:8px;font-size:13px}
.editor-title{text-align:center;display:grid}
.editor-title span{font-size:9px;color:var(--gold);letter-spacing:.16em;text-transform:uppercase}
.editor-title b{font:400 15px Rufina,serif}
.editor-actions{justify-self:end;display:flex;gap:7px;align-items:center}
.secondary-action{padding:9px;font-size:13px}
.primary-action{border:1px solid var(--gold);background:var(--gold);color:var(--ink)!important;padding:10px 16px;font-weight:700;display:inline-flex;align-items:center;gap:10px;cursor:pointer}
.primary-action:hover{background:#d3ab76}
.primary-action:disabled{opacity:.5;cursor:default}

/* ── Editor shell: 2-col ── */
.editor-shell{display:grid;grid-template-columns:minmax(480px,1fr) 296px;height:calc(100vh - 64px);overflow:hidden}
.studio--embedded .editor-shell{height:auto;min-height:600px;overflow:visible}

/* ── Canvas stage ── */
.canvas-stage{padding:24px 28px 16px;background:#e8e2dc;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.studio--embedded .canvas-stage{height:auto;min-height:420px}
.stage-ruler{display:flex;justify-content:space-between;color:#776c62;font-size:10px;letter-spacing:.06em;margin-bottom:8px;flex-shrink:0}
.canvas-wrap{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:280px}
.canvas-root{position:relative;flex-shrink:0;box-shadow:0 18px 44px rgba(26,20,16,.22);user-select:none}
.canvas-bg{position:absolute;inset:0;pointer-events:none}
.canvas-corners{position:absolute;inset:0;pointer-events:none}
.preview-caption{display:flex;justify-content:center;gap:7px;color:#776c62;font-size:10px;letter-spacing:.04em;margin-top:10px;flex-shrink:0}
.live-dot{width:6px;height:6px;border-radius:50%;background:#5c8a68;margin:auto 0}

/* ── Canvas elements ── */
.canvas-el{position:absolute;box-sizing:border-box}
.canvas-el.selected>.sel-ring{display:block}

/* QR element */
.el--qr{cursor:grab;will-change:left,top,width,height}
.el--qr:hover::after{content:'';position:absolute;inset:-2px;border:1.5px dashed rgba(189,148,90,.5)}
.el--qr.selected::after{display:none}
/* Grabbing state — applied to canvas-wrap during active drag */
.canvas-wrap.is-dragging{cursor:grabbing}
.canvas-wrap.is-dragging .el--qr{cursor:grabbing}

/* Selection ring */
.sel-ring{display:none;position:absolute;inset:-3px;border:2px solid var(--gold);pointer-events:none}

/* Resize handle — bottom-right square for QR, right-edge grip for text blocks (width only) */
.resize-handle{position:absolute;right:-5px;bottom:-5px;width:14px;height:14px;background:var(--gold);cursor:nwse-resize;border-radius:2px;z-index:2}
.resize-handle--h{top:50%;bottom:auto;right:-6px;transform:translateY(-50%);width:8px;height:28px;cursor:ew-resize;border-radius:3px}

/* QR reset mini-button */
.qr-reset-btn{position:absolute;top:-26px;right:0;border:1px solid var(--gold);background:rgba(26,20,16,.75);color:var(--gold);font-size:10px;padding:3px 7px;cursor:pointer;display:flex;align-items:center;gap:4px}

/* Copy / merchant blocks — grab anywhere to drag, like the QR element */
.el--copy,.el--merchant{cursor:grab;will-change:left,top}
.el--copy:hover:not(.selected),.el--merchant:hover:not(.selected){outline:1.5px dashed rgba(189,148,90,.4)}
.el--copy.selected,.el--merchant.selected{outline:none}
.canvas-wrap.is-dragging .el--copy,.canvas-wrap.is-dragging .el--merchant{cursor:grabbing}

/* Text lines — plain text by default (drags with the block); double-click enters edit mode */
.t-line{min-height:1.2em;word-break:break-word;cursor:grab}
.t-line:focus{outline:2px solid rgba(189,148,90,.35);outline-offset:1px}
.t-line[contenteditable="true"]{cursor:text}
.canvas-wrap.is-dragging .t-line{cursor:grabbing}

/* Brand mark (locked) */
.el--brandmark{pointer-events:none;overflow:hidden}
.el--brandmark img{pointer-events:none;display:block}

/* Canva-style center snap guides */
.snap-guide{position:absolute;background:#ff4d6d;pointer-events:none;z-index:6}
.snap-guide--v{top:0;bottom:0;width:1px}
.snap-guide--h{left:0;right:0;height:1px}

/* ── Properties panel ── */
.properties-panel{background:#fbf9f6;padding:22px 20px;overflow-y:auto;border-left:1px solid #dfd7d0;display:flex;flex-direction:column;gap:0}
.properties-panel section+section{border-top:1px solid #e4ddd6;margin-top:22px;padding-top:20px}
.panel-kicker{font-size:9px;font-weight:700;letter-spacing:.19em;color:var(--gold);margin:0 0 14px}
.panel-back-row{display:flex;align-items:center;gap:4px;margin-bottom:14px}
.panel-back-row .panel-kicker{margin:0}
.back-to-props{border:0;background:transparent;color:var(--gold);cursor:pointer;padding:0 6px 0 0;font-size:13px;line-height:1}
.properties-panel label{display:grid;gap:5px;font-size:11px;color:var(--muted);margin-bottom:13px}
.properties-panel input,.properties-panel textarea{width:100%;border:1px solid #d9d0c7;background:#fff;padding:8px 10px;outline:0;color:var(--ink);resize:vertical}
.properties-panel input:focus,.properties-panel textarea:focus{border-color:var(--gold)}
.field-note{font-size:10px;color:#53725a;display:flex;gap:6px;line-height:1.4}
.field-note.invalid{color:#a44c41}
.field-hint{font-size:10px;color:var(--muted);line-height:1.55;margin-bottom:12px}
.canvas-edit-hint{font-size:10px;color:var(--muted);display:flex;align-items:flex-start;gap:7px;margin-bottom:14px;line-height:1.5;background:#f0ebe4;padding:10px;border-left:2px solid var(--gold)}
.theme-options{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.theme-options button{border:1px solid #ddd4cc;background:#fff;padding:8px;font-size:10px;cursor:pointer}
.theme-options button.active{border-color:var(--gold)}
.surface{height:32px;display:block;margin-bottom:6px}
.surface--light{background:#f5f2ee}
.surface--dark{background:#1a1410}
.standard-card{background:#eee8e1;padding:12px;font-size:10px}
.standard-card div{display:flex;gap:7px;color:#41614a}
.standard-card ul{padding-left:16px;margin:9px 0 0;color:var(--muted);line-height:1.8}
.signature-card{width:100%;display:grid;grid-template-columns:50px 1fr auto;align-items:center;gap:10px;text-align:left;border:1px solid #ddd4cc;background:#fff;padding:8px;margin-bottom:7px;cursor:pointer}
.signature-card.active{border-color:var(--gold);box-shadow:inset 3px 0 var(--gold)}
.signature-card img{width:50px;height:50px;object-fit:contain}
.signature-card span{display:grid;gap:3px}
.signature-card b{font-size:12px}
.signature-card small{font-size:9px;line-height:1.3;color:var(--muted)}
.signature-card>i{color:var(--gold);opacity:0}
.signature-card.active>i{opacity:1}
.reset-btn{width:100%;border:1px solid #ddd4cc;background:transparent;padding:9px;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:7px;justify-content:center;margin-top:4px}
.reset-btn:hover{border-color:var(--gold)}
.zone-hint{margin-top:auto;padding-top:18px;font-size:10px;color:var(--muted);display:flex;gap:8px;align-items:flex-start;border-top:1px solid #e4ddd6}

/* ── Visibility toggles ── */
.vis-toggles{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}
.vis-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid #d9d0c7;background:#fff;font-size:10px;font-weight:600;letter-spacing:.03em;cursor:pointer;color:var(--muted);transition:border-color .15s,color .15s,background .15s}
.vis-btn.active{border-color:var(--gold);color:var(--ink);background:#fdf8f2}
.vis-btn:hover{border-color:var(--gold);color:var(--ink)}
.vis-btn i{font-size:11px}
.properties-panel input:disabled,.properties-panel textarea:disabled{opacity:.4;pointer-events:none}

/* ── Notice ── */
.notice{position:fixed;right:22px;bottom:22px;background:var(--ink);color:var(--cream);padding:12px 17px;box-shadow:0 10px 28px rgba(0,0,0,.24);z-index:50;display:flex;gap:8px;align-items:center}
.notice i{color:var(--gold)}

/* ── Responsive ── */
@media(max-width:1050px){
  .template-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .editor-shell{grid-template-columns:minmax(360px,1fr) 260px}
}
@media(max-width:760px){
  .library-toolbar{display:grid}
  .style-switch{overflow:auto}
  .template-grid{grid-template-columns:1fr}
  .editor-bar{grid-template-columns:auto 1fr}
  .editor-title{display:none}
  .editor-actions .secondary-action{display:none}
  .editor-shell{grid-template-columns:1fr;grid-template-rows:auto auto;height:auto}
  .canvas-stage{min-height:360px}
  .properties-panel{border-left:0;border-top:1px solid #dfd7d0}
}
</style>
