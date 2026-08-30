<template>
  <div class="pk-item-page-surface">
  <PublicNav v-if="!error" />
  <div
    v-if="showFeedback"
    class="position-fixed top-0 start-50 translate-middle-x mt-3"
    style="z-index: 2000;"
  >
    <div class="alert alert-warning shadow" role="alert">{{ feedback }}</div>
  </div>

  <PublicErrorState
    v-if="error"
    title="This item is not available right now"
    message="The link may have changed, or the item may be temporarily unavailable. Please try again."
    :reference="`${eventName}/${menuName}/${itemName}`"
    @retry="loadItem"
  />

  <div v-else class="container py-3 pk-item-page">
    <div v-if="isLoading" class="pk-page-loader">
      <peshkash-loader size="110" theme="light" label="Loading item" />
    </div>
    <main v-else class="pk-reveal pk-item-shell" data-anim="animate__fadeInUp">
      <button v-if="canGoBack" class="pk-back-btn" @click="router.back()" aria-label="Go back">
        <i class="bi bi-chevron-left"></i> Back
      </button>
      <header class="pk-item-header">
        <p class="pk-item-overline">{{ itemData?.menu?.displayName || 'Peshkash selection' }}</p>
        <h1>{{ itemData?.displayName || itemData?.name }}</h1>
         <small class="d-block">
        <RouterLink
          v-if="itemData?.event?.vendor?.hasContactPage"
          :to="`/vendor/${itemData.event.vendor.name}`"
          class="vendor-name vendor-link"
        >{{ itemData.event.vendor.displayName }}</RouterLink>
        <span v-else class="vendor-name">{{ itemData?.event?.vendor?.displayName }}</span>
        <template v-if="itemData?.menu?.type === 'personalized'">
          <span class="mx-1 text-muted">@</span>
          <span class="event-name">{{ itemData.event.displayName }}</span>
        </template>
      </small>
        <small v-if="itemData?.price" class="pk-item-price">{{ itemData.price }}</small>
      </header>

      <div v-if="itemData?.image && !imageFailed" class="pk-item-media-wrap">
        <div class="pk-item-media">
          <div class="ratio ratio-16x9">
            <img
              :src="itemData.image"
              :alt="itemData?.displayName || itemData?.name"
              class="w-100 h-100 rounded shadow pk-hero-img"
              loading="lazy"
              @error="imageFailed = true"
            />
          </div>
        </div>
      </div>

      <div v-if="itemData?.isVeg !== undefined || itemData?.tags?.length || itemData?.allergens?.length || itemData?.spiceLevel" class="pk-item-badges">
        <span v-if="itemData?.isVeg !== undefined" class="pk-item-chip">
          <i :class="['bi','bi-circle-fill', itemData.isVeg ? 'text-success' : 'text-danger']"></i>
          <span class="ms-1">{{ itemData.isVeg ? 'Veg' : 'Non-Veg' }}</span>
        </span>
        <span v-for="tag in itemData?.tags || []" :key="tag" class="pk-item-chip">{{ tag }}</span>
        <span v-for="allergen in itemData?.allergens || []" :key="allergen" class="pk-item-chip pk-item-chip--warning">{{ allergen }}</span>
        <span v-if="itemData?.spiceLevel" class="pk-item-chip text-danger">
          <i v-for="n in 3" :key="n" class="bi bi-fire" :class="{'opacity-25': n > itemData.spiceLevel}"></i>
        </span>
      </div>

      <nav v-if="itemData.parentItems?.length" class="pk-item-lineage" aria-label="breadcrumb">
        <ol class="breadcrumb justify-content-center mb-0">
          <li v-for="parentItem in itemData.parentItems" :key="parentItem.displayName" class="breadcrumb-item">{{ parentItem.displayName }}</li>
        </ol>
      </nav>

      <section class="pk-story" :class="{ 'pk-story--no-media': !itemData?.image || imageFailed }">
          <p class="pk-story-kicker">Discover</p>
          <h2>{{ itemSectionLabel }}</h2>
          <p class="pk-story-copy">{{ itemData?.description }}</p>
          <div v-if="itemData?.ingredients" class="d-flex flex-wrap gap-2 mb-3">
            <span
              v-for="ing in itemData.ingredients.split(',')"
              :key="ing"
              class="badge bg-info pk-beige-text"
            >
              {{ ing.trim() }}
            </span>
          </div>
          <div v-if="itemData?.allergens?.length" class="d-flex flex-wrap gap-2">
            <span
              v-for="allergen in itemData.allergens"
              :key="allergen"
              class="badge bg-danger"
            >
              {{ allergen }}
            </span>
          </div>
      </section>

      <div class="pk-engage-section" aria-label="Item actions">
        <span class="pk-engage-title">Keep what speaks to you</span>
        <div class="pk-engage-actions">
        <button class="btn btn-sm" :class="userReaction === 'like' ? 'btn-primary' : 'btn-outline-primary'" @click="toggleReaction('like')" aria-label="Like this item">
          <i :class="userReaction === 'like' ? 'bi bi-hand-thumbs-up-fill' : 'bi bi-hand-thumbs-up'"></i>
          <span>Like</span>
        </button>
        <button class="btn btn-sm" :class="userReaction === 'dislike' ? 'btn-primary' : 'btn-outline-primary'" @click="toggleReaction('dislike')" aria-label="Dislike this item">
          <i :class="userReaction === 'dislike' ? 'bi bi-hand-thumbs-down-fill' : 'bi bi-hand-thumbs-down'"></i>
          <span>Dislike</span>
        </button>
        <button class="btn btn-sm pk-save-action" :class="isBookmarked ? 'btn-primary' : 'btn-outline-primary'" @click="saveItemToPhone" aria-label="Save this item using your phone">
          <i :class="isBookmarked ? 'bi bi-bookmark-check-fill' : 'bi bi-bookmark-plus'"></i>
          <span>{{ isBookmarked ? 'Saved' : 'Save' }}</span>
        </button>
        </div>
      </div>
    </main>

    <!-- Floating Share Button -->
    <button
      v-if="itemData"
      class="btn btn-primary rounded-circle position-fixed bottom-0 end-0 m-3 shadow-lg pk-share-fab"
      @click="shareItem"
      aria-label="Share this item"
      style="width: 56px; height: 56px; z-index: 1000;"
    >
      <i class="bi bi-share-fill fs-5"></i>
    </button>
  </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PublicNav from '../components/PublicNav.vue';
