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
          <p class="kicker">Peshkash Exhibits · No. 01</p>
          <h1>The Atelier<br><em>Edit</em></h1>
          <p class="deck">An interactive shop window for fashion, boutique collections and jewellery—made to travel through a scan or a share.</p>
          <button type="button" class="text-link" @click="goTo(1, 'exhibit_next')">Open the folio <i class="bi bi-arrow-down"></i></button>
        </div>
        <p class="credit">Curated by ArtisticGeek Studios</p>
      </section>

      <section class="exhibit-spread fashion-spread" data-page="1">
        <div class="folio-number">01</div>
        <div class="fashion-image" role="img" aria-label="Close editorial crop of flowing ivory fabric"></div>
        <div class="spread-copy fashion-copy">
          <p class="kicker">Fashion · Form in motion</p>
          <h2>Quiet fabric.<br>Strong silhouette.</h2>
          <p>Collections deserve more than a crowded grid. Give every drop its own pace, story and tactile sense of detail.</p>
          <dl>
            <div><dt>Edition</dt><dd>Limited atelier</dd></div>
            <div><dt>Material</dt><dd>Hand-finished silk</dd></div>
            <div><dt>Made for</dt><dd>Occasion &amp; heirloom</dd></div>
          </dl>
        </div>
        <span class="edge-word">FASHION</span>
      </section>

      <section class="exhibit-spread jewellery-spread" data-page="2">
        <div class="jewel-intro">
          <p class="kicker">Jewellery · Object stories</p>
          <h2>Pieces worth<br><em>remembering.</em></h2>
          <p>Provenance, craft, care and the maker’s note—kept beside the piece without adding visual noise to the counter.</p>
        </div>
        <div class="jewel-stage" aria-label="Sculptural jewellery display">
          <div class="necklace-orbit"><span v-for="n in 17" :key="n" :style="{ '--i': n }"></span></div>
          <div class="garnet"></div>
          <p>Hand formed<br><b>Brushed brass</b></p>
        </div>
        <div class="jewel-notes"><span>Certificate</span><span>Material</span><span>Care</span><span>Maker</span></div>
      </section>

      <section class="exhibit-spread closing-spread" data-page="3">
        <div class="closing-mark">P</div>
        <div class="spread-copy closing-copy">
          <p class="kicker">Your collection, presented</p>
          <h2>From counter<br>to conversation.</h2>
          <p>One living brochure for your boutique, exhibition or jewellery line. Share it online, place it behind a QR, and see what your audience keeps exploring.</p>
          <div class="closing-actions">
            <a :href="whatsappUrl" target="_blank" rel="noopener" @click="track('exhibit_whatsapp')"><i class="bi bi-whatsapp"></i> Build my exhibit</a>
            <button type="button" @click="shareExhibit"><i class="bi bi-share"></i> Share this folio</button>
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
import { useAnalytics } from '../composables/useAnalytics';
import { usePageMeta } from '../composables/usePageMeta';
import { sharePublicPage } from '../utils/socialShare';

const pages = ['Cover', 'Fashion', 'Jewellery', 'Present yours'];
const current = ref(0);
const book = ref<HTMLElement | null>(null);
const touchStart = ref({ x: 0, y: 0 });
const { setMeta, resetMeta } = usePageMeta();
const analytics = useAnalytics({ vendorSlug: 'artisticgeek-studios', qrHash: 'peshkash-home' });
const pageLabel = computed(() => pages[current.value]);
const whatsappUrl = 'https://wa.me/919115551110?text=I%20would%20like%20a%20Peshkash%20interactive%20exhibit%20for%20my%20collection.';

function track(action: string) { analytics.track(action); }

function goTo(index: number, action?: string) {
  const target = Math.max(0, Math.min(pages.length - 1, index));
  const section = book.value?.querySelector<HTMLElement>(`[data-page="${target}"]`);
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (action && target !== current.value) track(action);
}

