<template>
  <aside class="ms-panel ms-props" aria-label="Properties">
    <!-- Item or section -->
    <template v-if="item">
      <div class="ms-props-head">
        <span class="ms-crumbs">
          <button type="button" class="ms-link" @click="studio.selection.value = { kind: 'menu' }">{{ menu.displayName }}</button>
          <template v-for="parent in path" :key="parent.id">
            <i class="bi bi-chevron-right"></i>
            <button type="button" class="ms-link" @click="studio.selection.value = { kind: 'item', id: parent.id }">{{ parent.displayName }}</button>
          </template>
        </span>
        <h3>{{ isSection ? 'Section' : 'Item' }}</h3>
      </div>

      <label class="ms-field" for="ms-prop-name">Name
        <input id="ms-prop-name" :value="item.displayName" maxlength="120" @input="patch({ displayName: text($event) })" />
        <small v-if="!item.displayName.trim()" class="ms-warn">A name is required. Changes are saved once it has one.</small>
      </label>
      <label class="ms-field" for="ms-prop-desc">Description
        <textarea id="ms-prop-desc" :value="item.description ?? ''" rows="3" :placeholder="isSection ? 'Optional line under the section title' : 'Short guest-facing description'" @input="patch({ description: text($event) })"></textarea>
      </label>

      <template v-if="!isSection">
        <div class="ms-field-pair">
          <label class="ms-field" for="ms-prop-price">Price
            <input id="ms-prop-price" :value="item.price ?? ''" placeholder="₹450 or From ₹2,500" @input="patch({ price: text($event) })" />
          </label>
          <label class="ms-field" for="ms-prop-type">Kind
            <select id="ms-prop-type" :value="item.type || 'item'" @change="patch({ type: text($event) })">
              <option v-for="kind in ITEM_KINDS" :key="kind.value" :value="kind.value">{{ kind.label }}</option>
            </select>
          </label>
        </div>

        <div class="ms-field">Photo
          <div class="ms-photo" :style="item.image ? { backgroundImage: `url(${JSON.stringify(item.image)})` } : undefined">
            <span v-if="!item.image">No photo yet</span>
          </div>
          <div class="ms-photo-actions">
            <label class="ms-btn sm" :class="{ disabled: uploading }">
              <i class="bi bi-cloud-arrow-up"></i> {{ uploading ? 'Uploading…' : 'Upload' }}
              <input id="ms-prop-upload" type="file" accept="image/*" hidden :disabled="uploading" @change="upload" />
            </label>
            <button v-if="item.image" type="button" class="ms-btn sm" @click="patch({ image: '' })">Remove</button>
          </div>
          <input id="ms-prop-image" :value="item.image ?? ''" type="url" placeholder="or paste an image URL" aria-label="Image URL" @input="patch({ image: text($event) })" />
        </div>

        <div v-if="isFood" class="ms-field-pair">
          <label class="ms-field" for="ms-prop-veg">Dietary
            <select id="ms-prop-veg" :value="vegValue" @change="patch({ isVeg: vegFrom(text($event)) })">
              <option value="">Not specified</option>
              <option value="veg">Vegetarian</option>
              <option value="nonveg">Non-vegetarian</option>
            </select>
          </label>
          <label class="ms-field" for="ms-prop-spice">Spice
            <select id="ms-prop-spice" :value="String(item.spiceLevel ?? 0)" @change="patch({ spiceLevel: Number(text($event)) || null })">
              <option value="0">Not specified</option>
              <option value="1">Mild</option>
              <option value="2">Medium</option>
              <option value="3">Hot</option>
            </select>
          </label>
        </div>

        <label class="ms-field" for="ms-prop-badge">Badge <small>optional</small>
          <input id="ms-prop-badge" :value="item.enumType ?? ''" list="ms-badge-options" placeholder="Bestseller, New, Chef's pick" @input="patch({ enumType: text($event) })" />
          <datalist id="ms-badge-options"><option v-for="badge in badgeSuggestions" :key="badge" :value="badge"></option></datalist>
        </label>
        <label class="ms-field" for="ms-prop-details">{{ menu.itemMaterialHeading || 'Details' }}
          <textarea id="ms-prop-details" :value="item.ingredients ?? ''" rows="2" placeholder="Ingredients, materials or what's included" @input="patch({ ingredients: text($event) })"></textarea>
        </label>
        <label class="ms-field" for="ms-prop-tags">Tags <small>comma-separated</small>
          <input id="ms-prop-tags" :value="(item.tags ?? []).join(', ')" placeholder="spicy, signature, gluten-free" @change="patch({ tags: list(text($event)) })" />
        </label>
        <label v-if="isFood" class="ms-field" for="ms-prop-allergens">Allergens <small>comma-separated</small>
          <input id="ms-prop-allergens" :value="(item.allergens ?? []).join(', ')" placeholder="nuts, dairy, gluten" @change="patch({ allergens: list(text($event)) })" />
        </label>

        <div class="ms-field">Buttons on the item page
          <label class="ms-check">
            <input id="ms-prop-cta-inherit" type="checkbox" :checked="!item.ctaConfig" @change="toggleCtaOverride" />
            Use the menu's default buttons
          </label>
          <CtaEditor v-if="item.ctaConfig" id-prefix="ms-item-cta" :model-value="item.ctaConfig" @update:model-value="patch({ ctaConfig: $event })" />
        </div>
      </template>

      <div class="ms-field">Position
        <div class="ms-move">
          <select id="ms-prop-move" :value="String(item.parentId || 0)" aria-label="Move into section" @change="moveInto(Number(text($event)))">
            <option value="0">Top level of the menu</option>
            <option v-for="option in moveTargets" :key="option.id" :value="String(option.id)">{{ option.label }}</option>
          </select>
          <button type="button" class="ms-icon-btn" title="Move up" aria-label="Move up" :disabled="siblingIndex <= 0" @click="nudge(-1)"><i class="bi bi-arrow-up"></i></button>
          <button type="button" class="ms-icon-btn" title="Move down" aria-label="Move down" :disabled="siblingIndex >= siblingCount - 1" @click="nudge(1)"><i class="bi bi-arrow-down"></i></button>
        </div>
      </div>

      <label class="ms-check ms-visible">
        <input id="ms-prop-visible" type="checkbox" :checked="item.isActive" @change="patch({ isActive: checked($event) })" />
        Visible to guests
      </label>

      <div class="ms-props-actions">
        <template v-if="isSection">
          <button type="button" class="ms-btn sm" @click="studio.startNew(false, endOfSection)"><i class="bi bi-plus-lg"></i> Add item</button>
          <button type="button" class="ms-btn sm" @click="studio.startNew(true, endOfSection)"><i class="bi bi-folder-plus"></i> Add sub-section</button>
        </template>
        <button v-else type="button" class="ms-btn sm" @click="studio.duplicate(item.id)"><i class="bi bi-copy"></i> Duplicate</button>
        <button v-if="!confirmingRemove" type="button" class="ms-btn sm danger" @click="askRemove"><i class="bi bi-trash3"></i> Remove from menu</button>
      </div>
      <div v-if="confirmingRemove" class="ms-confirm">
        <span>Remove <b>{{ item.displayName }}</b> and the {{ descendants }} entr{{ descendants === 1 ? 'y' : 'ies' }} inside it from this menu?</span>
        <button type="button" class="ms-btn danger sm" @click="studio.remove(item.id)">Remove</button>
        <button type="button" class="ms-btn sm" @click="confirmingRemove = false">Keep</button>
      </div>
      <p class="ms-hint">Changes apply to this menu only. The same item in other menus isn't touched.</p>
    </template>

    <!-- Menu settings -->
    <template v-else>
      <div class="ms-props-head">
        <h3>Menu settings</h3>
        <span class="ms-chip">{{ menu.type === 'personalized' ? 'Personalized' : 'Generic' }}</span>
      </div>
      <label class="ms-field" for="ms-menu-name">Menu name
        <input id="ms-menu-name" :value="menu.displayName" maxlength="120" @input="studio.updateMenu({ displayName: text($event) })" />
      </label>
      <label class="ms-field" for="ms-menu-desc">Description
        <textarea id="ms-menu-desc" :value="menu.description ?? ''" rows="3" placeholder="Tell guests what this menu is about" @input="studio.updateMenu({ description: text($event) })"></textarea>
      </label>
      <div class="ms-field-pair">
        <label class="ms-field" for="ms-menu-story">Story heading
          <input id="ms-menu-story" :value="menu.itemStoryHeading ?? ''" placeholder="The backstory" @input="studio.updateMenu({ itemStoryHeading: text($event) })" />
        </label>
        <label class="ms-field" for="ms-menu-material">Details heading
          <input id="ms-menu-material" :value="menu.itemMaterialHeading ?? ''" placeholder="Material" @input="studio.updateMenu({ itemMaterialHeading: text($event) })" />
        </label>
      </div>
      <label class="ms-check">
        <input id="ms-menu-elaborate" type="checkbox" :checked="Boolean(menu.elaborateDescriptions)" @change="studio.updateMenu({ elaborateDescriptions: checked($event) })" />
        Show photos, prices and tags in the menu list
      </label>

      <div class="ms-field">Default buttons on item pages
        <small class="ms-sub">Every item uses these unless you change them on the item.</small>
        <CtaEditor id-prefix="ms-menu-cta" :model-value="menuCtas" @update:model-value="studio.updateMenu({ ctaConfig: $event })" />
      </div>

      <div class="ms-field">Linked events
        <ul v-if="linkedEvents.length" class="ms-linked">
          <li v-for="event in linkedEvents" :key="event.id">
            <i class="bi bi-calendar-event"></i> {{ event.displayName }}
            <a :href="`/event/${event.name}/menu/${menu.name}`" target="_blank" rel="noreferrer" class="ms-link">Guest view <i class="bi bi-box-arrow-up-right"></i></a>
          </li>
        </ul>
        <small v-else class="ms-sub">Not linked yet. Guests see this menu once it's linked to an event.</small>
        <button type="button" class="ms-btn sm" @click="emit('link-event')"><i class="bi bi-link-45deg"></i> Link to an event</button>
      </div>

      <div class="ms-stats">
        <span><b>{{ sectionCount }}</b> sections</span>
        <span><b>{{ itemCount }}</b> items</span>
        <span><b>{{ hiddenCount }}</b> hidden</span>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useStudio, type StudioVendor } from '../context';
