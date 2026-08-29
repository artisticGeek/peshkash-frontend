<template>
  <div class="studio" :class="{ 'studio--embedded': embedded, 'studio--editor': mode === 'editor' }">
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
          <div class="style-switch" aria-label="Preview QR signature">
            <button v-for="(style, id) in qrManifest.qrStyles" :key="id" :class="{ active: previewStyle === id }" @click="previewStyle = id as QrStyleId">
              <span :class="['style-dot', `style-dot--${id}`]"></span>{{ style.label }}
            </button>
          </div>
        </div>
        <div class="category-list" aria-label="Template categories">
          <button :class="{ active: activeCategory === 'all' }" @click="activeCategory = 'all'">All use cases</button>
          <button v-for="(label, id) in qrManifest.categories" :key="id" :class="{ active: activeCategory === id }" @click="activeCategory = id">{{ label }}</button>
        </div>
        <div class="format-list" aria-label="Template formats">
          <button :class="{ active: activeFormat === 'all' }" @click="activeFormat = 'all'">All formats</button>
          <button v-for="format in formatOptions" :key="format" :class="{ active: activeFormat === format }" @click="activeFormat = format">{{ format }}</button>
        </div>
        <button class="create-template-cta" @click="showCreator = true">
          <span class="cta-icon"><i class="bi bi-plus-lg"></i></span>
          <span class="cta-text"><b>Create a custom template</b><small>Pick a shape and size — it works just like the library, start to finish.</small></span>
          <i class="bi bi-arrow-up-right"></i>
        </button>
        <div v-if="filteredTemplates.length" class="template-grid">
          <article v-for="template in filteredTemplates" :key="template.id" class="template-card">
            <div class="template-preview">
              <img :src="assetPath(template)" :alt="template.label">
              <div class="template-card-actions">
                <button @click="previewTemplate = template"><i class="bi bi-eye"></i> Preview</button>
                <button class="use-template" @click="startWithTemplate(template)">Use template <i class="bi bi-arrow-up-right"></i></button>
              </div>
            </div>
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
        <div class="editor-title">
          <input v-model="design.name" maxlength="80" aria-label="Design name">
          <span class="save-status" role="status"><i :class="saveStatusIcon"></i>{{ saveStatusLabel }}</span>
        </div>
        <div class="editor-actions">
          <button class="secondary-action" :disabled="!canUndo" @click="undo" title="Undo (Ctrl+Z)"><i class="bi bi-arrow-counterclockwise"></i></button>
          <button class="secondary-action" :disabled="!canRedo" @click="redo" title="Redo (Ctrl+Shift+Z)"><i class="bi bi-arrow-clockwise"></i></button>
          <span class="editor-actions-divider"></span>
          <button class="secondary-action" @click="downloadSvg" title="Download SVG after preflight"><i class="bi bi-filetype-svg"></i> SVG</button>
          <button class="secondary-action" @click="downloadPng" title="Download high-resolution PNG after preflight"><i class="bi bi-download"></i> PNG</button>
          <button class="primary-action compact" :disabled="saving" @click="saveDesign()">{{ saving ? 'Saving…' : 'Save design' }}</button>
        </div>
      </header>
      <main class="editor-shell" :class="{ 'rail-panel-open': !!activeRailPanel, 'props-open': !!(selectedEl || selectedElementId) }">

        <!-- ── Left icon rail: switch which slide-out panel is open ────────── -->
        <nav class="rail">
          <button class="rail-btn" :class="{ active: activeRailPanel === 'design' }" title="Design" @click="toggleRailPanel('design')"><i class="bi bi-sliders"></i><span>Design</span></button>
          <button class="rail-btn" :class="{ active: activeRailPanel === 'qr' }" title="QR and preflight" @click="toggleRailPanel('qr')"><i class="bi bi-qr-code"></i><span>QR</span></button>
          <button class="rail-btn" :class="{ active: activeRailPanel === 'background' }" title="Background" @click="toggleRailPanel('background')"><i class="bi bi-palette2"></i><span>Canvas</span></button>
          <button class="rail-btn" :class="{ active: activeRailPanel === 'typography' }" title="Typography" @click="toggleRailPanel('typography')"><i class="bi bi-fonts"></i><span>Type</span></button>
          <button class="rail-btn" :class="{ active: activeRailPanel === 'elements' }" title="Elements" @click="toggleRailPanel('elements')"><i class="bi bi-stickies"></i><span>Elements</span></button>
          <button class="rail-btn" :class="{ active: activeRailPanel === 'layers' }" title="Layers" @click="toggleRailPanel('layers')"><i class="bi bi-layers"></i><span>Layers</span></button>
          <!-- Always mounted (not gated by which rail panel is open) — both the Elements panel's
               "Image" button and the properties dock's "Replace image" action trigger it. -->
          <input ref="imageFileInput" type="file" accept="image/png,image/jpeg,image/webp" class="visually-hidden" @change="onImageFileChosen">
        </nav>

        <!-- ── Left slide-out panel: content for whichever rail icon is active ── -->
        <aside v-if="activeRailPanel" class="properties-panel properties-panel--left" @click.stop>

          <section v-if="activeRailPanel === 'design'">
            <p class="panel-kicker">DESIGN</p>
            <label>Design name<input v-model="design.name" maxlength="80"></label>
            <label>Scan destination<input v-model="design.destination" inputmode="url" placeholder="https://pksh.in/your-link"></label>
            <p :class="['field-note', { invalid: !destinationValid }]">
              <i :class="destinationValid ? 'bi bi-shield-check' : 'bi bi-exclamation-circle'"></i>
              {{ destinationValid ? 'Production Peshkash link ready to encode.' : 'Use a live Peshkash HTTPS link, not a placeholder.' }}
            </p>
          </section>

          <section v-else-if="activeRailPanel === 'qr'">
            <p class="panel-kicker">QR &amp; PREFLIGHT</p>
            <label>Scan destination<input v-model="design.destination" inputmode="url" placeholder="https://pksh.in/your-link"></label>
            <div class="signature-mini-grid">
              <button v-for="(style, id) in qrManifest.qrStyles" :key="id" :class="['signature-mini', { active: design.qrStyle === id }]" @click="design.qrStyle = id as QrStyleId">
                <img :src="signaturePreview(id as QrStyleId)" alt="">
                <span><b>{{ style.label }}</b><small>{{ style.medallion }}</small></span>
              </button>
            </div>
            <div class="qr-color-controls">
              <label>Modules<input v-model="qrColors.foreground" type="color" class="color-input"></label>
              <label>Quiet zone<input v-model="qrColors.background" type="color" class="color-input" :disabled="qrColors.transparent"></label>
              <label>Accent<input v-model="qrColors.accent" type="color" class="color-input"></label>
            </div>
            <label class="toggle-row"><input v-model="qrColors.transparent" type="checkbox"><span>Transparent QR background</span></label>
            <button class="reset-btn" @click="resetQrColors"><i class="bi bi-arrow-counterclockwise"></i> Reset QR colors</button>
            <div v-if="preflight" class="preflight-summary" :class="{ blocked: !preflight.canExport }">
              <div class="preflight-head"><i :class="preflight.canExport ? 'bi bi-shield-check' : 'bi bi-exclamation-octagon'"></i><span><b>{{ preflight.canExport ? 'Ready to export' : 'Export blocked' }}</b><small>{{ preflight.errors.length }} errors · {{ preflight.warnings.length }} warnings</small></span></div>
              <ul>
                <li v-for="check in preflight.checks" :key="check.id" :class="`check--${check.level}`">
                  <i :class="check.level === 'pass' ? 'bi bi-check-circle-fill' : check.level === 'error' ? 'bi bi-x-circle-fill' : 'bi bi-exclamation-triangle-fill'"></i>
                  <span><b>{{ check.label }}</b><small>{{ check.detail }}</small></span>
                </li>
              </ul>
            </div>
          </section>
          <section v-if="activeRailPanel === 'design'">
            <p class="panel-kicker">OUTPUT</p>
            <div class="dimension-row">
              <label>Print width<input v-model.number="displayWidth" type="number" :min="displayMinWidth" :max="displayMaxWidth" :step="displayUnitStep" @change="syncHeight"></label>
              <label>Unit<select v-model="design.displayUnit"><option value="mm">mm</option><option value="cm">cm</option><option value="in">in</option><option value="px">px</option><option value="pt">pt</option></select></label>
            </div>
            <div class="standard-card">
              <div><i class="bi bi-patch-check-fill"></i><b>Scan-safe standard</b></div>
              <ul><li>Error correction H</li><li>4-module quiet zone</li><li>Rounded modules + anchors</li><li>Peshkash brand mark</li></ul>
            </div>
          </section>
          <section v-if="activeRailPanel === 'design'">
            <p class="panel-kicker">ELEMENTS</p>
            <div class="vis-toggles">
              <button :class="['vis-btn', { active: vis.merchantName }]" @click="toggleVis('merchantName')">
                <i :class="vis.merchantName ? 'bi bi-eye' : 'bi bi-eye-slash'"></i>
                Merchant name
              </button>
              <button :class="['vis-btn', { active: vis.brandmark }]" @click="toggleVis('brandmark')">
                <i :class="vis.brandmark ? 'bi bi-eye' : 'bi bi-eye-slash'"></i>
                Peshkash mark
              </button>
            </div>
          </section>

          <section v-else-if="activeRailPanel === 'background'">
            <p class="panel-kicker">BACKGROUND</p>
            <div class="bg-swatch-grid">
              <button v-for="preset in BACKGROUND_PRESETS" :key="preset.label"
                      class="bg-swatch"
                      :class="{ active: currentBgColor === preset.color }"
                      :style="{ background: preset.color }"
                      :title="preset.label"
                      @click="applyBackgroundPreset(preset)">
                <i v-if="currentBgColor === preset.color" class="bi bi-check2" :style="{ color: preset.ink }"></i>
              </button>
              <label class="bg-swatch bg-swatch--custom" title="Custom color">
                <input type="color" :value="currentBgColor" @input="setCustomBackground(($event.target as HTMLInputElement).value)">
                <i class="bi bi-palette2"></i>
              </label>
            </div>
            <p class="field-hint" style="margin:8px 0 0">Text and QR frame auto-adjust for legibility on any background.</p>
            <div class="panel-rule"></div>
            <p class="panel-kicker">RULERS &amp; GRID</p>
            <label class="toggle-row"><input v-model="grid.rulers" type="checkbox"><span>Show rulers</span></label>
            <label class="toggle-row"><input v-model="grid.visible" type="checkbox"><span>Show grid</span></label>
            <label class="toggle-row"><input v-model="grid.snap" type="checkbox"><span>Snap objects to grid</span></label>
            <label>Grid spacing (mm)<input v-model.number="grid.sizeMm" type="number" min="1" max="50" step="1"></label>
          </section>

          <section v-else-if="activeRailPanel === 'typography'">
            <p class="panel-kicker">TYPOGRAPHY</p>
            <div class="font-pairing-list">
              <button v-for="pairing in FONT_PAIRINGS" :key="pairing.id" class="font-pairing-btn"
                      :class="{ active: typography.pairingId === pairing.id }"
                      @click="setFontPairing(pairing.id)">
                <span class="font-pairing-sample" :style="{ fontFamily: pairing.displayFont }">Aa</span>
                <span class="font-pairing-label">{{ pairing.label }}</span>
                <i v-if="typography.pairingId === pairing.id" class="bi bi-check2"></i>
              </button>
            </div>
            <div class="type-scale-row">
              <span class="field-hint" style="margin:0">Size</span>
              <button class="scale-btn" title="Smaller" :disabled="typography.scale <= 0.75" @click="setTypeScale(typography.scale - 0.05)"><i class="bi bi-dash"></i></button>
              <span class="scale-value">{{ Math.round(typography.scale * 100) }}%</span>
              <button class="scale-btn" title="Larger" :disabled="typography.scale >= 1.4" @click="setTypeScale(typography.scale + 0.05)"><i class="bi bi-plus"></i></button>
            </div>
            <p class="field-hint" style="margin-top:6px">Applies to eyebrow, headline, descriptor, CTA and the merchant name.</p>
          </section>

          <section v-else-if="activeRailPanel === 'elements'">
            <p class="panel-kicker">ELEMENT BANK</p>
            <p class="field-hint" style="margin-bottom:10px">Text, shapes, CTA badges and images — click to drop one on the canvas, then drag, resize or edit it.</p>
            <div class="element-bank">
              <button v-for="preset in ELEMENT_PRESETS" :key="preset.id" class="bank-item" @click="addElement(preset.id)" :title="'Add ' + preset.label">
                <span class="bank-icon" v-html="preset.icon"></span>
                <span>{{ preset.label }}</span>
              </button>
              <button class="bank-item" @click="imageFileInput?.click()" title="Upload an image">
                <span class="bank-icon"><i class="bi bi-image"></i></span>
                <span>Image</span>
              </button>
            </div>
          </section>

          <section v-else-if="activeRailPanel === 'layers'">
            <p class="panel-kicker">LAYERS</p>
            <p class="field-hint" style="margin-bottom:10px">Front to back. Hide or lock any added layer; protected template layers stay scan-safe.</p>
            <div class="layers-list">
              <template v-for="el in frontLayerRows" :key="el.id">
                <div class="layer-row" :class="{ active: selectedElementId === el.id }" @click="selectElement(el.id)">
                  <i class="bi bi-grip-vertical layer-grip"></i>
                  <span class="layer-swatch" :style="layerSwatchStyle(el)"></span>
                  <span class="layer-name">{{ layerLabel(el) }}</span>
                  <button class="layer-btn" :title="el.visible === false ? 'Show layer' : 'Hide layer'" @click.stop="toggleElementVisibility(el.id)"><i :class="el.visible === false ? 'bi bi-eye-slash' : 'bi bi-eye'"></i></button>
                  <button class="layer-btn" :class="{ active: el.locked }" :title="el.locked ? 'Unlock layer' : 'Lock layer'" @click.stop="toggleElementLock(el.id)"><i :class="el.locked ? 'bi bi-lock-fill' : 'bi bi-unlock'"></i></button>
                  <button class="layer-btn" title="Move forward" @click.stop="moveElement(el.id, 'up')"><i class="bi bi-chevron-up"></i></button>
                  <button class="layer-btn" title="Move backward" @click.stop="moveElement(el.id, 'down')"><i class="bi bi-chevron-down"></i></button>
                  <button class="layer-btn" title="Delete" @click.stop="deleteElement(el.id)"><i class="bi bi-trash"></i></button>
                </div>
              </template>
              <div class="layers-divider"><span>protected template layers</span></div>
              <div class="layer-row" :class="{ active: selectedEl === 'brandmark' }" @click="selectFixedLayer('brandmark')">
                <i class="bi bi-vector-pen layer-grip"></i><span class="layer-core-icon"><i class="bi bi-gem"></i></span><span class="layer-name">Peshkash mark</span>
                <button class="layer-btn" :title="vis.brandmark ? 'Hide mark' : 'Show mark'" @click.stop="toggleVis('brandmark')"><i :class="vis.brandmark ? 'bi bi-eye' : 'bi bi-eye-slash'"></i></button>
                <i class="bi bi-lock-fill layer-protected" title="Protected layer"></i>
              </div>
              <div class="layer-row" :class="{ active: selectedEl === 'merchant' }" @click="selectFixedLayer('merchant')">
                <i class="bi bi-vector-pen layer-grip"></i><span class="layer-core-icon"><i class="bi bi-shop"></i></span><span class="layer-name">Brand name</span>
                <button class="layer-btn" :title="vis.merchantName ? 'Hide name' : 'Show name'" @click.stop="toggleVis('merchantName')"><i :class="vis.merchantName ? 'bi bi-eye' : 'bi bi-eye-slash'"></i></button>
                <i class="bi bi-lock-fill layer-protected" title="Protected layer"></i>
              </div>
              <div class="layer-row" :class="{ active: selectedEl === 'copy' }" @click="selectFixedLayer('copy')">
                <i class="bi bi-vector-pen layer-grip"></i><span class="layer-core-icon"><i class="bi bi-text-paragraph"></i></span><span class="layer-name">Copy block</span>
                <button class="layer-btn" :title="copyVisible ? 'Hide copy' : 'Show copy'" @click.stop="toggleCopyVisibility"><i :class="copyVisible ? 'bi bi-eye' : 'bi bi-eye-slash'"></i></button>
                <i class="bi bi-lock-fill layer-protected" title="Protected layer"></i>
              </div>
              <div class="layer-row" :class="{ active: selectedEl === 'qr' }" @click="selectFixedLayer('qr')">
                <i class="bi bi-vector-pen layer-grip"></i><span class="layer-core-icon"><i class="bi bi-qr-code"></i></span><span class="layer-name">QR code</span>
                <i class="bi bi-shield-check layer-scan-safe" title="Required for scanning"></i>
                <i class="bi bi-lock-fill layer-protected" title="Protected layer"></i>
              </div>
              <div v-if="backLayerRows.length" class="layers-divider"><span>behind QR &amp; text</span></div>
              <template v-for="el in backLayerRows" :key="el.id">
                <div class="layer-row" :class="{ active: selectedElementId === el.id }" @click="selectElement(el.id)">
                  <i class="bi bi-grip-vertical layer-grip"></i>
                  <span class="layer-swatch" :style="layerSwatchStyle(el)"></span>
                  <span class="layer-name">{{ layerLabel(el) }}</span>
                  <button class="layer-btn" :title="el.visible === false ? 'Show layer' : 'Hide layer'" @click.stop="toggleElementVisibility(el.id)"><i :class="el.visible === false ? 'bi bi-eye-slash' : 'bi bi-eye'"></i></button>
                  <button class="layer-btn" :class="{ active: el.locked }" :title="el.locked ? 'Unlock layer' : 'Lock layer'" @click.stop="toggleElementLock(el.id)"><i :class="el.locked ? 'bi bi-lock-fill' : 'bi bi-unlock'"></i></button>
                  <button class="layer-btn" title="Move forward" @click.stop="moveElement(el.id, 'up')"><i class="bi bi-chevron-up"></i></button>
                  <button class="layer-btn" title="Move backward" @click.stop="moveElement(el.id, 'down')"><i class="bi bi-chevron-down"></i></button>
                  <button class="layer-btn" title="Delete" @click.stop="deleteElement(el.id)"><i class="bi bi-trash"></i></button>
                </div>
              </template>
            </div>
          </section>

        </aside>

        <!-- ── Interactive canvas stage ─────────────────────── -->
        <section class="canvas-stage" ref="stageRef">
          <div class="stage-ruler">
            <span>{{ activeTemplate.ratio }}</span>
            <span>{{ formattedDimensions }}</span>
          </div>
          <div class="canvas-wrap" ref="canvasWrapRef" :class="{ 'is-dragging': isDragging }">
            <div class="artboard-frame" :class="{ 'with-rulers': design.grid?.rulers }">
              <div v-if="design.grid?.rulers" class="canvas-ruler canvas-ruler--x" :style="rulerXStyle"></div>
              <div v-if="design.grid?.rulers" class="canvas-ruler canvas-ruler--y" :style="rulerYStyle"></div>
              <div class="canvas-root"
                 :class="{ 'canvas-root--canonical': !design.customTemplate }"
                 :style="{ width: displayW + 'px', height: displayH + 'px' }"
                 @click.self="selectedEl = null; selectedElementId = null">

              <!-- The same canonical SVG feeds this preview and both download paths. Transparent
                   interaction boxes above it retain drag/resize/selection without a second visual
                   implementation drifting away from the exported artwork. -->
              <img v-if="!design.customTemplate" class="canvas-render" :src="previewDataUri" alt="">

              <!-- Background layers (pointer-events:none) -->
              <div class="canvas-bg" :style="{ background: bgColor }"></div>
              <div class="canvas-inner" :style="innerBgStyle"></div>
              <div v-if="design.grid?.visible" class="canvas-grid" :style="gridStyle"></div>

              <!-- Scan corners SVG (pointer-events:none) -->
              <svg class="canvas-corners"
                   :width="displayW" :height="displayH"
                   :viewBox="`0 0 ${displayW} ${displayH}`"
                   style="pointer-events:none">
                <g fill="none" stroke="#BB9057" :stroke-width="cornerSw" opacity=".8">
                  <path v-for="(d, i) in cornerPaths" :key="i" :d="d"/>
                </g>
              </svg>

              <!-- Element bank: backdrop shapes (behind QR/copy/merchant/brandmark) -->
              <CanvasElementView v-for="el in backCanvasElements" :key="el.id"
                   class="canvas-el--back-hit"
                   :class="{ 'canvas-el--back-dragging': dragState?.id === el.id || resizeState?.id === el.id }"
                   :el="el" :scale="canvasScale"
                   :selected="selectedElementId === el.id"
                   :editing="editingElementId === el.id"
                   @pointerdown="onCanvasElPointerDown"
                   @select="selectElement"
                   @start-text-edit="startElementTextEdit"
                   @end-text-edit="endElementTextEdit"
                   @input-text="onElementInputText"
                   @resize-height="onElementResizeHeight"
                   @resize-pointerdown="startCanvasElResize"
                   @delete="deleteElement" />

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

              <!-- Brand mark: drag anywhere to move (Canva-style), corner handle to resize (locked aspect) -->
              <div v-if="vis.brandmark"
                   class="canvas-el el--brandmark"
                   :class="{ selected: selectedEl === 'brandmark' }"
                   :style="bmContainerStyle"
                   @pointerdown.stop="startElDrag('brandmark', $event)"
                   @click.stop="selectedEl = 'brandmark'; selectedElementId = null">
                <img
                  :src="dark ? '/brand/peshkash-logo-dark.svg' : '/brand/peshkash-logo-light.svg'"
                  :style="bmImgStyle"
                  draggable="false">
                <template v-if="selectedEl === 'brandmark'">
                  <div class="sel-ring"></div>
                  <div class="resize-handle" @pointerdown.stop="startBrandmarkResize" title="Drag to resize"></div>
                </template>
              </div>

              <!-- Element bank: foreground shapes / CTA badges / text / images (above everything else) -->
              <CanvasElementView v-for="el in frontCanvasElements" :key="el.id"
                   :el="el" :scale="canvasScale"
                   :selected="selectedElementId === el.id"
                   :editing="editingElementId === el.id"
                   @pointerdown="onCanvasElPointerDown"
                   @select="selectElement"
                   @start-text-edit="startElementTextEdit"
                   @end-text-edit="endElementTextEdit"
                   @input-text="onElementInputText"
                   @resize-height="onElementResizeHeight"
                   @resize-pointerdown="startCanvasElResize"
                   @delete="deleteElement" />

              <!-- Canva-style center snap guides -->
              <div v-if="snapGuides.centerX" class="snap-guide snap-guide--v" :style="{ left: (displayW / 2) + 'px' }"></div>
              <div v-if="snapGuides.centerY" class="snap-guide snap-guide--h" :style="{ top: (displayH / 2) + 'px' }"></div>

              </div><!-- /canvas-root -->
            </div><!-- /artboard-frame -->
          </div><!-- /canvas-wrap -->
          <div class="canvas-footer">
            <div class="preview-caption"><span class="live-dot"></span> Direct editing is live · Shift + arrows for larger nudges</div>
            <div class="zoom-controls" aria-label="Canvas zoom">
              <button @click="setZoom(canvasScale - 0.1)" title="Zoom out"><i class="bi bi-dash-lg"></i></button>
              <button class="zoom-value" @click="updateCanvasScale" title="Fit page">{{ Math.round(canvasScale * 100) }}%</button>
              <button @click="setZoom(canvasScale + 0.1)" title="Zoom in"><i class="bi bi-plus-lg"></i></button>
            </div>
          </div>
        </section>

        <!-- ── Properties dock: only appears once something on canvas is selected ── -->
        <aside v-if="selectedEl || selectedElementId" class="properties-panel properties-panel--right" @click.stop>

          <!-- QR Code selected -->
          <template v-if="selectedEl === 'qr'">
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

          <!-- Brand mark selected -->
          <template v-else-if="selectedEl === 'brandmark'">
            <div class="panel-back-row">
              <button class="back-to-props" @click="selectedEl = null"><i class="bi bi-arrow-left"></i></button>
              <p class="panel-kicker">PESHKASH MARK</p>
            </div>
            <p class="canvas-edit-hint"><i class="bi bi-pencil"></i> Drag to move, corner handle to resize (aspect ratio locked).</p>
            <section>
              <div class="vis-toggles">
                <button :class="['vis-btn', { active: vis.brandmark }]" @click="toggleVis('brandmark')">
                  <i :class="vis.brandmark ? 'bi bi-eye' : 'bi bi-eye-slash'"></i>
                  Show mark
                </button>
              </div>
            </section>
          </template>

          <!-- Freeform shape / CTA badge / text / image selected -->
          <template v-else-if="selectedElementId && selectedElement">
            <div class="panel-back-row">
              <button class="back-to-props" @click="selectedElementId = null"><i class="bi bi-arrow-left"></i></button>
              <p class="panel-kicker">{{ { shape: 'SHAPE', cta: 'CTA BADGE', text: 'TEXT', image: 'IMAGE' }[selectedElement.kind] }}</p>
            </div>
            <p class="canvas-edit-hint"><i class="bi bi-pencil"></i> Drag to move (snaps to center), corner handle to resize<span v-if="selectedElement.kind === 'cta' || selectedElement.kind === 'text'">, double-click the text to edit it</span>.</p>
            <div class="vis-toggles">
              <button class="vis-btn active" @click="toggleElementVisibility(selectedElementId)" title="Hide this layer"><i class="bi bi-eye"></i> Visible</button>
              <button class="vis-btn" :class="{ active: selectedElement.locked }" @click="toggleElementLock(selectedElementId)"><i :class="selectedElement.locked ? 'bi bi-lock-fill' : 'bi bi-unlock'"></i> {{ selectedElement.locked ? 'Locked' : 'Unlocked' }}</button>
            </div>
            <section>
              <p class="panel-kicker" style="margin-bottom:10px">LAYER ORDER</p>
              <div class="layer-order-grid">
                <button class="layer-order-btn" @click="bringToFront(selectedElementId)" title="Bring to front"><i class="bi bi-chevron-bar-up"></i><span>To front</span></button>
                <button class="layer-order-btn" @click="moveElement(selectedElementId, 'up')" title="Move forward one step"><i class="bi bi-chevron-up"></i><span>Forward</span></button>
                <button class="layer-order-btn" @click="moveElement(selectedElementId, 'down')" title="Move backward one step"><i class="bi bi-chevron-down"></i><span>Backward</span></button>
                <button class="layer-order-btn" @click="sendToBack(selectedElementId)" title="Send to back"><i class="bi bi-chevron-bar-down"></i><span>To back</span></button>
              </div>
              <p class="field-hint" style="margin-top:8px">
                <i :class="(selectedElement.layer ?? 'front') === 'front' ? 'bi bi-layers-fill' : 'bi bi-layers'"></i>
                Currently {{ (selectedElement.layer ?? 'front') === 'front' ? 'in front of' : 'behind' }} the QR code and text.
              </p>
            </section>
            <section v-if="selectedElement.kind === 'shape' || selectedElement.kind === 'cta'">
              <label v-if="selectedElement.kind === 'cta'">Badge text<input v-model="selectedElement.text" maxlength="30"></label>
              <label>{{ selectedElement.kind === 'shape' && selectedElement.shape === 'frame' ? 'Border color' : 'Fill color' }}<input type="color" v-model="selectedElement.fill" class="color-input"></label>
              <label v-if="selectedElement.kind === 'cta'">Text color<input type="color" v-model="selectedElement.textColor" class="color-input"></label>
              <label v-if="selectedElement.kind === 'shape' && (selectedElement.shape === 'rect' || selectedElement.shape === 'frame')">Corner radius<input type="number" min="0" max="200" v-model.number="selectedElement.radius"></label>
              <label>Opacity<input type="range" min="0.1" max="1" step="0.05" v-model.number="selectedElementOpacity"></label>
            </section>
            <section v-else-if="selectedElement.kind === 'text'">
              <label>Text content<textarea v-model="selectedElement.text" rows="2" maxlength="200"></textarea></label>
              <label>Font<select v-model="selectedElement.fontFamily" :style="{ fontFamily: selectedElement.fontFamily }">
                <option v-for="f in TEXT_FONT_CHOICES" :key="f.value" :value="f.value" :style="{ fontFamily: f.value }">{{ f.label }}</option>
              </select></label>
              <label>Size<input type="number" min="8" max="400" v-model.number="selectedElement.fontSize"></label>
              <div class="text-style-row">
                <button class="vis-btn" :class="{ active: selectedElement.fontWeight === '700' }" @click="selectedElement.fontWeight = selectedElement.fontWeight === '700' ? '400' : '700'" title="Bold"><i class="bi bi-type-bold"></i></button>
                <button class="vis-btn" :class="{ active: selectedElement.align === 'left' }" @click="selectedElement.align = 'left'" title="Align left"><i class="bi bi-text-left"></i></button>
                <button class="vis-btn" :class="{ active: selectedElement.align === 'center' }" @click="selectedElement.align = 'center'" title="Align center"><i class="bi bi-text-center"></i></button>
                <button class="vis-btn" :class="{ active: selectedElement.align === 'right' }" @click="selectedElement.align = 'right'" title="Align right"><i class="bi bi-text-right"></i></button>
              </div>
              <label>Color<input type="color" v-model="selectedElement.color" class="color-input"></label>
              <label>Opacity<input type="range" min="0.1" max="1" step="0.05" v-model.number="selectedElementOpacity"></label>
            </section>
            <section v-else-if="selectedElement.kind === 'image'">
              <label>Opacity<input type="range" min="0.1" max="1" step="0.05" v-model.number="selectedElementOpacity"></label>
              <button class="reset-btn" @click="imageFileInput?.click(); replacingImageId = selectedElementId"><i class="bi bi-arrow-repeat"></i> Replace image</button>
            </section>
            <div class="el-action-row">
              <button class="reset-btn" @click="duplicateElement(selectedElementId)"><i class="bi bi-copy"></i> Duplicate</button>
              <button class="reset-btn reset-btn--danger" @click="deleteElement(selectedElementId)"><i class="bi bi-trash"></i> Delete</button>
            </div>
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
        <p class="creator-sub creator-sub--spaced">Choose a layered starting point</p>
        <div class="starter-grid">
          <button v-for="starter in LAYERED_STARTERS" :key="starter.id"
                  :class="['starter-option', { active: creatorStarter === starter.id }]"
                  @click="creatorStarter = starter.id">
            <i :class="starter.icon"></i>
            <span><b>{{ starter.label }}</b><small>{{ starter.description }}</small></span>
            <i class="bi bi-check-circle-fill starter-check"></i>
          </button>
        </div>
        <div class="creator-actions">
          <button class="secondary-action" @click="showCreator = false">Cancel</button>
          <button class="primary-action" @click="startCustomTemplate">Create template <i class="bi bi-arrow-right"></i></button>
        </div>
      </div>
    </div>

    <div v-if="previewTemplate" class="creator-overlay" @click.self="previewTemplate = null">
      <div class="preview-modal">
        <button class="creator-close" @click="previewTemplate = null" title="Close preview"><i class="bi bi-x-lg"></i></button>
        <div class="preview-modal-art"><img :src="assetPath(previewTemplate)" :alt="previewTemplate.label"></div>
        <div class="preview-modal-copy">
          <p class="eyebrow">{{ previewTemplate.categoryLabel }} · {{ previewTemplate.format }}</p>
          <h3>{{ previewTemplate.label }}</h3>
          <p>{{ previewTemplate.defaultCopy.headline }}</p>
          <div class="tag-row"><span v-for="tag in previewTemplate.tags" :key="tag">{{ tag }}</span></div>
          <button class="primary-action" @click="startWithTemplate(previewTemplate); previewTemplate = null">Use this template <i class="bi bi-arrow-right"></i></button>
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
import { DEFAULT_QR_COLORS, renderBrandedQrSvg, svgDataUri } from '../features/qrStudio/qrRenderer';
import { brandKitLayout, renderTemplateSvg } from '../features/qrStudio/templateRenderer';
import { qrManifest, type QrStyleId, type QrTemplateDefinition, type StudioDesign, type ElementKey, type TemplateFormat, type CustomTemplateSpec, type CanvasElement, type ImageElement, type TextElement, type FixedElementLayout, type StudioUnit } from '../features/qrStudio/types';
import { FORMAT_PRESETS, LAYERED_STARTERS, buildCustomTemplateSpec, buildLayeredStarter, synthesizeCustomTemplate, type LayeredStarterId } from '../features/qrStudio/customTemplate';
import { ELEMENT_PRESETS, BACKGROUND_PRESETS, inkForBackground, newId, TEXT_FONT_CHOICES, FONT_PAIRINGS, fontPairingFor, DEFAULT_TYPOGRAPHY } from '../features/qrStudio/elementPresets';
import { createStudioDocument, designFromDocument, layoutFitsCanvas, readStudioDocument } from '../features/designStudio/document/migrations';
import { STUDIO_SCHEMA_VERSION } from '../features/designStudio/document/types';
import { preflightDesign } from '../features/designStudio/export/preflight';
import CanvasElementView from '../features/qrStudio/CanvasElementView.vue';
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
const activeFormat = ref<'all' | TemplateFormat>('all');
const previewStyle = ref<QrStyleId>('obsidian-ring');
const previewTemplate = ref<QrTemplateDefinition | null>(null);
const activeTemplate = ref<QrTemplateDefinition | null>(null);
const savedDesigns = ref<StudioDesign[]>([]);
const saving = ref(false);
const saveState = ref<'saved' | 'saving' | 'local' | 'unsaved' | 'error'>('saved');
const lastSavedAt = ref('');
const saveStatusLabel = computed(() => ({
  saved: lastSavedAt.value ? `Saved ${lastSavedAt.value}` : 'All changes saved',
  saving: 'Saving changes…',
  local: 'Saved locally',
  unsaved: 'Unsaved draft',
  error: 'Save conflict',
})[saveState.value]);
const saveStatusIcon = computed(() => ({
  saved: 'bi bi-cloud-check', saving: 'bi bi-arrow-repeat', local: 'bi bi-device-ssd', unsaved: 'bi bi-pencil', error: 'bi bi-exclamation-circle',
})[saveState.value]);
const deleting = ref<number | string | null>(null);
const notice = ref('');
// Set from ?destination query param when opened from a QR asset "Design" button
const destinationHint = ref('');