import PublicErrorState from '../components/PublicErrorState.vue';
import { API_BASE_URL } from '../config';
import { useAnalytics } from '../composables/useAnalytics';
import { usePageMeta } from '../composables/usePageMeta';

const route = useRoute()
const router = useRouter()
const eventName = route.params.eventName as string
const menuName = route.params.menuName as string
const itemName = route.params.itemName as string

// Only show a back button if user navigated here from within the app
// (i.e. not a direct QR scan landing). history.length > 2 is a proxy for
// "there's somewhere to go back to in this session".
const canGoBack = computed(() => window.history.length > 2)

const { setMeta, resetMeta } = usePageMeta()
onUnmounted(resetMeta)

const itemData = ref<any>(null)
const isLoading = ref(true)
const imageFailed = ref(false)

const ITEM_SECTION_MAP: Record<string, { label: string; icon: string }> = {
  dish:     { label: 'The flavour story', icon: 'bi-fork-knife' },
  dishtype: { label: 'The flavour story', icon: 'bi-fork-knife' },
  product:  { label: 'Behind the piece',  icon: 'bi-box-seam' },
  item:     { label: 'Worth knowing',     icon: 'bi-tag' },
  service:  { label: 'What to expect',    icon: 'bi-gear' },
  art:      { label: 'Behind the work',   icon: 'bi-palette' },
}

const itemSectionLabel = computed(() => {
  if (itemData.value?.menu?.itemStoryHeading) return itemData.value.menu.itemStoryHeading
  const t = (itemData.value?.itemType || itemData.value?.type)?.toLowerCase()
  return ITEM_SECTION_MAP[t]?.label ?? 'The backstory'
})
const error = ref<string | null>(null)
const feedback = ref('')
const showFeedback = ref(false)
const analytics = useAnalytics()

const userReaction = ref<'like' | 'dislike' | null>(null)
const isBookmarked = ref(false)

function engagementKey() { return `${eventName}:${menuName}:${itemName}` }
function reactionKey() { return `pk-reaction-${engagementKey()}` }
function bookmarkKey() { return `pk-bookmark-${engagementKey()}` }

function loadEngagement() {
  try {
    const r = localStorage.getItem(reactionKey())
    if (r === 'like' || r === 'dislike') userReaction.value = r
    isBookmarked.value = localStorage.getItem(bookmarkKey()) === '1'
  } catch {}
}

function toggleReaction(type: 'like' | 'dislike') {
  const next = userReaction.value === type ? null : type
  userReaction.value = next
  try {
    if (next) localStorage.setItem(reactionKey(), next)
    else localStorage.removeItem(reactionKey())
  } catch {}
  analytics.track(next ? `item_${type}` : `item_un${type}`, {
    vendorId: itemData.value?.event?.vendor?.id,
    eventId: itemData.value?.event?.id,
    menuId: itemData.value?.menu?.id,
    itemId: itemData.value?.numericId,
  })
}

