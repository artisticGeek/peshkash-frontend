<!--
  Renders one freeform canvas element (shape / CTA badge / text box / image) inside the QR
  Template Studio editor. Used for both the back-layer and front-layer element loops in
  QrTemplatePage.vue — kept as a single component so drag/resize/edit/delete behavior for every
  element kind lives in one place instead of being duplicated per loop.
-->
<template>
  <div class="canvas-el el--dyn"
       :class="{ selected, 'el--dyn-text': el.kind === 'text' }"
       :style="posStyle"
       @pointerdown="onPointerDown"
       @click.stop="$emit('select', el.id)">

    <img v-if="el.kind === 'image'" :src="el.src" class="dyn-image" draggable="false" alt="">

    <div v-else-if="el.kind === 'text'"
         class="dyn-text"
         :data-el-text="el.id"
         :contenteditable="editing"
         spellcheck="false"
         :style="textStyle"
         @dblclick.stop="$emit('start-text-edit', el.id, $event)"
         @blur="$emit('end-text-edit')"
         @keydown.escape="($event.target as HTMLElement).blur()"
         @input="$emit('input-text', el.id, ($event.target as HTMLElement).innerText)"
    >{{ el.text }}</div>

    <div v-else class="dyn-shape" :style="shapeStyle">
      <div v-if="el.kind === 'cta'"
           class="dyn-cta-text"
           :data-el-text="el.id"
           :contenteditable="editing"
           spellcheck="false"
           :style="ctaTextStyle"
           @dblclick.stop="$emit('start-text-edit', el.id, $event)"
           @blur="$emit('end-text-edit')"
           @keydown.escape="($event.target as HTMLElement).blur()"
           @input="$emit('input-text', el.id, ($event.target as HTMLElement).innerText)"
      >{{ el.text }}</div>
    </div>

    <template v-if="selected">
      <div class="sel-ring"></div>
      <div class="resize-handle" @pointerdown.stop="$emit('resize-pointerdown', el.id, $event)" title="Drag to resize"></div>
      <button class="el-delete-btn" @click.stop="$emit('delete', el.id)" title="Delete"><i class="bi bi-trash"></i></button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { clipPathFor, ribbonClipPath } from './elementPresets';
import type { CanvasElement } from './types';

const props = defineProps<{
  el: CanvasElement;
  selected: boolean;
  editing: boolean;
  scale: number;
}>();

const emit = defineEmits<{
  (e: 'pointerdown', id: string, ev: PointerEvent): void;
  (e: 'select', id: string): void;
  (e: 'start-text-edit', id: string, ev: MouseEvent): void;
  (e: 'end-text-edit'): void;
  (e: 'input-text', id: string, value: string): void;
  (e: 'resize-pointerdown', id: string, ev: PointerEvent): void;
  (e: 'delete', id: string): void;
}>();

// The parent owns the actual drag-start logic (it decides whether this is a fixed-slot id or a
// freeform element id) — this just forwards the raw event up, same as the old inline handlers did.
function onPointerDown(ev: PointerEvent): void {
  emit('pointerdown', props.el.id, ev);
}

const posStyle = computed((): Record<string, string> => {
  const { el, scale } = props;
  return { position: 'absolute', left: `${el.x * scale}px`, top: `${el.y * scale}px`, width: `${el.w * scale}px`, height: `${el.h * scale}px` };
});

const shapeStyle = computed((): Record<string, string> => {
  const el = props.el;
  if (el.kind !== 'shape' && el.kind !== 'cta') return {};
  const style: Record<string, string> = { width: '100%', height: '100%', opacity: String(el.opacity ?? 1) };
  if (el.kind === 'shape') {
    if (el.shape === 'frame') {
      const sw = Math.max(1.5, Math.min(el.w, el.h) * 0.025 * props.scale);
      style.background = 'transparent';
      style.border = `${sw}px solid ${el.fill}`;
      style.borderRadius = `${el.radius ?? 0}px`;
      return style;
    }
    style.background = el.fill;
    if (el.shape === 'circle') style.borderRadius = '50%';
    else if (el.shape === 'rect') style.borderRadius = `${el.radius ?? 0}px`;
    else if (el.shape === 'line') style.borderRadius = '999px';
    const clip = clipPathFor(el.shape);
    if (clip) style.clipPath = clip;
  } else {
    style.background = el.fill;
    if (el.style === 'button') style.borderRadius = '999px';
    const clip = el.style === 'tag' ? clipPathFor('tag') : el.style === 'ribbon' ? ribbonClipPath() : undefined;
    if (clip) style.clipPath = clip;
  }
  return style;
});

const ctaTextStyle = computed((): Record<string, string> => {
  const el = props.el;
  if (el.kind !== 'cta') return {};
  const fontSize = Math.max(9, el.h * 0.4 * props.scale);
  return {
    color: el.textColor,
    fontSize: `${fontSize}px`,
    justifyContent: el.style === 'tag' ? 'flex-start' : 'center',
    paddingLeft: el.style === 'tag' ? '14%' : '0',
  };
});

const textStyle = computed((): Record<string, string> => {
  const el = props.el;
  if (el.kind !== 'text') return {};
  return {
    color: el.color,
    fontFamily: el.fontFamily,
    fontSize: `${el.fontSize * props.scale}px`,
    fontWeight: el.fontWeight,
    textAlign: el.align,
    opacity: String(el.opacity ?? 1),
  };
});
</script>

<style scoped>
/* Root node still inherits the parent's .canvas-el / .el--dyn / .selected rules (Vue applies both
   the parent's and this component's scope attribute to a single-root child) — only nested
   elements need their own copies here. */
.canvas-el{position:absolute;box-sizing:border-box}
.el--dyn-text{cursor:grab}
.el--dyn-text:hover:not(.selected){outline:1.5px dashed rgba(189,148,90,.4)}

.dyn-shape{display:flex;align-items:center;overflow:hidden;width:100%;height:100%}
.dyn-cta-text{width:100%;height:100%;display:flex;align-items:center;font-weight:700;letter-spacing:.02em;font-family:Urbanist,Arial,sans-serif;white-space:nowrap;overflow:hidden;outline:none;cursor:grab}
.dyn-cta-text[contenteditable="true"]{cursor:text}

.dyn-text{width:100%;height:100%;white-space:pre-wrap;overflow:hidden;outline:none;cursor:grab;word-break:break-word}
.dyn-text[contenteditable="true"]{cursor:text;outline:2px solid rgba(189,148,90,.35);outline-offset:1px}

.dyn-image{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none;user-select:none}

.sel-ring{display:block;position:absolute;inset:-3px;border:2px solid var(--gold, #bd945a);pointer-events:none}
.resize-handle{position:absolute;right:-5px;bottom:-5px;width:14px;height:14px;background:var(--gold, #bd945a);cursor:nwse-resize;border-radius:2px;z-index:2}
.el-delete-btn{position:absolute;top:-26px;left:0;border:1px solid #a44c41;background:rgba(26,20,16,.75);color:#e8887c;font-size:10px;padding:3px 7px;cursor:pointer;display:flex;align-items:center;gap:4px}
.el-delete-btn:hover{background:#a44c41;color:#fff}
</style>
