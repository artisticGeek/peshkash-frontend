<template>
  <div 
    class="dish-row" 
    @click="navigateToDetail"
    role="button"
    tabindex="0"
    :style="{ marginLeft: indentation }"
  >
    <!-- Connecting Line (if not root level) -->
    <div v-if="level > 0" class="tree-line"></div>
    
    <!-- Veg/Non-veg Indicator -->
    <div 
      v-if="dish.isVeg !== undefined" 
      class="veg-indicator" 
      :class="dish.isVeg ? 'veg' : 'non-veg'"
      :aria-label="dish.isVeg ? 'Vegetarian' : 'Non-vegetarian'"
    ></div>
    
    <!-- Dish Info -->
    <div class="dish-info">
      <div class="dish-name">{{ dish.displayName || dish.name }}</div>
      <div v-if="dish.description" class="dish-description">
        {{ truncatedDescription }}
      </div>
    </div>

    <!-- Thumbnail (shown when image URL is set) -->
    <img
      v-if="dish.image"
      :src="dish.image"
      :alt="dish.displayName || dish.name"
      class="dish-thumb"
      loading="lazy"
    />

    <!-- Navigate Icon -->
    <i class="bi bi-chevron-right text-muted"></i>
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
  image?: string | null;
}

interface Props {
  dish: Dish;
  level: number;
  eventName: string;
  menuName: string;
}

const props = defineProps<Props>();
const router = useRouter();

// Calculate indentation
const indentation = computed(() => {
  return props.level > 0 ? `${props.level * 24}px` : '0px';
});

// Truncate description to fit in one line
const truncatedDescription = computed(() => {
  if (!props.dish.description) return '';
  return props.dish.description.length > 60
    ? props.dish.description.substring(0, 60) + '...'
    : props.dish.description;
});

const navigateToDetail = () => {
  const itemName = props.dish.name;
  router.push(`/event/${props.eventName}/menu/${props.menuName}/item/${itemName}`);
};
</script>

<style scoped>
.dish-row {
  position: relative;
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 4px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  gap: 10px;
}

.dish-thumb {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid rgba(189, 148, 90, 0.18);
}

.dish-row:hover {
  background-color: rgba(189, 148, 90, 0.05);
  transform: translateX(2px);
  box-shadow: 0 2px 4px rgba(189, 148, 90, 0.15);
}

.dish-row:active {
  transform: translateX(0);
}

.tree-line {
  position: absolute;
  left: -12px;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: rgba(189, 148, 90, 0.3);
}

.tree-line::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 12px;
  height: 1px;
  background-color: rgba(189, 148, 90, 0.3);
}

.veg-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 12px;
  flex-shrink: 0;
}

.veg-indicator.veg {
  background-color: #39681c;
}

.veg-indicator.non-veg {
  background-color: #9b2a46;
}

.dish-info {
  flex-grow: 1;
  min-width: 0;
}

.dish-name {
  font-weight: 600;
  margin-bottom: 2px;
  color: #15191e;
}

.dish-description {
  font-size: 0.875rem;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