function markItemSaved() {
  isBookmarked.value = true
  try {
    localStorage.setItem(bookmarkKey(), '1')
  } catch {}
  analytics.track('item_bookmark', {
    bookmarked: true,
    vendorId: itemData.value?.event?.vendor?.id,
    eventId: itemData.value?.event?.id,
    menuId: itemData.value?.menu?.id,
    itemId: itemData.value?.numericId,
  })
}

async function saveItemToPhone() {
  const title = itemData.value?.displayName || itemData.value?.name || 'Peshkash item'
  const vendor = itemData.value?.event?.vendor?.displayName
  const text = [title, vendor, itemData.value?.description].filter(Boolean).join(' — ')
  const url = window.location.href

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      markItemSaved()
      feedback.value = 'Saved through your phone'
      showFeedback.value = true
      window.setTimeout(() => { showFeedback.value = false }, 2200)
      return
    } catch (err: any) {
      if (err?.name === 'AbortError') return
    }
  }

  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    markItemSaved()
    feedback.value = 'Item link copied — paste it into Notes, Messages, or your browser bookmarks'
    showFeedback.value = true
    window.setTimeout(() => { showFeedback.value = false }, 3200)
  } catch {
    feedback.value = 'Use your browser menu to bookmark this item'
    showFeedback.value = true
    window.setTimeout(() => { showFeedback.value = false }, 3200)
  }
}

async function shareItem() {
  analytics.track('share_click', {
    vendorId: itemData.value?.event?.vendor?.id,
    eventId: itemData.value?.event?.id,
    menuId: itemData.value?.menu?.id,
    itemId: itemData.value?.numericId,
  });
  const shareData = { title: itemData.value?.displayName || itemData.value?.name, url: window.location.href }

  if (navigator.share) {
    try {
      await navigator.share(shareData)
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.error('Unable to share item:', err)
    }
    return
  }

  try {
    await navigator.clipboard.writeText(window.location.href)
    feedback.value = 'Link copied'
    showFeedback.value = true
    window.setTimeout(() => { showFeedback.value = false }, 2200)
  } catch (err) {
    console.error('Unable to copy item link:', err)
  }
}

