<template>
  <div class="ms-modal-backdrop" @click.self="emit('close')" @keydown.esc="emit('close')">
    <form class="ms-modal" role="dialog" aria-modal="true" aria-labelledby="ms-new-title" @submit.prevent="submit">
      <div class="ms-modal-head">
        <h3 id="ms-new-title">{{ fixedSource ? `Clone ${fixedSource.displayName}` : 'New menu' }}</h3>
        <button type="button" class="ms-icon-btn" aria-label="Close" @click="emit('close')"><i class="bi bi-x-lg"></i></button>
      </div>

      <label class="ms-field" for="ms-new-name">Menu name
        <input id="ms-new-name" ref="nameInput" v-model="displayName" maxlength="120" placeholder="Kapoor Wedding · Reception Dinner" required />
      </label>

      <fieldset v-if="!fixedSource" class="ms-options">
        <legend class="visually-hidden">Start from</legend>
        <label class="ms-option" :class="{ on: source === 'blank' }">
          <input v-model="source" type="radio" value="blank" name="ms-new-source" />
          <span><b>Start blank</b><small>An empty menu. Pull items in from your item bank.</small></span>
        </label>
        <label class="ms-option" :class="{ on: source === 'clone' }" :aria-disabled="!menus.length">
          <input v-model="source" type="radio" value="clone" name="ms-new-source" :disabled="!menus.length" />
          <span><b>Clone an existing menu</b><small>Copies its sections and items into a new, independent menu.</small></span>
        </label>
      </fieldset>

      <template v-if="source === 'clone'">
        <label v-if="!fixedSource" class="ms-field" for="ms-new-from">Clone from
          <select id="ms-new-from" v-model.number="sourceId">
            <option v-for="menu in menus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option>
          </select>
        </label>
        <div class="ms-field">What to copy
          <label class="ms-check"><input id="ms-new-structure" type="checkbox" checked disabled /> Sections and sub-sections</label>
          <label class="ms-check"><input id="ms-new-items" v-model="includeItems" type="checkbox" /> Items</label>
          <label class="ms-check"><input id="ms-new-hidden" v-model="includeHidden" type="checkbox" /> Hidden sections and items</label>
          <label class="ms-check"><input id="ms-new-ctas" v-model="includeCtas" type="checkbox" /> Button settings (CTAs)</label>
        </div>
      </template>

      <label class="ms-field" for="ms-new-type">Menu type
        <select id="ms-new-type" v-model="type">
          <option value="generic">Generic: reusable across events</option>
          <option value="personalized">Personalized: made for one client or event</option>
        </select>
      </label>

      <p v-if="error" class="ms-warn" role="alert">{{ error }}</p>
      <div class="ms-modal-actions">
        <button type="button" class="ms-btn" @click="emit('close')">Cancel</button>
        <button type="submit" class="ms-btn primary" :disabled="busy || !displayName.trim()">
          {{ busy ? 'Creating…' : source === 'clone' ? 'Clone and open' : 'Create and open' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { errorMessage, menuStudioApi } from '../api';
import { uniqueSlug } from '../tree';
import type { StudioMenu } from '../types';

const props = defineProps<{ menus: StudioMenu[]; vendorId: number; cloneFromId?: number | null }>();
const emit = defineEmits<{ close: []; created: [menu: StudioMenu] }>();

const fixedSource = computed(() => (props.cloneFromId ? props.menus.find((menu) => menu.id === props.cloneFromId) ?? null : null));
const source = ref<'blank' | 'clone'>(props.cloneFromId ? 'clone' : 'blank');
const sourceId = ref<number>(props.cloneFromId || props.menus[0]?.id || 0);
const displayName = ref(fixedSource.value ? `${fixedSource.value.displayName} (copy)` : '');
const type = ref<string>(fixedSource.value?.type === 'personalized' ? 'personalized' : 'generic');
const includeItems = ref(true);
const includeHidden = ref(true);
const includeCtas = ref(true);
const busy = ref(false);
const error = ref('');
const nameInput = ref<HTMLInputElement | null>(null);

onMounted(() => nextTick(() => {
  nameInput.value?.focus();
  nameInput.value?.select();
}));

async function submit() {
  const name = displayName.value.trim();
  if (!name) return;
  busy.value = true;
  error.value = '';
  const slug = uniqueSlug(name, props.menus.map((menu) => menu.name));
  try {
    const menu = source.value === 'clone' && sourceId.value
      ? await menuStudioApi.cloneMenu(sourceId.value, {
          name: slug,
          displayName: name,
          type: type.value,
          include: { items: includeItems.value, hidden: includeHidden.value, ctas: includeCtas.value },
        })
      : await menuStudioApi.createMenu({ vendorId: props.vendorId, name: slug, displayName: name, type: type.value });
    emit('created', menu);
  } catch (err) {
    error.value = errorMessage(err);
  } finally {
    busy.value = false;
  }
}
</script>