// ── Template creator (build a template from scratch, compatible with the library) ────────────
const showCreator = ref(false);
const creatorFormat = ref<TemplateFormat>('landscape');
const creatorName = ref('');
const creatorStarter = ref<LayeredStarterId>('blank');

// ── Canvas state ──────────────────────────────────────────────────────────────
const stageRef = ref<HTMLElement>();
const canvasWrapRef = ref<HTMLElement>();
const imageFileInput = ref<HTMLInputElement>();
// Set right before opening the file picker from an existing image's "Replace image" action; if
// set when a file is chosen, that image's src is swapped in place instead of adding a new element.
const replacingImageId = ref<string | null>(null);
const canvasScale = ref(0.5);
const designKey = ref(0);
const selectedEl = ref<'qr' | 'copy' | 'merchant' | 'brandmark' | null>(null);
// Left icon-rail: which slide-out (add/navigate) panel is open. Independent of selection — the
// properties dock (right side) opens separately once something on canvas is selected.
type RailPanel = 'design' | 'qr' | 'background' | 'typography' | 'elements' | 'layers';
const activeRailPanel = ref<RailPanel | null>(null);
function toggleRailPanel(panel: RailPanel): void {
  const next = activeRailPanel.value === panel ? null : panel;
  activeRailPanel.value = next;
  // The rail is for document-level tools; the right dock is for a selected canvas element.
  // Keeping both open crushes the artboard below a useful editing size on laptop viewports.
  if (next) {
    selectedEl.value = null;
    selectedElementId.value = null;
  }
}
// Which text line is currently in edit mode (contenteditable) — null means every element on the
// canvas is plain drag-anywhere, Canva-style; double-clicking a line enters edit mode for it alone.
const editingKey = ref<ElementKey | null>(null);

