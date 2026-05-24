<template>
  <div class="workspace-switcher">
    <span>Workspace</span>
    <select :value="modelValue" class="form-select form-select-sm" @change="$emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))">
      <option :value="0">Select vendor</option>
      <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
        {{ vendor.displayName }}
      </option>
    </select>
    <a v-if="selectedVendor?.hasContactPage" :href="vendorUrl" target="_blank" rel="noreferrer">Open card</a>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type VendorOption = { id: number; name: string; displayName: string; hasContactPage: boolean };

const props = defineProps<{
  modelValue: number;
  vendors: VendorOption[];
  selectedVendor?: VendorOption;
}>();

defineEmits<{
  (event: 'update:modelValue', value: number): void;
}>();

const vendorUrl = computed(() => props.selectedVendor ? `${window.location.origin}/vendor/${props.selectedVendor.name}` : '');
</script>

<style scoped>
.workspace-switcher {
  align-items: center;
  background: #fff;
  border: 1px solid #e6dfd4;
  border-radius: 999px;
  display: flex;
  gap: 10px;
  padding: 6px 8px 6px 12px;
}

.workspace-switcher span {
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.workspace-switcher select {
  border: 0;
  min-width: 190px;
}

.workspace-switcher a {
  text-decoration: none;
}

@media (max-width: 900px) {
  .workspace-switcher {
    align-items: stretch;
    border-radius: 8px;
    flex-direction: column;
  }
}
</style>
