<template>
  <main class="story-page" :class="`mode-${mode}`">
    <div class="story-shell">
      <section class="story-hero" :class="{ 'has-cover': Boolean(config.coverImageUrl) }">
        <figure v-if="config.coverImageUrl" class="hero-cover"><img :src="config.coverImageUrl" :alt="`${vendor.displayName} cover`" /></figure>
        <div v-else-if="vendor.logoUrl" class="hero-logo"><img :src="vendor.logoUrl" :alt="vendor.displayName" /></div>
        <div class="hero-copy">
          <p class="kicker">{{ config.kicker || 'Presented on Peshkash' }}</p>
          <h1>{{ vendor.displayName }}</h1>
          <p v-if="vendor.description" class="lead">{{ vendor.description }}</p>
          <div class="hero-meta">
            <span v-if="vendor.address"><i class="bi bi-geo-alt"></i>{{ vendor.address }}</span>
            <span v-if="businessSchedule"><i class="bi bi-clock"></i>{{ businessSchedule }}</span>
          </div>
        </div>
      </section>

      <a v-if="config.showCountdown && nextEvent" class="countdown-card" :href="`/event/${nextEvent.name}`">
        <div><p class="kicker">Next event</p><h2>{{ nextEvent.displayName }}</h2><small>{{ eventDate(nextEvent) }}</small></div>
        <div class="countdown-numbers" aria-label="Time until event">
          <span><strong>{{ countdown.days }}</strong><small>days</small></span>
          <span><strong>{{ countdown.hours }}</strong><small>hours</small></span>
          <span><strong>{{ countdown.minutes }}</strong><small>mins</small></span>
        </div>
      </a>

      <template v-for="section in visibleSections" :key="section.key">
        <section v-if="section.key === 'story'" class="page-section story-section">
          <header><p class="kicker">Our story</p><h2>{{ config.storyHeading || 'About us' }}</h2></header>
          <div class="story-grid">
            <div><p v-for="paragraph in storyParagraphs" :key="paragraph" class="lead">{{ paragraph }}</p></div>
            <blockquote v-if="config.storyQuote">“{{ config.storyQuote }}”<cite v-if="config.storyQuoteBy">{{ config.storyQuoteBy }}</cite></blockquote>
          </div>
        </section>

        <section v-else-if="section.key === 'gallery'" class="page-section gallery-section">
          <header><p class="kicker">Gallery</p><h2>From {{ vendor.displayName }}</h2></header>
          <div v-if="config.galleryLayout === 'carousel'" class="gallery-carousel">
            <div class="carousel-strip">
              <button v-for="slide in carouselSlides" :key="`${slide.position}-${slide.photo.url}`" class="carousel-slide" :class="slide.position" type="button" :aria-label="slide.position === 'current' ? `Open ${slide.photo.caption || 'gallery image'}` : `${slide.position === 'previous' ? 'Previous' : 'Next'} gallery image`" @click="slide.position === 'current' ? openPhoto(slide.index) : moveCarousel(slide.offset)">
                <img :src="slide.photo.url" :alt="slide.photo.caption || `${vendor.displayName} photo ${slide.index + 1}`" @error="markPhotoFailed(slide.photo.url)" />
                <span v-if="slide.position === 'current' && slide.photo.caption">{{ slide.photo.caption }}</span>
              </button>
            </div>
            <div class="carousel-controls">
              <p><strong>{{ carouselPhotoIndex + 1 }}</strong> / {{ galleryPhotos.length }}</p>
              <div><button type="button" aria-label="Previous gallery image" @click="moveCarousel(-1)"><i class="bi bi-arrow-left"></i></button><button type="button" aria-label="Next gallery image" @click="moveCarousel(1)"><i class="bi bi-arrow-right"></i></button></div>
            </div>
          </div>
          <div v-else class="gallery-grid">
            <button v-for="(photo, index) in galleryPhotos" :key="photo.url" type="button" @click="openPhoto(index)">
              <img :src="photo.url" :alt="photo.caption || `${vendor.displayName} photo ${index + 1}`" loading="lazy" @error="markPhotoFailed(photo.url)" />
              <span v-if="photo.caption">{{ photo.caption }}</span>
            </button>
          </div>
        </section>

        <section v-else-if="section.key === 'events'" class="page-section events-section">
          <header class="section-heading"><div><p class="kicker">Events</p><h2>{{ mode === 'programme' ? 'The programme' : 'What’s happening' }}</h2></div>
            <div v-if="hasPastAndUpcoming" class="event-tabs" role="group" aria-label="Event filter">
              <button type="button" :aria-pressed="eventTab === 'upcoming'" @click="eventTab = 'upcoming'">Upcoming</button>
              <button type="button" :aria-pressed="eventTab === 'past'" @click="eventTab = 'past'">Past</button>
            </div>
          </header>
          <div class="event-grid">
            <a v-for="event in tabbedEvents" :key="event.id" class="event-card" :class="{ past: isPast(event) }" :href="`/event/${event.name}`">
              <time><strong>{{ eventDay(event) }}</strong><small>{{ eventMonth(event) }}</small></time>
              <div><p class="event-when">{{ eventDate(event) }}</p><h3>{{ event.displayName }}</h3><p v-if="event.description">{{ event.description }}</p></div>
              <i class="bi bi-arrow-up-right"></i>
            </a>
          </div>
        </section>

        <section v-else-if="section.key === 'menus'" class="page-section menus-section">
          <header><p class="kicker">Menus</p><h2>{{ mode === 'shopfront' ? 'Browse the catalogue' : 'What we offer' }}</h2></header>
          <div class="menu-list">
            <component :is="menu.publicPath ? 'a' : 'article'" v-for="menu in visibleMenus" :key="menu.id" class="menu-row" :href="menu.publicPath || undefined">
              <span class="menu-icon"><i :class="mode === 'shopfront' ? 'bi bi-grid' : 'bi bi-journal-richtext'"></i></span>
              <div><p class="menu-kind">{{ mode === 'shopfront' ? 'Catalogue' : 'Menu' }}</p><h3>{{ menu.displayName }}</h3><p v-if="menu.description">{{ menu.description }}</p></div>
              <span class="menu-action"><small>{{ menu.itemCount }} {{ menu.itemCount === 1 ? 'item' : 'items' }}</small><strong v-if="menu.publicPath">View {{ mode === 'shopfront' ? 'catalogue' : 'menu' }}</strong><i v-if="menu.publicPath" class="bi bi-arrow-right"></i></span>
            </component>
          </div>
        </section>

        <section v-else-if="section.key === 'contact'" class="page-section contact-section">
          <header><p class="kicker">Visit</p><h2>Find us</h2></header>
          <div v-if="vendor.address" class="venue-card"><i class="bi bi-geo-alt"></i><div><small>Location</small><h3>{{ vendor.displayName }}</h3><p>{{ vendor.address }}</p></div><a :href="mapsUrl" target="_blank" rel="noreferrer">Directions <i class="bi bi-arrow-up-right"></i></a></div>
          <div class="contact-grid">
            <component :is="item.href ? 'a' : 'div'" v-for="item in contactItems" :key="item.label" class="contact-item" :href="item.href" :target="item.external ? '_blank' : undefined" :rel="item.external ? 'noreferrer' : undefined"><i :class="item.icon"></i><span><small>{{ item.label }}</small><strong>{{ item.value }}</strong></span><i v-if="item.href" class="bi bi-arrow-up-right"></i></component>
          </div>
        </section>

        <div v-if="config.galleryLayout === 'spread' && spreadPhotosFor(section.key).length" class="story-photo-break" :class="{ pair: spreadPhotosFor(section.key).length > 1 }">
          <button v-for="photo in spreadPhotosFor(section.key)" :key="photo.url" type="button" @click="openPhoto(galleryPhotos.findIndex(item => item.url === photo.url))">
            <img :src="photo.url" :alt="photo.caption || `${vendor.displayName} gallery photo`" loading="lazy" @error="markPhotoFailed(photo.url)" />
            <span v-if="photo.caption">{{ photo.caption }}</span>
          </button>
        </div>
      </template>

      <footer><span>Presented on</span><PeshkashLogo :variant="mode === 'programme' ? 'dark-bg' : 'light-bg'" :height="18" /></footer>
    </div>

    <nav class="action-dock" aria-label="Vendor actions">
      <a v-if="phone" :href="`tel:${phone}`"><i class="bi bi-telephone"></i><span>Call</span></a>
      <a v-if="vendor.address" :href="mapsUrl" target="_blank" rel="noreferrer"><i class="bi bi-sign-turn-right"></i><span>Directions</span></a>
      <button type="button" @click="saveContact"><i class="bi bi-person-plus"></i><span>Save</span></button>
      <button type="button" @click="share"><i class="bi bi-share"></i><span>Share</span></button>
    </nav>

    <div v-if="activePhoto !== null && galleryPhotos[activePhoto]" class="lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer" tabindex="-1" @click.self="activePhoto = null">
      <button class="close" type="button" aria-label="Close photo viewer" @click="activePhoto = null"><i class="bi bi-x-lg"></i></button>
      <button type="button" aria-label="Previous photo" @click="movePhoto(-1)"><i class="bi bi-arrow-left"></i></button>
      <figure><img :src="galleryPhotos[activePhoto].url" :alt="galleryPhotos[activePhoto].caption || 'Vendor gallery photo'" /><figcaption v-if="galleryPhotos[activePhoto].caption">{{ galleryPhotos[activePhoto].caption }}</figcaption></figure>
      <button type="button" aria-label="Next photo" @click="movePhoto(1)"><i class="bi bi-arrow-right"></i></button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import PeshkashLogo from '../PeshkashLogo.vue';
