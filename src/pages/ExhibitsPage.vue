<template>
  <div class="exhibits-page" @keydown="onKeydown" tabindex="-1">
    <header class="exhibit-header">
      <RouterLink to="/" aria-label="Peshkash home" @click="track('exhibit_get_started')">
        <PeshkashLogo variant="dark-bg" :height="26" />
      </RouterLink>
      <div class="header-edition"><span>Exhibits</span><b>{{ pageLabel }}</b></div>
      <button type="button" aria-label="Share this exhibit" @click="shareExhibit"><i class="bi bi-share"></i></button>
    </header>

    <main ref="book" class="exhibit-book" @scroll="syncCurrent" @touchstart="onTouchStart" @touchend="onTouchEnd">
      <section class="exhibit-spread hero-spread" data-page="0">
        <img src="/resources/exhibits/atelier-hero.png" alt="Ivory textile and handcrafted jewellery in a warm editorial setting" />
        <div class="hero-shade"></div>
        <div class="spread-copy hero-copy">
          <p class="kicker">Peshkash for exhibitions</p>
          <h1>Every stall.<br><em>Still discoverable.</em></h1>
          <p class="deck">Turn your exhibition into one connected, measurable visitor experience—before the gates open, across the floor, and long after the crowd leaves.</p>
          <button type="button" class="text-link" @click="goTo(1, 'exhibit_next')">See what your event gains <i class="bi bi-arrow-down"></i></button>
        </div>
        <p class="credit">A digital exhibition format by ArtisticGeek Studios</p>
      </section>

      <section class="exhibit-spread fashion-spread" data-page="1">
        <div class="folio-number">01</div>
        <div class="fashion-image" role="img" aria-label="A premium exhibitor collection presented as a digital shop window"></div>
        <div class="spread-copy fashion-copy">
          <p class="kicker">One event · many shop windows</p>
          <h2>Give every exhibitor<br>room to be found.</h2>
          <p>Each stall gets a living Peshkash page for its brand, collection, products and contact actions. Your visitors browse with context—not a paper map and a pile of forgotten cards.</p>
          <dl>
            <div><dt>Before</dt><dd>Event page, registration, reminders and exhibitor guide</dd></div>
            <div><dt>On site</dt><dd>QR discovery at the gate, aisles, stalls and products</dd></div>
            <div><dt>After</dt><dd>Saved vendors, shared products and measurable follow-up</dd></div>
          </dl>
        </div>
        <span class="edge-word">DISCOVERY</span>
      </section>

      <section class="exhibit-spread template-spread" data-page="2">
        <div class="template-heading">
          <p class="kicker">Designed for the physical event</p>
          <h2>One system.<br><em>Every touchpoint.</em></h2>
          <p>Print-ready QR cards adapt to the venue, exhibitor and product—while every destination stays editable after printing.</p>
        </div>
        <div class="template-gallery">
          <figure class="template-card template-wide">
            <img src="/brand/qr-templates/Porcelain-Cameo/30-exhibition-entry-card.svg" alt="Peshkash visitor entry QR card template" />
            <figcaption><b>Entry &amp; wayfinding</b><span>Flex boards · gates · help desks</span></figcaption>
          </figure>
          <figure class="template-card">
            <img src="/brand/qr-templates/Obsidian-Ring/08-exhibition-wall-label.svg" alt="Peshkash exhibition wall label QR template" />
            <figcaption><b>Exhibitor discovery</b><span>Stalls · aisles · installations</span></figcaption>
          </figure>
          <figure class="template-card template-tall">
            <img src="/brand/qr-templates/Porcelain-Cameo/16-jewellery-authenticity-card.svg" alt="Peshkash jewellery authenticity QR card template" />
            <figcaption><b>Product stories</b><span>Fashion · craft · jewellery</span></figcaption>
          </figure>
        </div>
        <p class="template-note">Real templates from the Peshkash QR Studio · content and destination remain dynamic</p>
      </section>

      <section class="exhibit-spread conversion-spread" data-page="3">
        <div class="conversion-heading">
          <p class="kicker">How offline becomes digital data</p>
          <h2>The physical moment<br><em>does not disappear.</em><br>It becomes observable.</h2>
        </div>
        <ol class="conversion-flow">
          <li><span>01</span><i class="bi bi-signpost-2"></i><b>Physical trigger</b><small>Gate, stall, product, flex board</small></li>
          <li><span>02</span><i class="bi bi-qr-code-scan"></i><b>Scan</b><small>Placement and QR identity recorded</small></li>
          <li><span>03</span><i class="bi bi-phone"></i><b>Living page</b><small>Event, exhibitor or item opens</small></li>
          <li><span>04</span><i class="bi bi-hand-index-thumb"></i><b>Visitor action</b><small>Explore, save, share, call, enquire</small></li>
          <li><span>05</span><i class="bi bi-graph-up-arrow"></i><b>Useful insight</b><small>Interest by place, time and subject</small></li>
        </ol>
        <div class="conversion-value">
          <p><b>No app required.</b> A normal camera scan moves the visitor into a measurable digital journey.</p>
          <p><b>No reprint required.</b> The same physical QR can point to updated schedules, exhibitors and collections.</p>
          <p><b>No personal tracking theatre.</b> Organisers see aggregate intent; verified identity is used only for consented flows such as registration.</p>
        </div>
      </section>

      <section class="exhibit-spread jewellery-spread" data-page="4">
        <div class="jewel-intro">
          <p class="kicker">The visitor journey · one scan</p>
          <h2>Interest becomes<br><em>intent.</em></h2>
          <p>A visitor can move from the event overview to an exhibitor, open a product story, save it, share it and contact the seller—without downloading an app.</p>
        </div>
        <div class="jewel-stage" aria-label="Sculptural jewellery display">
          <div class="necklace-orbit"><span v-for="n in 17" :key="n" :style="{ '--i': n }"></span></div>
          <div class="garnet"></div>
          <p>From scan to<br><b>meaningful action</b></p>
        </div>
        <div class="jewel-notes"><span>Discover</span><span>Explore</span><span>Save</span><span>Connect</span></div>
      </section>

      <section class="exhibit-spread insights-spread" data-page="5">
        <div class="insights-copy">
          <p class="kicker">From attendance to understanding</p>
          <h2>See what held<br>their attention.</h2>
          <p>Illustrative insights turn anonymous footfall into an evidence-based conversation with exhibitors—without pretending every visitor is a lead.</p>
          <ul>
            <li><i class="bi bi-check2"></i> Which QR placements actually worked</li>
            <li><i class="bi bi-check2"></i> Which exhibitors and products earned deeper exploration</li>
            <li><i class="bi bi-check2"></i> When interest became a save, share, call or enquiry</li>
          </ul>
        </div>
        <div class="insights-board" aria-label="Illustrative Peshkash analytics dashboard">
          <div class="insights-label"><span>Example organiser view</span><b>Live exhibition · Day 02</b></div>
          <div class="kpi-grid">
            <article><span>QR scans</span><strong>1,842</strong><small>↑ 23% vs Day 01</small></article>
            <article><span>Exhibitors explored</span><strong>63%</strong><small>of active profiles</small></article>
            <article><span>Items saved</span><strong>487</strong><small>across 38 exhibitors</small></article>
            <article><span>Contact intent</span><strong>214</strong><small>calls + WhatsApp</small></article>
          </div>
          <div class="interest-chart">
            <div class="chart-head"><span>Scan activity by hour</span><b>Peak · 4–5 PM</b></div>
            <div class="chart-bars" aria-hidden="true"><i style="--h:32%"></i><i style="--h:46%"></i><i style="--h:62%"></i><i style="--h:55%"></i><i style="--h:78%"></i><i style="--h:96%"></i><i style="--h:73%"></i><i style="--h:51%"></i></div>
            <div class="chart-axis"><span>11 AM</span><span>2 PM</span><span>5 PM</span><span>8 PM</span></div>
          </div>
          <p class="insights-disclaimer">Example data for demonstration—not a claim about a live event.</p>
        </div>
      </section>

      <section class="exhibit-spread difference-spread" data-page="6" @touchstart.stop @touchend.stop>
        <ProviderDifference audience="exhibition" promise="Send us your event details. We help get your pages and QR cards ready." :rows="providerDifferences" />
      </section>

      <section class="exhibit-spread closing-spread" data-page="7">
        <div class="closing-mark">P</div>
        <div class="spread-copy closing-copy">
          <p class="kicker">What the organiser finally sees</p>
          <h2>Footfall becomes<br>evidence.</h2>
          <p>See which QRs were scanned, which exhibitors and items drew attention, and which actions followed—shares, saves, calls, registrations and WhatsApp enquiries. Give exhibitors value they can take home.</p>
          <div class="closing-actions">
            <a :href="whatsappUrl" target="_blank" rel="noopener" @click="track('exhibit_whatsapp')"><i class="bi bi-whatsapp"></i> Digitise my exhibition</a>
            <button type="button" @click="shareExhibit"><i class="bi bi-share"></i> Share this proposal</button>
          </div>
          <p class="studio-credit">A Peshkash format by ArtisticGeek Studios</p>
        </div>
      </section>
    </main>

    <nav class="page-rail" aria-label="Exhibit pages">
      <button v-for="(_, index) in pages" :key="index" type="button" :class="{ active: current === index }" :aria-label="`Go to page ${index + 1}`" @click="goTo(index)"><span>{{ String(index + 1).padStart(2, '0') }}</span></button>
    </nav>

    <div class="page-controls">
      <button type="button" :disabled="current === 0" aria-label="Previous page" @click="goTo(current - 1, 'exhibit_previous')"><i class="bi bi-arrow-up-left"></i></button>
      <span>{{ String(current + 1).padStart(2, '0') }} / {{ String(pages.length).padStart(2, '0') }}</span>
      <button type="button" :disabled="current === pages.length - 1" aria-label="Next page" @click="goTo(current + 1, 'exhibit_next')"><i class="bi bi-arrow-down-right"></i></button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PeshkashLogo from '../components/PeshkashLogo.vue';