// ── Freeform element bank (shapes / CTA badges) — separate selection track from the fixed slots
const selectedElementId = ref<string | null>(null);
const editingElementId = ref<string | null>(null);
function findCanvasEl(id: string): CanvasElement | undefined {
  return design.canvasElements?.find((el) => el.id === id);
}
const selectedElement = computed(() => selectedElementId.value ? findCanvasEl(selectedElementId.value) : undefined);
const backCanvasElements = computed(() => (design.canvasElements ?? []).filter((el) => el.visible !== false && (el.layer ?? 'front') === 'back'));
const frontCanvasElements = computed(() => (design.canvasElements ?? []).filter((el) => el.visible !== false && (el.layer ?? 'front') === 'front'));
const selectedElementOpacity = computed<number>({
  get: () => selectedElement.value?.opacity ?? 1,
  set: (v) => { if (selectedElement.value) selectedElement.value.opacity = v; },
});

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
// whose height is driven by content); 'free' resizes both independently (freeform shapes/CTAs)
interface ResizeState { id: string; axis: 'square' | 'width' | 'free' | 'aspect'; startCX: number; startCY: number; origW: number; origH: number }
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

const MM_PER_UNIT: Record<StudioUnit, number> = { mm: 1, cm: 10, in: 25.4, px: 25.4 / 96, pt: 25.4 / 72 };
const UNIT_PRECISION: Record<StudioUnit, number> = { mm: 1, cm: 2, in: 2, px: 0, pt: 1 };
const unitFactor = computed(() => MM_PER_UNIT[design.displayUnit ?? 'mm']);
const displayWidth = computed<number>({
  get: () => Number((design.widthMm / unitFactor.value).toFixed(UNIT_PRECISION[design.displayUnit ?? 'mm'])),
  set: (value) => { design.widthMm = Number(value) * unitFactor.value; },
});
const displayMinWidth = computed(() => Number((24 / unitFactor.value).toFixed(UNIT_PRECISION[design.displayUnit ?? 'mm'])));
const displayMaxWidth = computed(() => Number((1000 / unitFactor.value).toFixed(UNIT_PRECISION[design.displayUnit ?? 'mm'])));
const displayUnitStep = computed(() => ({ mm: 1, cm: 0.1, in: 0.05, px: 1, pt: 1 })[design.displayUnit ?? 'mm']);
const formattedDimensions = computed(() => {
  const unit = design.displayUnit ?? 'mm';
  const precision = UNIT_PRECISION[unit];
  return `${(design.widthMm / MM_PER_UNIT[unit]).toFixed(precision)} × ${(design.heightMm / MM_PER_UNIT[unit]).toFixed(precision)} ${unit}`;
});
const grid = computed(() => design.grid ?? (design.grid = { rulers: false, visible: false, snap: false, sizeMm: 5 }));
const qrColors = computed(() => design.qrColors ?? (design.qrColors = { ...DEFAULT_QR_COLORS }));
function resetQrColors(): void { design.qrColors = { ...DEFAULT_QR_COLORS }; }
const gridDisplayStep = computed(() => {
  const mmPerCanvasUnit = design.widthMm / canvasW.value;
  return Math.max(4, (grid.value.sizeMm / mmPerCanvasUnit) * canvasScale.value);
});
const gridStyle = computed(() => ({
  backgroundImage: 'linear-gradient(rgba(189,148,90,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(189,148,90,.22) 1px, transparent 1px)',
  backgroundSize: `${gridDisplayStep.value}px ${gridDisplayStep.value}px`,
}));
const rulerXStyle = computed(() => ({ backgroundSize: `${gridDisplayStep.value}px 100%` }));
const rulerYStyle = computed(() => ({ backgroundSize: `100% ${gridDisplayStep.value}px` }));

const dark = computed(() => design.theme === 'dark');
// A custom background (palette pick or hand-picked color) overrides the two-theme default; the
// brand mark's light/dark asset still follows the theme flag so it stays legible either way.
const bgColor = computed(() => design.background?.color ?? (dark.value ? '#1A1410' : '#F5F2EE'));
const inkColor = computed(() => design.background?.ink ?? (dark.value ? '#F5F2EE' : '#1A1410'));
const currentBgColor = computed(() => bgColor.value);
// Whichever background is chosen, keep design.theme (drives the brand-mark asset + surface panel
// tone) in sync with its actual lightness so those pieces never render backwards.
function applyBackgroundPreset(preset: { color: string; ink: string }): void {
  design.background = { color: preset.color, ink: preset.ink };
  design.theme = inkForBackground(preset.color) === '#F5F2EE' ? 'dark' : 'light';
}
function setCustomBackground(hex: string): void {
  const ink = inkForBackground(hex);
  design.background = { color: hex, ink };
  design.theme = ink === '#F5F2EE' ? 'dark' : 'light';
}

