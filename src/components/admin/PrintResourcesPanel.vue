<template>
  <div class="brochure-library">
    <section class="library-hero">
      <div class="hero-copy">
        <p class="eyebrow">Admin brochure library</p>
        <h1>Physical business,<br><em>beautifully connected.</em></h1>
        <p class="hero-intro">Seven press-ready ways to show how Peshkash adds a current, measurable digital layer to products, counters, cards and real-world conversations.</p>
      </div>
      <div class="hero-proof" aria-label="Production specification">
        <span class="proof-number">600</span>
        <div><b>DPI PNG masters</b><p>Plus vector PDF, self-contained HTML and separate production dielines where required.</p></div>
      </div>
    </section>

    <section class="library-toolbar" aria-label="Brochure filters">
      <label class="search-field">
        <i class="bi bi-search"></i>
        <input v-model.trim="query" type="search" placeholder="Search product tags, bookmarks, analytics…" aria-label="Search brochures" />
      </label>
      <div class="library-total"><strong>{{ filteredBrochures.length }}</strong><span>brochures</span></div>
    </section>

    <section v-if="loading" class="library-state"><span class="spinner-border spinner-border-sm"></span><p>Loading brochure files…</p></section>
    <section v-else-if="loadError" class="library-state library-state--error">
      <i class="bi bi-exclamation-circle"></i><p>{{ loadError }}</p><button type="button" @click="loadManifest">Try again</button>
    </section>
    <section v-else-if="filteredBrochures.length" class="brochure-grid" aria-label="Brochure files">
      <article v-for="brochure in filteredBrochures" :key="brochure.id" class="brochure-card">
        <a class="brochure-preview" :href="brochure.html" target="_blank" rel="noopener" :aria-label="`Open ${brochure.title} HTML preview`">
          <img :src="brochure.preview" :alt="`${brochure.title} print preview`" loading="lazy" />
          <span class="brochure-number">{{ brochure.number }}</span>
          <span class="preview-label"><i class="bi bi-arrows-fullscreen"></i> Public preview</span>
        </a>
        <div class="brochure-copy">
          <div class="brochure-meta"><span>{{ brochure.format }}</span><span>{{ brochure.pngs.length }} sides</span></div>
          <h2>{{ brochure.title }}</h2>
          <p class="brochure-subtitle">{{ brochure.subtitle }}</p>
          <p class="brochure-use">{{ brochure.use }}</p>
          <div class="tag-list"><span v-for="tag in brochure.tags" :key="tag">{{ tag }}</span></div>

          <div class="public-link">
            <div><span>Public share link</span><code>{{ brochure.html }}</code></div>
            <button type="button" :title="`Copy public link for ${brochure.title}`" @click="copyPublicLink(brochure)">
              <i :class="copiedId === brochure.id ? 'bi bi-check2' : 'bi bi-copy'"></i>
              {{ copiedId === brochure.id ? 'Copied' : 'Copy' }}
            </button>
          </div>

          <div class="file-actions">
            <a :href="brochure.pdf" :download="fileName(brochure.pdf)"><i class="bi bi-file-earmark-pdf"></i><span>PDF</span><small>vector</small></a>
            <a :href="brochure.html" :download="fileName(brochure.html)"><i class="bi bi-code-slash"></i><span>HTML</span><small>editable</small></a>
            <a v-for="(png, index) in brochure.pngs" :key="png" :href="png" :download="fileName(png)">
              <i class="bi bi-file-earmark-image"></i><span>PNG {{ index + 1 }}</span><small>600 DPI</small>
            </a>
          </div>

          <div v-if="brochure.dielinePdf" class="dieline-row">
            <span><i class="bi bi-scissors"></i> Production dieline</span>
            <a :href="brochure.dielinePdf" :download="fileName(brochure.dielinePdf)">PDF</a>
            <a v-if="brochure.dielineHtml" :href="brochure.dielineHtml" target="_blank" rel="noopener">HTML</a>
          </div>
          <p class="finish-note">{{ brochure.finish }}</p>
        </div>
      </article>
    </section>
    <section v-else class="library-state"><i class="bi bi-search"></i><p>No brochure matches that search.</p><button type="button" @click="query = ''">Clear search</button></section>

    <section class="press-note">
      <div><p class="eyebrow">Before the print run</p><h2>Use the PDF at 100% scale.</h2></div>
      <ol>
        <li><span>01</span><p><b>Proof the structure</b>Make a white dummy for every custom structure or detachable section.</p></li>
        <li><span>02</span><p><b>Protect the QR</b>Keep the white field intact and finishes away from the scan area.</p></li>
        <li><span>03</span><p><b>Scan the stock</b>Test both sides on current iOS and Android devices at final size.</p></li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

