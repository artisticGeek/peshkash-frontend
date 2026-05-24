<template>
  <div class="workspace-switcher">
    <span>Workspace</span>
    <select :value="modelValue" class="form-select form-select-sm" @change="$emit('update:modelValue', Number(($event.target as HTMLSelectElement).value))">
      <option :value="0">Select vendor</option>
      <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
        {{ vendor.displayName }}
      </option>
    </select>
    <a v-if="selectedVendor?.hasContactPage" class="card-link" :href="vendorUrl" target="_blank" rel="noreferrer" title="Open vendor card" aria-label="Open vendor card">
      <i class="bi bi-box-arrow-up-right"></i>
    </a>
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
  background: #fffcf7;
  border: 1px solid #e8dccb;
  border-radius: 6px;
  box-shadow: 0 8px 22px rgba(42, 34, 24, 0.05);
  display: flex;
  gap: 10px;
  padding: 7px 8px 7px 12px;
}

.workspace-switcher span {
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.workspace-switcher select {
  border: 0;
  background: transparent;
  min-width: 190px;
}

.card-link {
  align-items: center;
  border: 1px solid #d8bd8f;
  border-radius: 5px;
  color: #7a542a;
  display: inline-flex;
  height: 30px;
  justify-content: center;
  text-decoration: none;
  width: 30px;
}

.card-link:hover {
  background: #f7efe3;
  color: #15191e;
}

@media (max-width: 900px) {
  .workspace-switcher {
    align-items: stretch;
    border-radius: 8px;
    flex-direction: column;
  }
}
</style>
