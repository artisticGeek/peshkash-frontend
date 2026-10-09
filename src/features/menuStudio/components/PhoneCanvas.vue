<template>
  <div class="ms-stage" @click.self="studio.selection.value = { kind: 'menu' }">
    <div class="ms-device" :class="`is-${device}`">
      <div class="ms-device-screen">
        <header
          class="ms-menu-head"
          :class="{ 'is-selected': studio.selection.value.kind === 'menu' }"
          role="button"
          tabindex="0"
          title="Menu settings"
          @click="studio.selection.value = { kind: 'menu' }"
          @keydown.enter.prevent="studio.selection.value = { kind: 'menu' }"
        >
          <small v-if="eventLabel">{{ eventLabel }}</small>
          <h2>{{ menu.displayName || 'Untitled menu' }}</h2>
          <p v-if="menu.description">{{ menu.description }}</p>
        </header>

        <div v-if="studio.loading.value" class="ms-canvas-loading">Loading menu…</div>
        <div v-else class="ms-canvas-body" @dragover.prevent>
          <template v-for="(node, index) in studio.tree.value" :key="node.item.id">
            <PendingRow v-if="pendingAt(index)" :section="studio.pendingNew.value!.section" />
            <InsertZone :target="{ parentId: null, index }" :section="true" />
            <CanvasNode :node="node" :elaborate="menu.elaborateDescriptions" />
          </template>
          <PendingRow v-if="pendingAt(studio.tree.value.length)" :section="studio.pendingNew.value!.section" />

          <div v-if="!studio.tree.value.length && !pendingAt(0)" class="ms-canvas-empty">
            <i class="bi bi-journal-plus"></i>
            <b>This menu is empty</b>
            <span>Start with a section like “Starters”, or drag items from the bank on the left.</span>
          </div>

          <div
            class="ms-root-drop"
            :class="{ 'is-over': overRoot }"
            @dragover.prevent="overRoot = Boolean(studio.drag.value)"
            @dragleave="overRoot = false"
            @drop.prevent="dropAtEnd"
          >
            <button type="button" class="ms-btn sm" @click="studio.startNew(true, endTarget)"><i class="bi bi-folder-plus"></i> Add section</button>
            <button type="button" class="ms-btn sm" @click="studio.startNew(false, endTarget)"><i class="bi bi-plus-lg"></i> Add item</button>
            <span>{{ overRoot ? 'Drop to add at the end' : 'or drop here' }}</span>
          </div>
        </div>

        <footer class="ms-dock" title="Buttons guests see on an item page">
          <span v-for="cta in dockCtas" :key="cta.label" class="ms-dock-cta"><i :class="['bi', cta.icon]"></i>{{ cta.label }}</span>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStudio } from '../context';
import { BUILT_IN_CTAS, customCtaIcon, effectiveCtas } from '../cta';
import type { DropTarget, StudioMenu } from '../types';
import CanvasNode from './CanvasNode.vue';
import InsertZone from './InsertZone.vue';
import PendingRow from './PendingRow.vue';

const props = defineProps<{ menu: StudioMenu; device: 'phone' | 'tablet'; eventLabel?: string }>();
const studio = useStudio();
const overRoot = ref(false);

const endTarget = computed<DropTarget>(() => ({ parentId: null, index: studio.tree.value.length }));

const dockCtas = computed(() => {
  const config = effectiveCtas(props.menu.ctaConfig, studio.selectedItem.value?.ctaConfig);
  return [
    ...BUILT_IN_CTAS.filter((cta) => config[cta.key]).map((cta) => ({ label: cta.label, icon: cta.icon })),
    ...config.custom.map((cta) => ({ label: cta.label, icon: customCtaIcon(cta.kind) })),
  ];
});

function pendingAt(index: number): boolean {
  const pending = studio.pendingNew.value;
  return Boolean(pending && pending.target.parentId === null && pending.target.index === index);
}

function dropAtEnd() {
  overRoot.value = false;
  void studio.drop(endTarget.value);
}
</script>
