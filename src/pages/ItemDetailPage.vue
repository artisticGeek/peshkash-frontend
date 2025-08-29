<template>
  <Navbar />

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
        <small class="d-block text-muted">
          {{ itemData.event.vendor.displayName }} @ {{ itemData.event.displayName }}
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
          <template v-for="n in 5">
            <input :id="'rate'+n" type="radio" class="btn-check" name="rating">
            <label :for="'rate'+n" class="btn btn-sm btn-outline-primary me-1">
              <i class="bi bi-star-fill"></i>
              <span class="visually-hidden">{{ n }} star</span>
            </label>
          </template>
        </div>
      </div>

      <div class="text-end mb-4">
        <button class="btn btn-outline-primary" @click="win.navigator?.share && win.navigator?.share({ title: itemData?.name, url: win.location.href })">
          <i class="bi bi-share-fill me-1"></i>Share
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '../components/Navbar.vue';

const route = useRoute()
const eventName = route.params.eventName as string
const menuName = route.params.menuName as string
const itemName = route.params.itemName as string

const itemData = ref<any>(null)
const isLoading = ref(true)
const error = ref<string | null>(null)
const win = window

onMounted(async () => {
  try {
    const res = await fetch(`https://peshkash-backend.onrender.com/api/event/${eventName}/menu/${menuName}/item/${itemName}`)
    if (!res.ok) throw new Error(`API error: ${res.status}`)
    const data = await res.json()
    itemData.value = data
    console.log(itemData.value)
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
</style>

