<template>
  <div class="event-page">
    <header class="event-topbar">
      <RouterLink to="/" aria-label="Peshkash home"><PeshkashLogo variant="light-bg" :height="28" /></RouterLink>
      <span class="event-state" :class="`is-${eventState}`"><i class="bi bi-broadcast-pin"></i>{{ stateLabel }}</span>
    </header>

    <main v-if="loading" class="event-message"><span class="spinner-border spinner-border-sm" /> Preparing the event…</main>
    <main v-else-if="error || !event" class="event-message event-error">
      <i class="bi bi-calendar-x"></i><h1>Event unavailable</h1><p>{{ error || 'This event page is not live.' }}</p>
    </main>
    <main v-else class="event-content">
      <aside v-if="event.preview" class="preview-notice" role="status">
        <i class="bi bi-eye"></i>
        <div><strong>Preview mode</strong><span>Publish this event to open registration to guests.</span></div>
      </aside>
      <section class="event-hero" :class="{ 'has-image': event.experience.heroImageUrl }">
        <img v-if="event.experience.heroImageUrl" :src="event.experience.heroImageUrl" :alt="event.displayName" />
        <div class="event-hero-copy">
          <p class="event-eyebrow">{{ event.experience.eyebrow || stateLabel }}</p>
          <h1>{{ event.displayName }}</h1>
          <p v-if="event.description" class="event-intro">{{ event.description }}</p>
          <div class="event-meta">
            <span v-if="event.startTime"><i class="bi bi-calendar3"></i>{{ eventDate }}</span>
          </div>
        </div>
      </section>

      <section v-if="event.experience.countdownEnabled && eventState === 'upcoming'" class="countdown" aria-label="Time until event">
        <p>Begins in</p>
        <div>
          <span><strong>{{ countdown.days }}</strong><small>days</small></span>
          <span><strong>{{ countdown.hours }}</strong><small>hours</small></span>
          <span><strong>{{ countdown.minutes }}</strong><small>minutes</small></span>
          <span><strong>{{ countdown.seconds }}</strong><small>seconds</small></span>
        </div>
      </section>

      <section v-if="event.experience.venueName || event.experience.venueAddress || event.experience.mapUrl" class="event-section venue-card">
        <div class="venue-icon" aria-hidden="true"><i class="bi bi-geo-alt"></i></div>
        <div class="venue-copy">
          <p class="section-kicker">Venue</p>
          <h2>{{ event.experience.venueName || 'Event location' }}</h2>
          <p v-if="event.experience.venueAddress && event.experience.venueAddress !== event.experience.venueName">{{ event.experience.venueAddress }}</p>
        </div>
        <a v-if="event.experience.mapUrl" class="directions-link" :href="event.experience.mapUrl" target="_blank" rel="noreferrer" @click="track('event_directions_click')"><span>Directions</span><i class="bi bi-arrow-up-right"></i></a>
      </section>

      <section v-if="visibleGuests.length" class="event-section guest-section">
        <div class="guest-section-heading">
          <div><p class="section-kicker">People to look forward to</p><h2>On the programme</h2></div>
          <div v-if="visibleGuests.length > 1" class="guest-controls" aria-label="Guest carousel controls">
            <button type="button" :disabled="activeGuestIndex === 0" aria-label="Previous guest" @click="moveGuestCarousel(-1)"><i class="bi bi-arrow-left"></i></button>
            <span>{{ activeGuestIndex + 1 }} / {{ visibleGuests.length }}</span>
            <button type="button" :disabled="activeGuestIndex === visibleGuests.length - 1" aria-label="Next guest" @click="moveGuestCarousel(1)"><i class="bi bi-arrow-right"></i></button>
          </div>
        </div>
        <div ref="guestCarousel" class="guest-carousel" role="region" aria-roledescription="carousel" aria-label="Event guests" @scroll.passive="syncGuestCarousel">
          <article v-for="(guest, index) in visibleGuests" :key="guest.id || guest.name" class="guest-card" :class="{ 'has-portrait': Boolean(guestPortrait(guest)) }" :aria-label="`${index + 1} of ${visibleGuests.length}: ${guest.name}`">
            <div v-if="guestPortrait(guest)" class="guest-portrait" :class="{ 'is-instagram-thumbnail': portraitUsesInstagramThumbnail(guest) }">
              <img :src="guestPortrait(guest)" :alt="`${guest.name} portrait`" loading="lazy" decoding="async" @error="markGuestPortraitFailed(guest)" />
            </div>
            <div v-else class="guest-monogram" aria-hidden="true">{{ guestInitials(guest.name) }}</div>
            <div class="guest-card-copy"><p class="guest-role">{{ guest.role || 'Guest' }}</p><h3>{{ guest.name }}</h3><p v-if="guest.bio" class="guest-bio">{{ guest.bio }}</p>
              <div class="guest-links">
                <a v-if="guest.vendorSlug" :href="`/vendor/${guest.vendorSlug}`" aria-label="Peshkash profile"><i class="bi bi-person-vcard"></i></a>
                <a v-if="guest.website" :href="guest.website" target="_blank" rel="noreferrer" aria-label="Website"><i class="bi bi-globe2"></i></a>
                <a v-if="guest.phone" :href="`tel:${guest.phone}`" aria-label="Phone"><i class="bi bi-telephone"></i></a>
                <a v-if="guest.instagram" :href="guest.instagram" target="_blank" rel="noreferrer" aria-label="Instagram"><i class="bi bi-instagram"></i></a>
                <a v-if="guest.youtube" :href="guest.youtube" target="_blank" rel="noreferrer" aria-label="YouTube"><i class="bi bi-youtube"></i></a>
                <a v-if="guest.linkedin" :href="guest.linkedin" target="_blank" rel="noreferrer" aria-label="LinkedIn"><i class="bi bi-linkedin"></i></a>
              </div>
            </div>
          </article>
        </div>
        <div v-if="visibleGuests.length > 1" class="guest-dots" aria-label="Choose a guest">
          <button v-for="(guest, index) in visibleGuests" :key="`dot-${guest.id || guest.name}`" type="button" :class="{ active: index === activeGuestIndex }" :aria-label="`Show ${guest.name}`" :aria-current="index === activeGuestIndex ? 'true' : undefined" @click="goToGuest(index)" />
        </div>
      </section>

      <section v-if="event.organizer" class="event-section organizer-card">
        <p class="section-kicker">Presented by</p>
        <div><img v-if="event.organizer.logoUrl" :src="event.organizer.logoUrl" :alt="event.organizer.displayName" /><h2>{{ event.organizer.displayName }}</h2></div>
        <RouterLink v-if="event.organizer.name" :to="`/vendor/${event.organizer.name}`" @click="track('event_organizer_profile_click')">Know more <i class="bi bi-arrow-right"></i></RouterLink>
      </section>

    </main>

    <nav v-if="event" class="event-cta-dock" aria-label="Event actions">
      <button v-if="event.experience.registrationEnabled && eventState !== 'ended'" :class="{ complete: event.registered, unavailable: !registrationIsOpen }" :disabled="!registrationIsOpen" @click="registerForEvent">
        <i :class="event.registered ? 'bi bi-check-circle-fill' : registrationIsOpen ? 'bi bi-person-check' : 'bi bi-lock'"></i><span>{{ event.registered ? 'Registered' : registrationIsOpen ? 'Register' : 'Publish to open' }}</span>
      </button>
      <button v-if="event.experience.reminderEnabled && eventState !== 'ended'" @click="setReminder"><i class="bi bi-calendar2-plus"></i><span>Set reminder</span></button>
      <a v-if="event.experience.livestreamUrl && eventState === 'live'" :href="event.experience.livestreamUrl" target="_blank" rel="noreferrer" class="live-cta" @click="track('event_livestream_click')"><i class="bi bi-youtube"></i><span>{{ event.experience.livestreamLabel || 'Watch live' }}</span></a>
      <button @click="shareEvent"><i class="bi bi-share"></i><span>Share</span></button>
    </nav>
    <p v-if="toast" class="event-toast" role="status">{{ toast }}</p>
    <LoginDrawer v-model="showLogin" @success="completeRegistration" />
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import LoginDrawer from '../components/auth/LoginDrawer.vue';
import PeshkashLogo from '../components/PeshkashLogo.vue';
import { API_BASE_URL } from '../config';
import { useAnalytics } from '../composables/useAnalytics';
import { usePageMeta } from '../composables/usePageMeta';
import { googleCalendarReminderUrl, publicEventUrl } from '../features/events/actions';
import { guestInitials, guestPortraitUrl, instagramUsername } from '../features/events/guestPresentation';
import { useAuthStore } from '../stores/auth';
import { calendarResource, openNativeResource } from '../utils/nativeResource';
import { sharePublicPage } from '../utils/socialShare';