import ProviderDifference from '../components/ProviderDifference.vue';
import { useAnalytics } from '../composables/useAnalytics';
import { usePageMeta } from '../composables/usePageMeta';
import { sharePublicPage } from '../utils/socialShare';

const pages = ['The proposition', 'Exhibitor value', 'QR touchpoints', 'Offline to data', 'Visitor journey', 'Insights', 'The Peshkash difference', 'Measurable value'];
const providerDifferences = [
  { title: 'Help visitors plan', standalone: 'A poster tells people when and where the event is.', connected: 'Visitors can see the brands taking part, sign up and save a reminder on one page.' },
  { title: 'Help visitors explore', standalone: 'You arrange the QR codes and signs for each stall separately.', connected: 'We help prepare QR cards for the entrance, stalls and products in a matching style.' },
  { title: 'See what people do', standalone: 'A guest list tells you who signed up.', connected: 'Also see how often people opened your event page, shared it or saved a reminder.' },
  { title: 'Get help setting up', standalone: 'You arrange the event page, QR codes and printing separately.', connected: 'Send us the event and stall details. We help prepare the pages and QR cards.' },
];
const current = ref(0);
const book = ref<HTMLElement | null>(null);
const touchStart = ref({ x: 0, y: 0 });
const { setMeta, resetMeta } = usePageMeta();
const analytics = useAnalytics({ vendorSlug: 'artisticgeek-studios', qrHash: 'peshkash-home' });
const pageLabel = computed(() => pages[current.value]);
const whatsappUrl = 'https://wa.me/919115551110?text=I%20would%20like%20to%20explore%20Peshkash%20for%20my%20exhibition.';

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
  const sections = Array.from(book.value.querySelectorAll<HTMLElement>('.exhibit-spread'));
  const nearest = sections.reduce((closest, section) => (
    Math.abs(section.offsetTop - book.value!.scrollTop) < Math.abs(closest.offsetTop - book.value!.scrollTop) ? section : closest
  ), sections[0]);
  current.value = Number(nearest?.dataset.page ?? 0);
}

