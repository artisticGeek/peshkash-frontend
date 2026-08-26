<template>
  <nav class="pk-public-nav">
    <a href="https://peshkash.app" target="_blank" rel="noopener" class="pk-nav-brand">
      <PeshkashLogo variant="dark-bg" :height="36" />
    </a>
    <a href="https://peshkash.app/#contact" target="_blank" rel="noopener" class="pk-nav-cta">
      <i class="bi bi-qr-code-scan"></i>
      Get your QR
    </a>
  </nav>
</template>

<script setup lang="ts">
import PeshkashLogo from '@/components/PeshkashLogo.vue'
</script>

<style scoped>
.pk-public-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.25rem;
  background: rgba(26, 20, 16, 0.97);
  box-shadow: 0 1px 0 rgba(189, 148, 90, 0.18);
  position: sticky;
  top: 0;
  z-index: 1030;
}

.pk-nav-brand {
  display: flex;
  align-items: center;
  opacity: 0.9;
  transition: opacity 0.2s;
}
.pk-nav-brand:hover { opacity: 1; }

.pk-nav-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #BD945A;
  text-decoration: none;
  padding: 0.38rem 0.9rem;
  border: 1px solid rgba(189, 148, 90, 0.4);
  border-radius: 100px;
  transition: all 0.2s;
  letter-spacing: 0.02em;
}
.pk-nav-cta:hover {
  background: rgba(189, 148, 90, 0.12);
  border-color: #BD945A;
  color: #D4AC72;
}
.pk-nav-cta .bi { font-size: 0.85rem; }
</style>
