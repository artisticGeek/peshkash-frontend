<template>
  <div class="step-items">
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="step-title mb-0">Build Your Menu Items</h5>
      <button class="btn btn-sm btn-primary" @click="openForm()">
        <i class="bi bi-plus-lg me-1"></i> Add Item
      </button>
    </div>

    <!-- Item list -->
    <div v-if="state.items.length === 0" class="empty-state text-center py-4 text-muted">
      <i class="bi bi-card-list fs-2 d-block mb-2"></i>
      No items yet. Click "Add Item" to start building.
    </div>

    <div v-for="item in sortedItems" :key="item.id" class="item-row" :style="{ paddingLeft: indentFor(item) }">
      <div class="item-inner">
        <span class="enum-dot" :class="item.enumType"></span>
        <div class="item-info">
          <span class="item-name">{{ item.displayName || item.name }}</span>
          <span class="item-type-badge" :class="item.type">{{ item.type }}</span>
        </div>
        <div class="item-actions ms-auto">
          <button class="btn btn-xs btn-outline-secondary me-1" @click="openForm(item)">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-xs btn-outline-danger" @click="remove(item.id)">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Slide-in form panel -->
    <div v-if="formVisible" class="form-panel">
      <div class="form-panel-header">
        <span class="fw-semibold">{{ editing ? 'Edit Item' : 'New Item' }}</span>
        <button class="btn-close" @click="closeForm"></button>
      </div>

      <form @submit.prevent="saveItem">
        <div class="row g-3">
          <div class="col-12">
            <label class="form-label small fw-semibold">Type</label>
            <div class="btn-group w-100">
              <button type="button" class="btn btn-sm" :class="form.type === 'category' ? 'btn-primary' : 'btn-outline-secondary'" @click="form.type = 'category'">Category</button>
              <button type="button" class="btn btn-sm" :class="form.type === 'dish' ? 'btn-primary' : 'btn-outline-secondary'" @click="form.type = 'dish'">Dish</button>
            </div>
          </div>

          <div class="col-12">
            <label class="form-label small fw-semibold">Name <span class="text-muted">(URL identifier)</span></label>
            <input v-model="form.name" type="text" class="form-control form-control-sm" placeholder="e.g. paneer-tikka" required :disabled="!!editing" />
          </div>

          <div class="col-12">
            <label class="form-label small fw-semibold">Display Name</label>
            <input v-model="form.displayName" type="text" class="form-control form-control-sm" placeholder="e.g. Paneer Tikka" />
          </div>

          <div class="col-12">
            <label class="form-label small fw-semibold">Parent (for nesting)</label>
            <select v-model="form.parentId" class="form-select form-select-sm">
              <option :value="undefined">None (top-level)</option>
              <option v-for="p in parentOptions" :key="p.id" :value="p.id">{{ p.displayName || p.name }}</option>
            </select>
          </div>

          <template v-if="form.type === 'dish'">
            <div class="col-12">
              <label class="form-label small fw-semibold">Dietary Type</label>
              <div class="btn-group w-100">
                <button v-for="opt in enumOptions" :key="opt.value" type="button" class="btn btn-sm"
                  :class="form.enumType === opt.value ? 'btn-success' : 'btn-outline-secondary'"
                  @click="form.enumType = opt.value as any">{{ opt.label }}</button>
              </div>
            </div>

            <div class="col-12">
              <label class="form-label small fw-semibold">Description</label>
              <textarea v-model="form.description" class="form-control form-control-sm" rows="2"></textarea>
            </div>

            <div class="col-12">
              <label class="form-label small fw-semibold">Ingredients <span class="text-muted">(comma-separated)</span></label>
              <input v-model="form.ingredients" type="text" class="form-control form-control-sm" placeholder="Paneer, Onion, Capsicum" />
            </div>

            <div class="col-12">
              <label class="form-label small fw-semibold">Image</label>
              <div class="input-group input-group-sm mb-1">
                <input v-model="form.image" type="url" class="form-control" placeholder="Paste image URL" />
              </div>
              <div class="text-muted small mb-1 text-center">— or —</div>
              <input type="file" class="form-control form-control-sm" accept="image/*" @change="handleFileUpload" />
              <div v-if="uploadingImage" class="text-muted small mt-1">
                <span class="spinner-border spinner-border-sm me-1"></span> Uploading...
              </div>
              <img v-if="form.image" :src="form.image" class="img-preview mt-2" alt="preview" />
            </div>
          </template>

          <div class="col-12">
            <button type="submit" class="btn btn-primary btn-sm w-100" :disabled="state.loading || uploadingImage">
              <span v-if="state.loading" class="spinner-border spinner-border-sm me-1"></span>
              {{ editing ? 'Save Changes' : 'Add Item' }}
            </button>
            <p v-if="state.error" class="text-danger small mt-2">{{ state.error }}</p>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useOnboarding, type FlatLineItem, type CreateLineItemPayload } from '../../../composables/useOnboarding';

