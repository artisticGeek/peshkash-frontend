<template>
  <div class="showrooms-page" @keydown="onKeydown" tabindex="-1">
    <header class="showroom-header">
      <RouterLink to="/" aria-label="Peshkash home" @click="track('showroom_get_started')"><PeshkashLogo variant="dark-bg" :height="26" /></RouterLink>
      <div class="header-edition"><span>Showrooms</span><b>{{ pageLabel }}</b></div>
      <button type="button" aria-label="Share this showroom proposal" @click="shareShowroom"><i class="bi bi-share"></i></button>
    </header>

    <main ref="book" class="showroom-book" @scroll="syncCurrent" @touchstart="onTouchStart" @touchend="onTouchEnd">
      <section class="showroom-spread hero-spread" data-page="0">
        <img src="/resources/showrooms/showroom-hero.webp" alt="A refined contemporary showroom with furniture, textiles and sculptural objects" />
        <div class="hero-shade"></div>
        <div class="spread-copy hero-copy">
          <p class="kicker">Peshkash for showrooms</p>
          <h1>Your showroom<br><em>needs a memory.</em></h1>
          <p class="deck">A beautiful floor starts the conversation. Data helps the business remember it, learn from it and scale beyond the people who happened to be on duty.</p>
          <button type="button" class="text-link" @click="goTo(1, 'showroom_next')">See what your showroom gains <i class="bi bi-arrow-down"></i></button>
        </div>
        <p class="credit">A digital showroom format by ArtisticGeek Studios</p>
      </section>

      <section class="showroom-spread people-spread" data-page="1">
        <div class="people-photo" role="img" aria-label="A salesperson and customer reviewing materials and product details in a showroom"></div>
        <div class="people-copy">
          <p class="kicker">People create trust · systems create scale</p>
          <h2>Your best salesperson<br>cannot be everywhere.</h2>
          <p class="lead">Salespeople are vital. But a growing business cannot let product knowledge, customer interest and follow-up live only in individual memory, personal chats or whoever is on the floor that day.</p>
          <div class="truth-grid">
            <article><span>When someone is absent</span><b>the customer should still get the full story.</b></article>
            <article><span>When the team changes</span><b>the business should not lose what it learned.</b></article>
            <article><span>When you add locations</span><b>the same standard should travel with you.</b></article>
          </div>
          <p class="emphasis">Your people deliver the experience. <em>Your data makes it repeatable.</em></p>
        </div>
        <span class="edge-word">CONTINUITY</span>
      </section>

      <section class="showroom-spread touchpoints-spread" data-page="2">
        <div class="touchpoints-heading">
          <p class="kicker">One showroom · many digital doorways</p>
          <h2>Give every product<br><em>a place to speak.</em></h2>
          <p>Permanent, editable QR touchpoints let customers explore without waiting, while your team keeps the human conversation focused where it matters.</p>
        </div>
        <div class="touchpoint-gallery">
          <figure class="touchpoint-card doorway-card"><img src="/brand/qr-templates/Porcelain-Cameo/04-portfolio-postcard.svg" alt="Peshkash brand story QR card for showroom entry" /><figcaption><b>At the entrance</b><span>Brand story · collections · wayfinding</span></figcaption></figure>
          <figure class="touchpoint-card"><img src="/brand/qr-templates/Obsidian-Ring/17-furniture-product-tag.svg" alt="Peshkash furniture QR tag for showroom discovery" /><figcaption><b>On the floor</b><span>Ranges · specifications · comparisons</span></figcaption></figure>
          <figure class="touchpoint-card"><img src="/brand/qr-templates/Porcelain-Cameo/14-product-care-card.svg" alt="Peshkash care card for individual showroom products" /><figcaption><b>With the product</b><span>Story · care · save · enquire</span></figcaption></figure>
        </div>
        <p class="touchpoint-note">Printed once · destinations stay editable · no app required</p>
      </section>

      <section class="showroom-spread memory-spread" data-page="3">
        <div class="memory-heading"><p class="kicker">The showroom becomes observable</p><h2>Interest should not<br><em>walk out unseen.</em></h2></div>
        <ol class="memory-flow">
          <li><span>01</span><i class="bi bi-qr-code-scan"></i><b>A customer scans</b><small>Entrance, range, display or product</small></li>
          <li><span>02</span><i class="bi bi-phone"></i><b>They explore</b><small>Details, options, story and context</small></li>
          <li><span>03</span><i class="bi bi-bookmark-heart"></i><b>They signal intent</b><small>Save, share, call, WhatsApp or enquire</small></li>
          <li><span>04</span><i class="bi bi-diagram-3"></i><b>The business remembers</b><small>Product, place, time and action connect</small></li>
          <li><span>05</span><i class="bi bi-graph-up-arrow"></i><b>The team improves</b><small>Follow-up and merchandising use evidence</small></li>
        </ol>
        <div class="memory-value"><p><b>No surveillance theatre.</b> Read aggregate behaviour and consented actions, not imagined identities.</p><p><b>No lost context.</b> A saved product or enquiry carries the customer’s actual interest into follow-up.</p><p><b>No dependency on one person.</b> Product truth and interaction history stay with the business.</p></div>
      </section>

      <section class="showroom-spread journey-spread" data-page="4">
        <div class="journey-copy"><p class="kicker">A customer journey that survives the visit</p><h2>The conversation<br><em>continues.</em></h2><p>A customer can discover a range, open a product, save the exact piece, share it with family and contact your team later—with the context still intact.</p></div>
        <div class="journey-board" aria-label="Illustrative connected showroom customer journey">
          <div class="journey-line" aria-hidden="true"></div>
          <article><span>01</span><i class="bi bi-door-open"></i><b>Arrive</b><small>Discover the showroom story</small></article>
          <article><span>02</span><i class="bi bi-grid"></i><b>Browse</b><small>Move through relevant collections</small></article>
          <article><span>03</span><i class="bi bi-box-seam"></i><b>Understand</b><small>See material, variants and care</small></article>
          <article><span>04</span><i class="bi bi-bookmark"></i><b>Remember</b><small>Save the exact products considered</small></article>
          <article><span>05</span><i class="bi bi-chat-dots"></i><b>Continue</b><small>Enquire with useful context</small></article>
        </div>
        <p class="journey-caption">The floor creates desire. The digital layer preserves it.</p>
      </section>

      <section class="showroom-spread insights-spread" data-page="5">
        <div class="insights-copy">
          <p class="kicker">From instinct to evidence</p><h2>Know what the floor<br>is really telling you.</h2>
          <p>Illustrative insights help owners, managers and teams see what attracts attention, what needs explanation and where intent becomes action.</p>
          <ul><li><i class="bi bi-check2"></i> Which displays and QR placements are earning attention</li><li><i class="bi bi-check2"></i> Which products are explored, saved and shared most</li><li><i class="bi bi-check2"></i> Which collections create enquiries—not just compliments</li><li><i class="bi bi-check2"></i> Which locations, days and hours need a different response</li></ul>
        </div>
        <div class="insights-board" aria-label="Illustrative Peshkash showroom analytics dashboard">
          <div class="insights-label"><span>Example owner view</span><b>Showroom · This month</b></div>
          <div class="kpi-grid"><article><span>Product opens</span><strong>2,486</strong><small>↑ 18% month on month</small></article><article><span>Items saved</span><strong>612</strong><small>across 74 products</small></article><article><span>Shares</span><strong>328</strong><small>high-consideration intent</small></article><article><span>Contact actions</span><strong>196</strong><small>calls + WhatsApp</small></article></div>
          <div class="product-signal"><div class="signal-head"><span>Top product signals</span><b>Explore → action</b></div><div class="signal-row"><span>Handwoven console</span><i><b style="--w:88%"></b></i><em>42 saves</em></div><div class="signal-row"><span>Brass floor lamp</span><i><b style="--w:72%"></b></i><em>31 shares</em></div><div class="signal-row"><span>Ivory lounge chair</span><i><b style="--w:61%"></b></i><em>24 enquiries</em></div></div>
          <p class="insights-disclaimer">Example data for demonstration—not a claim about a live showroom.</p>
        </div>
      </section>

      <section class="showroom-spread closing-spread" data-page="6">
        <div class="closing-grid" aria-hidden="true"></div><div class="closing-mark">P</div>
        <div class="spread-copy closing-copy"><p class="kicker">Build a showroom that compounds</p><h2>Do not just sell.<br><em>Learn.</em></h2><p>Your team should not have to start from zero with every visitor, every shift or every new location. Make products discoverable, interest measurable and follow-up informed.</p><div class="closing-actions"><a :href="whatsappUrl" target="_blank" rel="noopener" @click="track('showroom_whatsapp')"><i class="bi bi-whatsapp"></i> Digitise my showroom</a><button type="button" @click="shareShowroom"><i class="bi bi-share"></i> Share this proposal</button></div><p class="studio-credit">A Peshkash format by ArtisticGeek Studios</p></div>
      </section>
    </main>

    <nav class="page-rail" aria-label="Showroom pages"><button v-for="(_, index) in pages" :key="index" type="button" :class="{ active: current === index }" :aria-label="`Go to page ${index + 1}`" @click="goTo(index)"><span>{{ String(index + 1).padStart(2, '0') }}</span></button></nav>
    <div class="page-controls"><button type="button" :disabled="current === 0" aria-label="Previous page" @click="goTo(current - 1, 'showroom_previous')"><i class="bi bi-arrow-up-left"></i></button><span>{{ String(current + 1).padStart(2, '0') }} / {{ String(pages.length).padStart(2, '0') }}</span><button type="button" :disabled="current === pages.length - 1" aria-label="Next page" @click="goTo(current + 1, 'showroom_next')"><i class="bi bi-arrow-down-right"></i></button></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PeshkashLogo from '../components/PeshkashLogo.vue';
