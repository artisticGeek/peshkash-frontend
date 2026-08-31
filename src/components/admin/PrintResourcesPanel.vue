<template>
  <div class="resources-page">
    <section class="resources-hero">
      <div>
        <p class="eyebrow">Admin print library</p>
        <h1>Everything worth<br><em>taking to press.</em></h1>
        <p class="hero-copy">Vector QR collateral, brand marks and organiser-facing material—kept in one downloadable library for printers, partners and field teams.</p>
      </div>
      <aside class="printer-note">
        <i class="bi bi-printer"></i>
        <div>
          <b>For the print shop</b>
          <p>Use SVG as the production master. Confirm final size and scan the live QR at 100% before approving the print run.</p>
        </div>
      </aside>
    </section>

    <section class="resource-shortcuts" aria-label="Featured resources">
      <article v-for="resource in featuredResources" :key="resource.title" class="shortcut-card">
        <div class="shortcut-preview" :class="resource.tone">
          <img v-if="resource.preview" :src="resource.preview" :alt="resource.title" />
          <i v-else :class="resource.icon"></i>
        </div>
        <div class="shortcut-copy">
          <span>{{ resource.kind }}</span>
          <h2>{{ resource.title }}</h2>
          <p>{{ resource.description }}</p>
          <div class="shortcut-actions">
            <a :href="resource.href" target="_blank" rel="noopener">Open <i class="bi bi-box-arrow-up-right"></i></a>
            <a v-if="resource.download" :href="resource.href" :download="resource.filename">Download <i class="bi bi-download"></i></a>
          </div>
        </div>
      </article>
    </section>

    <section class="library-section">
      <header class="library-header">
        <div>
          <p class="eyebrow">QR collateral masters</p>
          <h2>Choose the physical format</h2>
          <p>These are editable vector masters from the approved Peshkash template system. The QR and copy shown inside are examples; generate the final live artwork in QR Studio before production.</p>
        </div>
        <div class="library-count"><strong>{{ filteredTemplates.length }}</strong><span>files shown</span></div>
      </header>

      <div class="resource-filters">
        <label class="search-field">
          <i class="bi bi-search"></i>
          <input v-model.trim="query" type="search" placeholder="Search cards, tags, plates…" aria-label="Search print resources" />
        </label>
        <div class="theme-toggle" aria-label="Template theme">
          <button v-for="option in themes" :key="option.value" type="button" :class="{ active: theme === option.value }" @click="theme = option.value">{{ option.label }}</button>
        </div>
        <select v-model="category" aria-label="Filter resource category">
          <option value="all">All formats</option>
          <option v-for="option in categories" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </div>

      <div v-if="filteredTemplates.length" class="resource-grid">
        <article v-for="asset in filteredTemplates" :key="asset.href" class="resource-card">
          <a :href="asset.href" target="_blank" rel="noopener" class="resource-preview" :aria-label="`Preview ${asset.title}`">
            <img :src="asset.href" :alt="`${asset.title} — ${asset.themeLabel}`" loading="lazy" />
          </a>
          <div class="resource-card-copy">
            <div class="resource-meta"><span>{{ asset.categoryLabel }}</span><span>SVG · vector</span></div>
            <h3>{{ asset.title }}</h3>
            <p>{{ asset.themeLabel }}</p>
            <div class="resource-actions">
              <a :href="asset.href" target="_blank" rel="noopener" title="Open full-size preview"><i class="bi bi-arrows-fullscreen"></i><span>Preview</span></a>
              <a :href="asset.href" :download="asset.filename" title="Download vector master"><i class="bi bi-download"></i><span>Download</span></a>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="resource-empty">
        <i class="bi bi-search"></i>
        <p>No resources match this search.</p>
        <button type="button" @click="resetFilters">Clear filters</button>
      </div>
    </section>

    <section class="press-checklist">
      <div>
        <p class="eyebrow">Before approving production</p>
        <h2>A sixty-second press check</h2>
      </div>
      <ol>
        <li><span>01</span><p><b>Use final artwork</b>Download from QR Studio after connecting the correct live destination.</p></li>
        <li><span>02</span><p><b>Protect the quiet zone</b>Do not crop, stretch or place graphics close to the QR edge.</p></li>
        <li><span>03</span><p><b>Test at actual size</b>Scan from two different phones before the full quantity is printed.</p></li>
        <li><span>04</span><p><b>Keep one proof</b>Save the approved digital file alongside the physical sample.</p></li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

type Theme = 'Porcelain-Cameo' | 'Obsidian-Ring';
type Category = 'identity' | 'art' | 'product' | 'food' | 'service' | 'event';

const theme = ref<Theme>('Porcelain-Cameo');
const category = ref<'all' | Category>('all');
const query = ref('');