import { errorMessage, menuStudioApi } from '../api';
import { defaultCtaConfig, normalizeCtaConfig } from '../cta';
import { ancestry, childrenOf, descendantIds, isSectionItem } from '../tree';
import type { StudioEvent, StudioItem, StudioMenu } from '../types';
import CtaEditor from './CtaEditor.vue';

const props = defineProps<{ menu: StudioMenu; vendor: StudioVendor; linkedEvents: StudioEvent[] }>();
const emit = defineEmits<{ 'link-event': []; error: [message: string] }>();
const studio = useStudio();
const uploading = ref(false);
const confirmingRemove = ref(false);

const ITEM_KINDS = [
  { value: 'item', label: 'Item' },
  { value: 'dish', label: 'Dish' },
  { value: 'product', label: 'Product' },
  { value: 'service', label: 'Service' },
  { value: 'art', label: 'Art piece' },
  { value: 'addon', label: 'Add-on' },
];
const FOOD_KINDS = new Set(['item', 'dish', 'addon', 'modifier']);

const item = computed(() => studio.selectedItem.value);
watch(() => item.value?.id, () => { confirmingRemove.value = false; });

const isSection = computed(() => Boolean(item.value && isSectionItem(item.value, studio.items.value)));
const isFood = computed(() => FOOD_KINDS.has(item.value?.type || 'item'));
const path = computed(() => (item.value ? ancestry(studio.items.value, item.value.id) : []));
const descendants = computed(() => (item.value ? descendantIds(studio.items.value, item.value.id).length : 0));
const endOfSection = computed(() => ({
  parentId: item.value?.id ?? null,
  index: studio.items.value.filter((row) => row.parentId === item.value?.id).length,
}));
const vegValue = computed(() => (item.value?.isVeg === true ? 'veg' : item.value?.isVeg === false ? 'nonveg' : ''));
const badgeSuggestions = computed(() => [...new Set(studio.pool.value.map((row) => row.enumType).filter((badge): badge is string => Boolean(badge)))].slice(0, 20));
const menuCtas = computed(() => normalizeCtaConfig(props.menu.ctaConfig));

