<template>
  <div 
    class="card mb-2 shadow-sm dish-card" 
    @click="navigateToDetail"
    role="button"
    tabindex="0"
  >
    <div class="card-body d-flex align-items-center py-2 px-3">
      <!-- Veg/Non-veg Indicator -->
      <i 
        v-if="dish.isVeg !== undefined" 
        class="bi bi-circle-fill me-2" 
        :class="dish.isVeg ? 'text-success' : 'text-danger'"
        :aria-label="dish.isVeg ? 'Vegetarian' : 'Non-vegetarian'"
      ></i>
      
      <!-- Dish Name and Description -->
      <div class="flex-grow-1">
        <div class="fw-bold">{{ dish.displayName || dish.name }}</div>
        <small v-if="dish.description" class="text-muted d-block text-truncate">
          {{ truncatedDescription }}
        </small>
      </div>
      
      <!-- Tags/Badges -->
      <span 
        v-for="tag in (dish.tags || []).slice(0, 2)" 
        :key="tag" 
        class="badge bg-primary me-1"
      >
        {{ tag }}
      </span>
      
      <!-- Spice Level Indicator -->
      <span v-if="dish.spiceLevel" class="badge bg-light text-danger me-1">
        <i 
          v-for="n in 3" 
          :key="n" 
          class="bi bi-fire" 
          :class="{'opacity-25': n > dish.spiceLevel}"
        ></i>
      </span>
      
      <!-- Chevron Icon -->
      <i class="bi bi-chevron-right ms-2 text-muted"></i>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

interface Dish {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
  itemType: string;
  isVeg?: boolean;
  tags?: string[];
  spiceLevel?: number;
}

interface Props {
  dish: Dish;
  eventName: string;
  menuName: string;
}

const props = defineProps<Props>();
const router = useRouter();

// Truncate description to one line (approx 50 chars)
const truncatedDescription = computed(() => {
  if (!props.dish.description) return '';
  return props.dish.description.length > 50 
    ? props.dish.description.substring(0, 50) + '...' 
    : props.dish.description;
});

const navigateToDetail = () => {
  const itemName = props.dish.name;
  router.push(`/event/${props.eventName}/menu/${props.menuName}/item/${itemName}`);
};
</script>

<style scoped>
.dish-card {
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: white;
}

.dish-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.dish-card:active {
  transform: translateY(0);
}

.text-truncate {
  max-width: 250px;
}
</style>
