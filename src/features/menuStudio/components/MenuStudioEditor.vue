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
      <span class="ms-save" :class="`is-${studio.saveState.value}`" role="status">
        <template v-if="studio.saveState.value === 'saving'">Saving…</template>
        <template v-else-if="studio.saveState.value === 'saved'">All changes saved</template>
        <template v-else>Couldn't save. <button type="button" class="ms-link" @click="studio.retry()">Try again</button></template>
      </span>
      <span class="ms-spacer"></span>
      <div class="ms-seg ms-device-toggle" role="group" aria-label="Preview size">
        <button type="button" :class="{ on: device === 'phone' }" :aria-pressed="device === 'phone'" @click="device = 'phone'"><i class="bi bi-phone"></i> Phone</button>
        <button type="button" :class="{ on: device === 'tablet' }" :aria-pressed="device === 'tablet'" @click="device = 'tablet'"><i class="bi bi-tablet"></i> Tablet</button>
      </div>
      <button type="button" class="ms-btn" @click="cloneOpen = true"><i class="bi bi-copy"></i> Clone</button>
      <button type="button" class="ms-btn" @click="emit('link-event', currentMenu.id)"><i class="bi bi-link-45deg"></i> Link to event</button>
      <a v-if="guestUrl" class="ms-btn primary" :href="guestUrl" target="_blank" rel="noreferrer"><i class="bi bi-box-arrow-up-right"></i> Guest view</a>
    </header>

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
      @close="cloneOpen = false"
      @created="onCloned"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
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

watch(() => props.menu.id, () => studio.load(props.menu), { immediate: true });
// On small screens, selecting something on the phone jumps to its editor.
watch(() => studio.selection.value, () => { if (mobileTab.value === 'canvas' && window.innerWidth < 1100 && studio.selection.value.kind === 'item') mobileTab.value = 'props'; });

const currentMenu = computed(() => studio.menu.value ?? props.menu);
const linkedEvents = computed(() => props.eventsForMenu(props.menu.id));
const guestUrl = computed(() => (linkedEvents.value[0] ? `/event/${linkedEvents.value[0].name}/menu/${currentMenu.value.name}` : ''));

function leave() {
  studio.flush();
  emit('home');
}

function onEsc(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
  studio.selection.value = { kind: 'menu' };
  studio.pendingNew.value = null;
}

function onCloned(menu: StudioMenu) {
  cloneOpen.value = false;
  studio.flush();
  emit('changed');
  emit('notify', 'success', `Cloned into ${menu.displayName}`);
  emit('open', menu.id);
}

// Let the dashboard refresh its copy of the menu (name, settings) once the editor closes.
onBeforeUnmount(() => {
  studio.flush();
  emit('changed');
});
</script>