// Typography: one curated font pairing + a uniform size scale, applied to every fixed text slot
// (eyebrow/headline/descriptor/cta/merchantName) so the copy block always restyles as a set.
const typography = computed(() => design.typography ?? DEFAULT_TYPOGRAPHY);
const currentPairing = computed(() => fontPairingFor(typography.value.pairingId));
function setFontPairing(pairingId: string): void {
  design.typography = { pairingId, scale: typography.value.scale };
}
function setTypeScale(scale: number): void {
  design.typography = { pairingId: typography.value.pairingId, scale: Math.min(1.4, Math.max(0.75, scale)) };
}

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

// Typography styles (in display px, matching SVG renderer proportions) — font + size scale come
// from the design's typography pairing, kept in sync with renderTemplateSvg()'s textBlock().
const eyebrowStyle = computed(() => ({
  fontFamily: currentPairing.value.bodyFont, fontWeight: '700',
  fontSize: `${Math.round(displayShort.value * 0.027 * typography.value.scale)}px`,
  letterSpacing: `${Math.round(displayShort.value * 0.006)}px`,
  color: inkColor.value, textTransform: 'uppercase' as const,
  marginBottom: `${Math.round(displayShort.value * 0.022)}px`,
  display: 'block', outline: 'none', whiteSpace: 'nowrap' as const,
}));
const headlineStyle = computed(() => ({
  fontFamily: currentPairing.value.displayFont, fontWeight: '400',
  fontSize: `${Math.round(displayShort.value * 0.071 * typography.value.scale)}px`,
  lineHeight: '1.1', color: inkColor.value,
  marginBottom: `${Math.round(displayShort.value * 0.012)}px`,
  display: 'block', outline: 'none',
}));
const descriptorStyle = computed(() => ({
  fontFamily: currentPairing.value.bodyFont, fontWeight: '400',
  fontSize: `${Math.round(displayShort.value * 0.032 * typography.value.scale)}px`,
  color: inkColor.value, opacity: '0.72',
  marginBottom: `${Math.round(displayShort.value * 0.014)}px`,
  display: 'block', outline: 'none', whiteSpace: 'nowrap' as const,
}));
const ctaStyle = computed(() => ({
  fontFamily: currentPairing.value.bodyFont, fontWeight: '700',
  fontSize: `${Math.round(displayShort.value * 0.026 * typography.value.scale)}px`,
  letterSpacing: `${Math.round(displayShort.value * 0.004)}px`,
  color: '#BB9057', textTransform: 'uppercase' as const,
  display: 'block', outline: 'none', whiteSpace: 'nowrap' as const,
}));
const merchantTextStyle = computed(() => ({
  fontFamily: currentPairing.value.displayFont, fontWeight: '400',
  fontSize: `${Math.round(displayShort.value * 0.034 * typography.value.scale)}px`,
  color: inkColor.value, display: 'block', outline: 'none', whiteSpace: 'nowrap' as const,
}));