import { contactFieldValue, normalizeContactPageConfig, normalizeContactPageMode, vendorPhoneValue, type ContactPageMode } from '../../features/vendors/contactPage';
import { contactResource, openNativeResource } from '../../utils/nativeResource';
import { sharePublicPage } from '../../utils/socialShare';

const props = defineProps<{ vendor: any }>();
const mode = computed<ContactPageMode>(() => normalizeContactPageMode(props.vendor.contactPageMode || 'editorial'));
const config = computed(() => normalizeContactPageConfig(props.vendor.contactPageConfig));
const now = ref(Date.now());
const eventTab = ref<'upcoming' | 'past'>('upcoming');
const activePhoto = ref<number | null>(null);
const carouselPhotoIndex = ref(0);
const failedPhotos = ref(new Set<string>());
let timer: number | undefined;

function contactValue(label: string) { return contactFieldValue(props.vendor.contact, label); }
const phone = computed(() => vendorPhoneValue(props.vendor.contact));
const email = computed(() => contactValue('Email'));
const website = computed(() => contactValue('Website'));
const businessDays = computed(() => contactValue('Business Days'));
const businessHours = computed(() => contactValue('Business Hours'));
const businessSchedule = computed(() => [businessDays.value, businessHours.value].filter(Boolean).join(' · '));
const mapsValue = computed(() => contactValue('Google Maps'));
const mapsUrl = computed(() => mapsValue.value || `https://maps.google.com/?q=${encodeURIComponent(props.vendor.address || '')}`);
const storyParagraphs = computed(() => config.value.storyBody.split(/\n\s*\n/).map(value => value.trim()).filter(Boolean));
const galleryPhotos = computed(() => config.value.gallery.filter(photo => !failedPhotos.value.has(photo.url)));
const carouselSlides = computed(() => {
  const photos = galleryPhotos.value;
  if (!photos.length) return [];
  const slide = (offset: number, position: 'previous' | 'current' | 'next') => {
    const index = (carouselPhotoIndex.value + offset + photos.length) % photos.length;
    return { photo: photos[index], index, offset, position };
  };
  if (photos.length === 1) return [slide(0, 'current')];
  return [slide(-1, 'previous'), slide(0, 'current'), slide(1, 'next')];
});
const selectedEvents = computed(() => {
  let events = [...(props.vendor.events || [])];
  if (config.value.eventScope === 'selected') events = events.filter(event => config.value.eventIds.includes(Number(event.id)));
  if (config.value.eventScope === 'upcoming') events = events.filter(event => !isPast(event));
  if (config.value.eventScope === 'past') events = events.filter(isPast);
  return events;
});
const upcomingEvents = computed(() => selectedEvents.value.filter(event => !isPast(event)));
const pastEvents = computed(() => selectedEvents.value.filter(isPast).reverse());
const hasPastAndUpcoming = computed(() => upcomingEvents.value.length > 0 && pastEvents.value.length > 0);
const tabbedEvents = computed(() => hasPastAndUpcoming.value ? (eventTab.value === 'upcoming' ? upcomingEvents.value : pastEvents.value) : selectedEvents.value);
const nextEvent = computed(() => [...upcomingEvents.value]
  .filter(event => event.startTime && new Date(event.startTime).getTime() > now.value)
  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]);