const themes: Array<{ value: Theme; label: string }> = [
  { value: 'Porcelain-Cameo', label: 'Light' },
  { value: 'Obsidian-Ring', label: 'Dark' },
];

const categories: Array<{ value: Category; label: string }> = [
  { value: 'identity', label: 'Identity & contact' },
  { value: 'art', label: 'Art & exhibitions' },
  { value: 'product', label: 'Products & packaging' },
  { value: 'food', label: 'Food & hospitality' },
  { value: 'service', label: 'Services & learning' },
  { value: 'event', label: 'Events & places' },
];

const templateFiles = [
  '01-contact-card-creative.svg', '02-contact-card-professional.svg', '03-contact-card-maker.svg',
  '04-portfolio-postcard.svg', '05-social-follow-card.svg', '06-artist-artwork-tag.svg',
  '07-painter-title-card.svg', '08-exhibition-wall-label.svg', '09-gallery-takeaway-card.svg',
  '10-museum-object-label.svg', '11-craft-market-tag.svg', '12-product-sticker-square.svg',
  '13-product-sticker-round.svg', '14-product-care-card.svg', '15-packaging-insert.svg',
  '16-jewellery-authenticity-card.svg', '17-furniture-product-tag.svg', '18-baker-box-sticker.svg',
  '19-caterer-menu-card.svg', '20-restaurant-table-menu.svg', '21-cafe-counter-plate.svg',
  '22-food-stall-sign.svg', '23-salon-booking-card.svg', '24-studio-booking-plate.svg',
  '25-repair-service-tag.svg', '26-tutor-class-flyer.svg', '27-event-checkin-pass.svg',
  '28-wedding-vendor-card.svg', '29-real-estate-property-card.svg', '30-exhibition-entry-card.svg',
] as const;

function templateCategory(filename: string): Category {
  const number = Number(filename.slice(0, 2));
  if (number <= 5) return 'identity';
  if (number <= 11) return 'art';
  if (number <= 18) return 'product';
  if (number <= 22) return 'food';
  if (number <= 26) return 'service';
  return 'event';
}

