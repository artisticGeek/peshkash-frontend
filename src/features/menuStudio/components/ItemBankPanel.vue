<template>
  <aside class="ms-panel ms-bank" aria-label="Item bank">
    <div class="ms-seg" role="tablist">
      <button v-for="t in tabs" :key="t.key" type="button" role="tab" :aria-selected="tab === t.key" :class="{ on: tab === t.key }" @click="tab = t.key">
        {{ t.label }}
      </button>
    </div>

    <template v-if="tab === 'items'">
      <div class="ms-search">
        <i class="bi bi-search"></i>
        <input id="ms-bank-search" v-model="query" placeholder="Search items, tags, price" aria-label="Search the item bank" />
      </div>
      <label class="ms-check">
        <input id="ms-bank-hide-used" v-model="hideUsed" type="checkbox" />
        Hide items already in this menu
      </label>
      <p class="ms-hint">{{ visibleEntries.length }} of {{ studio.bank.value.length }} items. Drag onto the phone, or press + to add {{ addHint }}.</p>
      <ul class="ms-bank-list">
        <li
          v-for="entry in visibleEntries"
          :key="entry.key"
          class="ms-bank-item"
          :class="{ used: entry.inCurrentMenu }"
          draggable="true"
          @dragstart="startDrag($event, { kind: 'bank', key: entry.key }, entry.item.displayName)"
          @dragend="studio.drag.value = null"
        >
          <span class="ms-bank-thumb" :style="entry.item.image ? { backgroundImage: `url(${JSON.stringify(entry.item.image)})` } : undefined">
            <template v-if="!entry.item.image">{{ initial(entry.item.displayName) }}</template>
          </span>
          <span class="ms-bank-text">
            <b>{{ entry.item.displayName }}</b>
            <small>
              <template v-if="entry.item.price">{{ entry.item.price }} · </template>{{ usage(entry.menuIds.length) }}
            </small>
            <span v-if="entry.inCurrentMenu" class="ms-in-menu"><i class="bi bi-check2"></i> In this menu</span>
          </span>
          <span v-if="entry.item.isVeg !== null && entry.item.isVeg !== undefined" class="ms-veg" :class="{ nv: entry.item.isVeg === false }"></span>
          <button type="button" class="ms-icon-btn" :title="`Add ${entry.item.displayName} ${addHint}`" @click="studio.addFromBank(entry.key, quickTarget)">
            <i class="bi bi-plus-lg"></i>
          </button>
        </li>
      </ul>
      <p v-if="!visibleEntries.length" class="ms-empty">
        {{ query ? 'No items match your search.' : 'Every item from your other menus is already here. Use the Create tab to add new ones.' }}
      </p>
    </template>

    <template v-else-if="tab === 'sections'">
      <p class="ms-hint">Reuse a whole section from another menu, with everything inside it.</p>
      <ul class="ms-bank-list">
        <li
          v-for="template in studio.templates.value"
          :key="template.item.id"
          class="ms-bank-item"
          draggable="true"
          @dragstart="startDrag($event, { kind: 'template', id: template.item.id }, template.item.displayName)"
          @dragend="studio.drag.value = null"
        >
          <span class="ms-bank-thumb"><i class="bi bi-folder2-open"></i></span>
          <span class="ms-bank-text">
            <b>{{ template.item.displayName }}</b>
            <small>{{ template.itemCount }} items · from {{ template.menuDisplayName }}</small>
          </span>
          <button type="button" class="ms-icon-btn" :title="`Add ${template.item.displayName} ${addHint}`" @click="studio.addTemplate(template.item.id, quickTarget)">
            <i class="bi bi-plus-lg"></i>
          </button>
        </li>
      </ul>
      <p v-if="!studio.templates.value.length" class="ms-empty">Your other menus don't have sections yet.</p>
    </template>

    <template v-else>
      <p class="ms-hint">Drag a block onto the phone, or click to add it {{ addHint }}.</p>
      <div class="ms-blocks">
        <button
          type="button"
          class="ms-block"
          draggable="true"
          @dragstart="startDrag($event, { kind: 'new', section: true }, 'New section')"
          @dragend="studio.drag.value = null"
          @click="studio.startNew(true, quickTarget)"
        >
          <i class="bi bi-folder-plus"></i>
          <b>Section</b>
          <small>Starters, Live counters, Gallery rooms… Sections can hold sub-sections at any depth.</small>
        </button>
        <button
          type="button"
          class="ms-block"
          draggable="true"
          @dragstart="startDrag($event, { kind: 'new', section: false }, 'New item')"
          @dragend="studio.drag.value = null"
          @click="studio.startNew(false, quickTarget)"
        >
          <i class="bi bi-card-text"></i>
          <b>Item</b>
          <small>A dish, product, artwork or service. It joins your item bank for other menus too.</small>
        </button>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useStudio } from '../context';
import { matchesSearch } from '../bank';
import { childrenOf } from '../tree';
import type { DragPayload, DropTarget } from '../types';

const studio = useStudio();
const tabs = [
  { key: 'items', label: 'Item bank' },
  { key: 'sections', label: 'Sections' },
  { key: 'create', label: 'Create' },
] as const;
const tab = ref<(typeof tabs)[number]['key']>('items');
const query = ref('');
const hideUsed = ref(false);

const visibleEntries = computed(() =>
  studio.bank.value.filter((entry) => (!hideUsed.value || !entry.inCurrentMenu) && matchesSearch(entry.item, query.value)));

/** Where "+" adds: inside the selected section, after the selected item, else at the end of the menu. */
const quickTarget = computed<DropTarget>(() => {
  const selected = studio.selectedItem.value;
  const node = selected ? findNode(selected.id) : null;
  if (selected && node?.section) return { parentId: selected.id, index: node.children.length };
  if (selected) {
    const parentId = selected.parentId || null;
    const index = childrenOf(studio.items.value, parentId).findIndex((item) => item.id === selected.id) + 1;
    return { parentId, index };
  }
  return { parentId: null, index: studio.tree.value.length };
});

const addHint = computed(() => {
  const selected = studio.selectedItem.value;
  if (!selected) return 'to the end of the menu';
  return findNode(selected.id)?.section ? `into ${selected.displayName}` : `after ${selected.displayName}`;
});

function findNode(id: number) {
  const stack = [...studio.tree.value];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.item.id === id) return node;
    stack.push(...node.children);
  }
  return null;
}

function startDrag(event: DragEvent, payload: DragPayload, label: string) {
  studio.drag.value = payload;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('text/plain', label);
  }
}

function initial(name: string) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

function usage(otherMenus: number) {
  return otherMenus === 0 ? 'Only in this menu' : `Used in ${otherMenus} other menu${otherMenus === 1 ? '' : 's'}`;
}
</script>
