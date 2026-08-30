<template>
  <div class="event-page">
    <header class="event-topbar">
      <RouterLink to="/" aria-label="Peshkash home"><PeshkashLogo variant="dark-bg" :height="28" /></RouterLink>
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
            <span v-if="event.experience.venueName"><i class="bi bi-geo-alt"></i>{{ event.experience.venueName }}</span>
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

      <section v-if="event.experience.venueAddress" class="event-section venue-card">
        <p class="section-kicker">Where to arrive</p>
        <h2>{{ event.experience.venueName || 'Venue' }}</h2>
        <p>{{ event.experience.venueAddress }}</p>
        <a v-if="event.experience.mapUrl" :href="event.experience.mapUrl" target="_blank" rel="noreferrer" @click="track('event_directions_click')">Open directions <i class="bi bi-arrow-up-right"></i></a>
      </section>

      <section v-if="visibleGuests.length" class="event-section">
        <p class="section-kicker">People to look forward to</p>
        <h2>On the programme</h2>
        <div class="guest-grid">
          <article v-for="guest in visibleGuests" :key="guest.id" class="guest-card">
            <img v-if="guest.imageUrl" :src="guest.imageUrl" :alt="guest.name" />
            <div><p class="guest-role">{{ guest.role || 'Guest' }}</p><h3>{{ guest.name }}</h3><p v-if="guest.bio">{{ guest.bio }}</p>
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
      </section>

      <section v-if="event.organizer" class="event-section organizer-card">
        <p class="section-kicker">Presented by</p>
        <div><img v-if="event.organizer.logoUrl" :src="event.organizer.logoUrl" :alt="event.organizer.displayName" /><h2>{{ event.organizer.displayName }}</h2></div>
        <RouterLink v-if="event.organizer.name" :to="`/vendor/${event.organizer.name}`" @click="track('event_organizer_profile_click')">Know more <i class="bi bi-arrow-right"></i></RouterLink>
      </section>

      <p class="event-footnote">One scan. The right moment, remembered.</p>
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
import { useAuthStore } from '../stores/auth';

