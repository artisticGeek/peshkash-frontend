<template>
  <section class="engagement-shell">
    <header class="engagement-intro">
      <div>
        <p class="engagement-kicker">Peshkash engagement</p>
        <h2>Bring people back, thoughtfully.</h2>
        <p>Build campaigns only for people who explicitly asked to hear from {{ vendorName || 'this vendor' }}.</p>
      </div>
      <span class="sender-chip"><i class="bi bi-whatsapp"></i> Sent by Peshkash Updates</span>
    </header>

    <div v-if="!vendorId" class="engagement-empty"><i class="bi bi-building"></i><div><strong>Select a vendor</strong><p>Campaigns and consented audiences are always vendor-specific.</p></div></div>
    <div v-else-if="loading" class="engagement-loading"><span></span><span></span><span></span></div>
    <div v-else-if="error" class="engagement-empty"><i class="bi bi-cloud-slash"></i><div><strong>Could not load Engage</strong><p>{{ error }}</p></div><button class="eg-link" @click="load">Try again</button></div>

    <template v-else-if="overview">
      <div class="audience-strip">
        <article><span>Consented on WhatsApp</span><strong>{{ overview.audience.whatsappOptedIn }}</strong><small>sendable now</small></article>
        <article><span>Known visitors</span><strong>{{ overview.audience.knownUsers }}</strong><small>identified by login</small></article>
        <article><span>Active in 30 days</span><strong>{{ overview.audience.recentlyActive }}</strong><small>recent visitors</small></article>
        <article><span>Engaged</span><strong>{{ overview.audience.engagedUsers }}</strong><small>saved or reacted</small></article>
      </div>

      <div class="channel-status">
        <span :class="['status-dot', selectedProviderStatus]"></span>
        <div>
          <strong>{{ draft.channel === 'whatsapp' ? 'WhatsApp delivery' : 'Peshkash push' }}</strong>
          <p v-if="selectedProviderStatus === 'configured'">Connected and ready to send to opted-in recipients.</p>
          <p v-else>{{ draft.channel === 'whatsapp' ? 'Add Meta WhatsApp credentials and an approved template before sending.' : 'Add VAPID keys before sending browser notifications.' }}</p>
        </div>
        <span class="status-label">{{ selectedProviderStatus === 'configured' ? 'Connected' : 'Setup needed' }}</span>
      </div>

      <div class="engagement-grid">
        <form class="composer" @submit.prevent="saveDraft">
          <div class="section-heading"><div><p class="engagement-kicker">New campaign</p><h3>Compose an update</h3></div><span>{{ recipientCount }} recipients</span></div>

          <label><span>Channel</span><select v-model="draft.channel"><option value="whatsapp">WhatsApp</option><option value="push">Peshkash push</option></select></label>
          <label><span>Starting point</span><select v-model="draft.templateKey" @change="applyTemplate"><option value="new_collection">New collection</option><option value="event_reminder">Event reminder</option><option value="saved_followup">Saved-item follow-up</option><option value="custom">Write my own</option></select></label>
          <label><span>Internal campaign name</span><input v-model.trim="draft.title" maxlength="120" placeholder="September collection rollout" /></label>
          <label><span>Message</span><textarea v-model.trim="draft.message" rows="7" maxlength="1200" placeholder="Write a concise, useful update..."></textarea><small>{{ draft.message.length }}/1200</small></label>

          <div class="consent-note"><i class="bi bi-shield-check"></i><p><strong>Consent-safe audience</strong><br>Only people who enabled {{ draft.channel === 'whatsapp' ? 'WhatsApp updates' : 'browser notifications' }} for {{ vendorName }} are included. Identity alone is never treated as permission.</p></div>
          <div class="composer-actions"><button class="eg-primary" :disabled="saving || !draft.title || !draft.message">{{ saving ? 'Saving…' : 'Save campaign draft' }}</button></div>
          <p v-if="savedMessage" class="saved-message" role="status">{{ savedMessage }}</p>
        </form>

        <aside class="message-preview">
          <p class="preview-label">Recipient preview</p>
          <div class="phone-preview">
            <header><span class="sender-avatar">P</span><div><strong>Peshkash Updates</strong><small>Business account</small></div></header>
            <div class="message-bubble"><p>{{ draft.message || 'Your campaign message will appear here.' }}</p><a href="#" @click.prevent>Explore on Peshkash</a><time>10:42</time></div>
            <p class="vendor-context">Update from {{ vendorName }}</p>
          </div>
        </aside>
      </div>

      <section class="campaign-list">
        <div class="section-heading"><div><p class="engagement-kicker">Campaign history</p><h3>Drafts and delivery</h3></div><span>{{ overview.campaigns.length }} total</span></div>
        <div v-if="overview.campaigns.length" class="campaign-table">
          <article v-for="campaign in overview.campaigns" :key="campaign.id">
            <span class="campaign-icon"><i :class="campaign.channel === 'whatsapp' ? 'bi bi-whatsapp' : 'bi bi-bell'"></i></span>
            <div><strong>{{ campaign.title }}</strong><p>{{ campaign.message }}</p></div>
            <span>{{ campaign.recipientCount }} recipients</span>
            <span class="draft-pill">{{ campaign.status }}</span>
            <time>{{ formatDate(campaign.createdAt) }}</time>
            <div v-if="campaign.status === 'draft' || campaign.status === 'failed'" class="campaign-send">
              <button v-if="confirmCampaignId !== campaign.id" type="button" class="eg-link" :disabled="!providerReady(campaign.channel) || !campaign.recipientCount" @click="confirmCampaignId=campaign.id">Send</button>
              <template v-else>
                <span>Send to {{ campaign.recipientCount }}?</span>
                <button type="button" class="eg-primary" :disabled="sendingCampaignId === campaign.id" @click="sendCampaign(campaign)">{{ sendingCampaignId === campaign.id ? 'Sending…' : 'Confirm' }}</button>
                <button type="button" class="eg-link" :disabled="sendingCampaignId === campaign.id" @click="confirmCampaignId=null">Cancel</button>
              </template>
            </div>
          </article>
        </div>
        <div v-else class="campaign-empty">Campaign drafts will appear here.</div>
        <p v-if="deliveryMessage" class="saved-message" role="status">{{ deliveryMessage }}</p>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import axios from 'axios'
