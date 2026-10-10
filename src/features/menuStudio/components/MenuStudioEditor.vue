<template>
  <section class="ms-editor" :data-tab="mobileTab" @keydown.esc="onEsc">
    <header class="ms-topbar">
      <button type="button" class="ms-icon-btn" title="All menus" aria-label="Back to all menus" @click="leave"><i class="bi bi-arrow-left"></i></button>
      <input
        id="ms-top-name"
        class="ms-title-input"
        :value="currentMenu.displayName"
        maxlength="120"
        aria-label="Menu name"
        @input="studio.updateMenu({ displayName: ($event.target as HTMLInputElement).value })"
      />
      <span class="ms-save" :class="`is-${studio.status.value}`" role="status">{{ statusLabel }}</span>
      <span class="ms-spacer"></span>
      <span class="ms-save-actions">
        <button type="button" class="ms-btn" :disabled="!studio.dirty.value || Boolean(studio.busy.value)" title="Keep these changes privately (Ctrl+S). Guests still see the last saved menu." @click="studio.saveDraft()">
          <i class="bi bi-file-earmark"></i> {{ studio.busy.value === 'draft' ? 'Saving draft…' : 'Save draft' }}
        </button>
        <button type="button" class="ms-btn primary" :disabled="!canSave" title="Save and show these changes to guests" @click="studio.publish()">
          <i class="bi bi-check2-circle"></i> {{ studio.busy.value === 'publish' ? 'Saving…' : 'Save' }}
        </button>
      </span>
      <div class="ms-tools">
        <div class="ms-seg ms-device-toggle" role="group" aria-label="Preview size">
          <button type="button" :class="{ on: device === 'phone' }" :aria-pressed="device === 'phone'" @click="device = 'phone'"><i class="bi bi-phone"></i> Phone</button>
          <button type="button" :class="{ on: device === 'tablet' }" :aria-pressed="device === 'tablet'" @click="device = 'tablet'"><i class="bi bi-tablet"></i> Tablet</button>
        </div>
        <button type="button" class="ms-btn" @click="cloneOpen = true"><i class="bi bi-copy"></i> Clone</button>
        <button type="button" class="ms-btn" @click="emit('link-event', currentMenu.id)"><i class="bi bi-link-45deg"></i> Link to event</button>
        <a v-if="guestUrl" class="ms-btn" :href="guestUrl" target="_blank" rel="noreferrer" title="Opens what guests see now (the last saved version)"><i class="bi bi-box-arrow-up-right"></i> Guest view</a>
      </div>
    </header>

    <div v-if="leaving" class="ms-banner is-warn" role="alert">
      <i class="bi bi-exclamation-circle"></i>
      <span>You have unsaved changes to <b>{{ currentMenu.displayName }}</b>.</span>
      <button type="button" class="ms-btn sm" :disabled="Boolean(studio.busy.value)" @click="saveAndLeave('draft')">Save draft and leave</button>
      <button type="button" class="ms-btn sm primary" :disabled="Boolean(studio.busy.value)" @click="saveAndLeave('publish')">Save and leave</button>
      <button type="button" class="ms-btn sm danger" @click="leaveWithoutSaving">Leave without saving</button>
      <button type="button" class="ms-link" @click="leaving = false">Stay</button>
    </div>
    <div v-else-if="studio.draftSavedAt.value" class="ms-banner" role="note">
      <i class="bi bi-file-earmark-text"></i>
      <span>You're editing a draft saved {{ formatTime(studio.draftSavedAt.value) }}. Guests still see the last saved menu until you press <b>Save</b>.</span>
      <template v-if="confirmDiscard">
        <span>Discard the draft{{ studio.dirty.value ? ' and your unsaved changes' : '' }}?</span>
        <button type="button" class="ms-btn sm danger" :disabled="Boolean(studio.busy.value)" @click="discard">Discard</button>
        <button type="button" class="ms-link" @click="confirmDiscard = false">Keep editing</button>
      </template>
      <button v-else type="button" class="ms-link" @click="confirmDiscard = true">Discard draft</button>
    </div>

    <nav class="ms-mobile-tabs" aria-label="Studio panels">
      <button type="button" :class="{ on: mobileTab === 'add' }" @click="mobileTab = 'add'"><i class="bi bi-plus-square"></i> Add</button>
      <button type="button" :class="{ on: mobileTab === 'canvas' }" @click="mobileTab = 'canvas'"><i class="bi bi-phone"></i> Menu</button>
      <button type="button" :class="{ on: mobileTab === 'props' }" @click="mobileTab = 'props'"><i class="bi bi-sliders"></i> Edit</button>
    </nav>

    <div class="ms-body">
      <ItemBankPanel class="ms-col-add" />
      <PhoneCanvas class="ms-col-canvas" :menu="currentMenu" :device="device" :event-label="linkedEvents[0]?.displayName" />
      <PropertiesPanel
        class="ms-col-props"
        :menu="currentMenu"
        :vendor="vendor"
        :linked-events="linkedEvents"
        @link-event="emit('link-event', currentMenu.id)"
        @error="emit('notify', 'error', $event)"
      />
    </div>

    <NewMenuDialog
      v-if="cloneOpen"
      :menus="menus"
      :vendor-id="vendor.id"
      :clone-from-id="currentMenu.id"
      :note="studio.dirty.value || studio.draftSavedAt.value ? 'This copies the last saved version. Your draft and unsaved changes stay here.' : ''"
      @close="cloneOpen = false"
      @created="onCloned"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { provideMenuStudio, type StudioVendor } from '../context';
