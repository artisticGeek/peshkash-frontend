<template>
  <ul class="pl-4">
    <li v-for="item in items" :key="item.name">
      <div class="py-1 font-medium text-base" v-if="item.itemType === 'category'">
        📁 {{ item.name }}
      </div>
      <div class="py-1" v-else-if="item.itemType === 'dish'">
        🍽️ {{ item.name }}
      </div>

      <!-- Recursively render children if they exist -->
      <LineItemTree
        v-if="item.subCategoryLineItems && item.subCategoryLineItems.length > 0"
        :items="item.subCategoryLineItems"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { LineItem } from '@/types';

defineProps<{
  items: LineItem[];
}>();
</script>
