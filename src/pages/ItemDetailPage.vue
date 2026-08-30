<template>
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

  <div v-else class="container py-3">
    <div v-if="isLoading" class="pk-page-loader">
      <peshkash-loader size="110" theme="light" label="Loading item" />
    </div>
    <div v-else class="pk-reveal" data-anim="animate__fadeInUp">
      <button v-if="canGoBack" class="pk-back-btn" @click="router.back()" aria-label="Go back">
        <i class="bi bi-chevron-left"></i> Back
      </button>
      <div class="text-center mb-4">
        <h1 class="fw-bold mb-1">{{ itemData?.displayName || itemData?.name }}</h1>
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
        <small v-if="itemData?.price" class="d-block text-info">{{ itemData.price }}</small>
      </div>

      <div class="d-flex justify-content-center mb-3">
        <div class="col-12 col-md-10 col-lg-8">
          <div class="ratio ratio-16x9">
            <img :src="itemData?.image" :alt="itemData?.displayName || itemData?.name" class="w-100 h-100 rounded shadow pk-hero-img" loading="lazy" />
          </div>
        </div>
      </div>

      <div class="d-flex flex-wrap justify-content-center gap-2 mb-4">
        <span v-if="itemData?.isVeg !== undefined" class="badge bg-light text-dark d-flex align-items-center">
          <i :class="['bi','bi-circle-fill', itemData.isVeg ? 'text-success' : 'text-danger']"></i>
          <span class="ms-1">{{ itemData.isVeg ? 'Veg' : 'Non-Veg' }}</span>
        </span>
        <span v-for="tag in itemData?.tags || []" :key="tag" class="badge bg-info text-dark">{{ tag }}</span>
        <span v-for="allergen in itemData?.allergens || []" :key="allergen" class="badge bg-warning text-dark">{{ allergen }}</span>
        <span v-if="itemData?.spiceLevel" class="badge bg-light text-danger">
          <i v-for="n in 3" :key="n" class="bi bi-fire" :class="{'opacity-25': n > itemData.spiceLevel}"></i>
        </span>
      </div>

      <nav v-if="itemData.parentItems?.length" class="mb-3" aria-label="breadcrumb">
        <ol class="breadcrumb justify-content-center mb-0">
          <li v-for="parentItem in itemData.parentItems" :key="parentItem.displayName" class="breadcrumb-item">{{ parentItem.displayName }}</li>
        </ol>
      </nav>

      <div class="card pk-detail-card mb-4">
        <div class="card-body">
          <h2 class="h5 mb-3 pk-detail-heading">
            <i :class="['bi', 'me-2', itemSectionIcon]"></i>{{ itemSectionLabel }}
          </h2>
          <p class="mb-3">{{ itemData?.description }}</p>
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
        </div>
      </div>

      <div class="pk-engage-bar" aria-label="Item actions">
        <button class="pk-engage-btn" :class="{ active: userReaction === 'like' }" @click="toggleReaction('like')" aria-label="Like this item">
          <i :class="userReaction === 'like' ? 'bi bi-hand-thumbs-up-fill' : 'bi bi-hand-thumbs-up'"></i>
          <span>Like</span>
        </button>
        <div class="pk-engage-sep" aria-hidden="true"></div>
        <button class="pk-engage-btn" :class="{ active: userReaction === 'dislike', 'is-dislike': true }" @click="toggleReaction('dislike')" aria-label="Dislike this item">
          <i :class="userReaction === 'dislike' ? 'bi bi-hand-thumbs-down-fill' : 'bi bi-hand-thumbs-down'"></i>
          <span>Dislike</span>
        </button>
        <div class="pk-engage-sep" aria-hidden="true"></div>
        <button class="pk-engage-btn" :class="{ active: isBookmarked }" @click="toggleBookmark" aria-label="Bookmark this item">
          <i :class="isBookmarked ? 'bi bi-bookmark-fill' : 'bi bi-bookmark'"></i>
          <span>Save</span>
        </button>
      </div>
    </div>

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

const ITEM_SECTION_MAP: Record<string, { label: string; icon: string }> = {
  dish:     { label: 'About the dish',    icon: 'bi-fork-knife' },
  dishtype: { label: 'About the dish',    icon: 'bi-fork-knife' },
  product:  { label: 'About this piece',  icon: 'bi-box-seam' },
  item:     { label: 'About this item',   icon: 'bi-tag' },
  service:  { label: 'About this service', icon: 'bi-gear' },
  art:      { label: 'About this piece',  icon: 'bi-palette' },
}

const itemSectionLabel = computed(() => {
  const t = itemData.value?.type?.toLowerCase()
  return ITEM_SECTION_MAP[t]?.label ?? 'Details'
})
const itemSectionIcon = computed(() => {
  const t = itemData.value?.type?.toLowerCase()
  return ITEM_SECTION_MAP[t]?.icon ?? 'bi-info-circle'
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

function toggleBookmark() {
  isBookmarked.value = !isBookmarked.value
  try {
    if (isBookmarked.value) localStorage.setItem(bookmarkKey(), '1')
    else localStorage.removeItem(bookmarkKey())
  } catch {}
  analytics.track('item_bookmark', {
    bookmarked: isBookmarked.value,
    vendorId: itemData.value?.event?.vendor?.id,
    eventId: itemData.value?.event?.id,
    menuId: itemData.value?.menu?.id,
    itemId: itemData.value?.numericId,
  })
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
.pk-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: none;
  padding: 0.3rem 0;
  margin-bottom: 0.75rem;
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
.pk-hero-img { object-fit: cover; }
.pk-beige-text { color: beige; }

.pk-detail-card {
  background: var(--rx-surface-color, #ebe7e1);
  border: 1px solid var(--rx-border-color, #d8d2c8);
}
.pk-detail-heading { color: #bd945a; }

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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.pk-share-fab:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3) !important;
}

.pk-engage-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.5rem auto;
  max-width: 300px;
  background: rgba(26, 20, 16, 0.55);
  border: 1px solid rgba(189, 148, 90, 0.22);
  border-radius: 100px;
  padding: 0.3rem;
  gap: 0;
}

.pk-engage-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: none;
  border: none;
  padding: 0.45rem 1rem;
  border-radius: 100px;
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(245, 242, 238, 0.5);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}
.pk-engage-btn:hover { color: #bd945a; }
.pk-engage-btn.active {
  background: rgba(189, 148, 90, 0.14);
  color: #bd945a;
}

.pk-engage-sep {
  width: 1px;
  height: 1.1rem;
  background: rgba(189, 148, 90, 0.2);
  flex-shrink: 0;
}
</style>