const visibleMenus = computed(() => config.value.menuIds.length ? (props.vendor.menus || []).filter((menu: any) => config.value.menuIds.includes(Number(menu.id))) : (props.vendor.menus || []));
const countdown = computed(() => { const left = Math.max(0, new Date(nextEvent.value?.startTime || 0).getTime() - now.value); return { days: Math.floor(left / 86400000), hours: Math.floor(left / 3600000) % 24, minutes: Math.floor(left / 60000) % 60 }; });
const instagram = computed(() => contactValue('Instagram'));
const contactItems = computed(() => [
  phone.value && { label: 'Phone', value: phone.value, href: `tel:${phone.value}`, icon: 'bi bi-telephone', external: false },
  email.value && { label: 'Email', value: email.value, href: `mailto:${email.value}`, icon: 'bi bi-envelope', external: false },
  website.value && { label: 'Website', value: website.value, href: website.value.startsWith('http') ? website.value : `https://${website.value}`, icon: 'bi bi-globe2', external: true },
  instagram.value && { label: 'Instagram', value: instagram.value.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, ''), href: instagram.value.startsWith('http') ? instagram.value : `https://instagram.com/${instagram.value.replace(/^@/, '')}`, icon: 'bi bi-instagram', external: true },
  businessSchedule.value && { label: 'Hours', value: businessSchedule.value, icon: 'bi bi-clock', external: false },
].filter(Boolean) as Array<{ label: string; value: string; href?: string; icon: string; external: boolean }>);
const visibleSections = computed(() => config.value.sections.filter(section => section.enabled && ({ story: storyParagraphs.value.length || config.value.storyQuote, gallery: config.value.galleryLayout !== 'spread' && galleryPhotos.value.length, events: selectedEvents.value.length, menus: visibleMenus.value.length, contact: props.vendor.address || contactItems.value.length }[section.key])));
const spreadSectionKeys = computed(() => visibleSections.value.filter(section => section.key !== 'gallery').map(section => section.key));
const spreadGalleryEnabled = computed(() => config.value.sections.some(section => section.key === 'gallery' && section.enabled));

