<template>
  <LoginModal :model-value="!auth.isLoggedIn" hide-close-button :dismissible="false" @success="load" />
  <PrintRecipientShell title="Collections" subtitle="Read-only artwork shared for print production" :phone="auth.phone" :loading="loading" @refresh="load" @logout="signOut">
    <section class="directory">
      <header><div><p>PRINT PRODUCTION</p><h1>Collections</h1><span>Open a collection to review and download its approved artwork. Editing controls are intentionally unavailable.</span></div><em>{{ collections.length }}</em></header>
      <div v-if="loading" class="state"><i class="bi bi-arrow-repeat spin"></i><span>Loading shared collections…</span></div>
      <div v-else-if="error" class="state error"><i class="bi bi-cloud-slash"></i><span>{{ error }}</span><button type="button" @click="load">Try again</button></div>
      <div v-else-if="collections.length" class="collection-list" role="table" aria-label="Shared print collections">
        <div class="collection-head" role="row"><span>Name</span><span>Notes</span><span>Remarks</span><span>Updated</span><span>Actions</span></div>
        <div v-for="collection in collections" :key="collection.token" class="collection-row" role="row" tabindex="0" @click="openCollection(collection)" @keydown.enter="openCollection(collection)">
          <span class="collection-name"><i class="bi bi-folder2"></i><span><b>{{ collection.name }}</b><small>{{ collection.artworkCount }} artworks</small></span></span>
          <p>{{ collection.notes || '—' }}</p><p>{{ collection.remarks || '—' }}</p><time>{{ formatDate(collection.updatedAt) }}</time><span class="row-actions"><button type="button" @click.stop="openCollection(collection, true)"><i class="bi bi-printer"></i> Print</button><button type="button" aria-label="Open collection" @click.stop="openCollection(collection)"><i class="bi bi-arrow-right"></i></button></span>
        </div>
      </div>
      <div v-else class="state"><i class="bi bi-folder2-open"></i><b>No collections shared</b><span>Collections shared with {{ auth.phone }} will appear here.</span></div>
    </section>
  </PrintRecipientShell>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import LoginModal from '../components/auth/LoginModal.vue';
import PrintRecipientShell from '../components/print/PrintRecipientShell.vue';
import { useAuthStore } from '../stores/auth';
import { listSharedPrintCollections, type SharedPrintCollectionSummary } from '../utils/sharedPrintCollections';

const auth = useAuthStore();
const router = useRouter();
const collections = ref<SharedPrintCollectionSummary[]>([]);
const loading = ref(false);
const error = ref('');
function formatDate(value: string): string { return value ? new Date(value).toLocaleDateString('en-IN') : '—'; }
function openCollection(collection: SharedPrintCollectionSummary, print = false): void { void router.push({ path: collection.path, query: print ? { print: '1' } : {} }); }
async function load(): Promise<void> { if (!auth.isLoggedIn) return; loading.value = true; error.value = ''; try { collections.value = await listSharedPrintCollections(); } catch (err: any) { error.value = err.response?.data?.error || 'Shared collections could not be loaded.'; } finally { loading.value = false; } }
function signOut(): void { auth.logout(); collections.value = []; }
onMounted(load);
</script>

<style scoped>
.directory{padding:28px 0}.directory>header{align-items:flex-end;display:flex;gap:24px;justify-content:space-between;margin-bottom:22px}.directory>header p{color:#ad7d43;font-size:.68rem;font-weight:800;letter-spacing:.14em;margin:0 0 5px}.directory>header h1{font:500 32px Rufina,Georgia,serif;margin:0}.directory>header span{color:#766a5e;display:block;font-size:.82rem;margin-top:7px}.directory>header em{align-items:center;background:#1a1713;border-radius:50%;color:#fff;display:flex;font-size:.78rem;font-style:normal;height:36px;justify-content:center;width:36px}.collection-list{border:1px solid #e0d6cc;background:#fff}.collection-head,.collection-row{align-items:center;display:grid;gap:16px;grid-template-columns:minmax(210px,1.2fr) minmax(150px,1fr) minmax(150px,1fr) 100px 120px}.collection-head{background:#f0e9e1;color:#7a6b5d;font-size:.68rem;font-weight:800;letter-spacing:.08em;padding:10px 14px;text-transform:uppercase}.collection-row{border-top:1px solid #ebe3da;color:inherit;cursor:pointer;padding:13px 14px;text-decoration:none}.collection-row:hover{background:#fbf7f1}.collection-name{align-items:center;display:flex;gap:10px;min-width:0}.collection-name>i{color:#ad7d43;font-size:1.15rem}.collection-name>span{display:grid;min-width:0}.collection-name b{font-size:.84rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.collection-name small,.collection-row p,.collection-row time{color:#7f7063;font-size:.72rem}.collection-row p{margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.row-actions{display:flex;gap:5px;justify-content:flex-end}.row-actions button{align-items:center;background:#fff;border:1px solid #d2c2b3;color:#725333;display:flex;font-size:.7rem;gap:5px;min-height:30px;padding:6px 8px}.row-actions button:first-child{background:#1a1713;border-color:#1a1713;color:#fff}.state{align-items:center;border:1px dashed #d8c8b5;color:#786858;display:flex;flex-direction:column;gap:8px;justify-content:center;min-height:260px;text-align:center}.state>i{color:#ad7d43;font-size:28px}.state button{background:#1a1713;border:0;color:#fff;padding:8px 12px}.spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:900px){.collection-head{display:none}.collection-row{grid-template-columns:1fr auto}.collection-row p,.collection-row time{grid-column:1/-1;white-space:normal}.row-actions{grid-column:2;grid-row:1}.directory{padding-top:20px}}
</style>