async function loadItem() {
  isLoading.value = true
  error.value = null
  itemData.value = null
  imageFailed.value = false
  loadEngagement()

  try {
    const res = await fetch(`${API_BASE_URL}/event/${eventName}/menu/${menuName}/item/${itemName}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()
    itemData.value = data

    // Dynamic SEO
    const itemDisplay  = data?.displayName || data?.name || itemName
    const vendorDisplay = data?.event?.vendor?.displayName || ''
    setMeta(
      vendorDisplay ? `${itemDisplay} by ${vendorDisplay} — Peshkash` : `${itemDisplay} — Peshkash`,
      data?.description
        ? `${itemDisplay}: ${data.description.slice(0, 140)}`
        : `Explore ${itemDisplay}${vendorDisplay ? ` by ${vendorDisplay}` : ''} on Peshkash.`,
    )

    analytics.track('item_detail_view', {
      vendorId: data?.event?.vendor?.id,
      eventId: data?.event?.id,
      menuId: data?.menu?.id,
      itemId: data?.numericId,
    })
  } catch (err: any) {
    error.value = 'unavailable'
    console.error('Error loading item:', err)
  } finally {
    isLoading.value = false

    if (error.value) return

    await nextTick()
    const els = document.querySelectorAll<HTMLElement>('.pk-reveal');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement;
          const anim = el.dataset.anim || 'animate__fadeInUp';
          const delay = Number(el.dataset.delay || 0);
          setTimeout(() => {
            el.classList.add('animate__animated', anim, 'pk-visible');
          }, delay);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.2 });
    els.forEach((el) => io.observe(el));
  }
}

onMounted(loadItem)
</script>

<style scoped>
.pk-item-page-surface { background: #f3ede4; min-height: 100vh; }
.pk-item-page { max-width: 1180px; padding-bottom: 6rem; }
.pk-item-shell { margin: 0 auto; max-width: 1060px; }
.pk-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  padding: 0.3rem 0;
  margin-top: 1.25rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: #bd945a;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.15s;
}
.pk-back-btn:hover { opacity: 1; }

.pk-reveal { opacity: 0; }
.pk-visible { opacity: 1; }
.pk-item-header { padding: clamp(3.25rem, 8vw, 6.5rem) 1rem clamp(2rem, 4vw, 3.25rem); text-align: center; }
.pk-item-overline,
.pk-story-kicker {
  color: #a77d45;
  font-size: 0.67rem;
  font-weight: 800;
  letter-spacing: 0.2em;
  margin: 0 0 1rem;
  text-transform: uppercase;
}
.pk-item-header h1 {
  color: #19140f;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2.55rem, 6vw, 5rem);
  font-weight: 500;
  letter-spacing: -0.045em;
  line-height: 0.96;
  margin: 0 auto 1.25rem;
  max-width: 900px;
  overflow-wrap: anywhere;
}
.pk-item-price { color: #1c1712; display: block; font-size: 1rem; margin-top: 0.85rem; }
.pk-item-media-wrap { display: flex; justify-content: center; }
.pk-item-media { width: min(100%, 960px); }
.pk-item-media .ratio { --bs-aspect-ratio: 62.5%; }
.pk-hero-img { border-radius: 2px !important; box-shadow: 0 24px 70px rgba(39, 27, 16, 0.12) !important; object-fit: cover; }
.pk-beige-text { color: beige; }
.pk-item-badges { display: flex; flex-wrap: wrap; gap: 0.45rem; justify-content: center; margin: 1.5rem auto; }
.pk-item-chip {
  align-items: center;
  border: 1px solid #ded3c4;
  border-radius: 999px;
  color: #625344;
  display: inline-flex;
  font-size: 0.72rem;
  gap: 0.3rem;
  padding: 0.35rem 0.7rem;
}
.pk-item-chip--warning { background: #fbf5e9; }
.pk-item-lineage { margin: 1.75rem auto 0; }
.pk-item-lineage .breadcrumb-item { color: #8d7b67; font-size: 0.76rem; letter-spacing: 0.04em; }
.pk-story {
  border-top: 1px solid #ddd1c1;
  margin: clamp(3.5rem, 8vw, 6.75rem) auto 0;
  max-width: 760px;
  padding-top: clamp(2.25rem, 5vw, 4rem);
}
.pk-story--no-media { margin-top: 1.5rem; }
.pk-story h2 {
  color: #1d1711;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2.25rem, 5vw, 4rem);
  font-weight: 500;
  letter-spacing: -0.035em;
  line-height: 1;
  margin: 0 0 1.4rem;
}
.pk-story-copy { color: #594c40; font-size: clamp(1rem, 2vw, 1.15rem); line-height: 1.85; margin-bottom: 1.5rem; }
.pk-story .badge { background: transparent !important; border: 1px solid #d9ccbc; color: #6c5944 !important; font-weight: 500; padding: 0.45rem 0.65rem; }

.vendor-name,
.event-name {
  color: #bd945a;
  font-weight: 500;
}

.vendor-link {
  text-decoration: none;
  cursor: pointer;
  border-bottom: 1px dashed rgba(189, 148, 90, 0.5);
  transition: border-color 0.15s ease;
}

.vendor-link:hover {
  border-bottom-color: #bd945a;
}

.pk-share-fab {
  background: #b98a4d;
  border: 1px solid rgba(255, 255, 255, 0.55);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.pk-share-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3) !important;
}

.pk-engage-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #e5dbce;
  margin: clamp(3rem, 7vw, 5rem) auto 0;
  max-width: 760px;
  padding-top: 2rem;
  gap: 0.8rem;
}
.pk-engage-title { color: var(--pk-mushroom, #8c7667); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.pk-engage-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: center; }
.pk-engage-actions .btn { align-items: center; border-radius: 999px; display: inline-flex; gap: 0.35rem; justify-content: center; min-height: 40px; min-width: 92px; padding-inline: 1rem; }
.pk-save-action { min-width: 112px !important; }

@media (max-width: 640px) {
  .pk-item-page { padding-left: 1rem; padding-right: 1rem; }
  .pk-item-header { padding-bottom: 2rem; padding-top: 3.5rem; }
  .pk-item-header h1 { font-size: clamp(2.5rem, 12vw, 3.8rem); }
  .pk-item-media .ratio { --bs-aspect-ratio: 78%; }
  .pk-story { margin-top: 3.5rem; padding-inline: 0.35rem; }
  .pk-story--no-media { margin-top: 1rem; }
  .pk-story-copy { line-height: 1.7; }
  .pk-engage-actions { width: 100%; }
  .pk-engage-actions .btn { flex: 1; min-width: 88px; }
  .pk-share-fab {
    display: flex;
    height: 48px !important;
    margin: 1.25rem auto 0 !important;
    position: static !important;
    width: 48px !important;
  }
}
</style>

