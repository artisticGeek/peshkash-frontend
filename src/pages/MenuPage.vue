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
      <small class="d-block text-muted">
        {{ menuData?.vendor?.displayName }} @ {{ menuData?.event?.displayName }}
      </small>
      <p v-if="menuData?.menu?.description" class="text-muted mt-2">
        {{ menuData.menu.description }}
      </p>
    </div>

    <!-- Event Status Notice -->
    <div v-if="!isEventActive" class="alert alert-warning mb-4" role="alert">
      <i class="bi bi-clock-history me-2"></i>
      This event has ended. Menu details are no longer available.
    </div>

    <!-- Menu Categories -->
    <div v-if="menuData?.menu?.lineItems && menuData.menu.lineItems.length > 0" class="menu-list pk-reveal" data-anim="animate__fadeInUp" data-delay="100">
      <MenuTree 
        v-for="item in menuData.menu.lineItems" 
        :key="item.id"
        :item="item"
        :level="0"
        :event-name="eventName"
        :menu-name="menuName"
      />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-5">
      <i class="bi bi-basket display-1 text-muted"></i>
      <p class="text-muted mt-3">No items available in this menu.</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick, computed } from 'vue'
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

// Check if event is currently active
const isEventActive = computed(() => {
  if (!menuData.value?.event) return false
  
  const now = new Date()
  const startTime = menuData.value.event.startTime ? new Date(menuData.value.event.startTime) : null
  const endTime = menuData.value.event.endTime ? new Date(menuData.value.event.endTime) : null
  
  if (!startTime || !endTime) return false
  
  return now >= startTime && now <= endTime
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
</style>