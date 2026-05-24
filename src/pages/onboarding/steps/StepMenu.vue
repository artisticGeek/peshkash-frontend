<template>
  <div class="step-menu">
    <h5 class="step-title">Select or Create a Menu</h5>

    <!-- Existing menus -->
    <div v-if="state.menus.length" class="mb-4">
      <p class="text-muted small mb-2">Your existing menus</p>
      <div
        v-for="menu in state.menus"
        :key="menu.id"
        class="menu-card"
        :class="{ selected: state.selectedMenuId === menu.id }"
        @click="select(menu.id)"
      >
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">{{ menu.displayName }}</div>
            <div class="text-muted small">{{ menu.name }}</div>
            <div v-if="menu.description" class="text-muted small mt-1">{{ menu.description }}</div>
          </div>
          <i v-if="state.selectedMenuId === menu.id" class="bi bi-check-circle-fill text-success fs-5"></i>
        </div>
      </div>
    </div>

    <!-- Create new menu -->
    <div class="create-card">
      <div class="d-flex align-items-center gap-2 mb-3 create-header" @click="showForm = !showForm">
        <i class="bi bi-plus-circle"></i>
        <span class="fw-semibold">Create New Menu</span>
        <i class="bi ms-auto" :class="showForm ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
      </div>

      <form v-if="showForm" @submit.prevent="submit">
        <div class="mb-3">
          <label class="form-label small fw-semibold">Menu Name <span class="text-muted">(URL-safe identifier)</span></label>
          <input v-model="form.name" type="text" class="form-control" placeholder="e.g. wedding-menu-2025" required />
        </div>
        <div class="mb-3">
          <label class="form-label small fw-semibold">Display Name</label>
          <input v-model="form.displayName" type="text" class="form-control" placeholder="e.g. Wedding Dinner Menu" required />
        </div>
        <div class="mb-3">
          <label class="form-label small fw-semibold">Description <span class="text-muted">(optional)</span></label>
          <textarea v-model="form.description" class="form-control" rows="2" placeholder="A short description shown to guests"></textarea>
        </div>
        <button type="submit" class="btn btn-primary w-100" :disabled="state.loading">
          <span v-if="state.loading" class="spinner-border spinner-border-sm me-2"></span>
          Create Menu
        </button>
        <p v-if="state.error" class="text-danger small mt-2">{{ state.error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOnboarding } from '../../../composables/useOnboarding';

const props = defineProps<{ vendorName: string }>();
const emit = defineEmits<{ (e: 'selected', menuId: number): void }>();

const { state, fetchMenus, createMenu } = useOnboarding(props.vendorName);
const showForm = ref(false);
const form = ref({ name: '', displayName: '', description: '' });

onMounted(fetchMenus);

function select(menuId: number) {
  (state as any).selectedMenuId = menuId;
  emit('selected', menuId);
}

async function submit() {
  const menu = await createMenu({ ...form.value });
  showForm.value = false;
  form.value = { name: '', displayName: '', description: '' };
  select(menu.id);
}
</script>

<style scoped>
.step-title { font-weight: 700; margin-bottom: 1.25rem; }

.menu-card {
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.menu-card:hover { border-color: #6366f1; }
.menu-card.selected { border-color: #6366f1; background: #f5f3ff; }

.create-card {
  border: 2px dashed #d1d5db;
  border-radius: 10px;
  padding: 1rem;
}
.create-header { cursor: pointer; user-select: none; }
</style>