// Brand mark: position the logo so its visual content (x:[335,1312] y:[164,415]) renders correctly
const bmContainerStyle = computed((): Record<string, string> => {
  const { x, y, w, h } = elPos.value.brandmark; const s = canvasScale.value;
  return { position: 'absolute', left: `${x * s}px`, top: `${y * s}px`, width: `${w * s}px`, height: `${h * s}px`, overflow: 'hidden' };
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
const qrDataUri = computed(() => svgDataUri(renderBrandedQrSvg(design.destination || 'https://peshkash.app', design.qrStyle, 600, qrColors.value)));

// Rendered SVG for export (uses current elPos)
const renderedSvg = computed(() => {
  const t = activeTemplate.value; if (!t) return '';
  const sh = Math.min(t.canvas.width, t.canvas.height);
  const { x, y, w } = elPos.value.qr;
  return renderTemplateSvg(t, design, {
    qr: { x: x / t.canvas.width, y: y / t.canvas.height, size: w / sh },
    copy: { ...elPos.value.copy },
    merchant: { ...elPos.value.merchant },
    brandmark: { ...elPos.value.brandmark },
  });
});
const renderedDataUri = computed(() => svgDataUri(renderedSvg.value));
// Curated templates use their canonical SVG for fixed artwork, but freeform elements stay as live
// DOM/SVG nodes above it. This avoids regenerating and decoding a full data URI on every pointer
// move—the source of uploaded images blinking or disappearing during drag.
const previewSvg = computed(() => {
  const t = activeTemplate.value; if (!t || design.customTemplate) return '';
  const sh = Math.min(t.canvas.width, t.canvas.height);
  const { x, y, w } = elPos.value.qr;
  return renderTemplateSvg(t, {
    merchantName: design.merchantName,
    eyebrow: design.eyebrow,
    headline: design.headline,
    descriptor: design.descriptor,
    cta: design.cta,
    destination: design.destination,
    qrStyle: design.qrStyle,
    qrColors: qrColors.value,
    theme: design.theme,
    visibility: design.visibility,
    background: design.background,
    typography: design.typography,
    canvasElements: backCanvasElements.value.filter((el) => el.id !== dragState.value?.id && el.id !== resizeState.value?.id),
  }, {
    qr: { x: x / t.canvas.width, y: y / t.canvas.height, size: w / sh },
    copy: { ...elPos.value.copy },
    merchant: { ...elPos.value.merchant },
    brandmark: { ...elPos.value.brandmark },
  });
});
const previewDataUri = computed(() => svgDataUri(previewSvg.value));
const preflight = computed(() => activeTemplate.value
  ? preflightDesign(design, activeTemplate.value, elPos.value as FixedElementLayout)
  : null);

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

  const markBaseY = height - padding * 0.22;

  let cx: number, cy: number, cw: number, ch: number;
  if (horizontal) {
    cx = qrOnLeft ? Math.max(width * 0.47, qrX + qrSize + padding) : padding * 1.2;
    cy = height * 0.14;
    cw = qrOnLeft ? width - cx - padding : qrX - cx - padding;
    ch = height * 0.75;
  } else {
    const qrBottom = qrY + qrSize;
    const footerTop = height - sh * 0.12;
    const spaceAbove = qrY - padding;
    const spaceBelow = footerTop - qrBottom;
    const minimumCopyHeight = sh * 0.2;
    const above = spaceAbove >= minimumCopyHeight || spaceAbove >= spaceBelow;
    cx = width * 0.08;
    cw = width * 0.84;
    cy = above ? padding : (qrBottom + sh * 0.03);
    const availableHeight = above
      ? qrY - cy - sh * 0.01
      : footerTop - cy;
    // The selection box must stay inside the artboard. Earlier it always used 35% of page height,
    // which pushed copy controls beyond square, tag, insert, and portrait canvases.
    ch = Math.max(sh * 0.14, availableHeight);
    ch = Math.min(ch, height - cy);
  }

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
  if (!design.customTemplate) {
    const canonical = brandKitLayout(t);
    cx = canonical.copy.x; cy = canonical.copy.y; cw = canonical.copy.w; ch = canonical.copy.h;
  }
  elPos.value = {
    qr: { ...qrRect },
    copy: { x: cx, y: cy, w: cw, h: ch },
    merchant: { x: padding, y: markBaseY - sh * 0.05, w: width * 0.46, h: sh * 0.06 },
    brandmark: { x: bx, y: by, w: logoContentW, h: logoH },
  };
  if (!design.customTemplate) {
    const canonical = brandKitLayout(t);
    elPos.value.merchant = { ...canonical.merchant };
    elPos.value.brandmark = { ...canonical.brandmark };
  }
  elPosDefault.value = { qr: { ...qrRect } };
  const isCanonicalLayout = design.variables?.layoutEngine === 'brandkit-v2';
  if (layoutFitsCanvas(design.layout, width, height) && (design.customTemplate || isCanonicalLayout)) {
    elPos.value = JSON.parse(JSON.stringify(design.layout));
  } else if (design.layout) {
    // Older drafts could accidentally carry the previous template's coordinate system. Reset the
    // whole fixed layout instead of preserving a mixture of incompatible positions and sizes.
    design.layout = JSON.parse(JSON.stringify(elPos.value));
  }
  if (!design.customTemplate) {
    if (!isCanonicalLayout && design.visibility?.merchantName === undefined) {
      design.visibility = { ...(design.visibility ?? {}), merchantName: false };
    }
    design.variables = { ...(design.variables ?? {}), layoutEngine: 'brandkit-v2' };
  }
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

function setZoom(next: number): void {
  canvasScale.value = Math.max(0.08, Math.min(1.6, Math.round(next * 10) / 10));
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
  activeRailPanel.value = null;
  selectedEl.value = 'qr';
  selectedElementId.value = null;
  dragState.value = { id: 'qr', startCX: e.clientX, startCY: e.clientY, origX: elPos.value.qr.x, origY: elPos.value.qr.y };
  safeSetPointerCapture(e.currentTarget as Element, e.pointerId);
  startDragListeners();
}
function startQrResize(e: PointerEvent): void {
  resizeState.value = { id: 'qr', axis: 'square', startCX: e.clientX, startCY: e.clientY, origW: elPos.value.qr.w, origH: elPos.value.qr.h };
  safeSetPointerCapture(e.currentTarget as Element, e.pointerId);
  startDragListeners();
}
function startElDrag(id: 'copy' | 'merchant' | 'brandmark', e: PointerEvent): void {
  activeRailPanel.value = null;
  selectedEl.value = id;
  selectedElementId.value = null;
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
// Uniform resize for the brand mark — aspect ratio must stay locked (the logo isn't square).
function startBrandmarkResize(e: PointerEvent): void {
  const { w, h } = elPos.value.brandmark;
  resizeState.value = { id: 'brandmark', axis: 'aspect', startCX: e.clientX, startCY: e.clientY, origW: w, origH: h };
  safeSetPointerCapture(e.currentTarget as Element, e.pointerId);
  startDragListeners();
}
// Grab-anywhere drag for the copy block / merchant name / brand mark — Canva-style: pointerdown on
// the block body starts a drag immediately, unless it landed on the one line currently in
// text-edit mode (isContentEditable), in which case native cursor placement/selection takes over.
function onBlockPointerDown(id: 'copy' | 'merchant' | 'brandmark', e: PointerEvent): void {
  if ((e.target as HTMLElement).isContentEditable) return;
  startElDrag(id, e);
}

// ── Element bank (freeform shapes / CTA badges / text / images) ───────────────
function addElement(presetId: string): void {
  const preset = ELEMENT_PRESETS.find((p) => p.id === presetId);
  const t = activeTemplate.value;
  if (!preset || !t) return;
  const el = preset.build(t.canvas.width, t.canvas.height);
  if (!design.canvasElements) design.canvasElements = [];
  design.canvasElements.push(el);
  activeRailPanel.value = null;
  selectedEl.value = null;
  selectedElementId.value = el.id;
}
// Downscales an uploaded image client-side (long edge capped, re-encoded as JPEG) before storing
// it as an inline data: URI — there's no asset-upload backend, and the design is persisted whole
// as JSON, so keeping the payload small matters.
const IMAGE_MAX_EDGE = 900;
const IMAGE_MAX_BYTES = 12 * 1024 * 1024;
function downscaleImage(file: File): Promise<{ dataUrl: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    if (file.size > IMAGE_MAX_BYTES) { reject(new Error('Image exceeds 12 MB')); return; }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { reject(new Error('Unsupported image type')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        // Preserve alpha for PNG/WebP logos and cut-outs. Photographs remain compact JPEGs.
        const outputType = file.type === 'image/png' || file.type === 'image/webp' ? file.type : 'image/jpeg';
        resolve({ dataUrl: canvas.toDataURL(outputType, outputType === 'image/jpeg' ? 0.88 : undefined), w, h });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
async function onImageFileChosen(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ''; // allow choosing the same file again later
  const t = activeTemplate.value;
  const replaceId = replacingImageId.value;
  replacingImageId.value = null;
  if (!file || !t) return;
  try {
    const { dataUrl, w, h } = await downscaleImage(file);
    const existing = replaceId ? findCanvasEl(replaceId) : undefined;
    if (existing && existing.kind === 'image') {
      // Keep position + width, adjust height to the new image's aspect ratio.
      existing.src = dataUrl;
      existing.h = existing.w * (h / w);
      return;
    }
    const short = Math.min(t.canvas.width, t.canvas.height);
    const boxW = short * 0.4;
    const boxH = boxW * (h / w);
    const el: ImageElement = {
      id: newId(), kind: 'image', src: dataUrl,
      x: (t.canvas.width - boxW) / 2, y: (t.canvas.height - boxH) / 2,
      w: boxW, h: boxH, opacity: 1, layer: 'front',
    };
    if (!design.canvasElements) design.canvasElements = [];
    design.canvasElements.push(el);
    activeRailPanel.value = null;
    selectedEl.value = null;
    selectedElementId.value = el.id;
  } catch (error) {
    notice.value = error instanceof Error && error.message.includes('12 MB')
      ? 'That image is larger than 12 MB. Choose a smaller file.'
      : "Couldn't read that image — use a PNG, JPEG or WebP file.";
    window.setTimeout(() => { notice.value = ''; }, 3000);
  }
}
function deleteElement(id: string): void {
  if (!design.canvasElements) return;
  design.canvasElements = design.canvasElements.filter((el) => el.id !== id);
  if (selectedElementId.value === id) selectedElementId.value = null;
  if (editingElementId.value === id) editingElementId.value = null;
}
function selectElement(id: string): void {
  activeRailPanel.value = null;
  selectedElementId.value = id;
  selectedEl.value = null;
}
function duplicateElement(id: string): void {
  const el = findCanvasEl(id);
  if (!el || !design.canvasElements) return;
  const short = activeTemplate.value ? Math.min(activeTemplate.value.canvas.width, activeTemplate.value.canvas.height) : 0;
  const offset = short * 0.02;
  const copyEl: CanvasElement = { ...el, id: crypto.randomUUID(), x: el.x + offset, y: el.y + offset };
  const idx = design.canvasElements.findIndex((e) => e.id === id);
  design.canvasElements.splice(idx + 1, 0, copyEl);
  selectElement(copyEl.id);
}
// Layers panel display order: front-layer elements first (topmost = highest stacking), then
// back-layer — each group listed with its topmost (last-rendered, last-in-array) element first.
const layerRows = computed(() => {
  const all = design.canvasElements ?? [];
  const front = all.filter((el) => (el.layer ?? 'front') === 'front').slice().reverse();
  const back = all.filter((el) => (el.layer ?? 'front') === 'back').slice().reverse();
  return [...front, ...back];
});
const frontLayerRows = computed(() => layerRows.value.filter((el) => (el.layer ?? 'front') === 'front'));
const backLayerRows = computed(() => layerRows.value.filter((el) => (el.layer ?? 'front') === 'back'));
function toggleElementVisibility(id: string): void {
  const el = findCanvasEl(id);
  if (!el) return;
  el.visible = el.visible === false;
  if (el.visible === false && selectedElementId.value === id) selectedElementId.value = null;
}
function toggleElementLock(id: string): void {
  const el = findCanvasEl(id);
  if (el) el.locked = !el.locked;
}
function selectFixedLayer(key: 'qr' | 'copy' | 'merchant' | 'brandmark'): void {
  activeRailPanel.value = 'layers';
  selectedEl.value = key;
  selectedElementId.value = null;
}
function layerLabel(el: CanvasElement): string {
  if (el.name) return el.name;
  if (el.kind === 'cta') return `${el.style === 'tag' ? 'Tag' : el.style === 'ribbon' ? 'Ribbon' : 'Button'}: ${el.text || 'CTA'}`;
  if (el.kind === 'text') return `Text: ${el.text || 'empty'}`;
  if (el.kind === 'image') return 'Image';
  const names: Record<string, string> = { rect: 'Rectangle', circle: 'Circle', line: 'Line', triangle: 'Triangle', star: 'Star', tag: 'Tag shape', hexagon: 'Hexagon', diamond: 'Diamond', arrow: 'Arrow', frame: 'Frame' };
  return names[el.shape] || 'Shape';
}
// Swatch color/thumbnail shown next to each row in the Layers panel — text and shapes/CTAs use
// their color; images use their own thumbnail instead of a flat swatch.
function layerSwatchStyle(el: CanvasElement): Record<string, string> {
  if (el.kind === 'image') return { backgroundImage: `url(${el.src})`, backgroundSize: 'cover', backgroundPosition: 'center' };
  if (el.kind === 'text') return { background: el.color };
  return { background: el.fill };
}
// Moves an element one step toward the front (up) or back (down) WITHIN its own layer — array
// order is stacking order, so this is a plain adjacent swap.
function moveElement(id: string, direction: 'up' | 'down'): void {
  const list = design.canvasElements;
  if (!list) return;
  const i = list.findIndex((el) => el.id === id);
  if (i === -1) return;
  const layer = list[i].layer ?? 'front';
  const j = direction === 'up' ? i + 1 : i - 1;
  // find the nearest neighbor in the same layer to swap with
  let k = j;
  while (k >= 0 && k < list.length && (list[k].layer ?? 'front') !== layer) {
    k += direction === 'up' ? 1 : -1;
  }
  if (k < 0 || k >= list.length) return;
  [list[i], list[k]] = [list[k], list[i]];
}
// Canva's classic 4-action stacking model: Forward/Backward (moveElement, one step) plus these
// two jumps — bring to front means "front layer, topmost" (end of array, since front renders
// last); send to back means "back layer, bottommost" (start of array, since back renders first).
function bringToFront(id: string): void {
  const list = design.canvasElements;
  if (!list) return;
  const i = list.findIndex((el) => el.id === id);
  if (i === -1) return;
  const [el] = list.splice(i, 1);
  el.layer = 'front';
  list.push(el);
}
function sendToBack(id: string): void {
  const list = design.canvasElements;
  if (!list) return;
  const i = list.findIndex((el) => el.id === id);
  if (i === -1) return;
  const [el] = list.splice(i, 1);
  el.layer = 'back';
  list.unshift(el);
}
function startCanvasElDrag(id: string, e: PointerEvent): void {
  const el = findCanvasEl(id);
  if (!el || el.locked || el.visible === false) return;
  selectElement(id);
  dragState.value = { id, startCX: e.clientX, startCY: e.clientY, origX: el.x, origY: el.y };
  safeSetPointerCapture(e.currentTarget as Element, e.pointerId);
  startDragListeners();
}
function startCanvasElResize(id: string, e: PointerEvent): void {
  const el = findCanvasEl(id);
  if (!el || el.locked || el.visible === false) return;
  resizeState.value = { id, axis: 'free', startCX: e.clientX, startCY: e.clientY, origW: el.w, origH: el.h };
  safeSetPointerCapture(e.currentTarget as Element, e.pointerId);
  startDragListeners();
}
// Grab-anywhere drag for freeform elements, same pattern as the copy/merchant blocks — CTA labels
// stay editable via double-click without fighting the drag.
function onCanvasElPointerDown(id: string, e: PointerEvent): void {
  if ((e.target as HTMLElement).isContentEditable) return;
  startCanvasElDrag(id, e);
}
function startElementTextEdit(id: string, e: MouseEvent): void {
  editingElementId.value = id;
  const clientX = e.clientX, clientY = e.clientY;
  nextTick(() => {
    const el = document.querySelector<HTMLElement>(`[data-el-text="${id}"]`);
    if (!el) return;
    el.focus();
    placeCaretAt(el, clientX, clientY);
  });
}
function endElementTextEdit(): void { editingElementId.value = null; }
function onElementInputText(id: string, value: string): void {
  const el = findCanvasEl(id);
  if (el && (el.kind === 'cta' || el.kind === 'text')) el.text = value;
}
function onElementResizeHeight(id: string, canvasHeight: number): void {
  const el = findCanvasEl(id);
  if (el) el.h = canvasHeight;
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
// Resolves the mutable {x,y,w,h} for any draggable/resizable id — the four fixed slots (backed
// by elPos) or a freeform canvas element (backed by its own object in design.canvasElements).
function getMutableRect(id: string): ElRect | undefined {
  if (id === 'qr' || id === 'copy' || id === 'merchant' || id === 'brandmark') return elPos.value[id];
  return findCanvasEl(id);
}
function applyMove(e: PointerEvent): void {
  const t = activeTemplate.value; if (!t) return;
  const s = canvasScale.value;
  if (dragState.value) {
    const { id, startCX, startCY, origX, origY } = dragState.value;
    const el = getMutableRect(id);
    if (el) {
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
      if (grid.value.snap && grid.value.sizeMm > 0) {
        const canvasStep = grid.value.sizeMm / (design.widthMm / t.canvas.width);
        if (!snapX) nx = Math.max(0, Math.min(maxX, Math.round(nx / canvasStep) * canvasStep));
        if (!snapY) ny = Math.max(0, Math.min(maxY, Math.round(ny / canvasStep) * canvasStep));
      }
      snapGuides.value = { centerX: snapX, centerY: snapY };

      el.x = nx;
      el.y = ny;
    }
  }
  if (resizeState.value) {
    const rs = resizeState.value;
    const el = getMutableRect(rs.id);
    if (el) {
      if (rs.axis === 'square') {
        const sh = Math.min(t.canvas.width, t.canvas.height);
        const dCanvas = (e.clientX - rs.startCX) / s;
        const newW = Math.max(sh * 0.08, Math.min(sh * 0.72, rs.origW + dCanvas));
        el.w = newW;
        el.h = newW;
      } else if (rs.axis === 'width') {
        const dCanvas = (e.clientX - rs.startCX) / s;
        const maxW = t.canvas.width - el.x;
        const newW = Math.max(t.canvas.width * 0.12, Math.min(maxW, rs.origW + dCanvas));
        el.w = newW;
      } else if (rs.axis === 'aspect') {
        // Scale both dimensions by the same factor — preserves whatever aspect ratio the element
        // started with (the brand mark's logo shape, unlike QR, isn't literally square).
        const sh = Math.min(t.canvas.width, t.canvas.height);
        const dCanvas = (e.clientX - rs.startCX) / s;
        const minW = sh * 0.04;
        const newW = Math.max(minW, rs.origW + dCanvas);
        const factor = newW / rs.origW;
        el.w = newW;
        el.h = rs.origH * factor;
      } else {
        const sh = Math.min(t.canvas.width, t.canvas.height);
        const minSize = sh * 0.03;
        const dX = (e.clientX - rs.startCX) / s;
        const dY = (e.clientY - rs.startCY) / s;
        el.w = Math.max(minSize, Math.min(t.canvas.width - el.x, rs.origW + dX));
        el.h = Math.max(minSize, Math.min(t.canvas.height - el.y, rs.origH + dY));
      }
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
  const hadGesture = !!(dragState.value || resizeState.value);
  isDragging.value = false;
  dragState.value = null;
  resizeState.value = null;
  snapGuides.value = { centerX: false, centerY: false };
  window.removeEventListener('pointermove', onWindowMove);
  window.removeEventListener('pointerup', onWindowUp);
  window.removeEventListener('pointercancel', onWindowUp);
  if (hadGesture) flushHistoryPush();
}

// ── Keyboard nudge — arrow keys move the selected element by a small step, Shift for a bigger one.
// Delete/Backspace removes the selected freeform element (fixed slots use visibility toggles instead).
function onCanvasKeydown(e: KeyboardEvent): void {
  if (mode.value !== 'editor' || editingKey.value || editingElementId.value) return;
  const active = document.activeElement as HTMLElement | null;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;

  // Undo/redo work with nothing selected — they don't depend on activeId below.
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    redo();
    return;
  }

  const activeId = selectedEl.value ?? selectedElementId.value;
  if (!activeId) return;

  if (selectedElementId.value && (e.key === 'Delete' || e.key === 'Backspace')) {
    e.preventDefault();
    deleteElement(selectedElementId.value);
    return;
  }
  if (selectedElementId.value && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
    e.preventDefault();
    duplicateElement(selectedElementId.value);
    return;
  }

  const delta: Record<string, [number, number]> = {
    ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  };
  const d = delta[e.key];
  if (!d) return;
  const t = activeTemplate.value; if (!t) return;
  const el = getMutableRect(activeId);
  if (!el) return;
  e.preventDefault();
  const sh = Math.min(t.canvas.width, t.canvas.height);
  const step = sh * (e.shiftKey ? 0.02 : 0.004);
  const maxX = t.canvas.width - el.w, maxY = t.canvas.height - el.h;
  el.x = Math.max(0, Math.min(maxX, el.x + d[0] * step));
  el.y = Math.max(0, Math.min(maxY, el.y + d[1] * step));
}

// ── Design state (must be before watches) ────────────────────────────────────
const blankDesign = (): StudioDesign => ({
  id: undefined,
  name: '', libraryTemplateId: '', manifestVersion: qrManifest.version,
  schemaVersion: STUDIO_SCHEMA_VERSION, revision: 1,
  qrStyle: 'obsidian-ring', theme: 'light', widthMm: 120, heightMm: 70,
  displayUnit: 'mm', grid: { rulers: false, visible: false, snap: false, sizeMm: 5 },
  qrColors: { ...DEFAULT_QR_COLORS },
  merchantName: '', eyebrow: '', headline: '', descriptor: '', cta: '', destination: 'https://peshkash.app',
  visibility: {},
  canvasElements: [],
  customTemplate: undefined,
  background: undefined,
  typography: undefined,
  layout: undefined,
  variables: undefined,
  updatedAt: undefined,
});
const design = reactive<StudioDesign>(blankDesign());

// ── Undo / redo ────────────────────────────────────────────────────────────────
// A design tool nobody trusts without undo. History is a stack of serialized {design, elPos}
// snapshots — cheap enough for these small JSON payloads, and side-steps having to hand-write a
// separate inverse for every kind of edit (drag, resize, color, text, add/delete...).
interface HistorySnapshot { design: StudioDesign; elPos: typeof elPos.value }
const HISTORY_LIMIT = 60;
const historyStack = ref<string[]>([]);
const historyIndex = ref(-1);
const historyAssetBySource = new Map<string, string>();
const historyAssetByKey = new Map<string, string>();
let historyAssetSequence = 0;
let restoringHistory = false;
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1);
function pushHistory(): void {
  if (restoringHistory || mode.value !== 'editor') return;
  // Keep large uploaded images once in an in-memory asset table. History entries then carry a
  // tiny reference instead of repeating multi-megabyte base64 payloads up to 60 times.
  const serialized = JSON.stringify({ design, elPos: elPos.value } satisfies HistorySnapshot, (_key, value) => {
    if (typeof value !== 'string' || !value.startsWith('data:image/')) return value;
    let assetKey = historyAssetBySource.get(value);
    if (!assetKey) {
      assetKey = `history-asset://${++historyAssetSequence}`;
      historyAssetBySource.set(value, assetKey);
      historyAssetByKey.set(assetKey, value);
    }
    return assetKey;
  });
  // Skip no-op pushes (nothing actually changed since the last snapshot).
  if (historyStack.value[historyIndex.value] === serialized) return;
  historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
  historyStack.value.push(serialized);
  if (historyStack.value.length > HISTORY_LIMIT) historyStack.value.shift();
  historyIndex.value = historyStack.value.length - 1;
}
function restoreHistoryAt(index: number): void {
  const raw = historyStack.value[index];
  if (raw === undefined) return;
  const snap: HistorySnapshot = JSON.parse(raw, (_key, value) => (
    typeof value === 'string' && value.startsWith('history-asset://')
      ? historyAssetByKey.get(value) ?? ''
      : value
  ));
  restoringHistory = true;
  Object.assign(design, blankDesign(), snap.design);
  elPos.value = snap.elPos;
  selectedEl.value = null;
  selectedElementId.value = null;
  editingKey.value = null;
  editingElementId.value = null;
  historyIndex.value = index;
  nextTick(() => { restoringHistory = false; });
}
function undo(): void { if (canUndo.value) restoreHistoryAt(historyIndex.value - 1); }
function redo(): void { if (canRedo.value) restoreHistoryAt(historyIndex.value + 1); }
// Rather than hand-instrument every mutation site (drag, resize, color pickers, text edits, add/
// delete...), a debounced deep watch on the whole design + elPos catches everything generically:
// one history entry ~500ms after edits settle. Drag-end also flushes immediately (see onWindowUp)
// so undo lands cleanly on a completed gesture rather than waiting out the debounce.
const HISTORY_DEBOUNCE_MS = 500;
let historyDebounceTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleHistoryPush(): void {
  if (restoringHistory || mode.value !== 'editor') return;
  if (historyDebounceTimer) clearTimeout(historyDebounceTimer);
  historyDebounceTimer = setTimeout(() => { historyDebounceTimer = null; pushHistory(); }, HISTORY_DEBOUNCE_MS);
}
function flushHistoryPush(): void {
  if (historyDebounceTimer) { clearTimeout(historyDebounceTimer); historyDebounceTimer = null; }
  pushHistory();
}
watch(design, scheduleHistoryPush, { deep: true });
watch(elPos, () => {
  design.layout = JSON.parse(JSON.stringify(elPos.value));
  scheduleHistoryPush();
}, { deep: true });

// Helper: true = visible (default), false = hidden
const vis = computed(() => ({
  eyebrow:      design.visibility?.eyebrow      !== false,
  headline:     design.visibility?.headline     !== false,
  descriptor:   design.visibility?.descriptor   !== false,
  cta:          design.visibility?.cta          !== false,
  merchantName: design.visibility?.merchantName !== false,
  brandmark:    design.visibility?.brandmark    !== false,
}));
const copyVisible = computed(() => vis.value.eyebrow || vis.value.headline || vis.value.descriptor || vis.value.cta);

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
    if (activeFormat.value !== 'all' && t.format !== activeFormat.value) return false;
    return !query || [t.label, t.categoryLabel, t.merchantType, t.format, ...t.tags].join(' ').toLowerCase().includes(query);
  });
});
const formatOptions = computed(() => [...new Set(qrManifest.templates.map((template) => template.format))]);
const destinationValid = computed(() => !preflight.value?.errors.some((check) => ['destination', 'host', 'mapping'].includes(check.id)));

function templateById(id: string): QrTemplateDefinition | undefined { return qrManifest.templates.find((t) => t.id === id); }
function assetPath(template: QrTemplateDefinition): string { return `/brand/qr-templates/${qrManifest.qrStyles[previewStyle.value].folder}/${template.file}`; }
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
  autosavePaused = true;
  if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; }
  Object.assign(design, blankDesign(), next);
  activeTemplate.value = resolveTemplate(design);
  mode.value = 'editor';
  saveState.value = typeof design.id === 'number' ? 'saved' : typeof design.id === 'string' ? 'local' : 'unsaved';
  void nextTick(() => nextTick(() => { autosavePaused = false; }));
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
    canvasElements: buildLayeredStarter(creatorStarter.value, spec.canvas),
    ...template.defaultCopy,
    destination: destinationHint.value || template.sampleDestination,
  });
  initElPos(template);
  nextTick(updateCanvasScale);
  showCreator.value = false;
  creatorName.value = '';
  creatorStarter.value = 'blank';
}
function editSaved(saved: StudioDesign): void {
  designKey.value++;
  selectedEl.value = null;
  applyDesign(saved);
  if (activeTemplate.value) initElPos(activeTemplate.value);
  nextTick(updateCanvasScale);
}
function toggleCopyVisibility(): void {
  if (!design.visibility) design.visibility = {};
  const next = !copyVisible.value;
  design.visibility.eyebrow = next;
  design.visibility.headline = next;
  design.visibility.descriptor = next;
  design.visibility.cta = next;
}
function closeEditor(): void {
  if (design.id == null && saveState.value === 'unsaved' && !window.confirm('Discard this unsaved draft?')) return;
  if (autosaveTimer) { clearTimeout(autosaveTimer); autosaveTimer = null; }
  mode.value = 'library'; activeTemplate.value = null; selectedEl.value = null;
  void loadDesigns();
}
function syncHeight(): void {
  if (!activeTemplate.value) return;
  design.widthMm = Math.max(24, Math.min(1000, Number(design.widthMm) || 120));
  design.heightMm = design.widthMm * (activeTemplate.value.canvas.height / activeTemplate.value.canvas.width);
}
function fromApi(row: Record<string, unknown>): StudioDesign & { vendorId?: number } {
  const settings = (row.settings || {}) as Partial<StudioDesign>;
  const elements = Array.isArray(row.elements) && row.elements[0] && typeof row.elements[0] === 'object' ? row.elements[0] as Partial<StudioDesign> : {};
  const document = readStudioDocument(row.document);
  const documentDesign = document ? designFromDocument(document) : {};
  return { ...blankDesign(), ...elements, ...settings, ...documentDesign, id: row.id as number,
    vendorId: row.vendorId ? Number(row.vendorId) : undefined,
    name: String(row.name || settings.name || 'Untitled design'),
    libraryTemplateId: String(row.libraryTemplateId || settings.libraryTemplateId || qrManifest.templates[0].id),
    manifestVersion: String(row.manifestVersion || settings.manifestVersion || qrManifest.version),
    schemaVersion: String(row.schemaVersion || settings.schemaVersion || STUDIO_SCHEMA_VERSION),
    revision: Number(row.revision || document?.revision || settings.revision || 1),
    qrStyle: (row.qrStyle || settings.qrStyle || 'obsidian-ring') as QrStyleId,
    theme: (row.theme || settings.theme || 'light') as StudioDesign['theme'], widthMm: Number(row.widthMm || settings.widthMm || 120),
    heightMm: Number(row.heightMm || settings.heightMm || 70), updatedAt: String(row.updatedAt || '') };
}