type EventPageData = { id: number; name: string; displayName: string; description?: string; startTime?: string; endTime?: string; status: string; preview?: boolean; registrationOpen?: boolean; registered: boolean; organizer?: any; experience: any };
const route = useRoute();
const auth = useAuthStore();
const analytics = useAnalytics();
const { setMeta, resetMeta } = usePageMeta();
const event = ref<EventPageData | null>(null);
const loading = ref(true);
const error = ref('');
const showLogin = ref(false);
const toast = ref('');
const now = ref(Date.now());
const guestCarousel = ref<HTMLElement | null>(null);
const activeGuestIndex = ref(0);
const failedGuestPortraits = ref(new Set<string>());
let timer: number | undefined;
let guestScrollFrame: number | undefined;

const eventState = computed<'upcoming' | 'live' | 'ended'>(() => {
  if (!event.value) return 'upcoming';
  const start = event.value.startTime ? new Date(event.value.startTime).getTime() : Infinity;
  const end = event.value.endTime ? new Date(event.value.endTime).getTime() : Infinity;
  return now.value < start ? 'upcoming' : now.value <= end ? 'live' : 'ended';
});
const stateLabel = computed(() => eventState.value === 'live' ? 'Live now' : eventState.value === 'ended' ? 'Event ended' : 'Coming up');
const registrationIsOpen = computed(() => event.value?.registrationOpen ?? event.value?.status === 'active');
const eventDate = computed(() => event.value?.startTime ? new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short' }).format(new Date(event.value.startTime)) : '');
const countdown = computed(() => {
  const remaining = Math.max(0, new Date(event.value?.startTime || 0).getTime() - now.value);
  return { days: Math.floor(remaining / 86400000), hours: Math.floor(remaining / 3600000) % 24, minutes: Math.floor(remaining / 60000) % 60, seconds: Math.floor(remaining / 1000) % 60 };
});
const visibleGuests = computed(() => [...(event.value?.experience?.guests || [])].filter((guest: any) => guest.visible !== false).sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0)));

