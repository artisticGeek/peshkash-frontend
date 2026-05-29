<template>
  <Navbar />
  <div
    v-if="showFeedback"
    class="position-fixed top-0 start-50 translate-middle-x mt-3"
    style="z-index: 2000;"
  >
    <div class="alert alert-warning shadow" role="alert">{{ feedback }}</div>
  </div>

  <div class="container py-3">
    <div v-if="isLoading" class="text-center py-5">
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
    <div v-else-if="error" class="text-danger">{{ error }}</div>
    <div v-else class="pk-reveal" data-anim="animate__fadeInUp">
      <div class="text-center mb-4">
        <h1 class="fw-bold mb-1">{{ itemData?.name }}</h1>
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
            <img :src="itemData?.image" :alt="itemData?.name" class="w-100 h-100 rounded shadow pk-hero-img" loading="lazy" />
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

      <div class="card bg-light border-0 mb-4 shadow-sm">
        <div class="card-body">
          <h2 class="h5 mb-3 text-primary"><i class="bi bi-fork-knife me-2"></i>About the delight!</h2>
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

      <div class="my-4 d-flex flex-column align-items-center">
        <span class="mb-2">Rate this item</span>
        <div class="d-flex">
          <button
            v-for="n in 5"
            :key="n"
            type="button"
            class="btn btn-sm me-1"
            :class="n <= rating ? 'btn-primary' : 'btn-outline-primary'"
            @click="setRating(n)"
          >
            <i class="bi bi-star-fill"></i>
            <span class="visually-hidden">{{ n }} star</span>
          </button>
        </div>
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
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue';
import { API_BASE_URL } from '../config';
import { useAnalytics } from '../composables/useAnalytics';

const route = useRoute()
const eventName = route.params.eventName as string
const menuName = route.params.menuName as string
const itemName = route.params.itemName as string

const itemData = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const rating = ref<number>(0)
const feedback = ref('')
const showFeedback = ref(false)
const analytics = useAnalytics()

const setRating = (n: number) => {
  rating.value = n
  feedback.value = `Thanks for rating ${n} star${n > 1 ? 's' : ''}!`
  showFeedback.value = true
  setTimeout(() => {
    showFeedback.value = false
  }, 2000)
}

function shareItem() {
  analytics.track('share_click', {
    vendorId: itemData.value?.event?.vendor?.id,
    eventId: itemData.value?.event?.id,
    menuId: itemData.value?.menu?.id,
    itemId: itemData.value?.id,
  });
  navigator.share?.({ title: itemData.value?.name, url: window.location.href });
}

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE_URL}/event/${eventName}/menu/${menuName}/item/${itemName}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()
    itemData.value = data
    analytics.track('item_detail_view', {
      vendorId: data?.event?.vendor?.id,
      eventId: data?.event?.id,
      menuId: data?.menu?.id,
      itemId: data?.id,
    })
  } catch (err: any) {
    error.value = err.message
  } finally {
    isLoading.value = false
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
})
</script>

<style scoped>
.pk-reveal { opacity: 0; }
.pk-visible { opacity: 1; }
.pk-hero-img { object-fit: cover; }
.pk-beige-text { color: beige; }

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
</style>

