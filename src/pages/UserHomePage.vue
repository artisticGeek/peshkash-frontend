<template>
  <div class="uh-page">
    <PublicNav />
    <LoginModal v-model="loginOpen" @success="onLoginSuccess" />
    <main class="uh-shell">
      <button type="button" class="uh-back" aria-label="Go back" @click="goBack"><i class="bi bi-chevron-left"></i><span>Back</span></button>
      <header class="uh-hero">
        <div><p class="uh-kicker">YOUR PESHKASH</p><h1>Everything that caught your eye.</h1><p v-if="auth.isLoggedIn" class="uh-sub">Your collection and history across signed-in devices · {{ maskedPhone }}</p><p v-else class="uh-sub">Sign in once to keep the things you discover together.</p></div>
        <button v-if="auth.isLoggedIn" class="uh-signout" type="button" @click="signOut">Sign out</button>
      </header>
      <section v-if="!auth.isLoggedIn" class="uh-login-card"><i class="bi bi-bookmark-heart"></i><h2>Your finds, waiting for you</h2><p>Use your phone number to see your saved items, reactions and history.</p><button type="button" @click="loginOpen = true">Continue with phone</button></section>
      <template v-else>
        <nav class="uh-primary-tabs" aria-label="Your Peshkash pages"><RouterLink to="/home/saved" :class="{ active: !isHistoryPage && !isPreferencesPage }"><i class="bi bi-collection"></i>Collection</RouterLink><RouterLink to="/home/history" :class="{ active: isHistoryPage }"><i class="bi bi-clock-history"></i>History</RouterLink><RouterLink to="/home/preferences" :class="{ active: isPreferencesPage }"><i class="bi bi-bell"></i>Updates</RouterLink></nav>
        <div v-if="!isPreferencesPage" class="uh-toolbar">
          <label class="uh-search"><i class="bi bi-search"></i><input v-model.trim="search" type="search" :placeholder="isHistoryPage ? 'Search history, items, events or vendors' : 'Search this collection'" aria-label="Search" /><button v-if="search" type="button" aria-label="Clear search" @click="search = ''"><i class="bi bi-x-lg"></i></button></label>
          <div v-if="isHistoryPage" class="uh-range-tabs" role="group" aria-label="History time range">
            <button v-for="option in rangeOptions" :key="option.value" type="button" :class="{ active: range === option.value }" :aria-pressed="range === option.value" @click="range = option.value">{{ option.label }}</button>
          </div>
        </div>
        <div v-if="loading" class="uh-loading"><span></span><span></span><span></span></div>
        <div v-else-if="error" class="uh-error"><i class="bi bi-cloud-slash"></i><span>{{ error }}</span><button @click="load">Try again</button></div>
        <template v-else-if="history && !isHistoryPage && !isPreferencesPage">
          <section class="uh-heading"><div><p class="uh-section-kicker">Your collection</p><h2>Things you kept</h2></div><p>{{ filteredItems.length }} shown</p></section>
          <nav class="uh-pills" aria-label="Collection filters"><RouterLink v-for="option in collectionPages" :key="option.key" :to="`/home/${option.key}`" :class="{ active: section === option.key }">{{ option.label }} <span>{{ option.count }}</span></RouterLink></nav>
          <section v-if="filteredItems.length" class="uh-list">
            <RouterLink v-for="entry in filteredItems" :key="`${section}-${entry.id}`" :to="entry.publicPath || '/home/saved'" class="uh-card" :class="{ 'is-unavailable': entry.availability !== 'available' }">
              <div class="uh-thumb"><img v-if="showImage(entry)" :src="entry.image!" :alt="entry.itemName" @error="markImageFailed(entry)" /><span v-else class="uh-monogram">{{ guestInitials(entry.itemName) }}</span></div>
              <div class="uh-copy"><div class="uh-card-top"><span class="uh-action">{{ actionMeta(entry.actionType).label }}</span><time>{{ relativeTime(entry.occurredAt) }}</time></div><h2>{{ entry.itemName }} <span v-if="entry.availabilityLabel" class="uh-availability">{{ entry.availabilityLabel }}</span></h2><p>{{ [entry.vendorName, entry.eventName].filter(Boolean).join(' · ') }}</p></div><i v-if="entry.publicPath" class="bi bi-chevron-right uh-arrow"></i>
            </RouterLink>
          </section>
          <section v-else class="uh-empty"><i :class="section === 'saved' ? 'bi bi-bookmark' : section === 'liked' ? 'bi bi-hand-thumbs-up' : 'bi bi-hand-thumbs-down'"></i><div><h2>{{ search ? 'No matching items' : emptyTitle }}</h2><p>{{ search ? 'Try a different search.' : emptyCopy }}</p></div></section>
        </template>
        <template v-else-if="isHistoryPage">
          <section class="uh-heading"><div><p class="uh-section-kicker">Activity history</p><h2>Your audit trail</h2></div><p>{{ audit.total }} {{ audit.total === 1 ? 'entry' : 'entries' }}</p></section>
          <div v-if="audit.rows.length" class="uh-audit-list"><RouterLink v-for="entry in audit.rows" :key="entry.id" :to="entry.publicPath || '/home/history'" class="uh-audit-row"><span class="uh-audit-icon"><i :class="actionMeta(entry.actionType).icon"></i></span><span class="uh-audit-copy"><strong>{{ actionMeta(entry.actionType).label }}</strong><span>{{ entry.itemName }}<small v-if="entry.availabilityLabel"> · {{ entry.availabilityLabel }}</small></span></span><time>{{ relativeTime(entry.occurredAt) }}</time></RouterLink></div>
          <section v-else class="uh-empty"><i class="bi bi-clock-history"></i><div><h2>No history found</h2><p>Try another search or time range.</p></div></section>
          <nav v-if="audit.pages > 1" class="uh-pagination" aria-label="History pages"><button :disabled="audit.page <= 1" @click="goToPage(audit.page - 1)"><i class="bi bi-chevron-left"></i> Previous</button><span>Page {{ audit.page }} of {{ audit.pages }}</span><button :disabled="audit.page >= audit.pages" @click="goToPage(audit.page + 1)">Next <i class="bi bi-chevron-right"></i></button></nav>
        </template>
        <template v-else-if="isPreferencesPage">
          <section class="uh-heading"><div><p class="uh-section-kicker">Communication preferences</p><h2>Updates you asked for</h2></div><p>Sent by Peshkash Updates</p></section>
          <p class="uh-preferences-intro">Choose which vendors may send you occasional WhatsApp updates through Peshkash. Your login and activity never opt you in automatically.</p>
          <div v-if="preferences.length" class="uh-preference-list">
            <article v-for="preference in preferences" :key="preference.vendorId" class="uh-preference-row">
              <span class="uh-preference-mark">{{ guestInitials(preference.vendorName) }}</span>
              <div><strong>{{ preference.vendorName }}</strong><p>Collections, event reminders and relevant updates</p></div>
              <div class="uh-channel-switches">
                <label><b><i class="bi bi-whatsapp"></i> WhatsApp</b><span class="uh-switch"><input type="checkbox" :checked="preference.whatsappEnabled" :disabled="preference.saving" @change="togglePreference(preference, ($event.target as HTMLInputElement).checked)" /><span></span><em>{{ preference.whatsappEnabled ? 'On' : 'Off' }}</em></span></label>
                <label><b><i class="bi bi-bell"></i> Push</b><span class="uh-switch"><input type="checkbox" :checked="preference.pushEnabled" :disabled="preference.pushSaving" @change="togglePushPreference(preference, ($event.target as HTMLInputElement).checked)" /><span></span><em>{{ preference.pushEnabled ? 'On' : 'Off' }}</em></span></label>
              </div>
            </article>
          </div>
          <section v-else class="uh-empty"><i class="bi bi-bell"></i><div><h2>No vendor preferences yet</h2><p>Vendors you interact with will appear here, always off until you choose otherwise.</p></div></section>
          <p v-if="preferenceMessage" class="uh-preference-message" role="status">{{ preferenceMessage }}</p>
        </template>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { API_BASE_URL } from '../config'
