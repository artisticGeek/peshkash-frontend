<template>
  <div
    class="ms-insert"
    :class="{ 'is-over': over, 'is-dragging': Boolean(studio.drag.value) }"
    role="button"
    tabindex="0"
    :aria-label="section ? 'Add a section here' : 'Add an item here'"
    @dragover.prevent="onOver"
    @dragleave="over = false"
    @drop.prevent.stop="onDrop"
    @click="studio.startNew(Boolean(section), target)"
    @keydown.enter.prevent="studio.startNew(Boolean(section), target)"
  >
    <span class="ms-insert-line"></span>
    <span class="ms-insert-label">{{ over ? 'Drop here' : section ? '+ Section' : '+ Add here' }}</span>
    <span class="ms-insert-line"></span>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useStudio } from '../context';
import type { DropTarget } from '../types';

const props = defineProps<{ target: DropTarget; section?: boolean }>();
const studio = useStudio();
const over = ref(false);

function onOver(event: DragEvent) {
  if (!studio.drag.value) return;
  over.value = true;
  if (event.dataTransfer) event.dataTransfer.dropEffect = studio.drag.value.kind === 'node' ? 'move' : 'copy';
}

function onDrop() {
  over.value = false;
  void studio.drop(props.target);
}
</script>