function titleFromFilename(filename: string) {
  return filename.replace(/^\d+-/, '').replace(/\.svg$/, '').replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const allTemplates = computed(() => templateFiles.map((filename) => {
  const assetCategory = templateCategory(filename);
  const href = `/brand/qr-templates/${theme.value}/${filename}`;
  return {
    filename: `Peshkash-${theme.value}-${filename}`,
    href,
    title: titleFromFilename(filename),
    themeLabel: theme.value === 'Porcelain-Cameo' ? 'Porcelain Cameo · light' : 'Obsidian Ring · dark',
    category: assetCategory,
    categoryLabel: categories.find((item) => item.value === assetCategory)?.label ?? 'Print collateral',
  };
}));

const filteredTemplates = computed(() => {
  const search = query.value.toLowerCase();
  return allTemplates.value.filter((asset) =>
    (category.value === 'all' || asset.category === category.value)
    && (!search || `${asset.title} ${asset.categoryLabel}`.toLowerCase().includes(search))
  );
});

const featuredResources = [
  {
    kind: 'Print-ready brochure · A4 PDF', title: 'Exhibition organiser brochure',
    description: 'Eight-page organiser pitch with the visitor journey, QR touchpoints, value and illustrative insights.',
    href: '/resources/brochures/Peshkash-Exhibition-Organiser-Brochure.pdf', preview: '',
    filename: 'Peshkash-Exhibition-Organiser-Brochure.pdf', download: true, tone: 'gold', icon: 'bi bi-file-earmark-pdf',
  },
  {
    kind: 'Complete light collection', title: 'Porcelain Cameo catalogue',
    description: 'All approved light-theme QR formats on one reference board.',
    href: '/brand/qr-templates/Porcelain-Cameo/00-Porcelain-Cameo-Catalog.svg',
    preview: '/brand/qr-templates/Porcelain-Cameo/00-Porcelain-Cameo-Catalog.svg',
    filename: 'Peshkash-Porcelain-Cameo-Catalog.svg', download: true, tone: 'light', icon: '',
  },
  {
    kind: 'Complete dark collection', title: 'Obsidian Ring catalogue',
    description: 'All approved dark-theme QR formats on one reference board.',
    href: '/brand/qr-templates/Obsidian-Ring/00-Obsidian-Ring-Catalog.svg',
    preview: '/brand/qr-templates/Obsidian-Ring/00-Obsidian-Ring-Catalog.svg',
    filename: 'Peshkash-Obsidian-Ring-Catalog.svg', download: true, tone: 'dark', icon: '',
  },
  {
    kind: 'Interactive sales material', title: 'Exhibition organiser proposal',
    description: 'The shareable Peshkash pitch for exhibition organisers and partners.',
    href: '/exhibits', preview: '', filename: '', download: false, tone: 'gold', icon: 'bi bi-window-stack',
  },
  {
    kind: 'Brand master', title: 'Peshkash logo · dark',
    description: 'Vector Peshkash wordmark master for light backgrounds.',
    href: '/brand/peshkash-logo-dark.svg', preview: '/brand/peshkash-logo-dark.svg',
    filename: 'Peshkash-Logo-Dark.svg', download: true, tone: 'paper', icon: '',
  },
  {
    kind: 'Brand master', title: 'Peshkash logo · light',
    description: 'Vector Peshkash wordmark master for dark backgrounds.',
    href: '/brand/peshkash-logo-light.svg', preview: '/brand/peshkash-logo-light.svg',
    filename: 'Peshkash-Logo-Light.svg', download: true, tone: 'dark', icon: '',
  },
  {
    kind: 'Social identity', title: 'Peshkash profile artwork',
    description: 'Square profile artwork for WhatsApp and social channels.',
    href: '/brand/social/peshkash-whatsapp-dp.png', preview: '/brand/social/peshkash-whatsapp-dp.png',
    filename: 'Peshkash-WhatsApp-Profile.png', download: true, tone: 'paper', icon: '',
  },
] as const;

function resetFilters() {
  query.value = '';
  category.value = 'all';
}
</script>

<style scoped>
.resources-page{--ink:#211914;--paper:#f5efe6;--gold:#bd945a;--line:#dfd1c0;color:var(--ink);display:grid;gap:1.25rem;padding-bottom:3rem}.resources-hero{align-items:end;background:linear-gradient(120deg,#eee3d5 0%,#f8f3ec 65%,#ead8c1 100%);border:1px solid var(--line);display:grid;gap:clamp(2rem,6vw,7rem);grid-template-columns:minmax(0,1.2fr) minmax(280px,.8fr);min-height:360px;padding:clamp(2rem,5vw,5rem)}.eyebrow{color:#9b713c;font-size:.67rem;font-weight:700;letter-spacing:.2em;margin:0 0 1rem;text-transform:uppercase}.resources-hero h1{font-family:'Rufina',Georgia,serif;font-size:clamp(3rem,6vw,6.4rem);font-weight:400;letter-spacing:-.05em;line-height:.92;margin:0}.resources-hero h1 em{color:#a9783e;font-weight:400}.hero-copy{color:#655b53;line-height:1.65;margin:1.5rem 0 0;max-width:650px}.printer-note{align-items:flex-start;background:rgba(255,255,255,.64);border-left:2px solid var(--gold);display:flex;gap:1rem;padding:1.25rem}.printer-note>i{color:#9b713c;font-size:1.35rem}.printer-note b{font-family:'Rufina',serif;font-size:1.1rem;font-weight:400}.printer-note p{color:#655b53;font-size:.78rem;line-height:1.5;margin:.45rem 0 0}.resource-shortcuts{display:grid;gap:1rem;grid-template-columns:repeat(4,minmax(0,1fr))}.shortcut-card{background:#fff;border:1px solid var(--line);display:flex;flex-direction:column;min-height:340px}.shortcut-preview{align-items:center;background:#f1e9df;display:flex;height:160px;justify-content:center;overflow:hidden;padding:1rem}.shortcut-preview.dark{background:#211914}.shortcut-preview.gold{background:linear-gradient(135deg,#7f5b31,#c9a06a);color:#fff}.shortcut-preview>i{font-size:3rem}.shortcut-preview img{height:100%;max-width:100%;object-fit:contain}.shortcut-copy{display:flex;flex:1;flex-direction:column;padding:1rem}.shortcut-copy>span,.resource-meta{color:#9b713c;font-size:.56rem;letter-spacing:.12em;text-transform:uppercase}.shortcut-copy h2{font-family:'Rufina',serif;font-size:1.15rem;font-weight:400;margin:.45rem 0}.shortcut-copy p{color:#706158;font-size:.72rem;line-height:1.45;margin:0}.shortcut-actions{display:flex;gap:1rem;margin-top:auto;padding-top:1rem}.shortcut-actions a{border-bottom:1px solid #b58a55;color:var(--ink);font-size:.68rem;text-decoration:none}.library-section{background:#fbf8f3;border:1px solid var(--line);padding:clamp(1rem,3vw,2.5rem)}.library-header{align-items:end;display:flex;gap:2rem;justify-content:space-between}.library-header h2,.press-checklist h2{font-family:'Rufina',serif;font-size:clamp(2rem,4vw,3.6rem);font-weight:400;letter-spacing:-.03em;margin:0}.library-header>div>p:last-child{color:#706158;font-size:.78rem;line-height:1.5;margin:.8rem 0 0;max-width:720px}.library-count{align-items:center;background:#211914;color:#f5efe6;display:flex;flex-direction:column;min-width:104px;padding:1rem}.library-count strong{font-family:'Rufina',serif;font-size:2rem;font-weight:400}.library-count span{font-size:.53rem;letter-spacing:.1em;text-transform:uppercase}.resource-filters{align-items:center;border-bottom:1px solid var(--line);border-top:1px solid var(--line);display:grid;gap:.75rem;grid-template-columns:minmax(240px,1fr) auto minmax(170px,.35fr);margin:2rem 0 1.25rem;padding:1rem 0}.search-field{align-items:center;border:1px solid #cdbca7;display:flex;padding:0 .8rem}.search-field i{color:#9b713c}.search-field input,.resource-filters select{background:transparent;border:0;color:var(--ink);min-height:42px;outline:none;width:100%}.search-field input{padding:0 .7rem}.resource-filters select{border:1px solid #cdbca7;padding:0 .7rem}.theme-toggle{border:1px solid #cdbca7;display:flex}.theme-toggle button{background:transparent;border:0;color:#655b53;font-size:.72rem;min-height:42px;padding:0 1rem}.theme-toggle button.active{background:#211914;color:#fff}.resource-grid{display:grid;gap:1rem;grid-template-columns:repeat(3,minmax(0,1fr))}.resource-card{background:#fff;border:1px solid #e3d8ca;min-width:0}.resource-preview{align-items:center;background:#eee7de;display:flex;height:230px;justify-content:center;overflow:hidden;padding:.75rem}.resource-preview img{height:100%;object-fit:contain;transition:transform .25s;width:100%}.resource-preview:hover img{transform:scale(1.025)}.resource-card-copy{padding:1rem}.resource-meta{display:flex;justify-content:space-between}.resource-card h3{font-family:'Rufina',serif;font-size:1.15rem;font-weight:400;margin:.65rem 0 .25rem}.resource-card-copy>p{color:#837367;font-size:.66rem;margin:0}.resource-actions{border-top:1px solid #eee4d8;display:flex;gap:.4rem;margin-top:.9rem;padding-top:.8rem}.resource-actions a{align-items:center;border:1px solid #b99362;color:var(--ink);display:flex;font-size:.64rem;gap:.4rem;justify-content:center;padding:.55rem;text-decoration:none;width:50%}.resource-actions a:last-child{background:#bd945a}.resource-empty{align-items:center;color:#78695e;display:flex;flex-direction:column;padding:5rem;text-align:center}.resource-empty i{font-size:2rem}.resource-empty button{background:none;border:0;border-bottom:1px solid #9b713c}.press-checklist{background:#211914;color:#f5efe6;display:grid;gap:3rem;grid-template-columns:minmax(220px,.55fr) minmax(0,1.45fr);padding:clamp(2rem,5vw,4rem)}.press-checklist .eyebrow{color:#d0a267}.press-checklist ol{display:grid;gap:0;grid-template-columns:1fr 1fr;list-style:none;margin:0;padding:0}.press-checklist li{border-left:1px solid rgba(189,148,90,.35);display:grid;gap:.8rem;grid-template-columns:32px 1fr;padding:1rem}.press-checklist li>span{color:#bd945a;font-size:.58rem;letter-spacing:.12em}.press-checklist li p{color:#ad9f94;font-size:.72rem;line-height:1.45;margin:0}.press-checklist li b{color:#f5efe6;display:block;font-family:'Rufina',serif;font-size:.94rem;font-weight:400;margin-bottom:.25rem}
@media(max-width:1100px){.resource-shortcuts{grid-template-columns:1fr 1fr}.resource-grid{grid-template-columns:1fr 1fr}.resource-filters{grid-template-columns:1fr 1fr}.search-field{grid-column:1/-1}}
@media(max-width:700px){.resources-page{gap:.75rem}.resources-hero{display:block;min-height:0;padding:2rem 1.25rem}.resources-hero h1{font-size:3rem}.hero-copy{font-size:.82rem}.printer-note{margin-top:1.5rem}.resource-shortcuts{grid-template-columns:1fr}.shortcut-card{display:grid;grid-template-columns:120px 1fr;min-height:0}.shortcut-preview{height:100%;min-height:180px}.library-section{padding:1rem}.library-header{align-items:flex-start}.library-count{min-width:76px}.resource-filters{display:grid;grid-template-columns:1fr}.search-field{grid-column:auto}.resource-grid{grid-template-columns:1fr}.resource-preview{height:260px}.press-checklist{display:block;padding:2rem 1.25rem}.press-checklist ol{grid-template-columns:1fr;margin-top:1rem}.press-checklist li{border-left:0;border-top:1px solid rgba(189,148,90,.3);padding:.8rem 0}}
</style>
