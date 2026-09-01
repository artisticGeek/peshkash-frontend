<template>
  <PublicNav v-if="!error" />

  <!-- Login gate — shown when vendor.requireLogin=true and user not yet logged in -->
  <LoginModal
    v-model="loginModalOpen"
    no-dismiss
    @success="onLoginSuccess"
  />

  <!-- Loading State -->
  <div v-if="isLoading" class="pk-page-loader">
    <peshkash-loader size="110" theme="light" label="Loading menu" />
  </div>

  <!-- Error State -->
  <PublicErrorState
    v-else-if="error"
    title="This menu is not available right now"
    message="The link may have changed, or the menu may be temporarily unavailable. Please try again."
    :reference="`${eventName}/${menuName}`"
    @retry="loadMenu"
  />

  <!-- Menu Content -->
  <div v-else class="container py-3">
    <!-- Header Section -->
    <div class="text-center mb-4 pk-reveal" data-anim="animate__fadeInUp">
      <h1 class="fw-bold mb-1">{{ menuData?.menu?.displayName }}</h1>
      <small class="d-block">
        <RouterLink
          v-if="menuData?.vendor?.hasContactPage"
          :to="`/vendor/${menuData.vendor.name}`"
          class="vendor-name vendor-link"
        >{{ menuData.vendor.displayName }}</RouterLink>
        <span v-else class="vendor-name">{{ menuData?.vendor?.displayName }}</span>
        <template v-if="menuData?.menu?.type === 'personalized'">
          <span class="mx-1 text-muted">@</span>
          <span class="event-name">{{ menuData?.event?.displayName }}</span>
        </template>
      </small>
      <p v-if="menuData?.menu?.description" class="menu-item-description">
        {{ menuData.menu.description }}
      </p>
      <button class="menu-share-button" type="button" aria-label="Share this collection" title="Share this collection" @click="shareMenu">
        <i class="bi bi-share"></i>
      </button>
    </div>

    <!-- Event Status Notice -->
    <div v-if="!isEventActive" class="alert alert-warning mb-4" role="alert">
      <i class="bi bi-clock-history me-2"></i>
      This event has ended. Menu details are no longer available.
    </div>

    <!-- Filters Section -->
    <div v-if="menuData?.menu?.lineItems" class="filters-container mb-3">
      <!-- Search Bar -->
      <div class="search-bar">
        <i class="bi bi-search search-icon"></i>
        <input 
          v-model="searchQuery"
          type="text" 
          class="search-input" 
          placeholder="Search menu items..."
        />
      </div>
      
      <!-- Filter Tags (only show if enumTypes exist) -->
      <div v-if="availableFilters.length > 1" class="filter-tags">
        <button
          v-for="filter in availableFilters"
          :key="filter"
          class="filter-tag"
          :class="{ active: selectedFilter === filter }"
          @click="selectedFilter = filter"
        >
          {{ filter }}
        </button>
      </div>
    </div>

    <!-- Menu Categories -->
    <div v-if="filteredMenuItems && filteredMenuItems.length > 0" class="menu-list pk-reveal" data-anim="animate__fadeInUp" data-delay="100">
      <MenuTree
        v-for="item in filteredMenuItems"
        :key="`${item.id}-${forceRenderKey}`"
        :item="item"
        :level="0"
        :event-name="eventName"
        :menu-name="menuName"
        :search-query="searchQuery"
        :selected-filter="selectedFilter"
        :analytics-vendor-id="menuData?.vendor?.id"
        :analytics-event-id="menuData?.event?.id"
        :analytics-menu-id="menuData?.menu?.id"
      />
    </div>

    <!-- No Results State -->
    <div v-else-if="menuData?.menu?.lineItems && menuData.menu.lineItems.length > 0 && filteredMenuItems.length === 0" class="text-center py-5">
      <i class="bi bi-search display-1 text-muted"></i>
      <p class="text-muted mt-3">No items match your search</p>
      <button class="btn btn-sm btn-outline-secondary" @click="clearFilters">Clear filters</button>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-5">
      <i class="bi bi-basket display-1 text-muted"></i>
      <p class="text-muted mt-3">No items available in this menu.</p>
    </div>

    <!-- Powered by Peshkash footer -->
    <footer class="pk-powered-footer">
      <a href="https://peshkash.app" target="_blank" rel="noopener" class="pk-powered-link">
        <svg viewBox="235 95 360 380" xmlns="http://www.w3.org/2000/svg" height="18" width="13" aria-hidden="true">
          <polygon points="391.5,164 471,164 516,205 391.5,276.5" fill="#E8DBCE"/>
          <polygon points="516,205 516,262.5 470.5,310 391.5,276.5" fill="#C5AF9D"/>
          <polygon points="391.5,276.5 470.5,310 391.5,310" fill="#8C7667"/>
          <polygon points="335,164 392,164 392,415 364,389 335,415" fill="#BB9057"/>
        </svg>
        <span class="pk-powered-label">powered by</span>
        <span class="pk-powered-name">peshkash</span>
      </a>
    </footer>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted, nextTick, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import PublicNav from '../components/PublicNav.vue'
