<template>
  <div>
    <p v-if="loading">Loading...</p>
    <p v-if="error">{{ errorMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  const qrHash = route.params.qrHash as string;
  if (!qrHash) {
    errorMessage.value = 'QR hash not found in route.';
    error.value = true;
    loading.value = false;
    return;
  }

  try {
    // Replace <backend-domain> with your actual backend domain
    const apiResponse = await fetch(`https://peshkash-backend.onrender.com/api/details/${qrHash}`);

    if (apiResponse.ok) {
      const data = await apiResponse.json();
      const redirectUrl = data.redirectionUrl;

      if (redirectUrl) {
        router.push(redirectUrl);
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
});
</script>