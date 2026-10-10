<template>
  <!-- Section -->
  <div v-if="node.section" class="ms-sec" :class="[`depth-${Math.min(node.depth, 3)}`, { 'is-hidden': !node.item.isActive }]">
    <div
      class="ms-sec-head"
      :class="{ 'is-selected': selected, 'is-over': overHead }"
      draggable="true"
      tabindex="0"
      role="button"
      :aria-label="`Section ${node.item.displayName}`"
      @click="select"
      @keydown.enter.prevent="select"
      @dragstart.stop="onDragStart"
      @dragend="studio.drag.value = null"
      @dragover.prevent.stop="onOverHead"
      @dragleave="overHead = false"
      @drop.prevent.stop="onDropHead"
    >
      <button class="ms-chev" type="button" :aria-label="collapsed ? 'Expand section' : 'Collapse section'" @click.stop="studio.toggleCollapsed(node.item.id)">
        <i :class="collapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-down'"></i>
      </button>
      <span class="ms-sec-name">{{ node.item.displayName }}</span>
      <span v-if="!node.item.isActive" class="ms-chip">Hidden</span>
      <span class="ms-count">{{ leafCount }}</span>
      <span class="ms-row-actions" @click.stop>
        <button type="button" title="Add an item to this section" @click="studio.startNew(false, endTarget)"><i class="bi bi-plus-lg"></i></button>
        <button type="button" title="Add a sub-section" @click="studio.startNew(true, endTarget)"><i class="bi bi-folder-plus"></i></button>
        <button type="button" :title="node.item.isActive ? 'Hide from guests' : 'Show to guests'" @click="toggleVisible"><i :class="node.item.isActive ? 'bi bi-eye' : 'bi bi-eye-slash'"></i></button>
        <button type="button" class="danger" title="Remove from menu" @click="askRemove"><i class="bi bi-trash3"></i></button>
      </span>
    </div>
    <div v-if="confirming" class="ms-confirm" @click.stop>
      <span>Remove <b>{{ node.item.displayName }}</b> and the {{ leafCount }} item{{ leafCount === 1 ? '' : 's' }} inside it from this menu?</span>
      <button type="button" class="ms-btn danger sm" @click="studio.remove(node.item.id)">Remove</button>
      <button type="button" class="ms-btn sm" @click="confirming = false">Keep</button>
    </div>
    <p v-if="node.item.description && !collapsed" class="ms-sec-desc">{{ node.item.description }}</p>
    <div v-if="!collapsed" class="ms-sec-body">
      <template v-for="(child, index) in node.children" :key="child.item.id">
        <PendingRow v-if="pendingAt(index)" :section="studio.pendingNew.value!.section" />
        <InsertZone :target="{ parentId: node.item.id, index }" />
        <CanvasNode :node="child" :elaborate="elaborate" />
      </template>
      <PendingRow v-if="pendingAt(node.children.length)" :section="studio.pendingNew.value!.section" />
      <InsertZone :target="endTarget" />
      <p v-if="!node.children.length && !pendingAt(0)" class="ms-empty-sec">Empty section. Drag items here or click + above.</p>
    </div>
  </div>

  <!-- Item -->
  <div
    v-else
    class="ms-item"
    :class="{ 'is-selected': selected, 'is-hidden': !node.item.isActive, elaborate }"
    draggable="true"
    tabindex="0"
    role="button"
    :aria-label="`Item ${node.item.displayName}`"
    @click="select"
    @keydown.enter.prevent="select"
    @dragstart.stop="onDragStart"
    @dragend="studio.drag.value = null"
  >
    <span v-if="node.item.image" class="ms-thumb" :style="{ backgroundImage: `url(${JSON.stringify(node.item.image)})` }"></span>
    <span v-if="node.item.isVeg !== null && node.item.isVeg !== undefined" class="ms-veg" :class="{ nv: node.item.isVeg === false }" :title="node.item.isVeg ? 'Vegetarian' : 'Non-vegetarian'"></span>
    <span class="ms-item-text">
      <span class="ms-item-name">
        {{ node.item.displayName }}
        <span v-if="node.item.enumType" class="ms-badge">{{ node.item.enumType }}</span>
        <span v-if="!node.item.isActive" class="ms-chip">Hidden</span>
      </span>
      <small v-if="node.item.description">{{ node.item.description }}</small>
    </span>
    <span v-if="node.item.price" class="ms-price">{{ node.item.price }}</span>
    <span class="ms-row-actions" @click.stop>
      <button type="button" title="Duplicate" @click="studio.duplicate(node.item.id)"><i class="bi bi-copy"></i></button>
      <button type="button" :title="node.item.isActive ? 'Hide from guests' : 'Show to guests'" @click="toggleVisible"><i :class="node.item.isActive ? 'bi bi-eye' : 'bi bi-eye-slash'"></i></button>
      <button type="button" class="danger" title="Remove from menu" @click="studio.remove(node.item.id)"><i class="bi bi-trash3"></i></button>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStudio } from '../context';
import { countLeaves } from '../tree';
import type { DropTarget, TreeNode } from '../types';
import InsertZone from './InsertZone.vue';
import PendingRow from './PendingRow.vue';

defineOptions({ name: 'CanvasNode' });
const props = defineProps<{ node: TreeNode; elaborate?: boolean }>();
const studio = useStudio();
const overHead = ref(false);
const confirming = ref(false);

const selected = computed(() => studio.selection.value.kind === 'item' && studio.selection.value.id === props.node.item.id);
const collapsed = computed(() => studio.collapsed.has(props.node.item.id));
const leafCount = computed(() => countLeaves(props.node));
const endTarget = computed<DropTarget>(() => ({ parentId: props.node.item.id, index: props.node.children.length }));

function pendingAt(index: number): boolean {
  const pending = studio.pendingNew.value;
  return Boolean(pending && pending.target.parentId === props.node.item.id && pending.target.index === index);
}

function select() {
  studio.selection.value = { kind: 'item', id: props.node.item.id };
}

function onDragStart(event: DragEvent) {
  studio.drag.value = { kind: 'node', id: props.node.item.id };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('text/plain', props.node.item.displayName);
  }
}

// Dropping on a section header puts the item at the end of that section.
function onOverHead() {
  const payload = studio.drag.value;
  if (!payload || (payload.kind === 'node' && payload.id === props.node.item.id)) return;
  overHead.value = true;
}

function onDropHead() {
  overHead.value = false;
  if (collapsed.value) studio.toggleCollapsed(props.node.item.id);
  void studio.drop(endTarget.value);
}

function toggleVisible() {
  studio.updateItem(props.node.item.id, { isActive: !props.node.item.isActive });
}

function askRemove() {
  if (leafCount.value === 0 && !props.node.children.length) void studio.remove(props.node.item.id);
  else confirming.value = true;
}
</script>