import PublicErrorState from '../components/PublicErrorState.vue'
import MenuTree from '../components/MenuTree.vue'
import LoginModal from '../components/auth/LoginModal.vue'
import { API_BASE_URL } from '../config'
import { useAnalytics } from '../composables/useAnalytics'
import { useAuthStore } from '../stores/auth'
import { usePageMeta } from '../composables/usePageMeta'
import { sharePublicPage } from '../utils/socialShare'

const route = useRoute()
const eventName = route.params.eventName as string
const menuName = route.params.menuName as string

const { setMeta, resetMeta } = usePageMeta()
onUnmounted(resetMeta)

// Auth & login gate
const authStore = useAuthStore()
const loginModalOpen = ref(false)
const isLoggedIn = computed(() => authStore.isLoggedIn)

function onLoginSuccess() {
  loginModalOpen.value = false
}

const analytics = useAnalytics()

const menuData = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Filter state
const searchQuery = ref('')
const selectedFilter = ref('All')

// Check if event is currently active.
// Rule: no start/end times = perpetually active (most menus are evergreen).
// Only show "expired" when BOTH times are set AND the window has passed.
const isEventActive = computed(() => {
  if (!menuData.value?.event) return true // data not loaded yet — don't flash warning

  const now = new Date()
  const startTime = menuData.value.event.startTime ? new Date(menuData.value.event.startTime) : null
  const endTime = menuData.value.event.endTime ? new Date(menuData.value.event.endTime) : null

  // No time window configured → always active
  if (!startTime || !endTime) return true

  return now >= startTime && now <= endTime
})

// Get available filter types from menu items
const availableFilters = computed(() => {
  if (!menuData.value?.menu?.lineItems) return ['All']
  
  const enumTypes = new Set<string>()
  
  const collectEnumTypes = (items: any[]) => {
    for (const item of items) {
      if (item.enumType) {
        enumTypes.add(item.enumType)
      }
      if (item.subCategoryLineItems && item.subCategoryLineItems.length > 0) {
        collectEnumTypes(item.subCategoryLineItems)
      }
    }
  }
  
  collectEnumTypes(menuData.value.menu.lineItems)
  
  return enumTypes.size > 0 ? ['All', ...Array.from(enumTypes).sort()] : ['All']
})

// Create a reactive key that changes when filter state changes
const filterKey = computed(() => `${searchQuery.value}-${selectedFilter.value}`)

// Return menu items without filtering - MenuTree will handle visibility
const filteredMenuItems = computed(() => {
  return menuData.value?.menu?.lineItems || []
})

const clearFilters = () => {
  searchQuery.value = ''
  selectedFilter.value = 'All'
}

async function shareMenu() {
  if (!menuData.value) return
  const menuDisplay = menuData.value.menu?.displayName || menuName
  const vendorDisplay = menuData.value.vendor?.displayName
  const shared = await sharePublicPage({
    title: vendorDisplay ? `${menuDisplay} by ${vendorDisplay} @ Peshkash` : `${menuDisplay} @ Peshkash`,
    text: menuData.value.menu?.description || `Browse ${menuDisplay} on Peshkash.`,
    previewPath: `event/${eventName}/menu/${menuName}`,
  })
  if (shared) analytics.track('share_click', {
    vendorId: menuData.value.vendor?.id,
    eventId: menuData.value.event?.id,
    menuId: menuData.value.menu?.id,
  })
}

// Watch for search query changes to force reactivity
const forceRenderKey = ref(0)
watch([searchQuery, selectedFilter], ([newSearch, newFilter], [oldSearch, oldFilter]) => {
  // Force immediate re-render when transitioning to "no filter" state
  // This prevents blank categories after backspacing from empty results
  const wasFiltered = oldSearch?.trim() || oldFilter !== 'All'
  const isNowUnfiltered = !newSearch?.trim() && newFilter === 'All'
  
  if (wasFiltered && isNowUnfiltered) {
    forceRenderKey.value++
  } else {
    nextTick(() => {
      forceRenderKey.value++
    })
  }
})