const LOCAL_DESIGNS_KEY = 'peshkash_qr_studio_designs_v3';
function localDesigns(): StudioDesign[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_DESIGNS_KEY) || '[]') as StudioDesign[]; }
  catch { return []; }
}
function persistLocal(next: StudioDesign): StudioDesign {
  const local = { ...JSON.parse(JSON.stringify(next)), id: typeof next.id === 'string' ? next.id : `local-${Date.now().toString(36)}`, updatedAt: new Date().toISOString() } as StudioDesign;
  const all = localDesigns().filter((item) => item.id !== local.id);
  localStorage.setItem(LOCAL_DESIGNS_KEY, JSON.stringify([local, ...all].slice(0, 30)));
  return local;
}
function removeLocal(id: string | number | undefined): void {
  if (typeof id !== 'string') return;
  localStorage.setItem(LOCAL_DESIGNS_KEY, JSON.stringify(localDesigns().filter((item) => item.id !== id)));
}
async function loadDesigns(): Promise<void> {
  let remote: StudioDesign[] = [];
  try {
    const { data } = await axios.get<Record<string, unknown>[]>(`${API_BASE_URL}/admin/designs`);
    const all = data.map(fromApi);
    remote = props.vendorId ? all.filter((d) => d.vendorId === props.vendorId || !d.vendorId) : all;
  } catch { /* local drafts remain available in standalone/offline mode */ }
  savedDesigns.value = [...remote, ...localDesigns()].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}
function upsertSavedDesign(next: StudioDesign): void {
  savedDesigns.value = [
    JSON.parse(JSON.stringify(next)) as StudioDesign,
    ...savedDesigns.value.filter((item) => String(item.id) !== String(next.id)),
  ].sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}
let autosavePaused = false;
let saveInFlight = false;
let saveQueued = false;
async function saveDesign(quiet = false): Promise<void> {
  if (!activeTemplate.value) return;
  if (saveInFlight) { saveQueued = true; return; }
  saveInFlight = true;
  saving.value = true;
  saveState.value = 'saving';
  design.layout = JSON.parse(JSON.stringify(elPos.value));
  const document = createStudioDocument(design, design.layout!);
  const settings = {
    name: design.name, merchantName: design.merchantName, eyebrow: design.eyebrow, headline: design.headline,
    descriptor: design.descriptor, cta: design.cta, destination: design.destination,
    displayUnit: design.displayUnit, grid: design.grid, qrColors: design.qrColors,
    background: design.background, typography: design.typography, visibility: design.visibility,
    customTemplate: design.customTemplate, variables: design.variables,
  };
  const payload = { name: design.name || activeTemplate.value.label, widthMm: design.widthMm, heightMm: design.heightMm,
    vendorId: props.vendorId,
    elements: [], libraryTemplateId: activeTemplate.value.id, manifestVersion: qrManifest.version,
    schemaVersion: STUDIO_SCHEMA_VERSION, revision: design.revision,
    qrStyle: design.qrStyle, theme: design.theme, settings, document };
  try {
    const isRemote = typeof design.id === 'number';
    const oldLocalId = design.id;
    const { data } = await axios.request<Record<string, unknown>>({ url: `${API_BASE_URL}/admin/designs${isRemote ? `/${design.id}` : ''}`, method: isRemote ? 'PUT' : 'POST', data: payload });
    autosavePaused = true;
    Object.assign(design, fromApi(data));
    removeLocal(oldLocalId);
    upsertSavedDesign(design);
    saveState.value = 'saved';
    lastSavedAt.value = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!quiet) notice.value = 'Design saved to your Peshkash workspace.';
    await nextTick();
    autosavePaused = false;
  } catch (error: any) {
    const local = persistLocal(design);
    if (typeof design.id !== 'number') design.id = local.id;
    upsertSavedDesign(local);
    saveState.value = error?.response?.status === 409 ? 'error' : 'local';
    if (!quiet) notice.value = error?.response?.status === 409
      ? 'This design changed in another tab. Your local draft is safe; reload before saving again.'
      : 'Saved locally. It will remain available while the workspace connection is unavailable.';
  }
  finally {
    saving.value = false;
    saveInFlight = false;
    if (!quiet) { await loadDesigns(); window.setTimeout(() => { notice.value = ''; }, 4000); }
  }
  if (saveQueued) { saveQueued = false; await saveDesign(true); }
}
async function deleteDesign(id: number | string): Promise<void> {
  deleting.value = id;
  try {
    if (typeof id === 'string') removeLocal(id);
    else await axios.delete(`${API_BASE_URL}/admin/designs/${id}`);
    await loadDesigns();
    notice.value = 'Design deleted.';
    window.setTimeout(() => { notice.value = ''; }, 3000);
  } catch { notice.value = 'Couldn\'t delete — try again.'; }
  finally { deleting.value = null; }
}
function safeFilename(ext: string): string { return `${(design.name || 'peshkash-qr').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.${ext}`; }
function triggerDownload(href: string, name: string): void { const a = document.createElement('a'); a.href = href; a.download = name; a.click(); }
function ensureExportReady(): boolean {
  if (preflight.value?.canExport) return true;
  activeRailPanel.value = 'qr';
  notice.value = 'Export is blocked until the QR preflight errors are resolved.';
  window.setTimeout(() => { notice.value = ''; }, 4000);
  return false;
}
function downloadSvg(): void {
  if (!ensureExportReady()) return;
  const blob = new Blob([renderedSvg.value], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob); triggerDownload(url, safeFilename('svg')); URL.revokeObjectURL(url);
}
async function downloadPng(): Promise<void> {
  if (!activeTemplate.value || !ensureExportReady()) return;
  const img = new Image(); const loaded = new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; });
  img.src = renderedDataUri.value; await loaded;
  const scale = Math.max(2, 3000 / activeTemplate.value.canvas.width); const canvas = document.createElement('canvas');
  canvas.width = Math.round(activeTemplate.value.canvas.width * scale); canvas.height = Math.round(activeTemplate.value.canvas.height * scale);
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height); triggerDownload(canvas.toDataURL('image/png'), safeFilename('png'));
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleAutosave(): void {
  if (autosavePaused || mode.value !== 'editor') return;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  if (design.id == null) { saveState.value = 'unsaved'; return; }
  saveState.value = 'saving';
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null;
    void saveDesign(true);
  }, 1400);
}
watch(design, scheduleAutosave, { deep: true });
watch(elPos, scheduleAutosave, { deep: true });

watch(activeTemplate, () => {
  if (!activeTemplate.value) return;
  initElPos(activeTemplate.value);
  nextTick(updateCanvasScale);
  // Fresh template/design loaded — history should start clean from this exact baseline, not carry
  // over undo entries from whatever was open before.
  historyStack.value = [];
  historyIndex.value = -1;
  historyAssetBySource.clear();
  historyAssetByKey.clear();
  historyAssetSequence = 0;
  pushHistory();
});
// The rail slide-out and properties dock opening/closing resizes canvas-wrap without firing a
// window 'resize' event — a ResizeObserver on the wrap itself catches that (and any other
// container-driven resize) instead of hand-tracking every state change that affects its width.
let canvasResizeObserver: ResizeObserver | undefined;
watch(canvasWrapRef, (el) => {
  canvasResizeObserver?.disconnect();
  if (!el) return;
  canvasResizeObserver = new ResizeObserver(() => updateCanvasScale());
  canvasResizeObserver.observe(el);
});
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
  canvasResizeObserver?.disconnect();
  if (autosaveTimer) clearTimeout(autosaveTimer);
  onWindowUp();
});
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Rufina:wght@400;700&family=Urbanist:wght@400;500;600;700&display=swap');