function syncCurrent() {
  if (!book.value) return;
  current.value = Math.max(0, Math.min(pages.length - 1, Math.round(book.value.scrollTop / book.value.clientHeight)));
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
    title: 'The Atelier Edit — Peshkash Exhibits',
    text: 'An interactive brochure for fashion, boutique collections and jewellery by ArtisticGeek Studios.',
    previewPath: 'exhibits',
  });
  if (shared) track('exhibit_share');
}

onMounted(() => {
  setMeta({
    title: 'The Atelier Edit — Peshkash Exhibits',
    description: 'Swipe through an interactive Peshkash brochure for fashion, boutique collections and jewellery, presented by ArtisticGeek Studios.',
    type: 'article',
  });
  track('exhibit_page_view');
  window.addEventListener('keydown', onKeydown);
});

onUnmounted(() => { resetMeta(); window.removeEventListener('keydown', onKeydown); });
</script>

<style scoped>
.exhibits-page { --ink:#1a1410; --paper:#f5efe6; --gold:#bd945a; --garnet:#7b2734; background:var(--ink); color:var(--ink); height:100dvh; overflow:hidden; }
.exhibit-header { align-items:center; background:rgba(26,20,16,.94); border-bottom:1px solid rgba(189,148,90,.28); color:#f5efe6; display:grid; grid-template-columns:1fr auto 1fr; height:64px; left:0; padding:0 clamp(1rem,3vw,2.5rem); position:fixed; right:0; top:0; z-index:20; backdrop-filter:blur(14px); }
.exhibit-header>a { justify-self:start; }.exhibit-header button { background:none;border:1px solid rgba(189,148,90,.4);border-radius:50%;color:#eadcc8;height:36px;justify-self:end;width:36px}.header-edition { align-items:center;display:flex;gap:.7rem;font-size:.66rem;letter-spacing:.16em;text-transform:uppercase}.header-edition span{color:#bd945a}.header-edition b{font-weight:500}
.exhibit-book { height:100dvh; overflow-x:hidden; overflow-y:auto; scroll-behavior:smooth; scroll-snap-type:y mandatory; scrollbar-width:none; }.exhibit-book::-webkit-scrollbar{display:none}
.exhibit-spread { min-height:100dvh; overflow:hidden; padding-top:64px; position:relative; scroll-snap-align:start; scroll-snap-stop:always; }
.hero-spread { background:#d9c9b6; }.hero-spread>img{height:100%;inset:0;object-fit:cover;position:absolute;width:100%}.hero-shade{background:linear-gradient(90deg,rgba(245,239,230,.98) 0%,rgba(245,239,230,.88) 34%,rgba(245,239,230,.06) 72%),linear-gradient(0deg,rgba(26,20,16,.22),transparent 38%);inset:0;position:absolute}.spread-copy{position:relative;z-index:2}.hero-copy{align-items:flex-start;display:flex;flex-direction:column;height:calc(100dvh - 64px);justify-content:center;max-width:660px;padding:clamp(2rem,7vw,7rem)}
.kicker{color:#956a36;font-size:.68rem;font-weight:700;letter-spacing:.24em;margin:0 0 1.5rem;text-transform:uppercase}.hero-copy h1,.spread-copy h2,.jewel-intro h2{font-family:'Rufina',Georgia,serif;font-weight:400;letter-spacing:-.045em;line-height:.91;margin:0}.hero-copy h1{font-size:clamp(3.6rem,9vw,8.8rem)}.hero-copy h1 em,.jewel-intro h2 em{color:#a9783e;font-weight:400}.deck{font-size:clamp(1rem,1.6vw,1.25rem);line-height:1.55;margin:2rem 0;max-width:540px}.text-link{background:none;border:0;border-bottom:1px solid #9b713c;color:#1a1410;font-size:.78rem;font-weight:700;letter-spacing:.13em;padding:.5rem 0;text-transform:uppercase}.text-link i{margin-left:.7rem}.credit{bottom:2rem;color:#6f6258;font-size:.68rem;left:clamp(2rem,7vw,7rem);letter-spacing:.13em;margin:0;position:absolute;text-transform:uppercase;z-index:2}
.fashion-spread{background:#211914;color:#f4eade;display:grid;grid-template-columns:minmax(260px,.85fr) minmax(320px,1.15fr)}.fashion-image{background-image:linear-gradient(0deg,rgba(26,20,16,.18),rgba(26,20,16,.04)),url('/resources/exhibits/atelier-hero.png');background-position:68% center;background-size:auto 125%;clip-path:polygon(0 0,86% 0,100% 100%,0 100%)}.fashion-copy{align-self:center;padding:clamp(3rem,8vw,8rem)}.fashion-copy .kicker{color:#d1a66e}.fashion-copy h2{font-size:clamp(2.8rem,6vw,6.4rem)}.fashion-copy>p:not(.kicker){color:#c8baad;line-height:1.7;margin:2rem 0;max-width:560px}.fashion-copy dl{border-top:1px solid rgba(189,148,90,.3);margin-top:3rem}.fashion-copy dl>div{border-bottom:1px solid rgba(189,148,90,.2);display:grid;font-size:.78rem;grid-template-columns:120px 1fr;padding:.9rem 0}.fashion-copy dt{color:#a88a69;font-weight:500;text-transform:uppercase}.fashion-copy dd{margin:0}.folio-number{color:rgba(255,255,255,.06);font-family:'Rufina',serif;font-size:32vw;line-height:1;position:absolute;right:-2vw;top:8vh}.edge-word{bottom:2rem;color:#bd945a;font-size:.6rem;letter-spacing:.4em;position:absolute;right:2rem;writing-mode:vertical-rl}
.jewellery-spread{background:var(--paper);display:grid;grid-template-columns:1fr 1.1fr;padding-inline:clamp(2rem,7vw,7rem)}.jewel-intro{align-self:center;max-width:620px}.jewel-intro h2{font-size:clamp(3rem,6.5vw,7rem)}.jewel-intro>p:last-child{color:#655b53;line-height:1.7;margin-top:2rem;max-width:520px}.jewel-stage{align-self:center;aspect-ratio:1;position:relative}.necklace-orbit{border:1px solid rgba(189,148,90,.34);border-radius:50%;inset:12%;position:absolute}.necklace-orbit:after{border:1px solid rgba(189,148,90,.18);border-radius:50%;content:'';inset:12%;position:absolute}.necklace-orbit span{--a:calc(var(--i) * 21deg);background:#b98a4d;border-radius:40% 60% 45% 55%;height:28px;left:calc(50% + cos(var(--a))*44%);position:absolute;top:calc(50% + sin(var(--a))*44%);transform:translate(-50%,-50%) rotate(var(--a));width:11px}.garnet{background:radial-gradient(circle at 35% 30%,#d7858f 0 5%,#842e3b 20%,#3d1017 62%,#17090b);border:12px solid #b98a4d;box-shadow:0 20px 40px rgba(35,12,15,.25);height:74px;left:30%;position:absolute;top:54%;transform:rotate(-14deg);width:66px}.jewel-stage p{bottom:13%;color:#77695e;font-size:.65rem;letter-spacing:.16em;position:absolute;right:12%;text-transform:uppercase}.jewel-stage p b{color:#1a1410;display:block;font-family:'Rufina',serif;font-size:1.2rem;letter-spacing:0;margin-top:.4rem;text-transform:none}.jewel-notes{bottom:2rem;display:flex;gap:2rem;left:clamp(2rem,7vw,7rem);position:absolute}.jewel-notes span{border-top:1px solid #bd945a;color:#8b765f;font-size:.62rem;letter-spacing:.18em;padding-top:.65rem;text-transform:uppercase;width:90px}
.closing-spread{align-items:center;background:#201813;color:#f5efe6;display:flex;justify-content:center}.closing-spread:before{background:radial-gradient(circle at 50% 50%,rgba(189,148,90,.13),transparent 55%);content:'';inset:0;position:absolute}.closing-mark{color:rgba(189,148,90,.06);font-family:'Rufina',serif;font-size:min(82vw,80vh);line-height:1;position:absolute}.closing-copy{max-width:780px;padding:3rem;text-align:center}.closing-copy .kicker{color:#d0a267}.closing-copy h2{font-size:clamp(3.2rem,7vw,7.5rem)}.closing-copy>p:not(.kicker):not(.studio-credit){color:#c8baad;line-height:1.65;margin:2rem auto;max-width:620px}.closing-actions{display:flex;flex-wrap:wrap;gap:.75rem;justify-content:center;margin-top:2.5rem}.closing-actions a,.closing-actions button{align-items:center;border:1px solid #bd945a;display:inline-flex;font-size:.72rem;gap:.6rem;letter-spacing:.1em;padding:.9rem 1.25rem;text-decoration:none;text-transform:uppercase}.closing-actions a{background:#bd945a;color:#1a1410}.closing-actions button{background:transparent;color:#f5efe6}.studio-credit{color:#8e7c6e;font-size:.62rem;letter-spacing:.18em;margin-top:3rem;text-transform:uppercase}
.page-rail{display:flex;flex-direction:column;gap:.7rem;position:fixed;right:1.2rem;top:50%;transform:translateY(-50%);z-index:12}.page-rail button{background:none;border:0;color:rgba(245,239,230,.48);font-size:.56rem;padding:.2rem}.page-rail button:after{background:currentColor;content:'';display:block;height:1px;margin-top:.3rem;transition:width .2s;width:13px}.page-rail button.active{color:#d4a76a}.page-rail button.active:after{width:28px}.page-controls{align-items:center;background:rgba(26,20,16,.9);border:1px solid rgba(189,148,90,.28);border-radius:99px;bottom:1rem;color:#e8d7c1;display:flex;gap:.7rem;left:50%;padding:.35rem;position:fixed;transform:translateX(-50%);z-index:15}.page-controls button{background:none;border:0;border-radius:50%;color:#e8d7c1;height:34px;width:34px}.page-controls button:disabled{opacity:.25}.page-controls span{font-size:.6rem;letter-spacing:.13em;min-width:54px;text-align:center}
@media(max-width:760px){.exhibit-header{grid-template-columns:1fr auto}.header-edition{display:none}.hero-shade{background:linear-gradient(0deg,rgba(245,239,230,.98) 0%,rgba(245,239,230,.86) 50%,rgba(245,239,230,.1) 100%)}.hero-spread>img{object-position:68% center}.hero-copy{justify-content:flex-end;padding:2rem 1.5rem 7rem}.hero-copy h1{font-size:3.7rem}.deck{font-size:.95rem}.credit{bottom:4.7rem;left:1.5rem}.fashion-spread{display:block}.fashion-image{clip-path:polygon(0 0,100% 0,100% 78%,0 100%);height:46vh}.fashion-copy{padding:2.2rem 1.5rem 6rem}.fashion-copy h2{font-size:2.8rem}.fashion-copy>p:not(.kicker){margin:1.2rem 0}.fashion-copy dl{margin-top:1.3rem}.jewellery-spread{display:block;padding:6.2rem 1.5rem 5rem}.jewel-intro h2{font-size:3rem}.jewel-stage{margin:-1.5rem auto 0;max-width:390px}.jewel-notes{bottom:4.5rem;gap:.6rem;left:1.5rem;right:1.5rem}.jewel-notes span{width:auto;flex:1}.closing-copy{padding:2rem 1.5rem}.closing-copy h2{font-size:3.4rem}.page-rail{display:none}}
@media(prefers-reduced-motion:reduce){.exhibit-book{scroll-behavior:auto}}
</style>
