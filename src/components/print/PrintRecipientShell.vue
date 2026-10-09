<template>
  <div class="recipient-shell" :data-sidebar="sidebarState">
    <aside class="recipient-sidebar" :class="{ 'sidebar--overlay-open': sidebarOverlayOpen }">
      <div class="sidebar-brand">
        <PeshkashLogo v-if="sidebarState === 'full'" variant="dark-bg" :height="32" class="sidebar-logo-full" />
        <PeshkashLogo v-else variant="dark-bg" :height="30" :symbol="true" class="sidebar-logo-symbol" />
        <button class="sidebar-brand-toggle" type="button" :title="sidebarState === 'full' ? 'Icon-only mode' : 'Expand sidebar'" @click="cycleSidebar">
          <i :class="sidebarState === 'full' ? 'bi bi-layout-sidebar-inset-reverse' : 'bi bi-layout-sidebar-reverse'"></i>
        </button>
      </div>
      <nav>
        <RouterLink to="/print-collections" class="nav-button active" title="Collections" @click="sidebarOverlayOpen = false">
          <i class="bi bi-collection"></i><span class="nav-label">Collections</span>
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-user-row"><span class="sidebar-user-phone">{{ phone }}</span><span class="sidebar-user-role">Print recipient</span></div>
        <button class="nav-button sidebar-logout-btn" type="button" title="Sign out" @click="$emit('logout')"><i class="bi bi-box-arrow-left"></i><span class="nav-label">Sign out</span></button>
        <button class="nav-button sidebar-cycle-btn" type="button" :title="sidebarState === 'full' ? 'Compact' : 'Expand'" @click="cycleSidebar"><i :class="sidebarState === 'full' ? 'bi bi-layout-sidebar-inset-reverse' : 'bi bi-layout-sidebar-reverse'"></i><span class="nav-label">{{ sidebarState === 'full' ? 'Compact' : 'Expand' }}</span></button>
      </div>
    </aside>

    <main class="recipient-main">
      <header class="workspace-header">
        <div class="workspace-header-left">
          <button class="mobile-hamburger" type="button" aria-label="Open navigation" @click="sidebarOverlayOpen = true"><i class="bi bi-list"></i></button>
          <RouterLink v-if="backTo" :to="backTo" class="back-btn"><i class="bi bi-arrow-left"></i><span>{{ backLabel }}</span></RouterLink>
          <div class="workspace-title"><h2>{{ title }}</h2><p v-if="subtitle">{{ subtitle }}</p></div>
        </div>
        <button class="refresh-btn" type="button" :disabled="loading" title="Refresh" aria-label="Refresh" @click="$emit('refresh')"><i class="bi bi-arrow-clockwise" :class="{ spin: loading }"></i></button>
      </header>
      <slot />
    </main>
    <div v-if="sidebarOverlayOpen" class="sidebar-mobile-backdrop" @click="sidebarOverlayOpen = false"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { RouterLink } from 'vue-router';
import PeshkashLogo from '../PeshkashLogo.vue';

withDefaults(defineProps<{ title: string; subtitle?: string; phone?: string | null; loading?: boolean; backTo?: string; backLabel?: string }>(), {
  subtitle: '', phone: '', loading: false, backTo: '', backLabel: 'All collections',
});
defineEmits<{ (event: 'refresh'): void; (event: 'logout'): void }>();

const sidebarState = ref<'full' | 'icons'>('full');
const sidebarOverlayOpen = ref(false);
function cycleSidebar(): void { sidebarState.value = sidebarState.value === 'full' ? 'icons' : 'full'; }
</script>

