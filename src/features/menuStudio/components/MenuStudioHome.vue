<template>
  <section class="ms-home">
    <header class="ms-home-head">
      <div>
        <h2>Menus</h2>
        <p>{{ vendor.displayName }} · {{ menus.length }} menu{{ menus.length === 1 ? '' : 's' }}</p>
      </div>
      <div class="ms-search">
        <i class="bi bi-search"></i>
        <input id="ms-home-search" v-model="query" placeholder="Search menus" aria-label="Search menus" />
      </div>
    </header>

    <div class="ms-home-grid">
      <button type="button" class="ms-menu-card ms-menu-card--new" @click="openNew(null)">
        <i class="bi bi-plus-lg"></i>
        <b>New menu</b>
        <small>Start blank or clone one you have</small>
      </button>

      <article v-for="menu in filtered" :key="menu.id" class="ms-menu-card">
        <button type="button" class="ms-menu-card-main" @click="emit('open', menu.id)">
          <b>{{ menu.displayName }}</b>
          <small>{{ countsLabel(menu.id) }}</small>
        </button>
        <div class="ms-menu-card-tags">
          <span class="ms-chip">{{ menu.type === 'personalized' ? 'Personalized' : 'Generic' }}</span>
          <span v-if="menu.draftSavedAt" class="ms-chip draft" title="Has a saved draft that guests don't see yet"><i class="bi bi-file-earmark-text"></i> Draft</span>
          <span v-for="event in eventsForMenu(menu.id)" :key="event.id" class="ms-chip gold"><i class="bi bi-calendar-event"></i> {{ event.displayName }}</span>
          <span v-if="!eventsForMenu(menu.id).length" class="ms-chip muted">Not linked</span>
        </div>
        <div v-if="confirmDeleteId === menu.id" class="ms-confirm">
          <span>Delete <b>{{ menu.displayName }}</b> and everything in it?</span>
          <button type="button" class="ms-btn danger sm" :disabled="deleting" @click="remove(menu)">Delete</button>
          <button type="button" class="ms-btn sm" @click="confirmDeleteId = 0">Keep</button>
        </div>
        <div v-else class="ms-menu-card-actions">
          <button type="button" class="ms-btn sm primary" @click="emit('open', menu.id)">Open</button>
          <button type="button" class="ms-btn sm" @click="openNew(menu.id)"><i class="bi bi-copy"></i> Clone</button>
          <button
            type="button"
            class="ms-icon-btn danger"
            :title="eventsForMenu(menu.id).length ? 'Unlink this menu from its events before deleting it' : 'Delete menu'"
            :disabled="eventsForMenu(menu.id).length > 0"
            @click="confirmDeleteId = menu.id"
          ><i class="bi bi-trash3"></i></button>
        </div>
      </article>
    </div>
    <p v-if="menus.length && !filtered.length" class="ms-empty">No menus match “{{ query }}”.</p>

    <NewMenuDialog
      v-if="dialogOpen"
      :menus="menus"
      :vendor-id="vendor.id"
      :clone-from-id="cloneFromId"
      @close="dialogOpen = false"
      @created="onCreated"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { errorMessage, menuStudioApi } from '../api';
import { isSectionItem } from '../tree';
import type { StudioVendor } from '../context';
import type { PoolItem, StudioEvent, StudioMenu } from '../types';
import NewMenuDialog from './NewMenuDialog.vue';

const props = defineProps<{ vendor: StudioVendor; menus: StudioMenu[]; eventsForMenu: (menuId: number) => StudioEvent[] }>();
const emit = defineEmits<{ open: [menuId: number]; changed: []; notify: [type: 'success' | 'error', text: string] }>();

const query = ref('');
const dialogOpen = ref(false);
const cloneFromId = ref<number | null>(null);
const confirmDeleteId = ref(0);
const deleting = ref(false);
const pool = ref<PoolItem[]>([]);

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? props.menus.filter((menu) => menu.displayName.toLowerCase().includes(q)) : props.menus;
});

async function loadPool() {
  pool.value = await menuStudioApi.itemPool(props.vendor.id).catch(() => []);
}
onMounted(loadPool);
watch(() => props.vendor.id, loadPool);

function countsLabel(menuId: number) {
  const rows = pool.value.filter((row) => row.menuId === menuId);
  if (!rows.length) return 'Empty';
  const items = rows.filter((row) => !isSectionItem(row, rows)).length;
  const sections = rows.length - items;
  return `${sections} section${sections === 1 ? '' : 's'} · ${items} item${items === 1 ? '' : 's'}`;
}

function openNew(fromId: number | null) {
  cloneFromId.value = fromId;
  dialogOpen.value = true;
}

function onCreated(menu: StudioMenu) {
  dialogOpen.value = false;
  emit('changed');
  emit('open', menu.id);
}

async function remove(menu: StudioMenu) {
  deleting.value = true;
  try {
    await menuStudioApi.deleteMenu(menu.id);
    emit('notify', 'success', `Deleted ${menu.displayName}`);
    emit('changed');
  } catch (err) {
    emit('notify', 'error', errorMessage(err));
  } finally {
    deleting.value = false;
    confirmDeleteId.value = 0;
  }
}
</script>