function guestKey(guest: any) { return String(guest.id || guest.name || 'guest'); }
function guestPortrait(guest: any) {
  return failedGuestPortraits.value.has(guestKey(guest)) ? '' : guestPortraitUrl(guest, API_BASE_URL);
}
function portraitUsesInstagramThumbnail(guest: any) {
  return !guest.imageUrl?.trim() && Boolean(instagramUsername(guest.instagram));
}
function markGuestPortraitFailed(guest: any) {
  failedGuestPortraits.value = new Set([...failedGuestPortraits.value, guestKey(guest)]);
}
function goToGuest(index: number) {
  const carousel = guestCarousel.value;
  if (!carousel || !visibleGuests.value.length) return;
  const targetIndex = Math.max(0, Math.min(index, visibleGuests.value.length - 1));
  const card = carousel.querySelectorAll<HTMLElement>('.guest-card')[targetIndex];
  if (!card) return;
  activeGuestIndex.value = targetIndex;
  carousel.scrollTo({ left: card.offsetLeft - carousel.offsetLeft, behavior: 'smooth' });
}
function moveGuestCarousel(direction: -1 | 1) { goToGuest(activeGuestIndex.value + direction); }
function syncGuestCarousel() {
  if (guestScrollFrame) window.cancelAnimationFrame(guestScrollFrame);
  guestScrollFrame = window.requestAnimationFrame(() => {
    const carousel = guestCarousel.value;
    if (!carousel) return;
    const cards = Array.from(carousel.querySelectorAll<HTMLElement>('.guest-card'));
    if (!cards.length) return;
    const index = cards.reduce((closest, card, cardIndex) => {
      const distance = Math.abs(card.offsetLeft - carousel.offsetLeft - carousel.scrollLeft);
      const closestCard = cards[closest];
      const closestDistance = Math.abs(closestCard.offsetLeft - carousel.offsetLeft - carousel.scrollLeft);
      return distance < closestDistance ? cardIndex : closest;
    }, 0);
    activeGuestIndex.value = index;
  });
}

function notify(message: string) { toast.value = message; window.setTimeout(() => { toast.value = ''; }, 2600); }
function track(action: string) { if (event.value) analytics.track(action, { eventId: event.value.id, vendorId: event.value.organizer?.id }); }

function devEventFixture(): EventPageData {
  const start = new Date(Date.now() + 93784000);
  const end = new Date(start.getTime() + 7200000);
  return {
    id: 42, name: 'demo-event', displayName: 'Designing What Comes Next',
    description: 'An evening of ideas, craft and conversation with the people shaping tomorrow.',
    startTime: start.toISOString(), endTime: end.toISOString(), status: 'active', preview: false, registrationOpen: true, registered: false,
    organizer: { id: 7, name: 'artistic-geek-studios', displayName: 'ArtisticGeek Studios', description: 'Independent design and technology studio.', logoUrl: null },
    experience: { enabled: true, eyebrow: 'New Delhi · September 2026', heroImageUrl: '', venueName: 'The Imperial Hall', venueAddress: 'Janpath, New Delhi, India', mapUrl: 'https://maps.google.com', registrationEnabled: true, reminderEnabled: true, reminderMode: 'timed', countdownEnabled: true, organizerVisible: true, contactVisible: false, livestreamUrl: 'https://youtube.com', livestreamLabel: 'Watch live', guests: [
      { id: 'g1', name: 'Aarav Mehta', role: 'Keynote speaker', bio: 'Designer and founder exploring humane technology.', visible: true, sortOrder: 0, instagram: 'https://instagram.com' },
      { id: 'g2', name: 'Mira Sen', role: 'Artist', bio: 'Visual storyteller working across material and motion.', visible: true, sortOrder: 1, website: 'https://example.com' },
    ] },
  };
}

