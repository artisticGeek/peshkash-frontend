<template>
  <div class="ms-pending" :class="{ 'is-section': section }">
    <i :class="section ? 'bi bi-folder2-open' : 'bi bi-plus-circle'"></i>
    <input
      ref="input"
      v-model="name"
      class="ms-pending-input"
      :placeholder="section ? 'Section name, e.g. Live Counters' : 'Item name, e.g. Dal Makhani'"
      :aria-label="section ? 'New section name' : 'New item name'"
      @keydown.enter.prevent="commit"
      @keydown.esc.prevent="cancel"
      @blur="onBlur"
    />
    <button type="button" class="ms-link" @mousedown.prevent="toggle">{{ section ? 'Make it an item' : 'Make it a section' }}</button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { useStudio } from '../context';

defineProps<{ section: boolean }>();
const studio = useStudio();
const name = ref('');
const input = ref<HTMLInputElement | null>(null);
let done = false;

onMounted(() => nextTick(() => input.value?.focus()));

function commit() {
  if (done) return;
  done = true;
  if (name.value.trim()) void studio.commitNew(name.value);
  else studio.pendingNew.value = null;
}

function cancel() {
  done = true;
  studio.pendingNew.value = null;
}

function onBlur() {
  if (!done) commit();
}

function toggle() {
  const pending = studio.pendingNew.value;
  if (pending) studio.pendingNew.value = { ...pending, section: !pending.section };
  nextTick(() => input.value?.focus());
}
</script>
