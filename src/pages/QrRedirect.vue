<template>
  <div class="qr-redirect-shell">
    <div v-if="loading" class="pk-page-loader pk-page-loader--fullscreen">
      <peshkash-loader size="120" theme="dark" label="Resolving QR" />
    </div>
    <PublicErrorState
      v-if="error"
      title="This QR is not available right now"
      :reference="currentHash"
      @retry="resolveQr(currentHash)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';
import { gtagEvent } from '../utils/ga';
import PublicErrorState from '../components/PublicErrorState.vue';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref(false);
const currentHash = ref('');

async function resolveQr(qrHash: string) {
  loading.value = true;
  error.value = false;
  currentHash.value = qrHash;

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
        console.error('[QR] Redirect response did not include a destination.');
        error.value = true;
        loading.value = false;
      }
    } else {
      console.error(`[QR] Redirect lookup failed with status ${apiResponse.status}.`);
      error.value = true;
      loading.value = false;
    }
  } catch (err: any) {
    console.error('[QR] Redirect lookup failed.', err);
    error.value = true;
    loading.value = false;
  }
}

onMounted(() => {
  const qrHash = route.params.qrHash as string;
  if (!qrHash) {
    currentHash.value = '';
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