async function loadEvent() {
  try {
    const { data } = await axios.get(`${API_BASE_URL}/event/${encodeURIComponent(String(route.params.eventName))}`);
    event.value = data;
    const socialPreview = data.experience?.socialPreview || {};
    const metaTitle = socialPreview.titleOverride || data.displayName;
    const metaDescription = socialPreview.descriptionOverride || data.description || `Discover ${data.displayName}, event details, guests and reminders on Peshkash.`;
    const metaImage = socialPreview.imageUrl || socialPreview.generatedImageUrl || data.experience?.heroImageUrl;
    setMeta({
      title: metaTitle,
      description: metaDescription,
      image: metaImage,
      imageAlt: socialPreview.imageAlt || `${data.displayName} event preview`,
      type: 'article',
    });
    track('event_page_view');
  } catch (err: any) {
    if (import.meta.env.DEV && route.params.eventName === 'demo-event') {
      event.value = devEventFixture();
      setMeta({ title: event.value.displayName, description: event.value.description, type: 'article' });
    } else error.value = err.response?.data?.error || 'This event page could not be loaded.';
  }
  finally { loading.value = false; }
}

async function registerForEvent() {
  if (event.value?.registered) { notify('You are already registered.'); return; }
  if (!auth.isLoggedIn) { showLogin.value = true; return; }
  await completeRegistration();
}
async function completeRegistration() {
  if (!event.value) return;
  try {
    await axios.post(`${API_BASE_URL}/event/${encodeURIComponent(event.value.name)}/register`, { pageUrl: window.location.href });
    event.value.registered = true; notify('Registration confirmed.');
  } catch (err: any) { notify(err.response?.data?.error || 'Registration could not be completed.'); }
}

async function setReminder() {
  if (!event.value || !event.value.startTime) { notify('Add event timings before setting a reminder.'); return; }
  const location = [event.value.experience.venueName, event.value.experience.venueAddress].filter(Boolean).join(', ');
  const eventUrl = publicEventUrl(event.value.name, window.location.origin);
  const reminderInput = {
    title: event.value.displayName,
    startTime: event.value.startTime,
    endTime: event.value.endTime,
    allDay: event.value.experience.reminderMode === 'all_day',
    description: event.value.description,
    location,
    eventUrl,
  };
  track('event_reminder_click');
  try {
    // Android browser support for Calendar insertion intents is inconsistent.
    // A pre-filled Google Calendar page works in Chrome, PWAs and in-app browsers.
    if (/Android/i.test(navigator.userAgent)) {
      window.location.assign(googleCalendarReminderUrl(reminderInput));
      return;
    }

    const reminder = calendarResource(reminderInput);
    const result = await openNativeResource(reminder.file, reminder.androidIntent, `Add ${event.value.displayName} to calendar`);
    if (result === 'shared') notify('Choose your calendar app to finish adding the reminder.');
    if (result === 'opened') notify('Calendar file ready. Open it to add the reminder.');
  } catch {
    window.location.assign(googleCalendarReminderUrl(reminderInput));
  }
}

async function shareEvent() {
  if (!event.value) return;
  const eventUrl = publicEventUrl(event.value.name, window.location.origin, Number(event.value.experience?.socialPreview?.version) || 1);
  const shared = await sharePublicPage({
    title: event.value.displayName,
    text: event.value.description || `View event details, guests and timings on Peshkash.`,
    details: eventDate.value || undefined,
    url: eventUrl,
    onCopied: () => notify('Event link copied.'),
  });
  if (shared) track('event_share_click');
}

