<template>
  <div class="reference-list">
    <div v-for="routeItem in routes" :key="routeItem.label" class="reference-row">
      <span>{{ routeItem.label }}</span>
      <code>{{ routeItem.url }}</code>
      <button class="btn btn-outline-secondary btn-sm" type="button" @click="$emit('copy', routeItem.url)">Copy</button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  routes: { label: string; url: string }[];
}>();

defineEmits<{
  (event: 'copy', url: string): void;
}>();
</script>

<style scoped>
.reference-list {
  display: grid;
  gap: 8px;
}

.reference-row {
  align-items: center;
  background: #fbfaf8;
  border: 1px solid #ece4d8;
  border-radius: 8px;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(120px, 0.35fr) minmax(0, 1fr) auto;
  padding: 10px;
}

.reference-row span {
  color: #6b7280;
  font-size: 0.76rem;
  font-weight: 900;
  text-transform: uppercase;
}

.reference-row code {
  color: #853f19;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .reference-row {
    grid-template-columns: 1fr;
  }
}
</style>