function isPast(event: any) { return new Date(event.endTime || event.startTime || 0).getTime() < now.value; }
function eventDay(event: any) { return new Intl.DateTimeFormat(undefined, { day: '2-digit' }).format(new Date(event.startTime)); }
function eventMonth(event: any) { return new Intl.DateTimeFormat(undefined, { month: 'short' }).format(new Date(event.startTime)); }
function eventDate(event: any) { return event.startTime ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.startTime)) : 'Date to be announced'; }
function openPhoto(index: number) { activePhoto.value = index; }
function movePhoto(delta: number) { if (activePhoto.value === null || !galleryPhotos.value.length) return; activePhoto.value = (activePhoto.value + delta + galleryPhotos.value.length) % galleryPhotos.value.length; }
function moveCarousel(delta: number) { if (!galleryPhotos.value.length) return; carouselPhotoIndex.value = (carouselPhotoIndex.value + delta + galleryPhotos.value.length) % galleryPhotos.value.length; }
function markPhotoFailed(url: string) { failedPhotos.value = new Set([...failedPhotos.value, url]); carouselPhotoIndex.value = Math.min(carouselPhotoIndex.value, Math.max(0, galleryPhotos.value.length - 1)); if (activePhoto.value !== null && activePhoto.value >= galleryPhotos.value.length) activePhoto.value = null; }
function spreadPhotosFor(key: string) { if (!spreadGalleryEnabled.value) return []; const slot = spreadSectionKeys.value.indexOf(key as any); if (slot < 0) return []; return galleryPhotos.value.filter((_, index) => index % spreadSectionKeys.value.length === slot); }
function onKey(event: KeyboardEvent) { if (activePhoto.value === null) return; if (event.key === 'Escape') activePhoto.value = null; if (event.key === 'ArrowLeft') movePhoto(-1); if (event.key === 'ArrowRight') movePhoto(1); }
async function saveContact() { const resource = contactResource({ name: props.vendor.displayName, organization: props.vendor.displayName, phone: phone.value, email: email.value, address: props.vendor.address, website: website.value, notes: props.vendor.description }); await openNativeResource(resource.file, resource.androidIntent, `Save ${props.vendor.displayName}`); }
async function share() { await sharePublicPage({ title: props.vendor.displayName, text: props.vendor.description || `Discover ${props.vendor.displayName} on Peshkash.`, previewPath: `vendor/${props.vendor.name}` }); }
onMounted(() => { timer = window.setInterval(() => { now.value = Date.now(); }, 60000); window.addEventListener('keydown', onKey); });
onUnmounted(() => { if (timer) window.clearInterval(timer); window.removeEventListener('keydown', onKey); });
</script>