<style scoped>
.recipient-shell{background:#f7f2ea;color:#2f2a24;display:grid;font-family:'Urbanist',-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;grid-template-columns:260px 1fr;height:100vh;overflow:hidden;transition:grid-template-columns .22s ease}.recipient-shell[data-sidebar="icons"]{grid-template-columns:64px 1fr}.recipient-sidebar{background:#171512;color:#fff;display:flex;flex-direction:column;height:100vh;overflow:hidden;position:sticky;top:0;width:260px}.sidebar-brand{align-items:center;border-bottom:1px solid rgba(255,255,255,.07);display:flex;flex-shrink:0;gap:10px;min-height:56px;padding:0 12px}.sidebar-logo-full{flex:1;min-width:0}.sidebar-logo-symbol{flex-shrink:0}.sidebar-brand-toggle{align-items:center;background:transparent;border:0;border-radius:6px;color:rgba(255,255,255,.4);display:flex;font-size:.95rem;height:30px;justify-content:center;margin-left:auto;padding:0 6px}.recipient-sidebar nav{display:flex;flex:1;flex-direction:column;gap:2px;overflow-y:auto;padding:4px 8px}.nav-button{align-items:center;background:transparent;border:0;border-radius:8px;color:rgba(255,255,255,.72);display:flex;gap:10px;padding:10px;text-align:left;text-decoration:none;white-space:nowrap}.nav-button.active,.nav-button:hover{background:rgba(189,148,90,.18);color:#fff}.nav-button i{flex-shrink:0;font-size:1rem}.nav-label{font-size:.88rem}.sidebar-footer{border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;padding:8px 8px 16px}.sidebar-user-row{display:flex;flex-direction:column;gap:1px;overflow:hidden;padding:6px 12px 4px}.sidebar-user-phone{color:rgba(255,255,255,.65);font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.sidebar-user-role{color:rgba(255,255,255,.35);font-size:.68rem;letter-spacing:.04em}.sidebar-logout-btn,.sidebar-cycle-btn{color:rgba(255,255,255,.5);width:100%}.sidebar-logout-btn:hover{color:#ff7b7b}.recipient-shell[data-sidebar="icons"] .recipient-sidebar{width:56px}.recipient-shell[data-sidebar="icons"] .nav-label,.recipient-shell[data-sidebar="icons"] .sidebar-user-row{display:none}.recipient-shell[data-sidebar="icons"] .nav-button{justify-content:center;padding:10px 0}.recipient-shell[data-sidebar="icons"] .sidebar-brand{justify-content:center}.recipient-shell[data-sidebar="icons"] .sidebar-brand-toggle{display:none}.recipient-main{height:100vh;min-width:0;overflow-y:auto;padding:0 20px 24px}.workspace-header{align-items:center;background:rgba(247,242,234,.92);border-bottom:1px solid rgba(216,189,143,.35);display:flex;justify-content:space-between;margin:0 -20px;min-height:46px;padding:8px 20px;position:sticky;top:0;z-index:10}.workspace-header-left{align-items:center;display:flex;gap:10px;min-width:0}.workspace-title{min-width:0}.workspace-title h2{font-size:1.1rem;margin:0}.workspace-title p{color:#6f665c;font-size:.72rem;margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.refresh-btn,.back-btn,.mobile-hamburger{align-items:center;background:transparent;border:0;color:#65594d;display:flex;gap:6px;text-decoration:none}.refresh-btn{height:34px;justify-content:center;width:34px}.back-btn{font-size:.78rem}.mobile-hamburger{display:none}.sidebar-mobile-backdrop{background:rgba(0,0,0,.48);inset:0;position:fixed;z-index:199}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:767px){.recipient-shell{grid-template-columns:1fr!important}.recipient-main{padding:0 14px 20px}.recipient-sidebar{height:100vh;left:0;position:fixed;top:0;transform:translateX(-100%);transition:transform .24s ease;width:260px!important;z-index:200}.recipient-sidebar.sidebar--overlay-open{box-shadow:4px 0 24px rgba(0,0,0,.3);transform:translateX(0)}.mobile-hamburger{display:flex;font-size:1.25rem}.workspace-header{margin:0 -14px;padding:8px 14px}.sidebar-brand-toggle{display:none}}
</style>