onMounted(() => { loadEvent(); timer = window.setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => { if (timer) window.clearInterval(timer); if (guestScrollFrame) window.cancelAnimationFrame(guestScrollFrame); resetMeta(); });
</script>

<style scoped>
.event-page { --ink:#211812; --gold:#bd945a; --paper:#f4eee5; background:var(--paper); color:var(--ink); min-height:100vh; padding-bottom:8rem; }
.event-topbar { align-items:center; background:#1b1511; display:flex; justify-content:space-between; min-height:64px; padding:.9rem clamp(1rem,4vw,4rem); }
.event-state { align-items:center; border:1px solid #7f674d; border-radius:999px; color:#d8b47d; display:inline-flex; font-size:.72rem; gap:.45rem; letter-spacing:.12em; padding:.5rem .8rem; text-transform:uppercase; }
.event-state.is-live { background:#8b261d; border-color:#b74a3e; color:#fff; }
.event-message { align-items:center; display:flex; flex-direction:column; gap:1rem; justify-content:center; min-height:70vh; padding:2rem; text-align:center; }.event-message>i{font-size:2rem}.event-message h1{font-family:Georgia,serif}
.event-content { margin:auto; max-width:1120px; padding:clamp(2rem,6vw,5rem) clamp(1rem,4vw,3rem); }
.preview-notice { align-items:center;background:#fff8e8;border:1px solid #d6b273;color:#6f4e27;display:flex;gap:.8rem;margin:0 0 2rem;padding:.85rem 1rem}.preview-notice>i{font-size:1.25rem}.preview-notice>div{display:flex;flex-direction:column}.preview-notice strong{font-size:.78rem;letter-spacing:.1em;text-transform:uppercase}.preview-notice span{font-size:.88rem}
.event-hero { display:grid; gap:clamp(2rem,5vw,5rem); grid-template-columns:1fr; }.event-hero.has-image{grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);align-items:center}.event-hero>img{aspect-ratio:4/5;border-radius:160px 160px 12px 12px;height:auto;object-fit:cover;width:100%}
.event-eyebrow,.section-kicker { color:#9b7243; font-size:.72rem; font-weight:700; letter-spacing:.2em; text-transform:uppercase; }.event-hero h1{font-family:Georgia,serif;font-size:clamp(3rem,8vw,7.2rem);font-weight:400;letter-spacing:-.055em;line-height:.9;margin:1rem 0 1.5rem}.event-intro{font-size:clamp(1.05rem,2vw,1.35rem);line-height:1.7;max-width:660px}.event-meta{border-top:1px solid #d8c9b8;display:flex;flex-wrap:wrap;gap:1rem 2rem;margin-top:2rem;padding-top:1.2rem}.event-meta span{align-items:center;display:flex;gap:.55rem}
.countdown { background:#211812;color:#f8f1e7;margin:clamp(3rem,8vw,7rem) 0;padding:clamp(1.5rem,4vw,3rem);text-align:center}.countdown>p{color:#c7a36d;font-size:.72rem;letter-spacing:.2em;text-transform:uppercase}.countdown>div{display:grid;grid-template-columns:repeat(4,1fr);margin-top:1rem}.countdown span{border-right:1px solid #554638;display:flex;flex-direction:column}.countdown span:last-child{border:0}.countdown strong{font-family:Georgia,serif;font-size:clamp(2rem,6vw,4.5rem);font-weight:400}.countdown small{color:#b9aa9a;text-transform:uppercase}
.event-section { border-top:1px solid #d8c9b8;margin-top:clamp(3rem,8vw,7rem);padding-top:2rem}.event-section h2,.organizer-card h2{font-family:Georgia,serif;font-size:clamp(2rem,5vw,4rem);font-weight:400;letter-spacing:-.035em;line-height:1;margin:.35rem 0 0}.venue-card{align-items:center;background:#fbf7f0;border:1px solid #d8c9b8;display:grid;gap:1.25rem;grid-template-columns:auto minmax(0,1fr) auto;padding:1.4rem}.venue-icon{align-items:center;background:#211812;border-radius:50%;color:#d7ad73;display:flex;font-size:1.2rem;height:48px;justify-content:center;width:48px}.venue-copy h2{font-size:clamp(1.7rem,3vw,2.6rem)}.venue-copy p:last-child{color:#756657;line-height:1.5;margin:.55rem 0 0}.directions-link{align-items:center;background:#211812;border-radius:999px;color:#f7efe4;display:inline-flex;font-size:.78rem;font-weight:700;gap:.7rem;letter-spacing:.08em;padding:.8rem 1rem;text-decoration:none;text-transform:uppercase}.guest-section-heading{align-items:end;display:flex;gap:1rem;justify-content:space-between}.guest-controls{align-items:center;display:flex;gap:.65rem}.guest-controls span{color:#806e5e;font-size:.72rem;min-width:42px;text-align:center}.guest-controls button{align-items:center;background:transparent;border:1px solid #cdbba5;border-radius:50%;color:#5c4631;display:flex;height:42px;justify-content:center;width:42px}.guest-controls button:disabled{opacity:.35}.guest-carousel{display:grid;gap:1rem;grid-auto-columns:minmax(320px,calc((100% - 1rem)/2));grid-auto-flow:column;margin-top:2rem;overflow-x:auto;overscroll-behavior-inline:contain;padding:.15rem 0 .65rem;scroll-behavior:smooth;scroll-snap-type:inline mandatory;scrollbar-width:none}.guest-carousel::-webkit-scrollbar{display:none}.guest-card{background:#fbf7f0;border:1px solid #dfd2c3;border-radius:28px 28px 12px 12px;display:flex;flex-direction:column;min-height:410px;overflow:hidden;scroll-snap-align:start}.guest-card>img{aspect-ratio:4/3;height:240px;object-fit:cover;width:100%}.guest-monogram{align-items:center;background:linear-gradient(145deg,#2d2119,#59402d);color:#e6c28c;display:flex;font-family:Georgia,serif;font-size:3.5rem;height:190px;justify-content:center;letter-spacing:-.05em}.guest-card-copy{display:flex;flex:1;flex-direction:column;padding:1.25rem}.guest-role{color:#9b7243;font-size:.66rem;font-weight:700;letter-spacing:.15em;margin:0;text-transform:uppercase}.guest-card h3{font-family:Georgia,serif;font-size:1.85rem;font-weight:400;letter-spacing:-.025em;line-height:1.05;margin:.35rem 0 .65rem}.guest-bio{color:#685b50;font-size:.9rem;line-height:1.55;margin:0 0 1rem}.guest-links{display:flex;gap:.5rem;margin-top:auto}.guest-links a{align-items:center;border:1px solid #d4c0a7;border-radius:50%;color:#6e4d2a;display:inline-flex;height:36px;justify-content:center;width:36px}.guest-dots{display:flex;gap:.45rem;justify-content:center;margin-top:1rem}.guest-dots button{background:#cdbba5;border:0;border-radius:999px;height:5px;padding:0;transition:width .2s,background .2s;width:18px}.guest-dots button.active{background:#7a5734;width:34px}.organizer-card>div{align-items:center;display:flex;gap:1rem}.organizer-card img{height:56px;object-fit:contain;width:56px}.organizer-card>a{color:#7f5b32;display:inline-flex;gap:.45rem;margin-top:.75rem}.event-footnote{color:#9b8773;font-size:.82rem;margin:6rem 0 1rem;text-align:center}
.event-cta-dock { backdrop-filter:blur(16px);background:rgba(30,23,18,.94);border:1px solid #6e563d;border-radius:999px;bottom:max(1rem,env(safe-area-inset-bottom));box-shadow:0 18px 45px rgba(33,24,18,.28);display:flex;gap:.25rem;left:50%;padding:.42rem;position:fixed;transform:translateX(-50%);z-index:1050}.event-cta-dock button,.event-cta-dock a{align-items:center;background:transparent;border:0;border-radius:999px;color:#f6ead9;display:flex;gap:.5rem;min-height:46px;padding:.65rem 1rem;text-decoration:none;white-space:nowrap}.event-cta-dock button:hover,.event-cta-dock a:hover{background:#3d3025}.event-cta-dock .complete{color:#d7b67f}.event-cta-dock .live-cta{background:#a62a20;color:#fff}.event-toast{background:#fff8ec;border:1px solid #d4b17c;border-radius:8px;bottom:6rem;box-shadow:0 10px 30px #3b2b1d33;left:50%;padding:.75rem 1rem;position:fixed;transform:translateX(-50%);z-index:1060}
.event-cta-dock button.unavailable{color:#b7a998;cursor:not-allowed;opacity:.72}.event-cta-dock button.unavailable:hover{background:transparent}
@media(max-width:760px){.event-page{padding-bottom:7.25rem}.event-topbar{min-height:56px;padding:.7rem 1rem}.event-state{font-size:.61rem;letter-spacing:.09em;padding:.42rem .65rem}.event-content{overflow:hidden;padding:2.2rem 1.15rem 1rem}.preview-notice{align-items:flex-start;margin-bottom:1.5rem}.preview-notice span{font-size:.8rem;line-height:1.35}.event-hero.has-image{grid-template-columns:1fr}.event-hero>img{aspect-ratio:4/3;border-radius:72px 72px 10px 10px}.event-eyebrow,.section-kicker{font-size:.62rem;letter-spacing:.16em}.event-hero h1{font-size:clamp(2.65rem,12vw,4.25rem);letter-spacing:-.045em;line-height:.96;margin:.8rem 0 1.1rem}.event-intro{font-size:.98rem;line-height:1.6}.event-meta{font-size:.88rem;line-height:1.45;margin-top:1.5rem;padding-top:1rem}.countdown{margin:2.75rem -1.15rem 0;padding:1.25rem .4rem}.countdown>p{font-size:.62rem;margin-bottom:.6rem}.countdown>div{margin-top:0}.countdown strong{font-size:clamp(1.9rem,10vw,2.8rem)}.countdown small{font-size:.56rem;letter-spacing:.04em}.event-section{margin-top:3.5rem;padding-top:1.4rem}.event-section h2,.organizer-card h2{font-size:clamp(2rem,9vw,3rem)}.venue-card{gap:.85rem;grid-template-columns:auto minmax(0,1fr);padding:1rem}.venue-icon{height:42px;width:42px}.venue-copy h2{font-size:1.6rem}.venue-copy p:last-child{font-size:.86rem}.directions-link{grid-column:1/-1;justify-content:center;margin:0;padding:.78rem;width:100%}.guest-section-heading{align-items:end}.guest-section-heading h2{font-size:2.15rem}.guest-controls{gap:.35rem}.guest-controls button{height:36px;width:36px}.guest-controls span{font-size:.65rem;min-width:34px}.guest-carousel{grid-auto-columns:min(84vw,340px);margin-left:-1.15rem;margin-right:-1.15rem;margin-top:1.35rem;padding-left:1.15rem;padding-right:1.15rem;scroll-padding-inline:1.15rem}.guest-card{min-height:390px}.guest-card>img{height:210px}.guest-monogram{font-size:3rem;height:170px}.guest-card-copy{padding:1.1rem}.guest-card h3{font-size:1.65rem}.guest-bio{font-size:.86rem;line-height:1.5}.organizer-card>div{align-items:center}.organizer-card img{height:48px;width:48px}.organizer-card h2{font-size:1.75rem}.event-footnote{font-size:.72rem;margin:4rem 0 1rem}.event-cta-dock{border-radius:18px;bottom:max(.65rem,env(safe-area-inset-bottom));justify-content:stretch;max-width:none;overflow:hidden;padding:.32rem;width:calc(100vw - 1rem)}.event-cta-dock button,.event-cta-dock a{flex:1;flex-direction:column;font-size:.61rem;gap:.12rem;min-height:50px;min-width:0;padding:.42rem .35rem}.event-cta-dock i{font-size:1rem}.event-toast{bottom:5.5rem;font-size:.82rem;max-width:calc(100vw - 2rem);text-align:center;width:max-content}}
/* Quiet, editorial treatment for public event pages. */
.event-page {
  --ink: #27231f;
  --muted: #6f6962;
  --soft: #958e86;
  --accent: #806b57;
  --paper: #f5f3ef;
  --surface: #fbfaf8;
  --line: rgba(56, 48, 41, 0.13);
  background: var(--paper);
  color: var(--ink);
}

.event-topbar {
  background: rgba(245, 243, 239, 0.96);
  border-bottom: 1px solid var(--line);
  min-height: 70px;
}

.event-topbar :deep(img) { opacity: .95; }
.event-state {
  border-color: var(--line);
  color: var(--muted);
  font-size: .66rem;
  letter-spacing: .11em;
}
.event-state i { color: var(--accent); }
.event-state.is-live { background: #66584d; border-color: #66584d; }

.event-content {
  max-width: 1060px;
  padding-top: clamp(3.75rem, 7vw, 6rem);
}

.event-eyebrow,
.section-kicker {
  color: var(--soft);
  font-size: .66rem;
  letter-spacing: .16em;
}

.event-hero h1,
.event-section h2,
.organizer-card h2,
.guest-card h3,
.countdown strong {
  font-family: 'Rufina', Georgia, serif;
}

.event-hero h1 {
  font-size: clamp(3.4rem, 7vw, 6.15rem);
  letter-spacing: -.045em;
  line-height: .96;
  max-width: 900px;
  margin: 1.1rem 0 1.7rem;
}

.event-intro {
  color: var(--soft);
  font-size: clamp(1rem, 1.5vw, 1.16rem);
  line-height: 1.75;
  max-width: 760px;
}

.event-meta {
  border-color: var(--line);
  color: var(--muted);
  font-size: .9rem;
  margin-top: 2.25rem;
  padding-top: 1.25rem;
}
.event-meta i { color: var(--accent); }

.countdown {
  background: #24211e;
  border: 1px solid #24211e;
  border-radius: 18px;
  color: #f5f1eb;
  margin: clamp(3.5rem, 7vw, 5.5rem) 0;
  padding: clamp(1.5rem, 3vw, 2.35rem);
}
.countdown > p { color: #aaa198; }
.countdown span { border-color: rgba(245, 241, 235, .16); }
.countdown strong { font-size: clamp(2rem, 4.5vw, 3.6rem); }
.countdown small { color: #aaa198; font-size: .62rem; letter-spacing: .08em; }

.event-section {
  border-color: var(--line);
  margin-top: clamp(3.5rem, 7vw, 5.5rem);
}
.event-section h2,
.organizer-card h2 {
  font-size: clamp(2rem, 4vw, 3.35rem);
}

.venue-card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 12px 35px rgba(47, 40, 34, .035);
  padding: 1.5rem 1.65rem;
}
.venue-icon {
  background: #ece8e2;
  color: var(--accent);
  height: 44px;
  width: 44px;
}
.venue-copy h2 { font-size: clamp(1.55rem, 2.5vw, 2.25rem); }
.venue-copy p:last-child { color: var(--muted); font-size: .9rem; }
.directions-link {
  background: transparent;
  border-bottom: 1px solid #a89989;
  border-radius: 0;
  color: var(--ink);
  padding: .35rem 0;
}

.guest-section-heading h2 { max-width: 580px; }
.guest-controls button {
  background: var(--surface);
  border-color: var(--line);
  color: var(--muted);
}
.guest-controls button:not(:disabled):hover { border-color: #a99c8f; color: var(--ink); }
.guest-controls span { color: var(--soft); }

.guest-card {
  background: var(--surface);
  border-color: var(--line);
  border-radius: 18px;
  box-shadow: 0 12px 35px rgba(47, 40, 34, .035);
}
.guest-portrait {
  height: 240px;
  overflow: hidden;
}
.guest-portrait img {
  height: 100%;
  object-fit: cover;
  width: 100%;
}
.guest-portrait.is-instagram-thumbnail {
  align-items: center;
  background: linear-gradient(145deg, #eeeae4, #e3ddd5);
  display: flex;
  height: 190px;
  justify-content: center;
}
.guest-portrait.is-instagram-thumbnail img {
  border: 5px solid rgba(255, 255, 255, .92);
  border-radius: 50%;
  box-shadow: 0 12px 30px rgba(44, 35, 28, .16);
  height: 132px;
  object-fit: cover;
  width: 132px;
}
.guest-monogram {
  background: linear-gradient(145deg, #eeeae4, #e5dfd7);
  color: #776653;
  font-family: 'Rufina', Georgia, serif;
}
.guest-role { color: var(--soft); letter-spacing: .12em; }
.guest-card h3 { letter-spacing: -.02em; }
.guest-bio { color: var(--muted); }
.guest-links a { border-color: var(--line); color: var(--accent); }
.guest-dots button { background: #d8d1c8; }
.guest-dots button.active { background: #8f8173; }

.organizer-card > a { color: var(--accent); }

.event-cta-dock {
  backdrop-filter: blur(18px);
  background: rgba(7, 7, 7, .97);
  border-color: rgba(255, 255, 255, .16);
  box-shadow: 0 18px 48px rgba(0, 0, 0, .34), 0 0 0 1px rgba(0, 0, 0, .08);
}
.event-cta-dock button,
.event-cta-dock a { color: rgba(255, 255, 255, .82); }
.event-cta-dock button + button,
.event-cta-dock button + a,
.event-cta-dock a + button { border-left: 0; }
.event-cta-dock button:hover,
.event-cta-dock a:hover { background: rgba(255, 255, 255, .12); color: #fff; }
.event-cta-dock button i,
.event-cta-dock a i { color: #d9b77f; }
.event-cta-dock .complete { color: #d8c595; }
.event-cta-dock .live-cta { background: #8f2d25; color: #fff; }
.event-cta-dock .live-cta i { color: inherit; }
.event-cta-dock button.unavailable { color: rgba(255, 255, 255, .42); }

@media (max-width: 760px) {
  .event-page { padding-bottom: 6.75rem; }
  .event-topbar { min-height: 58px; }
  .event-content { padding: 2.75rem 1.25rem .75rem; }
  .event-hero h1 {
    font-size: clamp(2.65rem, 11.4vw, 3.8rem);
    line-height: 1;
    margin: .85rem 0 1.2rem;
  }
  .event-intro { color: var(--soft); font-size: .94rem; line-height: 1.68; }
  .event-meta { font-size: .83rem; margin-top: 1.75rem; }
  .countdown {
    border-radius: 14px;
    margin: 2.5rem 0 0;
    padding: 1.25rem .35rem;
  }
  .countdown strong { font-size: clamp(1.75rem, 8.5vw, 2.35rem); }
  .countdown small { font-size: .52rem; }
  .event-section { margin-top: 3rem; }
  .venue-card { gap: .75rem; padding: 1.1rem; }
  .venue-icon { height: 38px; width: 38px; }
  .venue-copy h2 { font-size: 1.45rem; }
  .directions-link {
    grid-column: 2;
    justify-self: start;
    margin: 0;
    padding: .25rem 0;
    width: auto;
  }
  .guest-section-heading h2 { font-size: 2rem; }
  .guest-carousel { grid-auto-columns: min(82vw, 326px); }
  .guest-card { border-radius: 16px; min-height: 372px; }
  .guest-portrait { height: 210px; }
  .guest-portrait.is-instagram-thumbnail { height: 170px; }
  .guest-portrait.is-instagram-thumbnail img { height: 116px; width: 116px; }
  .guest-monogram { font-size: 2.7rem; height: 156px; }
  .guest-card h3 { font-size: 1.55rem; }
  .organizer-card h2 { font-size: 1.75rem; }
  .event-cta-dock {
    border-radius: 16px;
    bottom: max(.55rem, env(safe-area-inset-bottom));
  }
  .event-cta-dock button,
  .event-cta-dock a { min-height: 48px; }
}
</style>