const props = defineProps<{ vendorName: string; menuId: number }>();
const { state, clearItems, createItems, updateItem, deleteItems, uploadImage } = useOnboarding(props.vendorName);

const formVisible = ref(false);
const editing = ref<FlatLineItem | null>(null);
const uploadingImage = ref(false);

const emptyForm = (): CreateLineItemPayload => ({
  name: '',
  displayName: '',
  description: '',
  ingredients: '',
  image: '',
  type: 'dish',
  enumType: undefined,
  parentId: undefined,
});
const form = ref<CreateLineItemPayload & { image?: string }>(emptyForm());

const enumOptions = [
  { label: 'Veg', value: 'veg' },
  { label: 'Non-Veg', value: 'non-veg' },
  { label: 'Egg', value: 'egg' },
];

onMounted(() => clearItems());

const sortedItems = computed(() => {
  const byId = new Map(state.items.map(i => [i.id, i]));
  const result: FlatLineItem[] = [];
  const visited = new Set<number>();

  function addWithChildren(item: FlatLineItem) {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    result.push(item);
    state.items.filter(c => c.parentId === item.id).forEach(addWithChildren);
  }

  state.items.filter(i => !i.parentId).forEach(addWithChildren);
  return result;
});

function indentFor(item: FlatLineItem): string {
  let depth = 0;
  let current = item;
  const byId = new Map(state.items.map(i => [i.id, i]));
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    depth++;
    current = parent;
  }
  return `${depth * 20}px`;
}

const parentOptions = computed(() =>
  state.items.filter(i => i.type === 'category')
);

function openForm(item?: FlatLineItem) {
  editing.value = item ?? null;
  form.value = item
    ? { name: item.name, displayName: item.displayName, description: item.description, ingredients: item.ingredients, image: item.image, type: (item.type as any) ?? 'dish', enumType: item.enumType as any, parentId: item.parentId }
    : emptyForm();
  formVisible.value = true;
}

function closeForm() {
  formVisible.value = false;
  editing.value = null;
}

async function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploadingImage.value = true;
  try {
    form.value.image = await uploadImage(file);
  } finally {
    uploadingImage.value = false;
  }
}

async function saveItem() {
  if (editing.value) {
    await updateItem(props.menuId, editing.value.id, { ...form.value });
  } else {
    await createItems(props.menuId, [{ ...form.value }]);
  }
  closeForm();
}

async function remove(itemId: number) {
  if (confirm('Delete this item?')) {
    await deleteItems(props.menuId, [itemId]);
  }
}
</script>

<style scoped>
.step-title { font-weight: 700; }

.empty-state { border: 2px dashed #e5e7eb; border-radius: 10px; }

.item-row { padding-top: 0; }
.item-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #f3f4f6;
}

.enum-dot {
  width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0;
  &.veg { background: #22c55e; }
  &.non-veg { background: #ef4444; }
  &.egg { background: #f97316; }
}

.item-type-badge {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 6px;
  &.category { background: #e0e7ff; color: #4338ca; }
  &.dish { background: #fef3c7; color: #92400e; }
}

.btn-xs { padding: 2px 6px; font-size: 0.75rem; }

.form-panel {
  margin-top: 1.25rem;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
  background: #fafafa;
}
.form-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.img-preview {
  max-height: 120px;
  border-radius: 8px;
  object-fit: cover;
  width: 100%;
}
</style>
