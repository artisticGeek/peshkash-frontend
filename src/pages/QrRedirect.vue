<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-if="error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';
import { gtagEvent } from '../utils/ga';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref(false);
const errorMessage = ref('');

async function resolveQr(qrHash: string) {
  loading.value = true;
  error.value = false;
  errorMessage.value = '';

  try {
    // Add timestamp to bust any HTTP/CDN caching so every scan reaches the server
    // (the server records a QR scan event on each request).
    const apiResponse = await fetch(
      `${API_BASE_URL}/details/${qrHash}?t=${Date.now()}`,
      { cache: 'no-store' },
    );

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      const redirectUrl = data.redirectionUrl;

      if (redirectUrl) {
        gtagEvent('qr_scan', { qr_hash: qrHash });
        router.push(redirectUrl.startsWith('/') ? redirectUrl : `/${redirectUrl}`);
      } else {
        errorMessage.value = 'API response missing redirectionUrl.';
        error.value = true;
        loading.value = false;
      }
    } else {
      errorMessage.value = `API responded with status: ${apiResponse.status}`;
      error.value = true;
      loading.value = false;
    }
  } catch (err: any) {
    errorMessage.value = `Error fetching redirect URL: ${err.message}`;
    error.value = true;
    loading.value = false;
  }
}

onMounted(() => {
  const qrHash = route.params.qrHash as string;
  if (!qrHash) {
    errorMessage.value = 'QR hash not found in route.';
    error.value = true;
    loading.value = false;
    return;
  }
  resolveQr(qrHash);
});

// Handle same-component re-use: if Vue Router reuses this instance
// (e.g. navigating from one /:qrHash to another), re-fire the scan.
watch(
  () => route.params.qrHash,
  (newHash, oldHash) => {
    if (newHash && newHash !== oldHash) resolveQr(newHash as string);
  },
);
</script>