interface BrochureAsset {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  use: string;
  format: string;
  finish: string;
  stem: string;
  tags: string[];
  pdf: string;
  html: string;
  pngs: string[];
  preview: string;
  dielinePdf?: string;
  dielineHtml?: string;
}

interface BrochureManifest {
  version: string;
  dpi: number;
  brochures: BrochureAsset[];
}

const brochures = ref<BrochureAsset[]>([]);
const query = ref('');
const loading = ref(true);
const loadError = ref('');
const copiedId = ref('');

const filteredBrochures = computed(() => {
  const search = query.value.toLowerCase();
  if (!search) return brochures.value;
  return brochures.value.filter((brochure) =>
    [brochure.title, brochure.subtitle, brochure.use, brochure.format, brochure.finish, ...brochure.tags]
      .join(' ')
      .toLowerCase()
      .includes(search)
  );
});

function fileName(path: string): string {
  return path.split('/').pop() || 'peshkash-brochure';
}

async function loadManifest(): Promise<void> {
  loading.value = true;
  loadError.value = '';
  try {
    const response = await fetch('/resources/brochures/manifest.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Brochure manifest returned ${response.status}`);
    const manifest = await response.json() as BrochureManifest;
    brochures.value = manifest.brochures;
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'The brochure library could not be loaded.';
  } finally {
    loading.value = false;
  }
}

async function copyPublicLink(brochure: BrochureAsset): Promise<void> {
  const link = new URL(brochure.html, window.location.origin).href;
  await navigator.clipboard.writeText(link);
  copiedId.value = brochure.id;
  window.setTimeout(() => {
    if (copiedId.value === brochure.id) copiedId.value = '';
  }, 1800);
}

onMounted(loadManifest);
</script>

<style scoped>
.brochure-library{--ink:#1a1410;--paper:#f5f2ee;--bone:#e8dbce;--gold:#bb9057;--taupe:#8c7667;--line:#ddcdbb;color:var(--ink);display:grid;gap:1.2rem;padding-bottom:3rem}.library-hero{align-items:end;background:linear-gradient(128deg,#f7f3ee 0%,#eadbcb 62%,#dcc4a8 100%);border:1px solid var(--line);display:grid;gap:clamp(2rem,7vw,8rem);grid-template-columns:minmax(0,1.3fr) minmax(270px,.7fr);min-height:360px;padding:clamp(2rem,5vw,5rem)}.eyebrow{color:#966b39;font-size:.66rem;font-weight:700;letter-spacing:.21em;margin:0 0 1rem;text-transform:uppercase}.library-hero h1{font-family:'Rufina',Georgia,serif;font-size:clamp(3rem,6vw,6rem);font-weight:400;letter-spacing:-.055em;line-height:.92;margin:0}.library-hero h1 em{color:#9c6d38;font-weight:400}.hero-intro{color:#65594f;line-height:1.65;margin:1.5rem 0 0;max-width:700px}.hero-proof{align-items:center;background:rgba(255,255,255,.7);border-left:2px solid var(--gold);display:grid;gap:1.1rem;grid-template-columns:auto 1fr;padding:1.35rem}.proof-number{font-family:'Rufina',serif;font-size:3.4rem;line-height:1}.hero-proof b{font-family:'Rufina',serif;font-size:1.05rem;font-weight:400}.hero-proof p{color:#74665a;font-size:.73rem;line-height:1.45;margin:.35rem 0 0}.library-toolbar{align-items:center;background:#fff;border:1px solid var(--line);display:flex;gap:1rem;justify-content:space-between;padding:.8rem}.search-field{align-items:center;border:1px solid #cab59c;display:flex;flex:1;max-width:720px;padding:0 .9rem}.search-field i{color:#9c6d38}.search-field input{background:transparent;border:0;min-height:46px;outline:0;padding:0 .75rem;width:100%}.library-total{align-items:center;background:var(--ink);color:var(--paper);display:flex;gap:.6rem;min-height:46px;padding:0 1rem}.library-total strong{font-family:'Rufina',serif;font-size:1.45rem;font-weight:400}.library-total span{font-size:.6rem;letter-spacing:.14em;text-transform:uppercase}.brochure-grid{display:grid;gap:1.2rem;grid-template-columns:repeat(2,minmax(0,1fr))}.brochure-card{background:#fff;border:1px solid var(--line);display:grid;grid-template-columns:minmax(210px,.8fr) minmax(0,1.2fr);min-width:0}.brochure-preview{align-items:center;background:#eee5da;color:var(--ink);display:flex;min-height:430px;overflow:hidden;padding:1.1rem;position:relative;text-decoration:none}.brochure-preview img{height:100%;object-fit:contain;transition:transform .3s;width:100%}.brochure-preview:hover img{transform:scale(1.025)}.brochure-number{background:var(--ink);color:var(--paper);font-family:'Rufina',serif;font-size:1.3rem;left:.75rem;line-height:1;padding:.55rem;position:absolute;top:.75rem}.preview-label{align-items:center;background:rgba(245,242,238,.93);bottom:.75rem;display:flex;font-size:.61rem;gap:.35rem;letter-spacing:.08em;padding:.45rem .6rem;position:absolute;right:.75rem;text-transform:uppercase}.brochure-copy{display:flex;flex-direction:column;padding:1.2rem}.brochure-meta{color:#9a6f3d;display:flex;font-size:.57rem;justify-content:space-between;letter-spacing:.12em;text-transform:uppercase}.brochure-copy h2{font-family:'Rufina',serif;font-size:1.5rem;font-weight:400;line-height:1.05;margin:.7rem 0 .2rem}.brochure-subtitle{color:#5f5147;font-family:'Rufina',serif;font-size:.9rem;margin:0}.brochure-use{color:#75665b;font-size:.7rem;line-height:1.45;margin:.75rem 0}.tag-list{display:flex;flex-wrap:wrap;gap:.3rem}.tag-list span{background:#f1e8dd;color:#745638;font-size:.52rem;letter-spacing:.07em;padding:.3rem .45rem;text-transform:uppercase}.public-link{align-items:center;background:#f8f4ef;border:1px solid #e6d9ca;display:grid;gap:.7rem;grid-template-columns:minmax(0,1fr) auto;margin-top:1rem;padding:.65rem}.public-link span{color:#8b745f;display:block;font-size:.5rem;letter-spacing:.13em;text-transform:uppercase}.public-link code{color:#4f433a;display:block;font-size:.58rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.public-link button{background:var(--ink);border:0;color:#fff;font-size:.6rem;padding:.55rem .7rem}.file-actions{display:grid;gap:.4rem;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:.75rem}.file-actions a{align-items:center;border:1px solid #c9ad8c;color:var(--ink);display:grid;font-size:.65rem;gap:.15rem;grid-template-columns:auto 1fr auto;padding:.55rem;text-decoration:none}.file-actions a:hover{background:#f1e8dd}.file-actions i{color:#9a6f3d}.file-actions small{color:#8e7c6e;font-size:.5rem;letter-spacing:.08em;text-transform:uppercase}.dieline-row{align-items:center;border-top:1px solid #eadfd3;display:flex;font-size:.6rem;gap:.7rem;margin-top:.75rem;padding-top:.7rem}.dieline-row span{color:#66584e;margin-right:auto}.dieline-row a{border-bottom:1px solid var(--gold);color:var(--ink);text-decoration:none}.finish-note{color:#907d6d;font-size:.55rem;margin:auto 0 0;padding-top:.7rem}.library-state{align-items:center;background:#fff;border:1px solid var(--line);color:#74665a;display:flex;flex-direction:column;gap:.7rem;justify-content:center;min-height:320px;text-align:center}.library-state i{font-size:1.7rem}.library-state button{background:none;border:0;border-bottom:1px solid var(--gold);color:var(--ink)}.library-state--error{color:#8d3c32}.press-note{background:var(--ink);color:var(--paper);display:grid;gap:3rem;grid-template-columns:minmax(220px,.55fr) minmax(0,1.45fr);padding:clamp(2rem,5vw,4rem)}.press-note .eyebrow{color:#d0a267}.press-note h2{font-family:'Rufina',serif;font-size:clamp(2rem,4vw,3.5rem);font-weight:400;line-height:1;margin:0}.press-note ol{display:grid;grid-template-columns:repeat(3,1fr);list-style:none;margin:0;padding:0}.press-note li{border-left:1px solid rgba(187,144,87,.35);display:grid;gap:.8rem;grid-template-columns:28px 1fr;padding:1rem}.press-note li>span{color:var(--gold);font-size:.55rem;letter-spacing:.12em}.press-note li p{color:#b8a99d;font-size:.7rem;line-height:1.45;margin:0}.press-note li b{color:var(--paper);display:block;font-family:'Rufina',serif;font-size:.9rem;font-weight:400;margin-bottom:.25rem}
@media(max-width:1250px){.brochure-grid{grid-template-columns:1fr}.brochure-card{grid-template-columns:minmax(220px,.7fr) minmax(0,1.3fr)}}
@media(max-width:760px){.library-hero{display:block;min-height:0;padding:2rem 1.25rem}.library-hero h1{font-size:3.1rem}.hero-proof{margin-top:1.6rem}.library-toolbar{align-items:stretch;flex-direction:column}.library-total{justify-content:center}.brochure-card{display:block}.brochure-preview{height:340px;min-height:0}.file-actions{grid-template-columns:1fr 1fr}.press-note{display:block;padding:2rem 1.25rem}.press-note ol{display:block;margin-top:1.5rem}.press-note li{border-left:0;border-top:1px solid rgba(187,144,87,.3);padding:.9rem 0}}
</style>
