<template>

        <router-view />

</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router';
import { useInspectGuard } from './composables/useInspectGuard';

useInspectGuard(useRouter());
</script>
