<template>
  <div class="workspace-switcher" @keydown.escape="open = false">
    <button class="workspace-trigger" type="button" @click="open = !open">
      <span>Workspace</span>
      <strong>{{ selectedVendor?.displayName || 'Select vendor' }}</strong>
      <i class="bi bi-chevron-down"></i>
    </button>
    <div v-if="open" class="workspace-menu">
      <button
        v-for="vendor in vendors"
        :key="vendor.id"
        type="button"
        :class="{ active: vendor.id === modelValue }"
        @click="selectVendor(vendor.id)"
      >
        <span>{{ vendor.displayName }}</span>
        <i v-if="vendor.id === modelValue" class="bi bi-check2"></i>
      </button>
    </div>
    <a v-if="selectedVendor?.hasContactPage" class="card-link" :href="vendorUrl" target="_blank" rel="noreferrer" title="Open vendor card" aria-label="Open vendor card">
      <i class="bi bi-box-arrow-up-right"></i>
    </a>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

type VendorOption = { id: number; name: string; displayName: string; hasContactPage: boolean };

const props = defineProps<{
  modelValue: number;
  vendors: VendorOption[];
  selectedVendor?: VendorOption;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: number): void;
}>();

const vendorUrl = computed(() => props.selectedVendor ? `${window.location.origin}/vendor/${props.selectedVendor.name}` : '');
const open = ref(false);

function selectVendor(id: number) {
  emit('update:modelValue', id);
  open.value = false;
}
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
  position: relative;
}

.workspace-trigger {
  align-items: center;
  background: transparent;
  border: 0;
  color: #2f2a24;
  display: grid;
  gap: 2px 10px;
  grid-template-columns: 1fr auto;
  min-width: 230px;
  padding: 0;
  text-align: left;
}

.workspace-trigger span {
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.workspace-trigger strong {
  font-size: 0.96rem;
  font-weight: 700;
  grid-column: 1;
}

.workspace-trigger i {
  color: #8b5527;
  grid-column: 2;
  grid-row: 1 / span 2;
}

.workspace-menu {
  background: #fffcf7;
  border: 1px solid #d8bd8f;
  border-radius: 6px;
  box-shadow: 0 18px 44px rgba(42, 34, 24, 0.16);
  display: grid;
  gap: 2px;
  left: 0;
  min-width: 280px;
  padding: 6px;
  position: absolute;
  top: calc(100% + 8px);
  z-index: 70;
}

.workspace-menu button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: #2f2a24;
  display: flex;
  justify-content: space-between;
  padding: 9px 10px;
  text-align: left;
}

.workspace-menu button:hover,
.workspace-menu button.active {
  background: #f7efe3;
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