import PublicNav from '../components/PublicNav.vue'
import LoginModal from '../components/auth/LoginModal.vue'
import { useAuthStore } from '../stores/auth'
import { guestInitials } from '../features/events/guestPresentation'
import { disableVendorPush, enableVendorPush, pwaInstalled } from '../utils/pushNotifications'

interface Entry { id:number; itemId:number; actionType:string; occurredAt:string; itemName:string; image:string|null; vendorName:string|null; eventName:string|null; publicPath:string|null; availability:'available'|'event_expired'|'event_upcoming'|'item_unavailable'; availabilityLabel:string|null }
interface History { summary:{savedCount:number;likedCount:number;dislikedCount:number;uniqueItems:number;uniqueVendors:number}; saved:Entry[];liked:Entry[];disliked:Entry[];recent:Entry[] }
interface Audit { rows:Entry[];total:number;page:number;pageSize:number;pages:number }
interface CommunicationPreference { vendorId:number;vendorName:string;lastInteraction:string;whatsappEnabled:boolean;pushEnabled:boolean;saving?:boolean;pushSaving?:boolean }
const auth=useAuthStore(),route=useRoute(),router=useRouter()
const loginOpen=ref(false),loading=ref(false),error=ref(''),history=ref<History|null>(null),search=ref(''),range=ref<'7d'|'30d'|'90d'|'all'>('30d'),audit=ref<Audit>({rows:[],total:0,page:1,pageSize:20,pages:1}),failedImages=ref(new Set<string>()),preferences=ref<CommunicationPreference[]>([]),preferenceMessage=ref('')
let searchTimer:number|undefined
const section=computed(()=>String(route.params.section||'saved') as 'saved'|'liked'|'disliked'|'history'|'preferences')
const isHistoryPage=computed(()=>section.value==='history')
const isPreferencesPage=computed(()=>section.value==='preferences')
const maskedPhone=computed(()=>auth.phone?`${auth.phone.slice(0,-4).replace(/\d/g,'•')}${auth.phone.slice(-4)}`:'')
const collectionPages=computed(()=>[{key:'saved',label:'Saved',count:history.value?.saved.length??0},{key:'liked',label:'Liked',count:history.value?.liked.length??0},{key:'disliked',label:'Disliked',count:history.value?.disliked.length??0}])
const rangeOptions:{value:'7d'|'30d'|'90d'|'all';label:string}[]=[{value:'7d',label:'7D'},{value:'30d',label:'30D'},{value:'90d',label:'90D'},{value:'all',label:'All'}]
const currentItems=computed<Entry[]>(()=>history.value&&!isHistoryPage.value&&!isPreferencesPage.value?history.value[section.value as 'saved'|'liked'|'disliked']:[])
const filteredItems=computed(()=>{const q=search.value.toLowerCase();return q?currentItems.value.filter(e=>[e.itemName,e.vendorName,e.eventName,e.availabilityLabel].some(v=>String(v||'').toLowerCase().includes(q))):currentItems.value})
const emptyTitle=computed(()=>section.value==='saved'?'Nothing saved yet':section.value==='liked'?'No likes yet':'No dislikes yet')
const emptyCopy=computed(()=>`Items you ${section.value==='saved'?'save':section.value==='liked'?'like':'dislike'} will appear here.`)
const labels:Record<string,{label:string;icon:string}>={item_detail_view:{label:'Visited',icon:'bi bi-eye'},item_expand:{label:'Explored',icon:'bi bi-eye'},item_bookmark:{label:'Saved',icon:'bi bi-bookmark-fill'},item_unbookmark:{label:'Removed from saved',icon:'bi bi-bookmark-x'},item_like:{label:'Liked',icon:'bi bi-hand-thumbs-up-fill'},item_unlike:{label:'Removed like',icon:'bi bi-hand-thumbs-up'},item_dislike:{label:'Disliked',icon:'bi bi-hand-thumbs-down-fill'},item_undislike:{label:'Removed dislike',icon:'bi bi-hand-thumbs-down'},share_click:{label:'Shared',icon:'bi bi-share'}}
function actionMeta(type:string){return labels[type]||{label:'Viewed',icon:'bi bi-eye'}}
function imageKey(e:Entry){return`${e.itemId}:${e.image||''}`}
function showImage(e:Entry){return Boolean(e.image)&&!failedImages.value.has(imageKey(e))}
function markImageFailed(e:Entry){failedImages.value=new Set([...failedImages.value,imageKey(e)])}
function relativeTime(iso:string){const ms=Date.now()-new Date(iso).getTime(),m=Math.floor(ms/60000),h=Math.floor(ms/3600000),d=Math.floor(ms/86400000);if(m<1)return'Just now';if(m<60)return`${m}m`;if(h<24)return`${h}h`;if(d<7)return`${d}d`;return new Date(iso).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}
async function reconcile(){try{const refs:{eventName:string;menuName:string;itemName:string}[]=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)||'';if(!key.startsWith('pk-bookmark-')||localStorage.getItem(key)!=='1')continue;const[eventName,menuName,itemName]=key.slice('pk-bookmark-'.length).split(':');if(eventName&&menuName&&itemName)refs.push({eventName,menuName,itemName})}if(refs.length)await axios.post(`${API_BASE_URL}/user/bookmarks/import`,{refs})}catch{}}
async function loadCollections(){await reconcile();history.value=(await axios.get<History>(`${API_BASE_URL}/user/history`)).data}
async function loadAudit(page=1){audit.value=(await axios.get<Audit>(`${API_BASE_URL}/user/history/audit`,{params:{q:search.value,range:range.value,page,pageSize:20}})).data}
async function loadPreferences(){preferences.value=(await axios.get<{vendors:CommunicationPreference[]}>(`${API_BASE_URL}/user/communication-preferences`)).data.vendors}
async function load(){if(!auth.isLoggedIn)return;loading.value=true;error.value='';try{if(isPreferencesPage.value)await loadPreferences();else{await loadCollections();if(isHistoryPage.value)await loadAudit(Number(route.query.page)||1)}}catch{error.value='We could not load this page right now.'}finally{loading.value=false}}
async function togglePreference(preference:CommunicationPreference,enabled:boolean){preference.saving=true;preferenceMessage.value='';const previous=preference.whatsappEnabled;preference.whatsappEnabled=enabled;try{await axios.put(`${API_BASE_URL}/user/communication-preferences/${preference.vendorId}`,{whatsappEnabled:enabled});preferenceMessage.value=enabled?`WhatsApp updates enabled for ${preference.vendorName}.`:`WhatsApp updates stopped for ${preference.vendorName}.`}catch(e:any){preference.whatsappEnabled=previous;preferenceMessage.value=e?.response?.data?.error||'Could not update this preference.'}finally{preference.saving=false}}
async function togglePushPreference(preference:CommunicationPreference,enabled:boolean){preference.pushSaving=true;preferenceMessage.value='';const previous=preference.pushEnabled;preference.pushEnabled=enabled;try{if(enabled&&!pwaInstalled()){window.dispatchEvent(new CustomEvent('peshkash:open-install'));throw new Error('Install Peshkash first. You can enable notifications here after opening the installed app.')}if(enabled)await enableVendorPush(preference.vendorId);else await disableVendorPush(preference.vendorId);preferenceMessage.value=enabled?`Browser notifications enabled for ${preference.vendorName}.`:`Browser notifications stopped for ${preference.vendorName}.`}catch(e:any){preference.pushEnabled=previous;preferenceMessage.value=e?.response?.data?.error||e?.message||'Could not update browser notifications.'}finally{preference.pushSaving=false}}
function goToPage(page:number){router.replace({path:'/home/history',query:{page}})}
function goBack(){if(window.history.length>2)router.back();else router.push('/')}
function onLoginSuccess(){loginOpen.value=false;load()}
function signOut(){auth.logout();history.value=null}
watch(section,()=>{search.value='';load()})
watch(range,()=>{if(isHistoryPage.value){router.replace('/home/history');loadAudit(1)}})
watch(search,()=>{if(!isHistoryPage.value)return;window.clearTimeout(searchTimer);searchTimer=window.setTimeout(()=>{router.replace('/home/history');loadAudit(1)},300)})
watch(()=>route.query.page,()=>{if(isHistoryPage.value)loadAudit(Number(route.query.page)||1)})
onMounted(load)
</script>

