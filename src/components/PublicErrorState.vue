<template>
  <main class="public-error" role="alert">
    <RouterLink to="/" class="public-error__brand" aria-label="Peshkash home">
      <PeshkashLogo variant="light-bg" :height="34" />
    </RouterLink>
    <div class="public-error__card">
      <span class="public-error__icon" aria-hidden="true"><i class="bi bi-qr-code-scan"></i></span>
      <p class="public-error__eyebrow">SCAN SUPPORT</p>
      <h1>{{ title }}</h1>
      <p>{{ message }}</p>
      <div class="public-error__actions">
        <button v-if="retryable" type="button" class="btn btn-primary" @click="$emit('retry')">
          <i class="bi bi-arrow-clockwise"></i> Try again
        </button>
        <RouterLink to="/" class="btn btn-outline-secondary">Peshkash home</RouterLink>
      </div>
      <small v-if="reference">Reference: {{ reference }}</small>
    </div>
  </main>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import PeshkashLogo from './PeshkashLogo.vue';

withDefaults(defineProps<{
  title?: string;
  message?: string;
  reference?: string;
  retryable?: boolean;
}>(), {
  title: 'This page is temporarily unavailable',
  message: 'The QR may be awaiting an update. Please try again, or let the business know if the problem continues.',
  reference: '',
  retryable: true,
});

defineEmits<{ retry: [] }>();
</script>

<style scoped>
.public-error {
  align-items: center;
  background: #f5f2ee;
  color: #1a1410;
  display: flex;
  flex-direction: column;
  gap: 28px;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 20px;
  text-align: center;
}

.public-error__brand { display: inline-flex; }
.public-error__card {
  background: #fff;
  border: 1px solid #e8dbce;
  box-shadow: 0 18px 55px rgba(26, 20, 16, 0.1);
  max-width: 520px;
  padding: clamp(28px, 6vw, 52px);
  width: 100%;
}
.public-error__icon {
  align-items: center;
  background: #1a1410;
  border-radius: 50%;
  color: #d3aa70;
  display: inline-flex;
  font-size: 1.5rem;
  height: 58px;
  justify-content: center;
  margin-bottom: 18px;
  width: 58px;
}
.public-error__eyebrow { color: #8c7667; font-size: 0.66rem; font-weight: 800; letter-spacing: 0.18em; margin: 0 0 10px; }
.public-error h1 { font-family: Rufina, Georgia, serif; font-size: clamp(1.65rem, 4vw, 2.3rem); font-weight: 400; margin: 0 0 12px; }
.public-error p:not(.public-error__eyebrow) { color: #665b51; line-height: 1.65; margin: 0 auto 24px; max-width: 420px; }
.public-error__actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
.public-error small { color: #8c7667; display: block; font-size: 0.68rem; margin-top: 20px; word-break: break-all; }
</style>