const leafItems = computed(() => studio.items.value.filter((row) => !isSectionItem(row, studio.items.value)));
const itemCount = computed(() => leafItems.value.length);
const sectionCount = computed(() => studio.items.value.length - itemCount.value);
const hiddenCount = computed(() => studio.items.value.filter((row) => !row.isActive).length);

// Sections this entry can move into: every section except itself and anything inside it.
const moveTargets = computed(() => {
  if (!item.value) return [];
  const blocked = new Set([item.value.id, ...descendantIds(studio.items.value, item.value.id)]);
  return studio.items.value
    .filter((row) => !blocked.has(row.id) && isSectionItem(row, studio.items.value))
    .map((row) => ({ id: row.id, label: [...ancestry(studio.items.value, row.id), row].map((part) => part.displayName).join(' › ') }))
    .sort((a, b) => a.label.localeCompare(b.label));
});
const siblings = computed(() => (item.value ? childrenOf(studio.items.value, item.value.parentId || null) : []));
const siblingIndex = computed(() => siblings.value.findIndex((row) => row.id === item.value?.id));
const siblingCount = computed(() => siblings.value.length);

function moveInto(parentId: number) {
  if (!item.value) return;
  const target = parentId || null;
  void studio.move(item.value.id, { parentId: target, index: childrenOf(studio.items.value, target).length });
}

