<template>
  <Navbar />
  
  <!-- Loading State -->
  <div v-if="isLoading" class="container py-5">
    <div class="text-center">
      <div class="spinner-grow text-primary shadow-lg" style="width: 3rem; height: 3rem;" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="spinner-grow text-info shadow-lg mt-3" style="width: 2rem; height: 2rem;" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <div class="spinner-grow text-white shadow-lg mt-3" style="width: 1rem; height: 1rem;" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  </div>

  <!-- Error State -->
  <div v-else-if="error" class="container py-5">
    <div class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle-fill me-2"></i>
      {{ error }}
    </div>
  </div>

  <!-- Menu Content -->
  <div v-else class="container py-3">
    <!-- Header Section -->
    <div class="text-center mb-4 pk-reveal" data-anim="animate__fadeInUp">
      <h1 class="fw-bold mb-1">{{ menuData?.menu?.displayName }}</h1>
      <small class="d-block">
        <span class="vendor-name">{{ menuData?.vendor?.displayName }}</span> @ <span class="event-name">{{ menuData?.event?.displayName }}</span>
      </small>
      <p v-if="menuData?.menu?.description" class="menu-item-description">
        {{ menuData.menu.description }}
      </p>
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
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue'
import MenuTree from '../components/MenuTree.vue'
import { API_BASE_URL } from '../config'

const route = useRoute()
const eventName = route.params.eventName as string
const menuName = route.params.menuName as string

const menuData = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)

// Filter state
const searchQuery = ref('')
const selectedFilter = ref('All')

// Check if event is currently active
const isEventActive = computed(() => {
  if (!menuData.value?.event) return false
  
  const now = new Date()
  const startTime = menuData.value.event.startTime ? new Date(menuData.value.event.startTime) : null
  const endTime = menuData.value.event.endTime ? new Date(menuData.value.event.endTime) : null
  
  if (!startTime || !endTime) return false
  
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

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/event/${eventName}/menu/${menuName}`)
    
    if (!res.ok) {
      throw new Error(`Failed to load menu: ${res.status} ${res.statusText}`)
    }
    
    const data = await res.json()
    menuData.value = data
    console.log('Menu data loaded:', data)
  } catch (err: any) {
    error.value = err.message || 'An error occurred while loading the menu'
    console.error('Error loading menu:', err)
  } finally {
    isLoading.value = false
    
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
})
</script>

<style scoped>
/* Force default fonts - prevent navbar font inheritance */
.container,
h1,
.vendor-name,
.event-name,
.menu-item-description,
.search-input,
.filter-tag {
  font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
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

.menu-item-description {
  font-size: 0.775rem;
  color: #6c757d;
  line-height: 1.4;
  margin-top: 2px;
}

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
  color: #9ca3af;
  font-size: 0.9rem;
  pointer-events: none;
}

.search-input {
  width: 100%;
  border: none;
  border-bottom: 1px solid #e5e7eb;
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
  color: #9ca3af;
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
  color: #6c757d;
  cursor: pointer;
  position: relative;
  transition: color 0.2s ease;
  font-weight: 400;
}

.filter-tag:hover {
  color: #495057;
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
</style>