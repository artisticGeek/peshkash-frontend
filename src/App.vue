<template>

        <router-view />
        <PwaLifecyclePrompt />

</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useInspectGuard } from './composables/useInspectGuard';
import PwaLifecyclePrompt from './components/pwa/PwaLifecyclePrompt.vue';

useInspectGuard(useRouter());
</script>