async function loadMenu() {
  isLoading.value = true
  error.value = null

  try {
    const res = await fetch(`${API_BASE_URL}/event/${eventName}/menu/${menuName}`)
    
    if (!res.ok) {
      throw new Error(`Failed to load menu: ${res.status} ${res.statusText}`)
    }
    
    const data = await res.json()
    menuData.value = data

    // Dynamic SEO
    const menuDisplay  = data?.menu?.displayName  || menuName
    const vendorDisplay = data?.vendor?.displayName || ''
    setMeta({
      title: vendorDisplay ? `${menuDisplay} by ${vendorDisplay} @ Peshkash` : `${menuDisplay} @ Peshkash`,
      description: data?.menu?.description || `Browse ${menuDisplay}${vendorDisplay ? ` by ${vendorDisplay}` : ''} on Peshkash — scan, explore, and enjoy.`,
      type: 'article',
    })

    // If the vendor requires login and the user isn't logged in, show the modal.
    // No redirect — just gate the content; user stays on this page.
    if (data?.vendor?.requireLogin && !isLoggedIn.value) {
      loginModalOpen.value = true
    }
    // Track menu page view (fires regardless of login state)
    analytics.track('menu_view', {
      vendorId: data?.vendor?.id,
      eventId: data?.event?.id,
      menuId: data?.menu?.id,
    })
  } catch (err: any) {
    error.value = 'unavailable'
    console.error('Error loading menu:', err)
  } finally {
    isLoading.value = false

    if (error.value) return

    // Trigger animations after content loads
    await nextTick()
    const els = document.querySelectorAll<HTMLElement>('.pk-reveal')
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLElement
          const anim = el.dataset.anim || 'animate__fadeInUp'
          const delay = Number(el.dataset.delay || 0)
          setTimeout(() => {
            el.classList.add('animate__animated', anim, 'pk-visible')
          }, delay)
          io.unobserve(el)
        }
      })
    }, { threshold: 0.2 })
    els.forEach((el) => io.observe(el))
  }
}

onMounted(loadMenu)
</script>

<style scoped>
/* Force body fonts on interactive elements — h1 inherits Rufina from global styles */
.vendor-name,
.event-name,
.menu-item-description,
.search-input,
.filter-tag {
  font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.pk-reveal { 
  opacity: 0; 
}

.pk-visible { 
  opacity: 1; 
}

.menu-list {
  max-width: 800px;
  margin: 0 auto;
}

.vendor-name, .event-name {
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

.menu-item-description {
  font-size: 0.775rem;
  color: var(--pk-mushroom);
  line-height: 1.4;
  margin-top: 2px;
}

.menu-share-button {
  align-items: center;
  background: transparent;
  border: 1px solid rgba(189, 148, 90, 0.5);
  border-radius: 999px;
  color: #9b713c;
  display: inline-flex;
  height: 34px;
  justify-content: center;
  margin-top: 0.85rem;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  width: 34px;
}

.menu-share-button:hover { background: #f4e9da; color: #1a1410; transform: translateY(-1px); }

@media (min-width: 768px) {
  .menu-item-description {
    font-size: 0.875rem;
    line-height: 1.5;
    margin-top: 4px;
  }
}

/* Filter UI Styles */
.filters-container {
  max-width: 800px;
  margin: 0 auto;
}

.search-bar {
  position: relative;
  margin-bottom: 12px;
}

.search-icon {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  color: var(--pk-mushroom);
  font-size: 0.9rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid rgba(189, 148, 90, 0.25);
  padding: 8px 8px 8px 24px;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease;
  background: transparent;
}

.search-input:focus {
  border-bottom-color: #bd945a;
}

.search-input::placeholder {
  color: var(--pk-mushroom);
}

.filter-tags {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  padding: 8px 0;
}

.filter-tag {
  background: none;
  border: none;
  padding: 4px 0;
  font-size: 0.85rem;
  color: var(--pk-mushroom);
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease;
  font-weight: 400;
}

.filter-tag:hover {
  color: var(--pk-stone-beige);
}

.filter-tag.active {
  color: #bd945a;
  font-weight: 500;
}

.filter-tag.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #bd945a;
}

@media (min-width: 768px) {
  .search-input {
    font-size: 0.95rem;
  }

  .filter-tag {
    font-size: 0.9rem;
  }
}

/* Powered by Peshkash footer */
.pk-powered-footer {
  display: flex;
  justify-content: center;
  padding: 28px 0 20px;
}

.pk-powered-link {
  align-items: center;
  color: inherit;
  display: inline-flex;
  gap: 5px;
  opacity: 0.55;
  text-decoration: none;
  transition: opacity 0.2s;
}

.pk-powered-link:hover {
  opacity: 0.85;
}

.pk-powered-label {
  color: #9a8870;
  font-size: 0.68rem;
  font-weight: 400;
  letter-spacing: 0.02em;
}

.pk-powered-name {
  color: #BD945A;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 0.88rem;
  font-weight: 600;
}
</style>
