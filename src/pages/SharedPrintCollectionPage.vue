<template>
  <div class="shared-collection-page">
    <header><RouterLink to="/"><PeshkashLogo variant="light-bg" :height="28" /></RouterLink><span>READ-ONLY PRINT ACCESS</span></header>
    <main>
      <div v-if="loading" class="state"><i class="bi bi-arrow-repeat spin"></i><p>Opening the shared collection…</p></div>
      <div v-else-if="error" class="state"><i class="bi bi-shield-lock"></i><h1>Collection unavailable</h1><p>{{ error }}</p><button v-if="!auth.isLoggedIn" type="button" @click="showLogin = true">Verify phone number</button></div>
      <template v-else-if="collection">
        <section class="heading"><p>PRINT COLLECTION</p><h1>{{ collection.name }}</h1><div v-if="collection.notes || collection.remarks" class="context"><article v-if="collection.notes"><b>Notes</b><span>{{ collection.notes }}</span></article><article v-if="collection.remarks"><b>Remarks</b><span>{{ collection.remarks }}</span></article></div></section>
        <section class="artwork-grid">
          <article v-for="(artwork, index) in collection.artworks" :key="artwork.key || index">
            <figure><img :src="svgDataUrl(artwork.svg)" :alt="artwork.label || `Artwork ${index + 1}`"></figure>
            <div><span><b>{{ artwork.label || `Artwork ${index + 1}` }}</b><small>SVG · ready for print</small></span><button type="button" @click="downloadArtwork(artwork, index)"><i class="bi bi-download"></i> Download</button></div>
          </article>
        </section>
      </template>
    </main>
    <LoginModal v-model="showLogin" hide-close-button :dismissible="false" @success="onLoginSuccess" />
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import LoginModal from '../components/auth/LoginModal.vue';
import PeshkashLogo from '../components/PeshkashLogo.vue';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/auth';

type SharedArtwork = { key?: string; label?: string; svg: string };
type SharedCollection = { id: number; name: string; notes?: string; remarks?: string; artworks: SharedArtwork[]; updatedAt: string; readOnly: true };
const route = useRoute();
const auth = useAuthStore();
const collection = ref<SharedCollection | null>(null);
const loading = ref(false);
const error = ref('');
const showLogin = ref(false);

function svgDataUrl(svg: string): string { return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`; }
function safeFilename(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'artwork'; }
function downloadArtwork(artwork: SharedArtwork, index: number): void {
  const url = URL.createObjectURL(new Blob([artwork.svg], { type: 'image/svg+xml;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${safeFilename(artwork.label || `artwork-${index + 1}`)}.svg`; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function loadCollection(): Promise<void> {
  if (!auth.isLoggedIn) { loading.value = false; showLogin.value = true; return; }
  loading.value = true; error.value = '';
  try { collection.value = (await axios.get<SharedCollection>(`${API_BASE_URL}/print-collections/shared/${encodeURIComponent(String(route.params.token))}`)).data; }
  catch (err: any) {
    if (err.response?.status === 401) {
      auth.logout();
      showLogin.value = true;
      return;
    }
    error.value = err.response?.data?.error || 'This link is not available for the signed-in phone number.';
  }
  finally { loading.value = false; }
}
async function onLoginSuccess(): Promise<void> {
  showLogin.value = false;
  await loadCollection();
}
onMounted(loadCollection);
</script>

<style scoped>
.shared-collection-page{background:#f5f2ee;color:#1a1410;min-height:100vh}.shared-collection-page>header{align-items:center;background:#fff;border-bottom:1px solid #e5ddd4;display:flex;justify-content:space-between;padding:16px clamp(18px,4vw,56px)}header span,.heading>p{color:#ad7d43;font-size:10px;font-weight:800;letter-spacing:.14em}main{margin:auto;max-width:1180px;padding:42px clamp(18px,4vw,56px) 70px}.heading h1{font:400 clamp(30px,5vw,52px) Rufina,serif;margin:5px 0 22px}.context{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));margin-bottom:30px}.context article{background:#fff;border-left:3px solid #bd945a;display:grid;gap:5px;padding:13px 15px}.context b{font-size:10px;text-transform:uppercase}.context span{color:#62564d;font-size:13px;white-space:pre-wrap}.artwork-grid{display:grid;gap:18px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}.artwork-grid article{background:#fff;border:1px solid #e0d6cc}.artwork-grid figure{align-items:center;background:#eae4de;display:flex;height:280px;justify-content:center;margin:0;padding:18px}.artwork-grid img{height:100%;max-width:100%;object-fit:contain}.artwork-grid article>div{align-items:center;display:flex;gap:12px;justify-content:space-between;padding:12px}.artwork-grid span{display:grid}.artwork-grid b{font-size:12px}.artwork-grid small{color:#817266;font-size:9px}.artwork-grid button,.state button{background:#1a1410;border:0;color:#fff;font-size:11px;padding:10px 12px}.state{align-items:center;display:flex;flex-direction:column;justify-content:center;min-height:65vh;text-align:center}.state i{color:#ad7d43;font-size:34px}.state h1{font-family:Rufina,serif}.state p{color:#706157;max-width:460px}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
</style>