function onTouchStart(event: TouchEvent) {
  touchStart.value = { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
}

function onTouchEnd(event: TouchEvent) {
  const dx = event.changedTouches[0].clientX - touchStart.value.x;
  const dy = event.changedTouches[0].clientY - touchStart.value.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 48) return;
  const direction = Math.abs(dx) > Math.abs(dy) ? dx : dy;
  goTo(current.value + (direction < 0 ? 1 : -1), direction < 0 ? 'exhibit_next' : 'exhibit_previous');
}

function onKeydown(event: KeyboardEvent) {
  if (['ArrowDown', 'ArrowRight', 'PageDown'].includes(event.key)) { event.preventDefault(); goTo(current.value + 1, 'exhibit_next'); }
  if (['ArrowUp', 'ArrowLeft', 'PageUp'].includes(event.key)) { event.preventDefault(); goTo(current.value - 1, 'exhibit_previous'); }
}

async function shareExhibit() {
  const shared = await sharePublicPage({
    title: 'Peshkash for Exhibitions',
    text: 'A short interactive proposal for exhibition organisers: connect every exhibitor, visitor scan and follow-up action with Peshkash.',
    previewPath: 'exhibits',
  });
  if (shared) track('exhibit_share');
}

onMounted(() => {
  setMeta({
    title: 'Peshkash for Exhibitions — Interactive organiser brochure',
    description: 'A short interactive proposal showing exhibition organisers how Peshkash connects exhibitors, visitor discovery, QR engagement and measurable follow-up.',
    type: 'article',
  });
  track('exhibit_page_view');
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => { resetMeta(); window.removeEventListener('keydown', onKeydown); });
</script>

<style scoped>
.exhibit-spread.difference-spread{overflow-y:auto;overscroll-behavior-y:contain;padding:64px 0 0;scrollbar-width:thin}
.exhibits-page { --ink:#1a1410; --paper:#f5efe6; --gold:#bd945a; --garnet:#7b2734; background:var(--ink); color:var(--ink); height:100dvh; overflow:hidden; }
.exhibit-header { align-items:center; background:rgba(26,20,16,.94); border-bottom:1px solid rgba(189,148,90,.28); color:#f5efe6; display:grid; grid-template-columns:1fr auto 1fr; height:64px; left:0; padding:0 clamp(1rem,3vw,2.5rem); position:fixed; right:0; top:0; z-index:20; backdrop-filter:blur(14px); }
.exhibit-header>a { justify-self:start; }.exhibit-header button { background:none;border:1px solid rgba(189,148,90,.4);border-radius:50%;color:#eadcc8;height:36px;justify-self:end;width:36px}.header-edition { align-items:center;display:flex;gap:.7rem;font-size:.66rem;letter-spacing:.16em;text-transform:uppercase}.header-edition span{color:#bd945a}.header-edition b{font-weight:500}
.exhibit-book { height:100dvh; overflow-x:hidden; overflow-y:auto; scroll-behavior:smooth; scroll-snap-type:y mandatory; scrollbar-width:none; }.exhibit-book::-webkit-scrollbar{display:none}
.exhibit-spread { box-sizing:border-box; height:100dvh; min-height:100dvh; overflow:hidden; padding-top:64px; position:relative; scroll-snap-align:start; scroll-snap-stop:always; }
.hero-spread { background:#d9c9b6; }.hero-spread>img{height:100%;inset:0;object-fit:cover;position:absolute;width:100%}.hero-shade{background:linear-gradient(90deg,rgba(245,239,230,.98) 0%,rgba(245,239,230,.88) 34%,rgba(245,239,230,.06) 72%),linear-gradient(0deg,rgba(26,20,16,.22),transparent 38%);inset:0;position:absolute}.spread-copy{position:relative;z-index:2}.hero-copy{align-items:flex-start;display:flex;flex-direction:column;height:calc(100dvh - 64px);justify-content:center;max-width:660px;padding:clamp(2rem,7vw,7rem)}
.kicker{color:#956a36;font-size:.68rem;font-weight:700;letter-spacing:.24em;margin:0 0 1.5rem;text-transform:uppercase}.hero-copy h1,.spread-copy h2,.jewel-intro h2{font-family:'Rufina',Georgia,serif;font-weight:400;letter-spacing:-.045em;line-height:.91;margin:0}.hero-copy h1{font-size:clamp(3.6rem,9vw,8.8rem)}.hero-copy h1 em,.jewel-intro h2 em{color:#a9783e;font-weight:400}.deck{font-size:clamp(1rem,1.6vw,1.25rem);line-height:1.55;margin:2rem 0;max-width:540px}.text-link{background:none;border:0;border-bottom:1px solid #9b713c;color:#1a1410;font-size:.78rem;font-weight:700;letter-spacing:.13em;padding:.5rem 0;text-transform:uppercase}.text-link i{margin-left:.7rem}.credit{bottom:2rem;color:#6f6258;font-size:.68rem;left:clamp(2rem,7vw,7rem);letter-spacing:.13em;margin:0;position:absolute;text-transform:uppercase;z-index:2}
.fashion-spread{background:#211914;color:#f4eade;display:grid;grid-template-columns:minmax(260px,.85fr) minmax(320px,1.15fr)}.fashion-image{background-image:linear-gradient(0deg,rgba(26,20,16,.18),rgba(26,20,16,.04)),url('/resources/exhibits/atelier-hero.png');background-position:68% center;background-size:auto 125%;clip-path:polygon(0 0,86% 0,100% 100%,0 100%)}.fashion-copy{align-self:center;padding:clamp(3rem,8vw,8rem)}.fashion-copy .kicker{color:#d1a66e}.fashion-copy h2{font-size:clamp(2.8rem,6vw,6.4rem)}.fashion-copy>p:not(.kicker){color:#c8baad;line-height:1.7;margin:2rem 0;max-width:560px}.fashion-copy dl{border-top:1px solid rgba(189,148,90,.3);margin-top:3rem}.fashion-copy dl>div{border-bottom:1px solid rgba(189,148,90,.2);display:grid;font-size:.78rem;grid-template-columns:120px 1fr;padding:.9rem 0}.fashion-copy dt{color:#a88a69;font-weight:500;text-transform:uppercase}.fashion-copy dd{margin:0}.folio-number{color:rgba(255,255,255,.06);font-family:'Rufina',serif;font-size:32vw;line-height:1;position:absolute;right:-2vw;top:8vh}.edge-word{bottom:2rem;color:#bd945a;font-size:.6rem;letter-spacing:.4em;position:absolute;right:2rem;writing-mode:vertical-rl}
.template-spread{background:#ece3d8;display:grid;gap:clamp(2rem,4vw,5rem);grid-template-columns:minmax(260px,.72fr) minmax(520px,1.28fr);padding:clamp(6.5rem,10vh,8rem) clamp(3rem,7vw,7rem) 4.8rem}.template-heading{align-self:center}.template-heading h2{font-family:'Rufina',Georgia,serif;font-size:clamp(3rem,5.4vw,6.2rem);font-weight:400;letter-spacing:-.045em;line-height:.92;margin:0}.template-heading h2 em{color:#a9783e;font-weight:400}.template-heading>p:last-child{color:#655b53;line-height:1.65;margin-top:2rem;max-width:440px}.template-gallery{align-self:center;display:grid;gap:1rem;grid-template-columns:1fr 1fr;grid-template-rows:minmax(0,.82fr) minmax(0,1fr);height:calc(100dvh - 181px);max-height:500px;min-height:0}.template-card{background:#f8f4ef;border:1px solid rgba(113,88,62,.13);box-shadow:0 18px 45px rgba(62,43,29,.1);display:flex;flex-direction:column;margin:0;min-height:0;overflow:hidden;padding:.75rem}.template-card img{background:#fff;height:calc(100% - 48px);min-height:0;object-fit:contain;object-position:center;width:100%}.template-card figcaption{align-items:center;display:flex;justify-content:space-between;min-height:48px;padding:.6rem .35rem 0}.template-card figcaption b{font-family:'Rufina',serif;font-size:.92rem;font-weight:400}.template-card figcaption span{color:#8d7b6d;font-size:.58rem;letter-spacing:.08em;text-align:right;text-transform:uppercase}.template-wide{grid-column:1/-1}.template-note{bottom:1.45rem;color:#8d7b6d;font-size:.58rem;letter-spacing:.14em;margin:0;position:absolute;right:clamp(3rem,7vw,7rem);text-transform:uppercase}
.conversion-spread{background:#211914;color:#f5efe6;padding:clamp(6.2rem,10vh,8rem) clamp(2rem,6vw,6rem) 4.5rem}.conversion-heading{align-items:end;display:flex;justify-content:space-between}.conversion-heading .kicker{align-self:flex-start;color:#d0a267;max-width:220px}.conversion-heading h2{font-family:'Rufina',Georgia,serif;font-size:clamp(2.8rem,5vw,5.7rem);font-weight:400;letter-spacing:-.04em;line-height:.94;margin:0;text-align:right}.conversion-heading h2 em{color:#d0a267;font-weight:400}.conversion-flow{display:grid;gap:1rem;grid-template-columns:repeat(5,1fr);list-style:none;margin:clamp(2.5rem,5vh,4rem) 0 2.3rem;padding:0;position:relative}.conversion-flow:before{background:linear-gradient(90deg,transparent,#9c7448 8%,#9c7448 92%,transparent);content:'';height:1px;left:3%;position:absolute;right:3%;top:60px}.conversion-flow li{align-items:center;display:flex;flex-direction:column;min-width:0;position:relative;text-align:center}.conversion-flow li>span{color:#a98a69;font-size:.58rem;letter-spacing:.14em}.conversion-flow li>i{align-items:center;background:#211914;border:1px solid #9c7448;border-radius:50%;color:#d0a267;display:flex;font-size:1.2rem;height:54px;justify-content:center;margin:.8rem 0;position:relative;width:54px;z-index:1}.conversion-flow li>b{font-family:'Rufina',serif;font-size:1.04rem;font-weight:400}.conversion-flow li>small{color:#9f9186;font-size:.68rem;line-height:1.4;margin-top:.35rem;max-width:150px}.conversion-value{border-top:1px solid rgba(189,148,90,.25);display:grid;gap:2rem;grid-template-columns:repeat(3,1fr);padding-top:1.5rem}.conversion-value p{color:#b7aaa0;font-size:.76rem;line-height:1.55;margin:0}.conversion-value b{color:#f5efe6;font-weight:600}
.jewellery-spread{background:var(--paper);display:grid;grid-template-columns:1fr 1.1fr;padding-inline:clamp(2rem,7vw,7rem)}.jewel-intro{align-self:center;max-width:620px}.jewel-intro h2{font-size:clamp(3rem,6.5vw,7rem)}.jewel-intro>p:last-child{color:#655b53;line-height:1.7;margin-top:2rem;max-width:520px}.jewel-stage{align-self:center;aspect-ratio:1;position:relative}.necklace-orbit{border:1px solid rgba(189,148,90,.34);border-radius:50%;inset:12%;position:absolute}.necklace-orbit:after{border:1px solid rgba(189,148,90,.18);border-radius:50%;content:'';inset:12%;position:absolute}.necklace-orbit span{--a:calc(var(--i) * 21deg);background:#b98a4d;border-radius:40% 60% 45% 55%;height:28px;left:calc(50% + cos(var(--a))*44%);position:absolute;top:calc(50% + sin(var(--a))*44%);transform:translate(-50%,-50%) rotate(var(--a));width:11px}.garnet{background:radial-gradient(circle at 35% 30%,#d7858f 0 5%,#842e3b 20%,#3d1017 62%,#17090b);border:12px solid #b98a4d;box-shadow:0 20px 40px rgba(35,12,15,.25);height:74px;left:30%;position:absolute;top:54%;transform:rotate(-14deg);width:66px}.jewel-stage p{bottom:13%;color:#77695e;font-size:.65rem;letter-spacing:.16em;position:absolute;right:12%;text-transform:uppercase}.jewel-stage p b{color:#1a1410;display:block;font-family:'Rufina',serif;font-size:1.2rem;letter-spacing:0;margin-top:.4rem;text-transform:none}.jewel-notes{bottom:2rem;display:flex;gap:2rem;left:clamp(2rem,7vw,7rem);position:absolute}.jewel-notes span{border-top:1px solid #bd945a;color:#8b765f;font-size:.62rem;letter-spacing:.18em;padding-top:.65rem;text-transform:uppercase;width:90px}
.insights-spread{align-items:center;background:#ede3d6;display:grid;gap:clamp(2rem,5vw,6rem);grid-template-columns:minmax(300px,.82fr) minmax(540px,1.18fr);padding:clamp(6rem,10vh,8rem) clamp(2rem,6vw,6rem) 4rem}.insights-copy h2{font-family:'Rufina',Georgia,serif;font-size:clamp(3rem,5.5vw,6.2rem);font-weight:400;letter-spacing:-.045em;line-height:.93;margin:0}.insights-copy>p:not(.kicker){color:#655b53;line-height:1.65;margin:1.6rem 0;max-width:500px}.insights-copy ul{display:grid;gap:.7rem;list-style:none;margin:0;padding:0}.insights-copy li{color:#493e36;font-size:.78rem;line-height:1.45}.insights-copy li i{color:#a9783e;margin-right:.55rem}.insights-board{background:#fbf8f3;border:1px solid rgba(106,78,51,.14);box-shadow:0 24px 60px rgba(64,43,24,.12);padding:clamp(1.2rem,2.5vw,2rem)}.insights-label{align-items:end;border-bottom:1px solid #e3d8ca;display:flex;justify-content:space-between;padding-bottom:1rem}.insights-label span{color:#9b713c;font-size:.6rem;letter-spacing:.16em;text-transform:uppercase}.insights-label b{font-family:'Rufina',serif;font-size:1.05rem;font-weight:400}.kpi-grid{display:grid;gap:.8rem;grid-template-columns:repeat(4,1fr);margin:1rem 0}.kpi-grid article{background:#f2eadf;padding:1rem}.kpi-grid span{color:#78695e;display:block;font-size:.58rem;letter-spacing:.08em;text-transform:uppercase}.kpi-grid strong{display:block;font-family:'Rufina',serif;font-size:clamp(1.5rem,2.4vw,2.4rem);font-weight:400;margin:.4rem 0}.kpi-grid small{color:#9a7b57;font-size:.58rem}.interest-chart{border:1px solid #eadfd1;padding:1rem}.chart-head{display:flex;font-size:.65rem;justify-content:space-between}.chart-head b{color:#9b713c;font-weight:600}.chart-bars{align-items:end;border-bottom:1px solid #cab9a5;display:flex;gap:clamp(.45rem,1.2vw,1rem);height:128px;margin-top:1rem;padding:0 1rem}.chart-bars i{background:linear-gradient(#c59a61,#8a633a);height:var(--h);width:100%}.chart-axis{color:#968476;display:flex;font-size:.52rem;justify-content:space-between;padding-top:.45rem}.insights-disclaimer{color:#a29284;font-size:.52rem;margin:.8rem 0 0;text-align:right}
.closing-spread{align-items:center;background:#201813;color:#f5efe6;display:flex;justify-content:center}.closing-spread:before{background:radial-gradient(circle at 50% 50%,rgba(189,148,90,.13),transparent 55%);content:'';inset:0;position:absolute}.closing-mark{color:rgba(189,148,90,.06);font-family:'Rufina',serif;font-size:min(82vw,80vh);line-height:1;position:absolute}.closing-copy{max-width:780px;padding:3rem;text-align:center}.closing-copy .kicker{color:#d0a267}.closing-copy h2{font-size:clamp(3.2rem,7vw,7.5rem)}.closing-copy>p:not(.kicker):not(.studio-credit){color:#c8baad;line-height:1.65;margin:2rem auto;max-width:620px}.closing-actions{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;margin-top:2.5rem}.closing-actions a,.closing-actions button{align-items:center;border:1px solid #bd945a;display:inline-flex;font-size:.72rem;gap:.6rem;letter-spacing:.1em;padding:.9rem 1.25rem;text-decoration:none;text-transform:uppercase}.closing-actions a{background:#bd945a;color:#1a1410}.closing-actions button{background:transparent;color:#f5efe6}.studio-credit{color:#8e7c6e;font-size:.62rem;letter-spacing:.18em;margin-top:3rem;text-transform:uppercase}
.page-rail{display:flex;flex-direction:column;gap:.7rem;position:fixed;right:1.2rem;top:50%;transform:translateY(-50%);z-index:12}.page-rail button{background:none;border:0;color:rgba(245,239,230,.48);font-size:.56rem;padding:.2rem}.page-rail button:after{background:currentColor;content:'';display:block;height:1px;margin-top:.3rem;transition:width .2s;width:13px}.page-rail button.active{color:#d4a76a}.page-rail button.active:after{width:28px}.page-controls{align-items:center;background:rgba(26,20,16,.9);border:1px solid rgba(189,148,90,.28);border-radius:99px;bottom:1rem;color:#e8d7c1;display:flex;gap:.7rem;left:50%;padding:.35rem;position:fixed;transform:translateX(-50%);z-index:15}.page-controls button{background:none;border:0;border-radius:50%;color:#e8d7c1;height:34px;width:34px}.page-controls button:disabled{opacity:.25}.page-controls span{font-size:.6rem;letter-spacing:.13em;min-width:54px;text-align:center}
@media(max-width:760px){.exhibit-header{grid-template-columns:1fr auto}.header-edition{display:none}.hero-shade{background:linear-gradient(0deg,rgba(245,239,230,.98) 0%,rgba(245,239,230,.86) 50%,rgba(245,239,230,.1) 100%)}.hero-spread>img{object-position:68% center}.hero-copy{justify-content:flex-end;padding:2rem 1.5rem 7rem}.hero-copy h1{font-size:3.7rem}.deck{font-size:.95rem}.credit{bottom:4.7rem;left:1.5rem}.fashion-spread{display:block}.fashion-image{clip-path:polygon(0 0,100% 0,100% 74%,0 100%);height:32vh}.fashion-copy{padding:1.2rem 1.5rem 4rem}.fashion-copy .kicker{margin-bottom:.8rem}.fashion-copy h2{font-size:2.3rem;line-height:.95}.fashion-copy>p:not(.kicker){font-size:.84rem;line-height:1.45;margin:.75rem 0}.fashion-copy dl{margin-top:.75rem}.fashion-copy dl>div{font-size:.7rem;grid-template-columns:76px 1fr;padding:.5rem 0}.jewellery-spread{display:block;padding:6.2rem 1.5rem 5rem}.jewel-intro h2{font-size:3rem}.jewel-stage{margin:-1.5rem auto 0;max-width:390px}.jewel-notes{bottom:4.5rem;gap:.6rem;left:1.5rem;right:1.5rem}.jewel-notes span{width:auto;flex:1}.closing-copy{padding:2rem 1.5rem}.closing-copy h2{font-size:3.4rem}.page-rail{display:none}}
@media(max-width:760px){
  .template-spread{display:block;padding:5.4rem 1rem 4.4rem}.template-heading .kicker{margin-bottom:.65rem}.template-heading h2{font-size:2.3rem}.template-heading>p:last-child{font-size:.75rem;line-height:1.4;margin:.65rem 0 1rem}.template-gallery{display:grid;gap:.55rem;grid-template-columns:1fr 1fr;grid-template-rows:158px 184px;height:auto;max-height:none;min-height:0}.template-card{box-shadow:0 8px 24px rgba(62,43,29,.08);padding:.35rem}.template-card img{height:calc(100% - 34px)}.template-card figcaption{display:block;min-height:34px;padding:.35rem .2rem 0}.template-card figcaption b{display:block;font-size:.66rem}.template-card figcaption span{display:block;font-size:.44rem;text-align:left}.template-wide{grid-column:span 2;grid-row:auto}.template-note{bottom:3.75rem;font-size:.42rem;left:1rem;right:1rem;text-align:center}
  .conversion-spread{padding:5.2rem 1.2rem 4.2rem}.conversion-heading{display:block}.conversion-heading .kicker{margin-bottom:.7rem}.conversion-heading h2{font-size:2.15rem;text-align:left}.conversion-flow{display:grid;gap:0;grid-template-columns:1fr;margin:1.1rem 0 .8rem}.conversion-flow:before{bottom:8%;height:auto;left:20px;right:auto;top:8%;width:1px}.conversion-flow li{display:grid;grid-template-columns:18px 40px minmax(0,1fr);min-height:52px;text-align:left}.conversion-flow li>span{align-self:center}.conversion-flow li>i{grid-column:2;height:32px;margin:.35rem 0;width:32px}.conversion-flow li>b{align-self:end;font-size:.82rem;grid-column:3;grid-row:1;padding-left:.45rem}.conversion-flow li>small{align-self:start;font-size:.55rem;grid-column:3;grid-row:2;margin:0;padding-left:.45rem}.conversion-value{gap:.35rem;grid-template-columns:1fr;padding-top:.65rem}.conversion-value p{font-size:.58rem;line-height:1.35}
  .insights-spread{display:block;padding:5.2rem 1rem 4.2rem}.insights-copy .kicker{margin-bottom:.65rem}.insights-copy h2{font-size:2.45rem}.insights-copy>p:not(.kicker){font-size:.72rem;line-height:1.4;margin:.7rem 0}.insights-copy ul{display:none}.insights-board{box-shadow:0 10px 30px rgba(64,43,24,.1);padding:.75rem}.insights-label{padding-bottom:.55rem}.insights-label b{font-size:.78rem}.insights-label span{font-size:.48rem}.kpi-grid{gap:.45rem;grid-template-columns:1fr 1fr;margin:.55rem 0}.kpi-grid article{padding:.55rem}.kpi-grid span,.kpi-grid small{font-size:.48rem}.kpi-grid strong{font-size:1.35rem;margin:.15rem 0}.interest-chart{padding:.55rem}.chart-bars{height:82px;margin-top:.5rem}.chart-head{font-size:.52rem}.insights-disclaimer{font-size:.43rem;margin:.35rem 0 0}
}
@media(prefers-reduced-motion:reduce){.exhibit-book{scroll-behavior:auto}}
</style>