import { useAnalytics } from '../composables/useAnalytics';
import { usePageMeta } from '../composables/usePageMeta';
import { sharePublicPage } from '../utils/socialShare';

const pages = ['The proposition', 'People and scale', 'Digital touchpoints', 'Interest to data', 'The customer journey', 'Showroom insights', 'A compounding system'];
const current = ref(0);
const book = ref<HTMLElement | null>(null);
const touchStart = ref({ x: 0, y: 0 });
const { setMeta, resetMeta } = usePageMeta();
const analytics = useAnalytics({ vendorSlug: 'artisticgeek-studios', qrHash: 'peshkash-home' });
const pageLabel = computed(() => pages[current.value]);
const whatsappUrl = 'https://wa.me/919115551110?text=I%20would%20like%20to%20explore%20Peshkash%20for%20my%20showroom.';

function track(action: string) { analytics.track(action); }
function goTo(index: number, action?: string) {
  const target = Math.max(0, Math.min(pages.length - 1, index));
  const changed = target !== current.value;
  const section = book.value?.querySelector<HTMLElement>(`[data-page="${target}"]`);
  current.value = target;
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (action && changed) track(action);
}
function syncCurrent() {
  if (!book.value) return;
  const sections = Array.from(book.value.querySelectorAll<HTMLElement>('.showroom-spread'));
  const nearest = sections.reduce((closest, section) => Math.abs(section.offsetTop - book.value!.scrollTop) < Math.abs(closest.offsetTop - book.value!.scrollTop) ? section : closest, sections[0]);
  current.value = Number(nearest?.dataset.page ?? 0);
}
function onTouchStart(event: TouchEvent) { touchStart.value = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY }; }
function onTouchEnd(event: TouchEvent) {
  const dx = event.changedTouches[0].clientX - touchStart.value.x;
  const dy = event.changedTouches[0].clientY - touchStart.value.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 48) return;
  const direction = Math.abs(dx) > Math.abs(dy) ? dx : dy;
  goTo(current.value + (direction < 0 ? 1 : -1), direction < 0 ? 'showroom_next' : 'showroom_previous');
}
function onKeydown(event: KeyboardEvent) {
  if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key)) { event.preventDefault(); goTo(current.value + 1, 'showroom_next'); }
  if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); goTo(current.value - 1, 'showroom_previous'); }
}
async function shareShowroom() {
  const shared = await sharePublicPage({ title: 'Peshkash for Showrooms', text: 'A short interactive proposal for showroom owners: make products discoverable, customer interest measurable and follow-up informed with Peshkash.', previewPath: 'showrooms' });
  if (shared) track('showroom_share');
}
onMounted(() => {
  setMeta({ title: 'Peshkash for Showrooms — A showroom that remembers', description: 'See how Peshkash gives showrooms a measurable digital layer so product interest, customer context and follow-up can scale beyond individual salespeople.', image: '/brand/social/peshkash-showrooms-preview.png', imageAlt: 'Peshkash for Showrooms — your showroom needs a memory', type: 'article' });
  track('showroom_page_view');
  window.addEventListener('keydown', onKeydown);
});
onUnmounted(() => { resetMeta(); window.removeEventListener('keydown', onKeydown); });
</script>

