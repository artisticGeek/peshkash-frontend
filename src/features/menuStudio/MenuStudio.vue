<template>
  <div class="ms-root">
    <p v-if="!vendor" class="ms-empty">Choose a workspace to manage its menus.</p>
    <MenuStudioEditor
      v-else-if="activeMenu"
      :key="activeMenu.id"
      :menu="activeMenu"
      :menus="vendorMenus"
      :vendor="vendor"
      :events-for-menu="eventsForMenu"
      @home="emit('home')"
      @open="openMenu"
      @changed="emit('changed')"
      @link-event="emit('link-event', $event)"
      @notify="(type, text) => emit('notify', type, text)"
    />
    <p v-else-if="menuId && !activeMenu" class="ms-empty">Opening menu…</p>
    <MenuStudioHome
      v-else
      :vendor="vendor"
      :menus="vendorMenus"
      :events-for-menu="eventsForMenu"
      @open="openMenu"
      @changed="emit('changed')"
      @notify="(type, text) => emit('notify', type, text)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { StudioVendor } from './context';
import type { StudioEvent, StudioMenu } from './types';
import MenuStudioEditor from './components/MenuStudioEditor.vue';
import MenuStudioHome from './components/MenuStudioHome.vue';
import './menuStudio.css';

const props = defineProps<{
  vendor?: StudioVendor | null;
  menus: StudioMenu[];
  /** Menu open in the editor; 0 shows the menus home. */
  menuId: number;
  eventsForMenu: (menuId: number) => StudioEvent[];
}>();
const emit = defineEmits<{
  open: [menuId: number];
  home: [];
  changed: [];
  'link-event': [menuId: number];
  notify: [type: 'success' | 'error', text: string];
}>();

const vendorMenus = computed(() => (props.vendor ? props.menus.filter((menu) => menu.vendorId === props.vendor!.id) : []));
const activeMenu = computed(() => (props.menuId ? vendorMenus.value.find((menu) => menu.id === props.menuId) ?? null : null));

function openMenu(menuId: number) {
  emit('open', menuId);
}
</script>