type EventPageData = { id: number; name: string; displayName: string; description?: string; startTime?: string; endTime?: string; status: string; preview?: boolean; registrationOpen?: boolean; registered: boolean; organizer?: any; experience: any };
const route = useRoute();
const auth = useAuthStore();
const analytics = useAnalytics();
const event = ref<EventPageData | null>(null);
const loading = ref(true);
const error = ref('');
const showLogin = ref(false);
const toast = ref('');
const now = ref(Date.now());
let timer: number | undefined;

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
    document.title = `${data.displayName} · Peshkash`;
    track('event_page_view');
  } catch (err: any) {
    if (import.meta.env.DEV && route.params.eventName === 'demo-event') {
      event.value = devEventFixture(); document.title = `${event.value.displayName} · Peshkash`;
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

function icsDate(date: Date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }
function icsDay(date: Date) { return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`; }
function escapeIcs(value: string) { return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;'); }
async function setReminder() {
  if (!event.value || !event.value.startTime) { notify('Add event timings before setting a reminder.'); return; }
  const start = new Date(event.value.startTime); const end = new Date(event.value.endTime || start.getTime() + 3600000);
  const allDay = event.value.experience.reminderMode === 'all_day';
  const nextDay = new Date(start); nextDay.setDate(nextDay.getDate() + 1);
  const dateLines = allDay ? `DTSTART;VALUE=DATE:${icsDay(start)}\r\nDTEND;VALUE=DATE:${icsDay(nextDay)}` : `DTSTART:${icsDate(start)}\r\nDTEND:${icsDate(end)}`;
  const location = [event.value.experience.venueName, event.value.experience.venueAddress].filter(Boolean).join(', ');
  const body = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Peshkash//Event Reminder//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${event.value.id}-${start.getTime()}@peshkash.app`,`DTSTAMP:${icsDate(new Date())}`,dateLines,`SUMMARY:${escapeIcs(event.value.displayName)}`,`DESCRIPTION:${escapeIcs(`${event.value.description || ''}\n${window.location.href}`)}`,`LOCATION:${escapeIcs(location)}`,'BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY',`DESCRIPTION:${escapeIcs(event.value.displayName)}`,'END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
  const calendarFile = new File([body], `${event.value.name}.ics`, { type: 'text/calendar;charset=utf-8' });
  if (navigator.canShare?.({ files: [calendarFile] })) {
    try {
      await navigator.share({ title: event.value.displayName, files: [calendarFile] });
      track('event_reminder_click'); return;
    } catch (err: any) { if (err?.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(calendarFile);
  const link = document.createElement('a'); link.href = url; link.download = `${event.value.name}.ics`; link.click(); URL.revokeObjectURL(url);
  track('event_reminder_click'); notify('Calendar reminder ready.');
}

async function shareEvent() {
  const share = { title: event.value?.displayName || 'Peshkash event', text: event.value?.description || '', url: window.location.href };
  try { if (navigator.share) await navigator.share(share); else { await navigator.clipboard.writeText(window.location.href); notify('Event link copied.'); } track('event_share_click'); } catch { /* share cancellation */ }
}

onMounted(() => { loadEvent(); timer = window.setInterval(() => { now.value = Date.now(); }, 1000); });
onUnmounted(() => { if (timer) window.clearInterval(timer); });
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
.event-section { border-top:1px solid #d8c9b8;margin-top:clamp(3rem,8vw,7rem);padding-top:2rem}.event-section>h2,.organizer-card h2{font-family:Georgia,serif;font-size:clamp(2rem,5vw,4rem);font-weight:400}.venue-card a,.organizer-card a{color:#7f5b32;display:inline-flex;gap:.45rem;margin-top:.75rem}.guest-grid{display:grid;gap:1rem;grid-template-columns:repeat(2,minmax(0,1fr));margin-top:2rem}.guest-card{background:#fbf7f0;display:grid;gap:1rem;grid-template-columns:120px 1fr;padding:1rem}.guest-card>img{height:150px;object-fit:cover;width:120px}.guest-role{color:#9b7243;font-size:.68rem;font-weight:700;letter-spacing:.13em;margin:0;text-transform:uppercase}.guest-card h3{font-family:Georgia,serif;font-size:1.65rem;margin:.25rem 0}.guest-links{display:flex;gap:.5rem}.guest-links a{align-items:center;border:1px solid #d4c0a7;border-radius:50%;color:#6e4d2a;display:inline-flex;height:34px;justify-content:center;width:34px}.organizer-card>div{align-items:center;display:flex;gap:1rem}.organizer-card img{height:56px;object-fit:contain;width:56px}.event-footnote{color:#9b8773;margin:6rem 0 1rem;text-align:center}
.event-cta-dock { backdrop-filter:blur(16px);background:rgba(30,23,18,.94);border:1px solid #6e563d;border-radius:999px;bottom:max(1rem,env(safe-area-inset-bottom));box-shadow:0 18px 45px rgba(33,24,18,.28);display:flex;gap:.25rem;left:50%;padding:.42rem;position:fixed;transform:translateX(-50%);z-index:1050}.event-cta-dock button,.event-cta-dock a{align-items:center;background:transparent;border:0;border-radius:999px;color:#f6ead9;display:flex;gap:.5rem;min-height:46px;padding:.65rem 1rem;text-decoration:none;white-space:nowrap}.event-cta-dock button:hover,.event-cta-dock a:hover{background:#3d3025}.event-cta-dock .complete{color:#d7b67f}.event-cta-dock .live-cta{background:#a62a20;color:#fff}.event-toast{background:#fff8ec;border:1px solid #d4b17c;border-radius:8px;bottom:6rem;box-shadow:0 10px 30px #3b2b1d33;left:50%;padding:.75rem 1rem;position:fixed;transform:translateX(-50%);z-index:1060}
.event-cta-dock button.unavailable{color:#b7a998;cursor:not-allowed;opacity:.72}.event-cta-dock button.unavailable:hover{background:transparent}
@media(max-width:760px){.event-content{padding-top:3rem}.event-hero.has-image{grid-template-columns:1fr}.event-hero>img{aspect-ratio:4/3;border-radius:90px 90px 8px 8px}.event-hero h1{font-size:clamp(3rem,16vw,5rem)}.countdown{margin-inline:-1rem}.countdown small{font-size:.6rem}.guest-grid{grid-template-columns:1fr}.event-cta-dock{max-width:calc(100vw - 1rem);overflow-x:auto}.event-cta-dock button,.event-cta-dock a{flex-direction:column;font-size:.65rem;gap:.15rem;min-width:68px;padding:.45rem .65rem}.event-cta-dock i{font-size:1rem}}
</style>