<style scoped>
.uh-channel-switches{display:grid;gap:.55rem;min-width:180px}.uh-channel-switches>label{align-items:center;display:flex;justify-content:space-between}.uh-channel-switches b{color:#6f5e4d;font-size:.68rem;font-weight:600}.uh-channel-switches b i{margin-right:.25rem}
.uh-preferences-intro{color:#786858;font-size:.82rem;line-height:1.55;max-width:650px}.uh-preference-list{border-bottom:1px solid #ded2c4;margin-top:1.2rem}.uh-preference-row{align-items:center;border-top:1px solid #ded2c4;display:grid;gap:.85rem;grid-template-columns:42px 1fr auto;padding:1rem .2rem}.uh-preference-mark{background:#e9ded0;border-radius:50%;color:#765a3d;display:grid;font:500 .85rem Georgia,serif;height:38px;place-items:center;width:38px}.uh-preference-row strong{font:500 1rem Georgia,serif}.uh-preference-row p{color:#82715f;font-size:.72rem;margin:.2rem 0 0}.uh-switch{align-items:center;display:flex;gap:.45rem}.uh-switch input{height:1px;opacity:0;position:absolute;width:1px}.uh-switch>span{background:#d6c9ba;border-radius:999px;cursor:pointer;height:24px;position:relative;transition:.2s;width:42px}.uh-switch>span:after{background:#fff;border-radius:50%;box-shadow:0 1px 4px #0003;content:'';height:18px;left:3px;position:absolute;top:3px;transition:.2s;width:18px}.uh-switch input:checked+span{background:#8a683f}.uh-switch input:checked+span:after{transform:translateX(18px)}.uh-switch input:focus-visible+span{outline:2px solid #a77d45;outline-offset:2px}.uh-switch em{color:#887866;font-size:.68rem;font-style:normal;min-width:20px}.uh-preference-message{color:#6f6747;font-size:.75rem;margin-top:1rem}
.uh-back{align-items:center;background:transparent;border:0;color:#7d6a57;display:inline-flex;font-size:.76rem;gap:.35rem;margin:0 0 1.25rem;padding:.35rem .15rem}.uh-back:hover{color:#211810}.uh-back:focus-visible{outline:2px solid #a77d45;outline-offset:3px}
.uh-page{min-height:100vh;background:#f4eee5;color:#211810}.uh-shell{max-width:900px;margin:auto;padding:clamp(2rem,6vw,4.5rem) 1rem 5rem}.uh-hero{display:flex;justify-content:space-between;gap:2rem;border-bottom:1px solid #d9cbbb;padding-bottom:2rem}.uh-kicker,.uh-section-kicker{color:#a77d45;font-size:.65rem;font-weight:800;letter-spacing:.17em;margin:0 0 .7rem;text-transform:uppercase}.uh-hero h1{font:500 clamp(2rem,6vw,3.6rem)/1.02 Georgia,serif;max-width:640px;margin:0}.uh-sub{color:#766554;margin:.9rem 0 0}.uh-signout{background:none;border:0;color:#8a6b49;font-size:.8rem}.uh-login-card{text-align:center;border:1px solid #ddcfbf;background:#fffaf3;border-radius:20px;margin:3rem auto;padding:3rem 1.5rem;max-width:520px}.uh-login-card>i{font-size:2rem;color:#b78952}.uh-login-card h2{font:500 1.65rem Georgia,serif}.uh-login-card p{color:#786858}.uh-login-card button{border:0;border-radius:999px;background:#211810;color:#f6ead9;padding:.75rem 1.2rem}.uh-primary-tabs{display:flex;border-bottom:1px solid #d9cbbb;margin-top:2rem}.uh-primary-tabs a{align-items:center;color:#826f5c;display:flex;gap:.45rem;padding:.8rem 1.1rem;text-decoration:none}.uh-primary-tabs a.active{border-bottom:2px solid #211810;color:#211810;font-weight:700}.uh-toolbar{display:flex;gap:.7rem;margin:1.4rem 0}.uh-search{align-items:center;background:#fffaf3;border:1px solid #d8c8b5;border-radius:10px;display:flex;flex:1;padding:0 .8rem}.uh-search>i{color:#9b8062}.uh-search input{background:transparent;border:0;flex:1;outline:0;padding:.72rem}.uh-search button{background:none;border:0;color:#8b7761}.uh-range-tabs{align-items:center;background:#e9ddce;border:1px solid #d8c8b5;border-radius:10px;display:flex;padding:3px}.uh-range-tabs button{background:transparent;border:0;border-radius:7px;color:#766451;font-size:.72rem;font-weight:700;min-width:42px;padding:.52rem .62rem;transition:background .15s,color .15s,box-shadow .15s}.uh-range-tabs button:hover{color:#211810}.uh-range-tabs button.active{background:#fffaf3;box-shadow:0 1px 5px rgba(62,43,25,.13);color:#211810}.uh-range-tabs button:focus-visible{outline:2px solid #a77d45;outline-offset:1px}.uh-heading{align-items:end;display:flex;justify-content:space-between;margin-top:2rem}.uh-heading h2{font:500 1.45rem Georgia,serif;margin:0}.uh-heading p:last-child{color:#8b7966;font-size:.75rem}.uh-pills{display:flex;gap:.45rem;margin:1.2rem 0}.uh-pills a{border:1px solid #d6c6b4;border-radius:999px;color:#665543;padding:.55rem .85rem;text-decoration:none}.uh-pills a.active{background:#251b13;color:#f8eddf}.uh-pills span{opacity:.6;margin-left:.2rem}.uh-list{display:grid;gap:.7rem}.uh-card{align-items:center;background:#fffaf3;border:1px solid #e0d4c5;border-radius:15px;color:inherit;display:grid;gap:1rem;grid-template-columns:74px 1fr auto;padding:.7rem;text-decoration:none}.uh-card:hover{box-shadow:0 10px 24px #5b422313;transform:translateY(-1px)}.uh-card.is-unavailable{background:#fbf6ef}.uh-thumb{background:linear-gradient(145deg,#eeeae4,#e5dfd7);border-radius:11px;color:#776653;display:grid;height:74px;overflow:hidden;place-items:center;width:74px}.uh-thumb img{height:100%;object-fit:cover;width:100%}.uh-monogram{font:500 1.35rem Georgia,serif}.uh-card-top{color:#917a62;display:flex;font-size:.7rem;justify-content:space-between}.uh-action{text-transform:uppercase;letter-spacing:.06em}.uh-copy h2{font:500 1.15rem Georgia,serif;margin:.35rem 0 .2rem}.uh-copy p{color:#7f6e5b;font-size:.8rem;margin:0}.uh-availability{background:#eee4d7;border-radius:999px;color:#806c57;font:700 .56rem system-ui;letter-spacing:.05em;margin-left:.35rem;padding:.24rem .42rem;text-transform:uppercase}.uh-arrow{color:#b99a75}.uh-empty,.uh-error{align-items:center;border:1px dashed #d8c8b5;border-radius:12px;display:flex;gap:.9rem;margin-top:1rem;padding:1.1rem 1.25rem}.uh-empty>i,.uh-error>i{color:#b78952;font-size:1.2rem}.uh-empty h2{font:500 1rem Georgia,serif;margin:0}.uh-empty p{color:#786858;font-size:.78rem;margin:.18rem 0 0}.uh-error button{margin-left:auto}.uh-audit-list{border-bottom:1px solid #ded2c4;margin-top:1rem}.uh-audit-row{align-items:center;border-top:1px solid #ded2c4;color:inherit;display:grid;gap:.8rem;grid-template-columns:30px 1fr auto;padding:.9rem .2rem;text-decoration:none}.uh-audit-row:hover{background:#f8f1e8}.uh-audit-icon{align-items:center;background:#e9ded0;border-radius:50%;color:#8c6a45;display:flex;height:28px;justify-content:center;width:28px}.uh-audit-copy{display:flex;gap:.45rem;min-width:0}.uh-audit-copy strong{font-size:.78rem}.uh-audit-copy>span{color:#746452;font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.uh-audit-copy small{color:#9c8063}.uh-audit-row time{color:#9a8875;font-size:.7rem}.uh-pagination{align-items:center;display:flex;justify-content:space-between;margin-top:1.2rem}.uh-pagination button{background:transparent;border:1px solid #d6c6b4;border-radius:8px;color:#665543;padding:.5rem .7rem}.uh-pagination button:disabled{opacity:.4}.uh-pagination span{color:#887866;font-size:.75rem}.uh-loading{display:grid;gap:.8rem;margin-top:2rem}.uh-loading span{animation:pulse 1.2s infinite;background:linear-gradient(90deg,#e7dbcc,#f7f0e7,#e7dbcc);background-size:200%;border-radius:12px;height:76px}@keyframes pulse{to{background-position:-200%}}
@media(max-width:600px){.uh-hero{display:block}.uh-signout{padding:1rem 0}.uh-toolbar{align-items:stretch;flex-direction:column}.uh-range-tabs{align-self:flex-start}.uh-range-tabs button{min-width:48px}.uh-card{grid-template-columns:58px 1fr auto}.uh-thumb{height:58px;width:58px}.uh-card-top time{display:none}.uh-audit-copy{display:block}.uh-audit-copy strong,.uh-audit-copy>span{display:block}.uh-audit-copy>span{margin-top:.15rem}}
@media(max-width:600px){.uh-preference-row{align-items:start;grid-template-columns:38px 1fr}.uh-channel-switches{grid-column:1/-1;padding-left:46px}}
</style>