import { computed, reactive, ref, watch } from 'vue'
import { API_BASE_URL } from '../../config'

type Campaign = { id:number;channel:'whatsapp'|'push';title:string;message:string;status:string;recipientCount:number;createdAt:string }
type Overview = { sender:{name:string;whatsapp:'configured'|'not_configured';push:'configured'|'not_configured'};audience:{knownUsers:number;recentlyActive:number;engagedUsers:number;whatsappOptedIn:number;pushOptedIn:number};campaigns:Campaign[] }
const props=defineProps<{vendorId?:number;vendorName?:string}>()
const loading=ref(false),saving=ref(false),error=ref(''),savedMessage=ref(''),deliveryMessage=ref(''),overview=ref<Overview|null>(null)
const confirmCampaignId=ref<number|null>(null),sendingCampaignId=ref<number|null>(null)
const templates:Record<string,string>={new_collection:'A new collection from {{vendor}} is now live on Peshkash. Explore it here:',event_reminder:'A reminder from {{vendor}}: your Peshkash experience is coming up. View the details here:',saved_followup:'Something you saved from {{vendor}} is waiting for another look. Return to your collection here:',custom:''}
const draft=reactive<{channel:'whatsapp'|'push';templateKey:string;title:string;message:string}>({channel:'whatsapp',templateKey:'new_collection',title:'',message:''})
const recipientCount=computed(()=>draft.channel==='whatsapp'?overview.value?.audience.whatsappOptedIn??0:overview.value?.audience.pushOptedIn??0)
const selectedProviderStatus=computed(()=>draft.channel==='whatsapp'?overview.value?.sender.whatsapp??'not_configured':overview.value?.sender.push??'not_configured')
function providerReady(channel:'whatsapp'|'push'){return channel==='whatsapp'?overview.value?.sender.whatsapp==='configured':overview.value?.sender.push==='configured'}
function applyTemplate(){if(draft.templateKey!=='custom')draft.message=templates[draft.templateKey].replace('{{vendor}}',props.vendorName||'this vendor')}
async function load(){if(!props.vendorId){overview.value=null;return}loading.value=true;error.value='';try{overview.value=(await axios.get<Overview>(`${API_BASE_URL}/engagement/overview`,{params:{vendorId:props.vendorId}})).data;if(!draft.message)applyTemplate()}catch(e:any){error.value=e?.response?.data?.error||'Please try again.'}finally{loading.value=false}}
async function saveDraft(){if(!props.vendorId)return;saving.value=true;savedMessage.value='';try{const campaign=(await axios.post<Campaign>(`${API_BASE_URL}/engagement/campaigns`,{vendorId:props.vendorId,...draft})).data;overview.value?.campaigns.unshift(campaign);savedMessage.value=`Draft saved for ${campaign.recipientCount} consented recipient${campaign.recipientCount===1?'':'s'}.`;draft.title=''}catch(e:any){savedMessage.value=e?.response?.data?.error||'Could not save this draft.'}finally{saving.value=false}}
async function sendCampaign(campaign:Campaign){if(!props.vendorId||sendingCampaignId.value)return;sendingCampaignId.value=campaign.id;deliveryMessage.value='';try{const result=(await axios.post(`${API_BASE_URL}/engagement/campaigns/${campaign.id}/send`,{vendorId:props.vendorId})).data;campaign.status=result.status;deliveryMessage.value=`${result.delivered} message${result.delivered===1?'':'s'} accepted by the provider${result.failed?`; ${result.failed} failed`:''}.`;confirmCampaignId.value=null}catch(e:any){deliveryMessage.value=e?.response?.data?.error||'Could not send this campaign.'}finally{sendingCampaignId.value=null}}
function formatDate(value:string){return new Date(value).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
watch(()=>props.vendorId,load,{immediate:true})
</script>

<style scoped>
.engagement-shell{color:#211810;padding:1.25rem 0 4rem}.engagement-intro{align-items:flex-start;border-bottom:1px solid #ddd0c0;display:flex;gap:2rem;justify-content:space-between;padding:0 0 1.5rem}.engagement-kicker{color:#a77d45;font-size:.64rem;font-weight:800;letter-spacing:.16em;margin:0 0 .55rem;text-transform:uppercase}.engagement-intro h2{font:500 2rem Georgia,serif;margin:0}.engagement-intro p:not(.engagement-kicker){color:#756351;margin:.6rem 0 0}.sender-chip{align-items:center;background:#efe4d5;border-radius:999px;color:#6f563e;display:flex;font-size:.75rem;gap:.45rem;padding:.55rem .8rem;white-space:nowrap}.audience-strip{border-bottom:1px solid #ddd0c0;display:grid;grid-template-columns:repeat(4,1fr)}.audience-strip article{border-right:1px solid #ddd0c0;padding:1.2rem}.audience-strip article:first-child{padding-left:0}.audience-strip article:last-child{border:0}.audience-strip span,.audience-strip small{color:#806e5c;display:block;font-size:.68rem}.audience-strip strong{display:block;font:500 1.75rem Georgia,serif;margin:.25rem 0}.channel-status{align-items:center;background:#fffaf3;border:1px solid #dfd2c2;border-radius:12px;display:grid;gap:.8rem;grid-template-columns:12px 1fr auto;margin:1.5rem 0;padding:1rem}.channel-status p{color:#7a6856;font-size:.75rem;margin:.2rem 0 0}.status-dot{border-radius:50%;height:9px;width:9px}.status-dot.configured{background:#4f845b}.status-dot.not_configured{background:#bc8a49}.status-label{color:#8b735b;font-size:.7rem}.engagement-grid{display:grid;gap:1.5rem;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr)}.composer,.message-preview{background:#fffaf3;border:1px solid #dfd2c2;border-radius:14px;padding:1.2rem}.section-heading{align-items:end;display:flex;justify-content:space-between;margin-bottom:1.1rem}.section-heading h3{font:500 1.35rem Georgia,serif;margin:0}.section-heading>span{color:#8b7966;font-size:.7rem}.composer label{display:block;margin-bottom:.9rem}.composer label>span{display:block;font-size:.69rem;font-weight:700;margin-bottom:.4rem}.composer input,.composer select,.composer textarea{background:#fff;border:1px solid #dacbbb;border-radius:8px;color:#2b2018;font:inherit;padding:.7rem;width:100%}.composer textarea{line-height:1.5;resize:vertical}.composer label>small{color:#9a8875;display:block;font-size:.65rem;text-align:right}.consent-note{align-items:flex-start;background:#f2e9dd;border-radius:10px;color:#6f5a44;display:flex;font-size:.72rem;gap:.7rem;padding:.8rem}.consent-note i{color:#8b693f;font-size:1rem}.consent-note p{margin:0}.composer-actions{display:flex;gap:.6rem;margin-top:1rem}.eg-primary,.eg-disabled,.eg-link{border-radius:8px;font-size:.75rem;font-weight:700;padding:.7rem 1rem}.eg-primary{background:#241a13;border:1px solid #241a13;color:#fff7ec}.eg-primary:disabled{opacity:.45}.eg-disabled{background:transparent;border:1px solid #d4c5b5;color:#9b8976}.eg-link{background:transparent;border:1px solid #d4c5b5;color:#6c5845}.saved-message{color:#6c6844;font-size:.75rem;margin:.8rem 0 0}.preview-label{color:#a77d45;font-size:.64rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.phone-preview{background:#e9e4dc;border-radius:18px;min-height:380px;overflow:hidden}.phone-preview header{align-items:center;background:#f8f5f0;display:flex;gap:.65rem;padding:.8rem}.phone-preview header small{color:#827565;display:block;font-size:.62rem}.sender-avatar{background:#241a13;border-radius:50%;color:#bd945a;display:grid;height:34px;place-items:center;width:34px}.message-bubble{background:#fff;border-radius:8px;box-shadow:0 2px 4px #00000012;margin:1rem;max-width:88%;padding:.75rem;position:relative}.message-bubble p{font-size:.78rem;line-height:1.45;white-space:pre-line}.message-bubble a{color:#825c34;display:block;font-size:.72rem;font-weight:700;text-decoration:none}.message-bubble time{color:#9c9184;display:block;font-size:.58rem;text-align:right}.vendor-context{color:#8a7c6c;font-size:.65rem;text-align:center}.campaign-list{margin-top:1.7rem}.campaign-table{border-bottom:1px solid #ddd0c0}.campaign-table article{align-items:center;border-top:1px solid #ddd0c0;display:grid;gap:.8rem;grid-template-columns:34px minmax(0,1fr) auto auto auto;padding:.85rem .2rem}.campaign-icon{background:#eee3d4;border-radius:50%;display:grid;height:30px;place-items:center;width:30px}.campaign-table p{color:#806f5d;font-size:.7rem;margin:.2rem 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.campaign-table>article>span,.campaign-table time{color:#8b7966;font-size:.68rem}.draft-pill{background:#efe4d5;border-radius:999px;padding:.25rem .5rem;text-transform:capitalize}.campaign-empty,.engagement-empty{align-items:center;border:1px dashed #d8c8b5;border-radius:12px;color:#756351;display:flex;gap:.8rem;padding:1.2rem}.campaign-empty{display:block}.engagement-empty p{font-size:.75rem;margin:.2rem 0 0}.engagement-loading{display:grid;gap:.7rem;margin-top:1.5rem}.engagement-loading span{animation:pulse 1.2s infinite;background:#e6dacb;border-radius:10px;height:70px}@keyframes pulse{50%{opacity:.45}}@media(max-width:800px){.engagement-intro{display:block}.sender-chip{display:inline-flex;margin-top:1rem}.audience-strip{grid-template-columns:1fr 1fr}.audience-strip article:nth-child(2){border-right:0}.audience-strip article:nth-child(-n+2){border-bottom:1px solid #ddd0c0}.engagement-grid{grid-template-columns:1fr}.campaign-table article{grid-template-columns:34px 1fr auto}.campaign-table article>span:nth-of-type(2),.campaign-table time{display:none}.composer-actions{align-items:stretch;flex-direction:column}}
.campaign-send{align-items:center;display:flex;gap:.45rem}.campaign-send>span{color:#745f4a;font-size:.68rem;white-space:nowrap}.campaign-send button{padding:.4rem .65rem}.campaign-send button:disabled{cursor:not-allowed;opacity:.45}.campaign-table article{grid-template-columns:34px minmax(0,1fr) auto auto auto auto}@media(max-width:800px){.campaign-table article{grid-template-columns:34px 1fr auto}.campaign-send{grid-column:2/-1}.campaign-table article>.campaign-send{display:flex}}
</style>