<style scoped>
.showrooms-page{--ink:#101713;--paper:#f3eee5;--brass:#b6945c;background:var(--ink);color:var(--ink);height:100dvh;overflow:hidden}.showroom-header{align-items:center;background:rgba(16,23,19,.94);border-bottom:1px solid rgba(182,148,92,.28);color:#f3eee5;display:grid;grid-template-columns:1fr auto 1fr;height:64px;left:0;padding:0 clamp(1rem,3vw,2.5rem);position:fixed;right:0;top:0;z-index:20;backdrop-filter:blur(14px)}.showroom-header>a{justify-self:start}.showroom-header button{background:none;border:1px solid rgba(182,148,92,.4);border-radius:50%;color:#eadcc8;height:36px;justify-self:end;width:36px}.header-edition{align-items:center;display:flex;gap:.7rem;font-size:.66rem;letter-spacing:.16em;text-transform:uppercase}.header-edition span{color:#c4a36d}.header-edition b{font-weight:500}.showroom-book{height:100dvh;overflow-x:hidden;overflow-y:auto;scroll-behavior:smooth;scroll-snap-type:y mandatory;scrollbar-width:none}.showroom-book::-webkit-scrollbar{display:none}.showroom-spread{box-sizing:border-box;height:100dvh;min-height:100dvh;overflow:hidden;padding-top:64px;position:relative;scroll-snap-align:start;scroll-snap-stop:always}.spread-copy{position:relative;z-index:2}.kicker{color:#89663a;font-size:.68rem;font-weight:700;letter-spacing:.24em;margin:0 0 1.5rem;text-transform:uppercase}
.hero-spread{background:#d5c8b7}.hero-spread>img{height:100%;inset:0;object-fit:cover;object-position:68% center;position:absolute;width:100%}.hero-shade{background:linear-gradient(90deg,rgba(243,238,229,.98),rgba(243,238,229,.88) 36%,rgba(16,23,19,.08) 72%),linear-gradient(0deg,rgba(16,23,19,.2),transparent 38%);inset:0;position:absolute}.hero-copy{align-items:flex-start;display:flex;flex-direction:column;height:calc(100dvh - 64px);justify-content:center;max-width:700px;padding:clamp(2rem,7vw,7rem)}.hero-copy h1,.people-copy h2,.touchpoints-heading h2,.memory-heading h2,.journey-copy h2,.insights-copy h2,.closing-copy h2{font-family:'Rufina',Georgia,serif;font-weight:400;letter-spacing:-.05em;line-height:.91;margin:0}.hero-copy h1{font-size:clamp(3.6rem,8.5vw,8.4rem)}.hero-copy h1 em,.touchpoints-heading h2 em,.memory-heading h2 em,.journey-copy h2 em,.closing-copy h2 em{color:#98713f;font-weight:400}.deck{font-size:clamp(1rem,1.6vw,1.25rem);line-height:1.55;margin:2rem 0;max-width:575px}.text-link{background:none;border:0;border-bottom:1px solid #8b673c;color:#101713;font-size:.78rem;font-weight:700;letter-spacing:.13em;padding:.5rem 0;text-transform:uppercase}.text-link i{margin-left:.7rem}.credit{bottom:2rem;color:#655e57;font-size:.68rem;left:clamp(2rem,7vw,7rem);letter-spacing:.13em;margin:0;position:absolute;text-transform:uppercase;z-index:2}
.people-spread{background:#111914;color:#f3eee5;display:grid;grid-template-columns:minmax(280px,.78fr) minmax(420px,1.22fr)}.people-photo{background:linear-gradient(0deg,rgba(16,23,19,.22),rgba(16,23,19,.02)),url('/resources/showrooms/showroom-consultation.webp') center/cover;clip-path:polygon(0 0,86% 0,100% 100%,0 100%)}.people-copy{align-self:center;padding:clamp(3rem,7vw,7rem)}.people-copy .kicker{color:#c4a36d}.people-copy h2{font-size:clamp(2.8rem,5.8vw,6.2rem)}.people-copy .lead{color:#c5bdb3;line-height:1.65;margin:1.6rem 0;max-width:650px}.truth-grid{border-top:1px solid rgba(182,148,92,.3);display:grid;grid-template-columns:repeat(3,1fr);margin-top:2rem}.truth-grid article{border-right:1px solid rgba(182,148,92,.2);padding:1rem 1.2rem 1rem 0}.truth-grid article+article{padding-left:1.2rem}.truth-grid article:last-child{border-right:0}.truth-grid span{color:#9e8d7b;display:block;font-size:.58rem;letter-spacing:.12em;margin-bottom:.5rem;text-transform:uppercase}.truth-grid b{font-family:'Rufina',serif;font-size:1rem;font-weight:400;line-height:1.4}.emphasis{color:#c5bdb3;font-size:.9rem;margin-top:2rem}.emphasis em{color:#d0ad72;font-family:'Rufina',serif;font-size:1.2rem}.edge-word{bottom:2rem;color:#b6945c;font-size:.6rem;letter-spacing:.4em;position:absolute;right:2rem;writing-mode:vertical-rl}
.touchpoints-spread{background:#e8e0d4;display:grid;gap:clamp(2rem,4vw,5rem);grid-template-columns:minmax(280px,.72fr) minmax(550px,1.28fr);padding:clamp(6.5rem,10vh,8rem) clamp(3rem,7vw,7rem) 4.8rem}.touchpoints-heading{align-self:center}.touchpoints-heading h2{font-size:clamp(3rem,5.3vw,6rem)}.touchpoints-heading>p:last-child{color:#625b54;line-height:1.65;margin-top:2rem;max-width:450px}.touchpoint-gallery{align-self:center;display:grid;gap:1rem;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;height:calc(100dvh - 182px);max-height:520px;min-height:0}.touchpoint-card{background:#f8f5ef;border:1px solid rgba(73,63,50,.12);box-shadow:0 20px 50px rgba(50,43,34,.1);display:flex;flex-direction:column;margin:0;min-height:0;overflow:hidden;padding:.7rem}.touchpoint-card img{height:calc(100% - 48px);min-height:0;object-fit:cover;object-position:center;width:100%}.touchpoint-card figcaption{align-items:center;display:flex;justify-content:space-between;min-height:48px;padding:.6rem .35rem 0}.touchpoint-card figcaption b{font-family:'Rufina',serif;font-size:.9rem;font-weight:400}.touchpoint-card figcaption span{color:#81766b;font-size:.56rem;letter-spacing:.07em;text-align:right;text-transform:uppercase}.doorway-card{grid-row:1/-1}.touchpoint-note{bottom:1.4rem;color:#887d71;font-size:.58rem;letter-spacing:.14em;margin:0;position:absolute;right:clamp(3rem,7vw,7rem);text-transform:uppercase}
.memory-spread{background:#111914;color:#f3eee5;padding:clamp(6.2rem,10vh,8rem) clamp(2rem,6vw,6rem) 4.5rem}.memory-heading{align-items:end;display:flex;justify-content:space-between}.memory-heading .kicker{align-self:flex-start;color:#c4a36d}.memory-heading h2{font-size:clamp(2.8rem,5vw,5.7rem);text-align:right}.memory-heading h2 em{color:#c4a36d}.memory-flow{display:grid;gap:1rem;grid-template-columns:repeat(5,1fr);list-style:none;margin:clamp(2.5rem,5vh,4rem) 0 2.3rem;padding:0;position:relative}.memory-flow:before{background:linear-gradient(90deg,transparent,#947647 8%,#947647 92%,transparent);content:'';height:1px;left:3%;position:absolute;right:3%;top:60px}.memory-flow li{align-items:center;display:flex;flex-direction:column;min-width:0;position:relative;text-align:center}.memory-flow li>span{color:#a5927f;font-size:.58rem;letter-spacing:.14em}.memory-flow li>i{align-items:center;background:#111914;border:1px solid #947647;border-radius:50%;color:#cfab70;display:flex;font-size:1.2rem;height:54px;justify-content:center;margin:.8rem 0;position:relative;width:54px;z-index:1}.memory-flow li>b{font-family:'Rufina',serif;font-size:1rem;font-weight:400}.memory-flow li>small{color:#9f958c;font-size:.67rem;line-height:1.4;margin-top:.35rem;max-width:155px}.memory-value{border-top:1px solid rgba(182,148,92,.25);display:grid;gap:2rem;grid-template-columns:repeat(3,1fr);padding-top:1.5rem}.memory-value p{color:#b8afa6;font-size:.76rem;line-height:1.55;margin:0}.memory-value b{color:#f3eee5;font-weight:600}
.journey-spread{background:var(--paper);display:grid;grid-template-columns:minmax(300px,.78fr) minmax(560px,1.22fr);padding:clamp(6.5rem,10vh,8rem) clamp(3rem,7vw,7rem) 5rem}.journey-copy{align-self:center;max-width:560px}.journey-copy h2{font-size:clamp(3rem,5.8vw,6.4rem)}.journey-copy>p:last-child{color:#655f58;line-height:1.7;margin-top:2rem}.journey-board{align-self:center;display:grid;gap:.8rem;position:relative}.journey-line{background:#c9b694;bottom:7%;left:25px;position:absolute;top:7%;width:1px}.journey-board article{align-items:center;background:#ebe3d7;border:1px solid rgba(108,90,61,.11);display:grid;grid-template-columns:50px 46px 1fr;min-height:74px;padding:.55rem 1rem;position:relative}.journey-board article>span{color:#9c845f;font-size:.58rem;letter-spacing:.12em}.journey-board article>i{align-items:center;background:#f6f1e9;border:1px solid #c9b694;border-radius:50%;color:#8d6a39;display:flex;font-size:1rem;height:34px;justify-content:center;position:relative;width:34px;z-index:1}.journey-board article>b{font-family:'Rufina',serif;font-size:1.1rem;font-weight:400}.journey-board article>small{color:#766d64;font-size:.66rem;grid-column:3;margin-top:-1.2rem}.journey-caption{bottom:2rem;color:#887d71;font-size:.6rem;letter-spacing:.16em;position:absolute;right:clamp(3rem,7vw,7rem);text-transform:uppercase}
.insights-spread{align-items:center;background:#dfe3da;display:grid;gap:clamp(2rem,5vw,6rem);grid-template-columns:minmax(320px,.82fr) minmax(560px,1.18fr);padding:clamp(6rem,10vh,8rem) clamp(2rem,6vw,6rem) 4rem}.insights-copy h2{font-size:clamp(3rem,5.25vw,6rem)}.insights-copy>p:not(.kicker){color:#566057;line-height:1.65;margin:1.5rem 0;max-width:500px}.insights-copy ul{display:grid;gap:.65rem;list-style:none;margin:0;padding:0}.insights-copy li{color:#36453b;font-size:.78rem;line-height:1.45}.insights-copy li i{color:#8d6a39;margin-right:.55rem}.insights-board{background:#f8f7f1;border:1px solid rgba(59,78,64,.15);box-shadow:0 24px 60px rgba(42,59,47,.12);padding:clamp(1.2rem,2.5vw,2rem)}.insights-label{align-items:end;border-bottom:1px solid #dbe0d7;display:flex;justify-content:space-between;padding-bottom:1rem}.insights-label span{color:#7c693f;font-size:.6rem;letter-spacing:.16em;text-transform:uppercase}.insights-label b{font-family:'Rufina',serif;font-size:1.05rem;font-weight:400}.kpi-grid{display:grid;gap:.8rem;grid-template-columns:repeat(4,1fr);margin:1rem 0}.kpi-grid article{background:#e8ece4;padding:1rem}.kpi-grid span{color:#657066;display:block;font-size:.56rem;letter-spacing:.08em;text-transform:uppercase}.kpi-grid strong{display:block;font-family:'Rufina',serif;font-size:clamp(1.45rem,2.3vw,2.35rem);font-weight:400;margin:.35rem 0}.kpi-grid small{color:#827351;font-size:.56rem}.product-signal{border:1px solid #dde2d9;padding:1rem}.signal-head{display:flex;font-size:.64rem;justify-content:space-between;margin-bottom:.9rem}.signal-head b{color:#85683c}.signal-row{align-items:center;display:grid;font-size:.61rem;gap:.7rem;grid-template-columns:130px 1fr 58px;margin:.65rem 0}.signal-row>i{background:#e1e5dc;height:7px;overflow:hidden}.signal-row>i b{background:linear-gradient(90deg,#a98752,#55705c);display:block;height:100%;width:var(--w)}.signal-row em{color:#77684e;font-style:normal;text-align:right}.insights-disclaimer{color:#8b948d;font-size:.51rem;margin:.8rem 0 0;text-align:right}
.closing-spread{align-items:center;background:#0f1712;color:#f3eee5;display:flex;justify-content:center}.closing-grid{background-image:linear-gradient(rgba(182,148,92,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(182,148,92,.05) 1px,transparent 1px);background-size:70px 70px;inset:0;position:absolute}.closing-spread:before{background:radial-gradient(circle at 50% 50%,rgba(182,148,92,.14),transparent 55%);content:'';inset:0;position:absolute}.closing-mark{color:rgba(182,148,92,.055);font-family:'Rufina',serif;font-size:min(82vw,80vh);line-height:1;position:absolute}.closing-copy{max-width:820px;padding:3rem;text-align:center}.closing-copy .kicker{color:#c4a36d}.closing-copy h2{font-size:clamp(3.2rem,7vw,7.5rem)}.closing-copy h2 em{color:#c4a36d}.closing-copy>p:not(.kicker):not(.studio-credit){color:#c3bbb1;line-height:1.65;margin:2rem auto;max-width:650px}.closing-actions{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;margin-top:2.5rem}.closing-actions a,.closing-actions button{align-items:center;border:1px solid #b6945c;display:inline-flex;font-size:.72rem;gap:.6rem;letter-spacing:.1em;padding:.9rem 1.25rem;text-decoration:none;text-transform:uppercase}.closing-actions a{background:#b6945c;color:#101713}.closing-actions button{background:transparent;color:#f3eee5}.studio-credit{color:#8a8178;font-size:.62rem;letter-spacing:.18em;margin-top:3rem;text-transform:uppercase}
.page-rail{display:flex;flex-direction:column;gap:.7rem;position:fixed;right:1.2rem;top:50%;transform:translateY(-50%);z-index:12}.page-rail button{background:none;border:0;color:rgba(243,238,229,.48);font-size:.56rem;padding:.2rem}.page-rail button:after{background:currentColor;content:'';display:block;height:1px;margin-top:.3rem;transition:width .2s;width:13px}.page-rail button.active{color:#d0ad72}.page-rail button.active:after{width:28px}.page-controls{align-items:center;background:rgba(16,23,19,.9);border:1px solid rgba(182,148,92,.28);border-radius:99px;bottom:1rem;color:#e8d7c1;display:flex;gap:.7rem;left:50%;padding:.35rem;position:fixed;transform:translateX(-50%);z-index:15}.page-controls button{background:none;border:0;border-radius:50%;color:#e8d7c1;height:34px;width:34px}.page-controls button:disabled{opacity:.25}.page-controls span{font-size:.6rem;letter-spacing:.13em;min-width:54px;text-align:center}
@media(max-width:760px){.showroom-header{grid-template-columns:1fr auto}.header-edition{display:none}.hero-shade{background:linear-gradient(0deg,rgba(243,238,229,.98),rgba(243,238,229,.86) 52%,rgba(16,23,19,.08))}.hero-copy{justify-content:flex-end;padding:2rem 1.5rem 7rem}.hero-copy h1{font-size:3.55rem}.deck{font-size:.92rem}.credit{bottom:4.7rem;left:1.5rem}.people-spread{display:block}.people-photo{clip-path:polygon(0 0,100% 0,100% 75%,0 100%);height:28vh}.people-copy{padding:1rem 1.4rem 4.2rem}.people-copy .kicker{margin-bottom:.65rem}.people-copy h2{font-size:2.25rem}.people-copy .lead{font-size:.76rem;line-height:1.4;margin:.7rem 0}.truth-grid{margin-top:.6rem}.truth-grid article{padding:.6rem .45rem 0 0}.truth-grid article+article{padding-left:.45rem}.truth-grid span{font-size:.43rem}.truth-grid b{font-size:.68rem}.emphasis{font-size:.65rem;margin-top:.7rem}.emphasis em{font-size:.8rem}.touchpoints-spread{display:block;padding:5.35rem 1rem 4.4rem}.touchpoints-heading .kicker{margin-bottom:.55rem}.touchpoints-heading h2{font-size:2.25rem}.touchpoints-heading>p:last-child{font-size:.7rem;line-height:1.35;margin:.55rem 0 .8rem}.touchpoint-gallery{gap:.5rem;grid-template-rows:165px 165px;height:auto;max-height:none}.touchpoint-card{padding:.3rem}.touchpoint-card img{height:calc(100% - 34px)}.touchpoint-card figcaption{display:block;min-height:34px;padding:.35rem .2rem 0}.touchpoint-card figcaption b{display:block;font-size:.65rem}.touchpoint-card figcaption span{display:block;font-size:.41rem;text-align:left}.touchpoint-note{bottom:3.7rem;font-size:.41rem;left:1rem;right:1rem;text-align:center}.memory-spread{padding:5.2rem 1.2rem 4.2rem}.memory-heading{display:block}.memory-heading .kicker{margin-bottom:.65rem}.memory-heading h2{font-size:2.2rem;text-align:left}.memory-flow{gap:0;grid-template-columns:1fr;margin:1rem 0 .75rem}.memory-flow:before{bottom:8%;height:auto;left:20px;right:auto;top:8%;width:1px}.memory-flow li{display:grid;grid-template-columns:18px 40px minmax(0,1fr);min-height:51px;text-align:left}.memory-flow li>span{align-self:center}.memory-flow li>i{grid-column:2;height:32px;margin:.35rem 0;width:32px}.memory-flow li>b{align-self:end;font-size:.78rem;grid-column:3;grid-row:1;padding-left:.45rem}.memory-flow li>small{align-self:start;font-size:.52rem;grid-column:3;grid-row:2;margin:0;padding-left:.45rem}.memory-value{gap:.3rem;grid-template-columns:1fr;padding-top:.6rem}.memory-value p{font-size:.56rem;line-height:1.3}.journey-spread{display:block;padding:5.3rem 1rem 4.5rem}.journey-copy .kicker{margin-bottom:.6rem}.journey-copy h2{font-size:2.55rem}.journey-copy>p:last-child{font-size:.68rem;line-height:1.35;margin:.55rem 0 .8rem}.journey-board{gap:.4rem}.journey-board article{grid-template-columns:34px 38px 1fr;min-height:52px;padding:.3rem .55rem}.journey-board article>i{height:27px;width:27px}.journey-board article>b{font-size:.78rem}.journey-board article>small{font-size:.5rem;margin-top:-.8rem}.journey-line{left:16px}.journey-caption{bottom:3.7rem;font-size:.42rem;left:1rem;right:1rem;text-align:center}.insights-spread{display:block;padding:5.2rem 1rem 4.2rem}.insights-copy .kicker{margin-bottom:.55rem}.insights-copy h2{font-size:2.4rem}.insights-copy>p:not(.kicker){font-size:.68rem;line-height:1.35;margin:.55rem 0}.insights-copy ul{display:none}.insights-board{padding:.7rem}.insights-label{padding-bottom:.5rem}.insights-label b{font-size:.75rem}.insights-label span{font-size:.45rem}.kpi-grid{gap:.4rem;grid-template-columns:1fr 1fr;margin:.5rem 0}.kpi-grid article{padding:.5rem}.kpi-grid span,.kpi-grid small{font-size:.45rem}.kpi-grid strong{font-size:1.3rem;margin:.12rem 0}.product-signal{padding:.5rem}.signal-row{font-size:.49rem;grid-template-columns:92px 1fr 48px;margin:.4rem 0}.insights-disclaimer{font-size:.4rem;margin:.3rem 0 0}.closing-copy{padding:2rem 1.4rem}.closing-copy h2{font-size:3.3rem}.page-rail{display:none}}
.touchpoint-card img{background:#fff;object-fit:contain}
@media(prefers-reduced-motion:reduce){.showroom-book{scroll-behavior:auto}}
</style>
