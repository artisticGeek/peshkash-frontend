<template>
  <div class="menu-category" :style="{ marginLeft: indentation }">
    <!-- Category/Subcategory Header -->
    <div 
      v-if="item.itemType !== 'DISH'" 
      class="card mb-2 shadow-sm category-card" 
      @click="toggleExpanded"
      role="button"
      tabindex="0"
      @keydown.enter="toggleExpanded"
      @keydown.space.prevent="toggleExpanded"
    >
      <div class="card-body d-flex align-items-center py-2 px-3">
        <!-- Chevron Icon -->
        <i 
          :class="isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'" 
          class="bi me-2 text-primary"
        ></i>
        
        <!-- Category Name -->
        <span class="fw-bold flex-grow-1">
          {{ item.displayName || item.name }}
        </span>
        
        <!-- Item Count Badge -->
        <span class="badge bg-primary">
          {{ totalItemsCount }} {{ totalItemsCount === 1 ? 'item' : 'items' }}
        </span>
      </div>
    </div>
    
    <!-- Expanded Content: Nested Children -->
    <div v-if="isExpanded && item.subCategoryLineItems && item.subCategoryLineItems.length > 0" class="nested-content">
      <MenuCategory 
        v-for="child in item.subCategoryLineItems" 
        :key="child.id"
        :item="child"
        :level="level + 1"
        :event-name="eventName"
        :menu-name="menuName"
      />
    </div>
    
    <!-- If it's a DISH, render DishCard instead -->
    <DishCard 
      v-if="item.itemType === 'DISH'" 
      :dish="item" 
      :event-name="eventName"
      :menu-name="menuName"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import DishCard from './DishCard.vue';

interface LineItem {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
  itemType: string;
  isActive: boolean;
  createdAt: string;
  subCategoryLineItems?: LineItem[];
  isVeg?: boolean;
  tags?: string[];
  spiceLevel?: number;
}

interface Props {
  item: LineItem;
  level?: number;
  eventName: string;
  menuName: string;
}

const props = withDefaults(defineProps<Props>(), {
  level: 0
});

const isExpanded = ref(false);

// Calculate indentation based on nesting level
const indentation = computed(() => {
  return props.level > 0 ? `${props.level * 16}px` : '0px';
});

// Count total items recursively
const totalItemsCount = computed(() => {
  const countItems = (items: LineItem[]): number => {
    let count = 0;
    for (const item of items) {
      if (item.itemType === 'DISH') {
        count++;
      }
      if (item.subCategoryLineItems && item.subCategoryLineItems.length > 0) {
        count += countItems(item.subCategoryLineItems);
      }
    }
    return count;
  };
  
  if (props.item.subCategoryLineItems) {
    return countItems(props.item.subCategoryLineItems);
  }
  return 0;
});

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};
</script>

<style scoped>
.menu-category {
  transition: margin 0.2s ease;
}

.category-card {
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: white;
  border-left: 3px solid transparent;
}

.category-card:hover {
  border-left-color: #BD945A;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
}

.category-card:active {
  transform: scale(0.98);
}

.nested-content {
  position: relative;
}

/* Add a subtle connecting line for nested items */
.nested-content::before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  width: 2px;
  background-color: rgba(189, 148, 90, 0.2);
}
</style>
