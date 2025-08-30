<template>
  <Navbar />

  <section class="py-3 py-md-4">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-12 col-md-10 col-lg-7">
          <div v-if="isLoading" class="text-center py-5">
            <div class="spinner-grow shadow-lg" style="width: 3rem; height: 3rem;" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="spinner-grow shadow-lg mt-3" style="width: 2rem; height: 2rem;" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <div class="spinner-grow shadow-lg mt-3" style="width: 1rem; height: 1rem;" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
          <div v-else-if="error">{{ error }}</div>
          <div v-else>
            <nav aria-label="breadcrumb" class="mb-2 mb-md-3">
              <ol class="breadcrumb small mb-0">
                <li class="breadcrumb-item"><a href="#">{{ itemData.event.displayName }}</a></li>
                <li v-for="parent in itemData.parentItems || []" :key="parent.displayName" class="breadcrumb-item">
                  <a href="#">{{ parent.displayName }}</a>
                </li>
                <li class="breadcrumb-item active" aria-current="page">{{ itemData.name }}</li>
              </ol>
            </nav>

            <div class="card border-0 shadow rounded-4 overflow-hidden pk-reveal" data-anim="fadeInUp">
              <div class="vstack gap-3 gap-md-4">
                <div class="p-3 p-md-4 pb-0">
                  <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-1">
                    <div>
                      <h3 class="mb-0">{{ itemData.name }}</h3>
                      <div class="small">{{ itemData.event.vendor.displayName }}</div>
                    </div>
                    <div v-if="itemData.price" class="fw-semibold">{{ itemData.price }}</div>
                  </div>
                  <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
                    <span v-if="itemData.isVeg !== undefined" class="d-flex align-items-center me-2 mb-2">
                      <svg width="8" height="8" :style="{ color: itemData.isVeg ? 'var(--bs-success)' : 'var(--bs-danger)' }" aria-hidden="true" focusable="false">
                        <circle cx="4" cy="4" r="4" fill="currentColor" />
                      </svg>
                      <span class="ms-1 small">{{ itemData.isVeg ? 'Veg' : 'Non-Veg' }}</span>
                    </span>
                    <span v-for="tag in itemData.tags || []" :key="'tag'+tag" class="badge rounded-pill border me-2 mb-2">{{ tag }}</span>
                    <span v-for="allergen in itemData.allergens || []" :key="'allergen'+allergen" class="badge rounded-pill border me-2 mb-2">{{ allergen }}</span>
                    <span v-if="itemData.spiceLevel" class="d-flex align-items-center mb-2">
                      <svg
                        v-for="n in 3"
                        :key="'chili'+n"
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        class="me-1"
                        :style="{ color: n <= itemData.spiceLevel ? 'var(--bs-danger)' : 'var(--bs-secondary)' }"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M4 1c1.5 1 3 .5 4 0 1 1 2 3 1 5l-2 5c-.5 1.5-2.5 1.5-3 0L2 6c-.5-2 0-4 2-5z" />
                      </svg>
                    </span>
                  </div>
                </div>
                <div class="ratio ratio-16x9 rounded-3 shadow-sm mx-3 mx-md-4 pk-reveal" data-anim="fadeInUp">
                  <img
                    class="w-100 h-100 object-fit-cover"
                    :src="itemData.image"
                    :alt="itemData.name"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div class="px-3 px-md-4 pb-4 pk-reveal" data-anim="fadeInUp">
                  <div class="border-top my-2"></div>
                  <h5 class="d-flex align-items-center mb-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      fill="currentColor"
                      class="me-2"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path d="M13 .5c0-.276-.226-.506-.498-.465-1.703.257-2.94 2.012-3 8.462a.5.5 0 0 0 .498.5c.56.01 1 .13 1 1.003v5.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5zM4.25 0a.25.25 0 0 1 .25.25v5.122a.128.128 0 0 0 .256.006l.233-5.14A.25.25 0 0 1 5.24 0h.522a.25.25 0 0 1 .25.238l.233 5.14a.128.128 0 0 0 .256-.006V.25A.25.25 0 0 1 6.75 0h.29a.5.5 0 0 1 .498.458l.423 5.07a1.69 1.69 0 0 1-1.059 1.711l-.053.022a.92.92 0 0 0-.58.884L6.47 15a.971.971 0 1 1-1.942 0l.202-6.855a.92.92 0 0 0-.58-.884l-.053-.022a1.69 1.69 0 0 1-1.059-1.712L3.462.458A.5.5 0 0 1 3.96 0z" />
                    </svg>
                    About the delight!
                  </h5>
                  <p class="mb-3">{{ itemData.description }}</p>
                  <div v-if="itemData.ingredients" class="d-flex flex-wrap">
                    <span
                      v-for="ing in itemData.ingredients.split(',')"
                      :key="ing"
                      class="badge rounded-pill border me-2 mb-2"
                    >
                      {{ ing.trim() }}
                    </span>
                  </div>
                  <div class="text-center text-uppercase mb-2 small mt-4">Rate this item</div>
                  <div class="d-flex justify-content-center">
                    <div class="btn-group" role="radiogroup">
                      <template v-for="n in 5">
                        <input class="btn-check" type="radio" name="rating" :id="'star'+n" />
                        <label class="btn btn-sm btn-outline-secondary" :for="'star'+n">
                          ★<span class="visually-hidden">{{ n }} star</span>
                        </label>
                      </template>
                    </div>
                  </div>
                  <div class="d-flex gap-2 justify-content-center mt-3">
                    <button class="btn btn-outline-secondary">
                      Like <span class="ms-1">{{ itemData?.likes || 0 }}</span>
                    </button>
                    <button class="btn btn-outline-secondary">
                      Dislike <span class="ms-1">{{ itemData?.dislikes || 0 }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="fixed-bottom border-top shadow-sm d-md-none">
    <div class="container py-2 d-flex gap-2">
      <button class="btn btn-outline-secondary flex-fill" @click="$router.back()">Back to Menu</button>
      <button
        class="btn btn-primary flex-fill"
        @click="win.navigator?.share && win.navigator?.share({ title: itemData?.name, url: win.location.href })"
      >
        Share
      </button>
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
</style>