import { useMenuStudio } from '../useMenuStudio';
import type { StudioEvent, StudioMenu } from '../types';
import ItemBankPanel from './ItemBankPanel.vue';
import NewMenuDialog from './NewMenuDialog.vue';
import PhoneCanvas from './PhoneCanvas.vue';
import PropertiesPanel from './PropertiesPanel.vue';

const props = defineProps<{ menu: StudioMenu; menus: StudioMenu[]; vendor: StudioVendor; eventsForMenu: (menuId: number) => StudioEvent[] }>();
const emit = defineEmits<{
  home: [];
  open: [menuId: number];
  changed: [];
  'link-event': [menuId: number];
  notify: [type: 'success' | 'error', text: string];
}>();

const studio = useMenuStudio((type, text) => emit('notify', type, text));
provideMenuStudio(studio);

const device = ref<'phone' | 'tablet'>('phone');
const mobileTab = ref<'add' | 'canvas' | 'props'>('canvas');
const cloneOpen = ref(false);
const leaving = ref(false);
const confirmDiscard = ref(false);
/** Set once the person chose to leave, so the route guard doesn't ask again. */
let leaveApproved = false;

watch(() => props.menu.id, () => studio.load(props.menu), { immediate: true });
// On small screens, selecting something on the phone jumps to its editor.
watch(() => studio.selection.value, () => { if (mobileTab.value === 'canvas' && window.innerWidth < 1100 && studio.selection.value.kind === 'item') mobileTab.value = 'props'; });
watch(() => studio.draftSavedAt.value, () => { confirmDiscard.value = false; });

const currentMenu = computed(() => studio.menu.value ?? props.menu);
const linkedEvents = computed(() => props.eventsForMenu(props.menu.id));
const guestUrl = computed(() => (linkedEvents.value[0] ? `/event/${linkedEvents.value[0].name}/menu/${currentMenu.value.name}` : ''));
const canSave = computed(() => !studio.busy.value && (studio.dirty.value || Boolean(studio.draftSavedAt.value)));

const statusLabel = computed(() => {
  switch (studio.status.value) {
    case 'saving': return 'Saving…';
    case 'unsaved': return 'Unsaved changes';
    case 'draft': return `Draft saved ${formatTime(studio.draftSavedAt.value)} · not live yet`;
    default: return 'Live · everything saved';
  }
});

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? `at ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`
    : `on ${date.toLocaleDateString([], { day: 'numeric', month: 'short' })}`;
}

function leave() {
  if (studio.dirty.value) {
    leaving.value = true;
    return;
  }
  emit('home');
}

async function saveAndLeave(kind: 'draft' | 'publish') {
  const ok = kind === 'draft' ? await studio.saveDraft() : await studio.publish();
  if (!ok) return;
  leaving.value = false;
  emit('home');
}

function leaveWithoutSaving() {
  leaveApproved = true;
  leaving.value = false;
  emit('home');
}

async function discard() {
  confirmDiscard.value = false;
  await studio.discardDraft();
  emit('changed');
}

function onEsc(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
  studio.selection.value = { kind: 'menu' };
  studio.pendingNew.value = null;
}

function onCloned(menu: StudioMenu) {
  cloneOpen.value = false;
  emit('changed');
  emit('notify', 'success', `Cloned into ${menu.displayName}`);
  emit('open', menu.id);
}

// Leaving through the sidebar, the browser or another menu: ask before unsaved edits are lost.
function confirmLeave(): boolean {
  if (leaveApproved || !studio.dirty.value) return true;
  return window.confirm('You have unsaved changes in this menu. Leave without saving?');
}
onBeforeRouteLeave(() => confirmLeave());
onBeforeRouteUpdate((to, from) => (to.params.menuId === from.params.menuId ? true : confirmLeave()));

function onBeforeUnload(event: BeforeUnloadEvent) {
  if (!studio.dirty.value) return;
  event.preventDefault();
  event.returnValue = '';
}

// Ctrl/Cmd+S keeps work as a draft instead of the browser's "save page".
function onKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    if (studio.dirty.value) void studio.saveDraft();
  }
}

onMounted(() => {
  window.addEventListener('beforeunload', onBeforeUnload);
  window.addEventListener('keydown', onKeydown);
});

// Let the dashboard refresh its copy of the menu (name, settings, draft state) once the editor closes.
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload);
  window.removeEventListener('keydown', onKeydown);
  emit('changed');
});
</script>