<style scoped>
.story-page{--cream:#f5f2ee;--cream2:#e8dbce;--ink:#1a1410;--muted:#564c40;--soft:#8c7667;--gold:#bd945a;--surface:#fff;--line:rgba(86,76,64,.18);background:var(--cream);color:var(--ink);font-family:Urbanist,system-ui,sans-serif;min-height:calc(100vh - 60px);padding-bottom:7rem}.story-shell{margin:auto;max-width:1060px;padding:clamp(2.25rem,6vw,5rem) clamp(1.1rem,4vw,3rem) 1rem}.story-page h1,.story-page h2,.story-page h3,.story-page blockquote{font-family:Rufina,Georgia,serif;font-weight:400;letter-spacing:-.03em;line-height:1.06}.story-page p{margin:0}.kicker{color:var(--gold);font-size:.66rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.lead{color:var(--muted);font-size:1rem;line-height:1.75;max-width:62ch}.story-hero{align-items:center;display:grid;gap:clamp(2rem,5vw,4.5rem)}.story-hero.has-cover{grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr)}.hero-cover{margin:0}.hero-cover img{aspect-ratio:4/5;border-radius:160px 160px 12px 12px;height:auto;object-fit:cover;width:100%}.hero-logo{align-items:center;background:#1a1410;border-radius:160px 160px 12px 12px;display:flex;justify-content:center;min-height:440px;padding:3rem}.hero-logo img{max-height:140px;max-width:75%;object-fit:contain}.hero-copy h1{font-size:clamp(3rem,7vw,5.8rem);margin:1rem 0 1.4rem}.hero-meta{border-top:1px solid var(--line);color:var(--muted);display:flex;flex-wrap:wrap;font-size:.88rem;gap:.8rem 2rem;margin-top:2rem;padding-top:1.1rem}.hero-meta span{align-items:center;display:flex;gap:.5rem}.hero-meta i{color:var(--gold)}.countdown-card{align-items:center;background:#1a1410;border-radius:18px;color:#f5f2ee;display:grid;gap:1rem 2rem;grid-template-columns:1fr auto;margin-top:4rem;padding:1.5rem 2rem;text-decoration:none}.countdown-card h2{font-size:2rem;margin:.35rem 0}.countdown-card small,.countdown-card .kicker{color:#c5af9d}.countdown-numbers{display:flex}.countdown-numbers span{border-right:1px solid rgba(255,255,255,.16);display:flex;flex-direction:column;min-width:74px;text-align:center}.countdown-numbers span:last-child{border:0}.countdown-numbers strong{font:400 2.5rem/1 Rufina,Georgia,serif}.page-section{border-top:1px solid var(--line);margin-top:clamp(3rem,7vw,5.5rem);padding-top:1.6rem}.page-section h2{font-size:clamp(2rem,4.6vw,3.35rem);margin:.4rem 0 0}.section-heading{align-items:end;display:flex;flex-wrap:wrap;gap:1rem;justify-content:space-between}.story-grid{display:grid;gap:clamp(1.5rem,5vw,4rem);grid-template-columns:1.1fr .9fr;margin-top:1.8rem}.story-grid .lead+.lead{margin-top:1rem}.story-grid blockquote{border-left:2px solid var(--gold);font-size:clamp(1.45rem,2.8vw,2rem);margin:0;padding-left:1.2rem}.story-grid cite{color:var(--soft);display:block;font:400 .8rem Urbanist,system-ui,sans-serif;margin-top:1rem}.gallery-grid{columns:3;column-gap:.9rem;margin-top:1.8rem}.gallery-grid button,.story-photo-break button,.carousel-slide{background:none;border:0;padding:0;position:relative;width:100%}.gallery-grid button,.story-photo-break button,.carousel-slide.current{cursor:zoom-in}.gallery-grid button{break-inside:avoid;margin:0 0 .9rem}.gallery-grid img{border-radius:14px;display:block;transition:transform .35s;width:100%}.gallery-grid button:hover img{transform:scale(1.02)}.gallery-grid span,.story-photo-break span,.carousel-slide.current>span{background:rgba(26,20,16,.76);border-radius:999px;bottom:.7rem;color:#fff;font-size:.7rem;left:.7rem;max-width:calc(100% - 1.4rem);overflow:hidden;padding:.3rem .65rem;position:absolute;text-overflow:ellipsis;white-space:nowrap}.gallery-carousel{margin-top:1.5rem}.carousel-strip{display:grid;gap:.75rem;grid-template-columns:minmax(70px,.18fr) minmax(0,.64fr) minmax(70px,.18fr);height:clamp(230px,31vw,340px);overflow:hidden}.carousel-slide{border-radius:16px;height:100%;overflow:hidden}.carousel-slide img{display:block;height:100%;object-fit:cover;transition:filter .25s,opacity .25s,transform .25s;width:100%}.carousel-slide.current{box-shadow:0 14px 36px rgba(26,20,16,.14)}.carousel-slide.previous,.carousel-slide.next{cursor:pointer;opacity:.66}.carousel-slide.previous img,.carousel-slide.next img{filter:blur(3px);opacity:.72;transform:scale(1.12);width:145%}.carousel-slide.previous img{float:right;object-position:right}.carousel-slide.next img{float:left;object-position:left}.carousel-slide.previous:hover,.carousel-slide.next:hover{opacity:.82}.carousel-controls{align-items:center;display:flex;justify-content:space-between;margin-top:.75rem}.carousel-controls p{color:var(--soft);font-size:.75rem}.carousel-controls p strong{color:var(--ink);font-size:1rem}.carousel-controls>div{display:flex;gap:.5rem}.carousel-controls button{align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:50%;color:var(--ink);display:flex;height:36px;justify-content:center;width:36px}.story-photo-break{display:grid;gap:1rem;grid-template-columns:1fr;margin:clamp(3rem,7vw,5.5rem) 0}.story-photo-break.pair{grid-template-columns:repeat(2,minmax(0,1fr))}.story-photo-break img{aspect-ratio:16/8;border-radius:18px;display:block;object-fit:cover;width:100%}.story-photo-break.pair img{aspect-ratio:4/3}.story-photo-break.pair button:nth-child(even){margin-top:clamp(1.5rem,4vw,3.5rem)}.event-tabs{background:var(--cream2);border-radius:999px;display:flex;padding:.25rem}.event-tabs button{background:transparent;border:0;border-radius:999px;color:var(--muted);font-size:.8rem;font-weight:600;padding:.5rem .95rem}.event-tabs button[aria-pressed=true]{background:var(--ink);color:var(--cream)}.event-grid{display:grid;gap:1rem;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:1.8rem}.event-card{background:var(--surface);border:1px solid var(--line);border-radius:28px 28px 12px 12px;color:inherit;display:grid;gap:1rem;grid-template-columns:auto minmax(0,1fr) auto;min-height:190px;padding:1.3rem;text-decoration:none;transition:.2s}.event-card:hover{border-color:var(--gold);color:inherit;transform:translateY(-2px)}.event-card.past{background:transparent}.event-card time{align-items:center;background:var(--ink);border-radius:50%;color:var(--cream);display:flex;flex-direction:column;height:62px;justify-content:center;width:62px}.event-card.past time{background:var(--cream2);color:var(--muted)}.event-card time strong{font:400 1.4rem/1 Rufina,Georgia,serif}.event-card time small{font-size:.58rem;letter-spacing:.1em;text-transform:uppercase}.event-card>div{align-self:end;min-width:0}.event-card h3,.menu-row h3,.venue-card h3{font-size:1.55rem;margin:.35rem 0}.event-card p,.menu-row p,.venue-card p{color:var(--muted);font-size:.88rem}.event-card .event-when{color:var(--soft);font-size:.78rem}.event-card>i{color:var(--gold)}.menu-list{display:grid;gap:.75rem;margin-top:1.6rem}.menu-row{align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:16px;display:grid;gap:1rem;grid-template-columns:auto minmax(0,1fr) auto;padding:1.15rem 1.25rem;transition:border-color .2s,box-shadow .2s,transform .2s}.menu-row[href]:hover{border-color:var(--gold);box-shadow:0 12px 30px rgba(26,20,16,.08);transform:translateY(-2px)}.menu-icon{align-items:center;background:var(--cream2);border-radius:12px;color:var(--gold);display:flex;font-size:1.15rem;height:48px;justify-content:center;width:48px}.menu-kind{color:var(--gold)!important;font-size:.6rem!important;font-weight:700;letter-spacing:.14em;text-transform:uppercase}.menu-action{align-items:center;color:var(--soft);display:grid;font-size:.75rem;gap:.2rem .45rem;grid-template-columns:auto auto;justify-items:end;min-width:112px}.menu-action small{grid-column:1/-1}.menu-action strong{color:var(--ink);font-size:.75rem;font-weight:700}.menu-action i{color:var(--gold);font-size:1rem}.menu-row>div{min-width:0}.menu-row>div>p:last-child{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2}.venue-card{align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:18px;display:grid;gap:1.2rem;grid-template-columns:auto minmax(0,1fr) auto;margin-top:1.6rem;padding:1.4rem 1.6rem}.venue-card>i{align-items:center;background:var(--cream2);border-radius:50%;color:var(--gold);display:flex;font-size:1.2rem;height:48px;justify-content:center;width:48px}.venue-card a{background:var(--ink);border-radius:999px;color:var(--cream);font-size:.75rem;font-weight:700;padding:.7rem 1rem;text-decoration:none;text-transform:uppercase}.contact-grid{display:grid;gap:0 1.5rem;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:.8rem}.contact-item{align-items:center;border-bottom:1px solid var(--line);color:inherit;display:grid;gap:.9rem;grid-template-columns:22px minmax(0,1fr) auto;min-width:0;padding:1rem .3rem;text-decoration:none}.contact-item>i:first-child{color:var(--gold)}.contact-item>span{min-width:0}.contact-grid small{color:var(--soft);display:block;font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.contact-grid strong{display:block;font-size:.9rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}footer{align-items:center;color:var(--soft);display:flex;font-size:.68rem;gap:.65rem;justify-content:center;margin:4.5rem 0 1rem}footer .pk-logo{width:auto}.action-dock{backdrop-filter:blur(14px);background:rgba(26,20,16,.94);border:1px solid rgba(189,148,90,.58);border-radius:999px;bottom:12px;box-shadow:0 18px 45px rgba(26,20,16,.28);display:flex;left:50%;padding:.4rem;position:fixed;transform:translateX(-50%);z-index:20}.action-dock a,.action-dock button{align-items:center;background:transparent;border:0;border-radius:999px;color:#f5f2ee;display:flex;font:500 .8rem Urbanist,system-ui,sans-serif;gap:.5rem;padding:.62rem 1rem;text-decoration:none;white-space:nowrap}.action-dock i{color:var(--gold)}.lightbox{align-items:center;background:rgba(26,20,16,.96);display:grid;grid-template-columns:auto minmax(0,900px) auto;inset:0;padding:2rem;position:fixed;z-index:1100}.lightbox button{background:transparent;border:1px solid rgba(255,255,255,.25);border-radius:50%;color:#fff;height:44px;width:44px}.lightbox .close{position:absolute;right:1.5rem;top:1.5rem}.lightbox figure{margin:0;text-align:center}.lightbox img{max-height:82vh;max-width:100%;object-fit:contain}.lightbox figcaption{color:#f5f2ee;font-size:.85rem;margin-top:.75rem}.mode-lookbook .story-hero{display:flex;flex-direction:column-reverse;align-items:stretch}.mode-lookbook .hero-copy h1{font-size:clamp(4rem,12vw,9rem);line-height:.88}.mode-lookbook .hero-cover img{aspect-ratio:16/7;border-radius:120px 120px 12px 12px}.mode-programme{--cream:#1a1410;--cream2:#3a2e25;--ink:#f5f2ee;--muted:#c5af9d;--soft:#c5af9d;--surface:#241c16;--line:rgba(245,242,238,.16)}.mode-programme .story-hero.has-cover{grid-template-columns:1.15fr .85fr}.mode-programme .hero-cover{order:2}.mode-programme .hero-cover img{aspect-ratio:1;border-radius:6px}.mode-programme .venue-card a{background:var(--gold);color:#1a1410}.mode-shopfront .story-hero{position:relative}.mode-shopfront .hero-cover img{border-radius:20px}.mode-shopfront .hero-copy{background:var(--surface);border:1px solid var(--line);border-radius:22px;padding:clamp(1.5rem,4vw,3rem)}
@media(max-width:760px){.story-page{padding-bottom:6rem}.story-shell{padding-top:2rem}.story-hero.has-cover,.mode-programme .story-hero.has-cover,.story-grid,.event-grid,.contact-grid{grid-template-columns:1fr}.hero-cover img,.mode-lookbook .hero-cover img{aspect-ratio:4/3;border-radius:72px 72px 10px 10px}.hero-copy h1,.mode-lookbook .hero-copy h1{font-size:clamp(2.5rem,12vw,3.8rem)}.countdown-card{grid-template-columns:1fr;padding:1.25rem}.countdown-numbers{justify-content:space-between}.gallery-grid{columns:2}.carousel-strip{gap:.45rem;grid-template-columns:11% 78% 11%;height:clamp(190px,54vw,225px)}.carousel-slide{border-radius:12px}.carousel-slide.previous img,.carousel-slide.next img{filter:blur(2px);width:185%}.story-photo-break.pair{grid-template-columns:1fr}.story-photo-break.pair button:nth-child(even){margin-top:0}.story-photo-break img,.story-photo-break.pair img{aspect-ratio:4/3}.event-card{min-height:160px}.menu-row{align-items:start;grid-template-columns:auto minmax(0,1fr)}.menu-action{grid-column:2;justify-items:start;min-width:0}.venue-card{grid-template-columns:auto 1fr}.venue-card a{grid-column:1/-1;text-align:center}.action-dock{bottom:0;border-radius:18px 18px 0 0;justify-content:space-around;width:100%}.action-dock a,.action-dock button{flex-direction:column;font-size:.68rem;gap:.2rem;padding:.55rem .7rem}.lightbox{grid-template-columns:36px 1fr 36px;padding:1rem}.lightbox button{height:36px;width:36px}}@media(prefers-reduced-motion:reduce){.event-card,.menu-row,.gallery-grid img,.carousel-slide img{transition:none}.event-card:hover,.menu-row[href]:hover{transform:none}.gallery-grid button:hover img{transform:none}}
.menu-row[href]{color:inherit;text-decoration:none}.menu-row[href]:hover{color:inherit}
.carousel-slide.previous,.carousel-slide.next,.carousel-slide.previous:hover,.carousel-slide.next:hover{opacity:1}.carousel-slide.previous img,.carousel-slide.next img{opacity:1}
.venue-card{background:transparent;border:0;border-bottom:1px solid var(--line);border-radius:0;gap:.9rem;grid-template-columns:22px minmax(0,1fr) auto;margin-top:1rem;padding:1rem .3rem}.venue-card>i{background:transparent;border-radius:0;font-size:1rem;height:auto;width:auto}.venue-card small{color:var(--soft);display:block;font-size:.6rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}.venue-card h3{font-family:Urbanist,system-ui,sans-serif;font-size:1rem;font-weight:700;letter-spacing:0;line-height:1.25;margin:.2rem 0}.venue-card p{font-size:.82rem;line-height:1.45}.venue-card a,.mode-programme .venue-card a{align-items:center;background:transparent;color:var(--ink);display:flex;gap:.45rem;padding:.35rem 0;text-transform:none}.venue-card a i{color:var(--gold)}
@media(max-width:760px){.venue-card{grid-template-columns:22px minmax(0,1fr)}.venue-card a{grid-column:2;justify-self:start;padding:0;text-align:left}}
</style>