function nudge(direction: -1 | 1) {
  if (!item.value) return;
  // Insert-zone indexes count the moving item itself, so "down" skips one extra slot.
  const index = siblingIndex.value + (direction === 1 ? 2 : -1);
  void studio.move(item.value.id, { parentId: item.value.parentId || null, index });
}

const text = (event: Event) => (event.target as HTMLInputElement).value;
const checked = (event: Event) => (event.target as HTMLInputElement).checked;
const list = (value: string) => value.split(',').map((part) => part.trim()).filter(Boolean);
const vegFrom = (value: string) => (value === 'veg' ? true : value === 'nonveg' ? false : null);

function patch(changes: Partial<StudioItem>) {
  if (item.value) studio.updateItem(item.value.id, changes);
}

function toggleCtaOverride(event: Event) {
  // Unticking "use default" starts the override from the menu's current defaults.
  patch({ ctaConfig: checked(event) ? null : { ...defaultCtaConfig(), ...menuCtas.value } });
}

function askRemove() {
  if (descendants.value) confirmingRemove.value = true;
  else if (item.value) void studio.remove(item.value.id);
}

async function upload(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !item.value) return;
  if (!file.type.startsWith('image/')) return emit('error', 'Choose an image file');
  if (file.size > 8 * 1024 * 1024) return emit('error', 'Images must be smaller than 8 MB');
  const id = item.value.id;
  uploading.value = true;
  try {
    const url = await menuStudioApi.uploadImage(props.vendor.name, file);
    studio.updateItem(id, { image: url });
  } catch (err) {
    emit('error', `Couldn't upload the photo: ${errorMessage(err)}`);
  } finally {
    uploading.value = false;
  }
}
</script>