/* ── Base ── */
.studio{--ink:#1a1410;--cream:#f5f2ee;--gold:#bd945a;--muted:#6d6256;--editor-bar-h:64px;background:var(--cream);color:var(--ink);font-family:Urbanist,Arial,sans-serif}
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
.style-switch{display:flex;padding:3px;background:#e8e1da;align-self:center}.style-switch button{border:0;background:transparent;padding:8px 11px;display:flex;gap:7px;align-items:center;font-size:11px;cursor:pointer}.style-switch button.active{background:#fff;box-shadow:0 2px 9px rgba(26,20,16,.08)}.style-dot{width:12px;height:12px;border-radius:50%;display:inline-block;border:2px solid}.style-dot--obsidian-ring{background:var(--ink);border-color:var(--gold)}.style-dot--porcelain-cameo{background:var(--cream);border-color:#c5af9d}
.category-list{display:flex;gap:6px;overflow:auto;padding-bottom:14px;margin-bottom:20px}
.category-list button{white-space:nowrap;border:1px solid #d4cbc2;background:transparent;padding:7px 11px;font-size:11px;letter-spacing:.04em;cursor:pointer}
.category-list button.active{background:var(--ink);border-color:var(--ink);color:var(--cream)}
.format-list{display:flex;gap:5px;overflow:auto;margin:-10px 0 20px;padding-bottom:4px}.format-list button{border:0;background:transparent;color:var(--muted);padding:5px 8px;font-size:10px;text-transform:capitalize;cursor:pointer;border-bottom:1px solid transparent}.format-list button.active{color:var(--ink);border-color:var(--gold)}
.template-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:34px 20px}
.template-card{min-width:0}
.template-preview{width:100%;aspect-ratio:1.32;border:1px solid #ded6cf;background:#e9e3dd;padding:20px;display:grid;place-items:center;overflow:hidden;position:relative;cursor:pointer}
.template-preview img{width:100%;height:100%;object-fit:contain;transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.template-preview:hover img{transform:scale(1.035)}
.template-card-actions{position:absolute;right:11px;bottom:11px;display:flex;gap:6px;opacity:0;transform:translateY(4px);transition:.2s}.template-card-actions button{border:1px solid var(--ink);background:#fff;color:var(--ink);padding:8px 10px;font-size:10px;cursor:pointer}.template-card-actions .use-template{position:static;background:var(--ink);color:var(--cream);opacity:1;transform:none}.template-preview:hover .template-card-actions,.template-preview:focus-within .template-card-actions{opacity:1;transform:none}
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
.creator-sub--spaced{margin-top:22px}
.starter-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px}
.starter-option{display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:9px;border:1px solid #d9d0c7;background:#fff;padding:11px;text-align:left;cursor:pointer}
.starter-option:hover,.starter-option.active{border-color:var(--gold);background:#fdf8f2}
.starter-option>i:first-child{color:var(--gold);font-size:16px}
.starter-option span{display:grid;gap:2px;min-width:0}.starter-option b{font-size:11px}.starter-option small{font-size:9px;line-height:1.3;color:var(--muted)}
.starter-check{color:var(--gold);opacity:0}.starter-option.active .starter-check{opacity:1}
.format-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:26px}
.format-option{border:1.5px solid #ddd4cc;background:#fff;padding:14px 12px;cursor:pointer;text-align:left;display:grid;gap:8px;justify-items:start}
.format-option:hover{border-color:var(--gold)}
.format-option.active{border-color:var(--gold);background:#fdf8f2}
.format-option .format-swatch{width:34px;background:#e4dcd2;border:1px solid #cfc3b8;display:block}
.format-option .format-swatch.round{border-radius:50%}
.format-option b{font-size:12px}
.format-option small{font-size:10px;color:var(--muted);line-height:1.4}
.creator-actions{display:flex;justify-content:flex-end;gap:10px}
.preview-modal{width:min(920px,calc(100vw - 40px));max-height:calc(100vh - 40px);background:#f8f4ef;display:grid;grid-template-columns:minmax(0,1.45fr) minmax(260px,.75fr);position:relative;overflow:auto}.preview-modal>.creator-close{position:absolute;right:14px;top:14px;z-index:2;background:#fff}.preview-modal-art{background:#e6dfd8;padding:44px;display:grid;place-items:center;min-height:420px}.preview-modal-art img{width:100%;height:100%;max-height:68vh;object-fit:contain}.preview-modal-copy{padding:64px 34px 34px;display:flex;flex-direction:column;align-items:flex-start}.preview-modal-copy h3{font:400 34px/1.15 Rufina,serif;margin:0 0 12px}.preview-modal-copy>p:not(.eyebrow){color:var(--muted);line-height:1.55}.preview-modal-copy .tag-row{margin:8px 0 26px}.preview-modal-copy .primary-action{margin-top:auto}

/* ── Editor bar ── */
.editor-bar{height:64px;background:var(--ink);color:var(--cream);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 22px;position:sticky;top:0;z-index:20}
.studio--embedded .editor-bar{height:58px;background:#f7f2ea;color:var(--ink);border-bottom:1px solid #dfd4c7;padding:0 18px;top:0}
.studio--embedded .editor-title input{color:var(--ink)}
.studio--embedded .editor-title .save-status{color:#786b5f}
.studio--embedded .editor-actions-divider{background:#d8cdbf}
.studio--embedded .secondary-action{border:1px solid transparent}.studio--embedded .secondary-action:hover{border-color:#d9c7ae;background:#fff}
.back-button,.secondary-action{border:0;background:transparent;color:inherit;cursor:pointer}
.back-button{justify-self:start;display:flex;align-items:center;gap:8px;font-size:13px}
.editor-title{text-align:center;display:grid;justify-items:center;gap:2px;min-width:220px}
.editor-title input{width:min(320px,28vw);border:0;border-bottom:1px solid transparent;background:transparent;color:var(--cream);font:400 14px Rufina,serif;text-align:center;padding:2px 8px;outline:0}
.editor-title input:hover,.editor-title input:focus{border-color:rgba(189,148,90,.55)}
.editor-title .save-status{font:600 9px Urbanist,sans-serif;color:#b7aaa0;letter-spacing:.04em;text-transform:none;display:flex;align-items:center;gap:5px}
.save-status i{color:var(--gold)}
.editor-actions{justify-self:end;display:flex;gap:7px;align-items:center}
.secondary-action{padding:9px;font-size:13px}
.secondary-action:disabled{opacity:.35;cursor:default}
.editor-actions-divider{width:1px;height:20px;background:rgba(245,242,238,.18);margin:0 2px}
.primary-action{border:1px solid var(--gold);background:var(--gold);color:var(--ink)!important;padding:10px 16px;font-weight:700;display:inline-flex;align-items:center;gap:10px;cursor:pointer}
.primary-action:hover{background:#d3ab76}
.primary-action:disabled{opacity:.5;cursor:default}

/* ── Editor shell: 2-col ── */
.editor-shell{
  display:grid;
  grid-template-columns:76px 0px minmax(360px,1fr) 0px;
  grid-template-areas:"rail railpanel canvas props";
  height:calc(100vh - var(--editor-bar-h));overflow:hidden;
  transition:grid-template-columns .18s ease;
}
.editor-shell.rail-panel-open{grid-template-columns:76px 300px minmax(360px,1fr) 0px}
.editor-shell.props-open{grid-template-columns:76px 0px minmax(360px,1fr) 296px}
.editor-shell.rail-panel-open.props-open{grid-template-columns:76px 300px minmax(360px,1fr) 296px}
.studio--embedded.studio--editor{height:100%;min-height:0;--editor-bar-h:58px;overflow:hidden}
.studio--embedded:not(.studio--editor){height:100%;overflow-y:auto}
.studio--embedded .editor-shell{height:calc(100% - var(--editor-bar-h));min-height:0;overflow:hidden}

/* ── Canvas stage ── */
.canvas-stage{grid-area:canvas;padding:24px 28px 16px;background:#e8e2dc;display:flex;flex-direction:column;min-width:0;overflow:hidden}
.studio--embedded .canvas-stage{height:auto;min-height:0}

/* ── Icon rail + slide-out panel ── */
.rail{grid-area:rail;background:#f4efe9;border-right:1px solid #dfd7d0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 4px;overflow-y:auto}
/* <button> defaults to white-space:nowrap in the browser's UA stylesheet — without overriding it
   here, a label longer than the rail's width (e.g. "Background") gets silently clipped instead of
   wrapping to a second line. */
.rail-btn{width:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:9px 3px;border:none;background:transparent;color:var(--muted);cursor:pointer;border-radius:6px;font-size:9px;font-weight:600;letter-spacing:.01em}
.rail-btn i{font-size:17px}
/* align-items:center above sizes the label to its unwrapped content by default (cross-axis
   auto-width), so white-space:normal alone has nothing to wrap against — constrain it to the
   button's own width so long labels ("Background") actually wrap instead of overflowing. */
.rail-btn span{width:100%;white-space:normal;text-align:center;line-height:1.25}
.rail-btn:hover{background:#efe7dd;color:var(--ink)}
.rail-btn.active{background:#fdf8f2;color:var(--gold);box-shadow:inset 0 0 0 1.5px var(--gold)}
.properties-panel--left{grid-area:railpanel}
.properties-panel--right{grid-area:props}
.properties-panel--left{border-left:0;border-right:1px solid #dfd7d0}
.stage-ruler{display:flex;justify-content:space-between;color:#776c62;font-size:10px;letter-spacing:.06em;margin-bottom:8px;flex-shrink:0}
.canvas-wrap{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;min-height:280px}
.artboard-frame{position:relative;flex-shrink:0}
.artboard-frame.with-rulers{padding:18px 0 0 18px}
.canvas-ruler{position:absolute;background-color:#f7f2eb;pointer-events:none;z-index:8;opacity:.9}
.canvas-ruler--x{left:18px;right:0;top:0;height:17px;border-bottom:1px solid #cbbba8;background-image:repeating-linear-gradient(90deg,#8c7667 0 1px,transparent 1px 100%)}
.canvas-ruler--y{top:18px;bottom:0;left:0;width:17px;border-right:1px solid #cbbba8;background-image:repeating-linear-gradient(0deg,#8c7667 0 1px,transparent 1px 100%)}
.canvas-root{position:relative;flex-shrink:0;box-shadow:0 18px 44px rgba(26,20,16,.22);user-select:none}
.canvas-render{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:0}
.canvas-grid{position:absolute;inset:0;pointer-events:none;z-index:5}
/* Approved library templates are rendered once, by the export renderer itself. The DOM boxes
   remain as transparent hit targets, so selection/drag/resize cannot introduce preview drift. */
.canvas-root--canonical .canvas-bg,.canvas-root--canonical .canvas-inner,.canvas-root--canonical .canvas-corners{display:none}
.canvas-root--canonical .el--qr>img,
.canvas-root--canonical .el--copy>.t-line,
.canvas-root--canonical .el--merchant>.t-line,
.canvas-root--canonical .el--brandmark>img{opacity:0!important}
.canvas-root--canonical :deep(.canvas-el--back-hit>.dyn-image),
.canvas-root--canonical :deep(.canvas-el--back-hit>.dyn-text),
.canvas-root--canonical :deep(.canvas-el--back-hit>.dyn-shape){opacity:0!important}
.canvas-root--canonical :deep(.canvas-el--back-hit.canvas-el--back-dragging>.dyn-image),
.canvas-root--canonical :deep(.canvas-el--back-hit.canvas-el--back-dragging>.dyn-text),
.canvas-root--canonical :deep(.canvas-el--back-hit.canvas-el--back-dragging>.dyn-shape){opacity:1!important}
.canvas-root--canonical .canvas-el{z-index:1}
.canvas-root--canonical .snap-guide{z-index:6}
.canvas-root--canonical .is-editing-text>.t-line[contenteditable="true"],
.canvas-root--canonical :deep(.dyn-text[contenteditable="true"]),
.canvas-root--canonical :deep(.dyn-cta-text[contenteditable="true"]){opacity:1!important;background:rgba(245,242,238,.94);color:#1a1410!important}
.canvas-bg{position:absolute;inset:0;pointer-events:none}
.canvas-corners{position:absolute;inset:0;pointer-events:none}
.canvas-footer{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-top:10px;flex-shrink:0}
.preview-caption{display:flex;justify-content:center;gap:7px;color:#776c62;font-size:10px;letter-spacing:.04em}
.zoom-controls{display:flex;align-items:center;border:1px solid #d0c6bc;background:#f5f0ea;height:30px}
.zoom-controls button{height:100%;min-width:30px;border:0;background:transparent;color:#665b51;cursor:pointer}
.zoom-controls button:hover{background:#e9e0d8;color:var(--ink)}
.zoom-controls .zoom-value{min-width:52px;border-left:1px solid #d0c6bc;border-right:1px solid #d0c6bc;font-size:10px}
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
.el--brandmark{cursor:grab;overflow:hidden}
.el--brandmark:hover:not(.selected){outline:1.5px dashed rgba(189,148,90,.4)}
.canvas-wrap.is-dragging .el--brandmark{cursor:grabbing}
.el--brandmark img{pointer-events:none;display:block}

/* Canva-style center snap guides */
.snap-guide{position:absolute;background:#ff4d6d;pointer-events:none;z-index:6}
.snap-guide--v{top:0;bottom:0;width:1px}
.snap-guide--h{left:0;right:0;height:1px}

/* Freeform element bank items on the canvas (shapes / CTA badges) */
.el--dyn{cursor:grab}
.el--dyn:hover:not(.selected){outline:1.5px dashed rgba(189,148,90,.4)}
.canvas-wrap.is-dragging .el--dyn{cursor:grabbing}
.dyn-shape{display:flex;align-items:center;overflow:hidden}
.dyn-cta-text{width:100%;height:100%;display:flex;align-items:center;font-weight:700;letter-spacing:.02em;font-family:Urbanist,Arial,sans-serif;white-space:nowrap;overflow:hidden;outline:none;cursor:grab}
.dyn-cta-text[contenteditable="true"]{cursor:text}
.el-delete-btn{position:absolute;top:-26px;left:0;border:1px solid #a44c41;background:rgba(26,20,16,.75);color:#e8887c;font-size:10px;padding:3px 7px;cursor:pointer;display:flex;align-items:center;gap:4px}
.el-delete-btn:hover{background:#a44c41;color:#fff}

/* ── Properties panel ── */
.properties-panel{background:#fbf9f6;padding:22px 20px;overflow-y:auto;overflow-x:hidden;border-left:1px solid #dfd7d0;display:flex;flex-direction:column;gap:0}
.properties-panel section+section{border-top:1px solid #e4ddd6;margin-top:22px;padding-top:20px}
.panel-kicker{font-size:9px;font-weight:700;letter-spacing:.19em;color:var(--gold);margin:0 0 14px}
.panel-back-row{display:flex;align-items:center;gap:4px;margin-bottom:14px}
.panel-back-row .panel-kicker{margin:0}
.back-to-props{border:0;background:transparent;color:var(--gold);cursor:pointer;padding:0 6px 0 0;font-size:13px;line-height:1}
.properties-panel label{display:grid;gap:5px;font-size:11px;color:var(--muted);margin-bottom:13px}
.properties-panel input,.properties-panel textarea{width:100%;border:1px solid #d9d0c7;background:#fff;padding:8px 10px;outline:0;color:var(--ink);resize:vertical}
.dimension-row{display:grid;grid-template-columns:minmax(0,1fr) 82px;gap:8px}.dimension-row label{margin-bottom:0}
.qr-color-controls{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:10px 0}.qr-color-controls label{font-size:9px;margin:0;text-align:center}
.toggle-row{display:flex!important;grid-template-columns:none!important;align-items:center;gap:9px;margin:9px 0!important}.toggle-row input{width:16px!important;height:16px;accent-color:var(--gold)}
.panel-rule{height:1px;background:#e4ddd6;margin:20px 0}
.properties-panel input:focus,.properties-panel textarea:focus{border-color:var(--gold)}
.field-note{font-size:10px;color:#53725a;display:flex;gap:6px;line-height:1.4}
.field-note.invalid{color:#a44c41}
.field-hint{font-size:10px;color:var(--muted);line-height:1.55;margin-bottom:12px}
.signature-mini-grid{display:grid;gap:8px;margin:12px 0}
.signature-mini{display:grid;grid-template-columns:46px 1fr;gap:10px;align-items:center;text-align:left;border:1px solid #d9d0c7;background:#fff;padding:8px;cursor:pointer}
.signature-mini.active{border-color:var(--gold);box-shadow:inset 3px 0 var(--gold)}
.signature-mini img{width:46px;height:46px}.signature-mini span{display:grid;gap:2px}.signature-mini b{font-size:11px}.signature-mini small{font-size:9px;line-height:1.35;color:var(--muted)}
.preflight-summary{margin-top:16px;border:1px solid #cad8cc;background:#f2f7f2}.preflight-summary.blocked{border-color:#dfc1bc;background:#fbf2f0}
.preflight-head{display:flex;gap:9px;align-items:center;padding:11px;border-bottom:1px solid rgba(86,76,64,.12)}
.preflight-head>i{font-size:18px;color:#53725a}.preflight-summary.blocked .preflight-head>i{color:#a44c41}.preflight-head span{display:grid;gap:2px}.preflight-head b{font-size:11px}.preflight-head small{font-size:9px;color:var(--muted)}
.preflight-summary ul{list-style:none;margin:0;padding:5px 10px}.preflight-summary li{display:grid;grid-template-columns:14px 1fr;gap:8px;padding:7px 0}.preflight-summary li>i{font-size:11px;margin-top:2px}.preflight-summary li span{display:grid;gap:1px}.preflight-summary li b{font-size:10px}.preflight-summary li small{font-size:9px;color:var(--muted);line-height:1.35}
.check--pass>i{color:#53725a}.check--warning>i{color:#a87632}.check--error>i{color:#a44c41}
.panel-empty{border:1px dashed #d3c8be;padding:22px 14px;text-align:center;color:var(--muted)}.panel-empty i{font-size:24px;color:var(--gold)}.panel-empty p{font-size:10px;line-height:1.5;margin:8px 0 0}
.canvas-edit-hint{font-size:10px;color:var(--muted);display:flex;align-items:flex-start;gap:7px;margin-bottom:14px;line-height:1.5;background:#f0ebe4;padding:10px;border-left:2px solid var(--gold)}
.bg-swatch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}
.bg-swatch{position:relative;width:100%;aspect-ratio:1;border:1.5px solid #ddd4cc;border-radius:6px;cursor:pointer;display:grid!important;place-items:center;padding:0!important;margin:0!important;gap:0!important}
.bg-swatch.active{border-color:var(--gold);box-shadow:0 0 0 2px rgba(189,148,90,.25)}
.bg-swatch i{font-size:13px}
.bg-swatch--custom{background:conic-gradient(from 0deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);color:#fff;position:relative;overflow:hidden}
.bg-swatch--custom i{text-shadow:0 1px 3px rgba(0,0,0,.5)}
.bg-swatch--custom input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
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
.el-action-row{display:flex;gap:8px}
.el-action-row .reset-btn{margin-top:4px}
.reset-btn--danger:hover{border-color:#a44c41;color:#a44c41}
.layer-order-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.layer-order-btn{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px;border:1px solid #d9d0c7;background:#fff;font-size:9.5px;font-weight:600;letter-spacing:.02em;color:var(--muted);cursor:pointer}
.layer-order-btn:hover{border-color:var(--gold);color:var(--ink)}
.layer-order-btn i{font-size:13px}

/* ── Typography (font pairing + size scale) ── */
.font-pairing-list{display:flex;flex-direction:column;gap:6px}
.font-pairing-btn{display:flex;align-items:center;gap:10px;padding:7px 10px;border:1px solid #d9d0c7;background:#fff;cursor:pointer;text-align:left}
.font-pairing-btn:hover{border-color:var(--gold)}
.font-pairing-btn.active{border-color:var(--gold);background:#fdf8f2;box-shadow:inset 3px 0 var(--gold)}
.font-pairing-sample{font-size:17px;line-height:1;color:var(--ink);width:22px;flex-shrink:0;text-align:center}
.font-pairing-label{flex:1;font-size:10.5px;font-weight:600;color:var(--muted);letter-spacing:.01em}
.font-pairing-btn.active .font-pairing-label{color:var(--ink)}
.font-pairing-btn>i{color:var(--gold);font-size:12px}
.type-scale-row{display:flex;align-items:center;gap:8px;margin-top:12px}
.scale-btn{width:22px;height:22px;display:grid;place-items:center;border:1px solid #d9d0c7;background:#fff;cursor:pointer;padding:0;color:var(--muted)}
.scale-btn:hover:not(:disabled){border-color:var(--gold);color:var(--ink)}
.scale-btn:disabled{opacity:.35;cursor:not-allowed}
.scale-value{font-size:10.5px;font-weight:600;color:var(--ink);min-width:34px;text-align:center;font-variant-numeric:tabular-nums}

/* ── Visibility toggles ── */
.vis-toggles{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}
.vis-btn{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid #d9d0c7;background:#fff;font-size:10px;font-weight:600;letter-spacing:.03em;cursor:pointer;color:var(--muted);transition:border-color .15s,color .15s,background .15s}
.vis-btn.active{border-color:var(--gold);color:var(--ink);background:#fdf8f2}
.vis-btn:hover{border-color:var(--gold);color:var(--ink)}
.vis-btn i{font-size:11px}
.properties-panel input:disabled,.properties-panel textarea:disabled{opacity:.4;pointer-events:none}
.text-style-row{display:flex;gap:6px;margin-bottom:13px}
.text-style-row .vis-btn{padding:6px 9px}
.properties-panel select{width:100%;border:1px solid #d9d0c7;background:#fff;padding:8px 10px;outline:0;color:var(--ink)}
.properties-panel select:focus{border-color:var(--gold)}

/* ── Layers panel ── */
.layers-list{display:flex;flex-direction:column;gap:2px}
.layer-row{display:flex;align-items:center;gap:7px;padding:6px 6px 6px 2px;border:1px solid transparent;border-radius:4px;cursor:pointer;font-size:11.5px}
.layer-row:hover{background:#f3ede4}
.layer-row.active{background:#fdf8f2;border-color:var(--gold)}
.layer-grip{color:#c2b7a9;font-size:12px;flex-shrink:0}
.layer-swatch{width:16px;height:16px;border-radius:4px;border:1px solid rgba(0,0,0,.12);flex-shrink:0}
.layer-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.layer-btn{border:0;background:transparent;color:var(--muted);cursor:pointer;padding:3px 4px;font-size:11px;line-height:1;flex-shrink:0}
.layer-btn:hover,.layer-btn.active{color:var(--ink)}
.layer-core-icon{width:16px;height:16px;display:grid;place-items:center;color:var(--gold);font-size:11px;flex-shrink:0}
.layer-protected{color:#b8afa5;font-size:9px;padding:0 4px;flex-shrink:0}
.layer-scan-safe{color:#3d7050;font-size:11px;padding:0 4px;flex-shrink:0}
.layers-divider{display:flex;align-items:center;gap:8px;margin:4px 0;font-size:9px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.layers-divider::before,.layers-divider::after{content:'';flex:1;height:1px;background:#e4ddd6}

/* ── Element bank ── */
.element-bank{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
.bank-item{border:1px solid #ddd4cc;background:#fff;padding:12px 8px;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:pointer;font-size:10px;color:var(--muted);text-align:center}
.bank-item:hover{border-color:var(--gold);color:var(--ink);background:#fdf8f2}
.bank-icon{color:var(--ink);display:flex}
.color-input{padding:2px 4px;height:34px;cursor:pointer}

/* ── Notice ── */
.notice{position:fixed;right:22px;bottom:22px;background:var(--ink);color:var(--cream);padding:12px 17px;box-shadow:0 10px 28px rgba(0,0,0,.24);z-index:50;display:flex;gap:8px;align-items:center}
.notice i{color:var(--gold)}

/* ── Responsive ── */
@media(max-width:1050px){
  .template-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .editor-shell{grid-template-columns:64px 0px minmax(320px,1fr) 0px}
  .editor-shell.rail-panel-open{grid-template-columns:64px 260px minmax(320px,1fr) 0px}
  .editor-shell.props-open{grid-template-columns:64px 0px minmax(320px,1fr) 260px}
  .editor-shell.rail-panel-open.props-open{grid-template-columns:64px 260px minmax(320px,1fr) 260px}
}
@media(max-width:760px){
  .library-toolbar{display:grid}
  .style-switch{overflow:auto}
  .preview-modal{grid-template-columns:1fr}.preview-modal-art{min-height:260px;padding:28px}.preview-modal-copy{padding:28px}
  .template-grid{grid-template-columns:1fr}
  .studio{--editor-bar-h:104px}
  .studio--embedded.studio--editor{--editor-bar-h:104px}
  .editor-bar,.studio--embedded .editor-bar{height:var(--editor-bar-h);grid-template-columns:auto minmax(0,1fr);grid-template-rows:48px 48px;padding:4px 10px}
  .editor-title{justify-items:end;min-width:0}.editor-title input{width:min(58vw,280px);text-align:right}.editor-title .save-status{display:none}
  .editor-actions{grid-column:1/-1;justify-self:stretch;overflow-x:auto;padding-bottom:3px}.editor-actions .secondary-action{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
  .editor-actions .primary-action{margin-left:auto;white-space:nowrap}
  /* Stacked single column regardless of panel state — repeats the same class combinations as the
     1050px block (not just the bare .editor-shell) because a more specific selector from an
     earlier, still-matching media query (≤1050px is also true at ≤760px) otherwise wins on
     specificity over this block's plain selector, regardless of source order. */
  .editor-shell,
  .editor-shell.rail-panel-open,
  .editor-shell.props-open,
  .editor-shell.rail-panel-open.props-open{
    grid-template-columns:1fr;
    grid-template-rows:auto auto auto auto;
    grid-template-areas:"rail" "canvas" "railpanel" "props";
    height:calc(100% - var(--editor-bar-h));
    overflow-y:auto;
  }
  .rail{flex-direction:row;width:100%;padding:6px;overflow-x:auto}
  .rail-btn{width:auto;min-width:64px;flex-shrink:0;padding:7px 12px}
  .canvas-stage{min-height:360px}
  .canvas-footer{justify-content:flex-end}.preview-caption{display:none}
  .properties-panel{border-left:0;border-top:1px solid #dfd7d0;max-height:60vh}
  .properties-panel--left{border-right:0;border-top:1px solid #dfd7d0}
  .starter-grid{grid-template-columns:1fr}
}
</style>
