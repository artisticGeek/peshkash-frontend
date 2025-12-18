<template>
  <div class="tree-node" :style="{ marginLeft: indentation }">
    <!-- Category Node (has children) -->
    <div 
      v-if="hasChildren" 
      class="tree-category" 
      @click="toggleExpanded"
      role="button"
      tabindex="0"
      @keydown.enter="toggleExpanded"
      @keydown.space.prevent="toggleExpanded"
    >
      <!-- Connecting Line (if not root level) -->
      <div v-if="level > 0" class="tree-line"></div>
      
      <!-- Chevron Icon -->
      <i 
        :class="isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'" 
        class="bi tree-chevron"
      ></i>
      
      <!-- Category Name (Gold/Brown color) -->
      <span class="category-name">
        {{ item.displayName || item.name }}
      </span>
      
      <!-- Item Count Badge (only count leaf nodes) -->
      <span class="badge bg-primary ms-auto">
        {{ leafItemCount }}
      </span>
    </div>
    
    <!-- Recursive Children (when expanded) -->
    <div v-if="isExpanded && hasChildren" class="tree-children">
      <MenuTree 
        v-for="child in item.subCategoryLineItems" 
        :key="child.id"
        :item="child"
        :level="level + 1"
        :event-name="eventName"
        :menu-name="menuName"
      />
    </div>
    
    <!-- Menu Item (Leaf Node - no children) -->
    <div 
      v-if="!hasChildren"
      class="menu-item"
      @click="toggleDescription"
      role="button"
      tabindex="0"
    >
      <!-- Connecting Line -->
      <div v-if="level > 0" class="tree-line"></div>
      
      <!-- Veg/Non-veg Indicator -->
      <div 
        v-if="item.isVeg !== undefined" 
        class="veg-indicator" 
        :class="item.isVeg ? 'veg' : 'non-veg'"
        :aria-label="item.isVeg ? 'Vegetarian' : 'Non-vegetarian'"
      ></div>
      
      <!-- Item Content -->
      <div class="menu-item-content">
        <!-- Dish Name (Black color) -->
        <div class="menu-item-name">{{ item.displayName || item.name }}</div>
        <div 
          v-if="item.description" 
          class="menu-item-description" 
          :class="{ expanded: descriptionExpanded }"
        >
          {{ descriptionExpanded ? item.description : truncatedDescription }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

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
const descriptionExpanded = ref(false);

// Check if item has children (is a category)
const hasChildren = computed(() => {
  return props.item.subCategoryLineItems && props.item.subCategoryLineItems.length > 0;
});

// Calculate indentation - even more reduced for mobile (8px), normal for desktop (18px)
const indentation = computed(() => {
  if (props.level === 0) return '0px';
  // Mobile: 8px per level, Desktop: 18px per level
  return `calc(${props.level} * var(--indent-size, 8px))`;
});

// Truncate description to one line
const truncatedDescription = computed(() => {
  if (!props.item.description) return '';
  const maxLength = 70;
  return props.item.description.length > maxLength
    ? props.item.description.substring(0, maxLength) + '...'
    : props.item.description;
});

// Count only leaf nodes (menu items) recursively
const leafItemCount = computed(() => {
  const countLeafItems = (items: LineItem[]): number => {
    let count = 0;
    for (const item of items) {
      if (!item.subCategoryLineItems || item.subCategoryLineItems.length === 0) {
        count++;
      } else {
        count += countLeafItems(item.subCategoryLineItems);
      }
    }
    return count;
  };
  
  if (hasChildren.value) {
    return countLeafItems(props.item.subCategoryLineItems!);
  }
  return 0;
});

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const toggleDescription = () => {
  descriptionExpanded.value = !descriptionExpanded.value;
};
</script>

<style scoped>
/* Mobile-first: 8px indent (reduced from 12px) */
:root {
  --indent-size: 8px;
}

/* Desktop: 18px indent */
@media (min-width: 768px) {
  :root {
    --indent-size: 18px;
  }
}

.tree-node {
  position: relative;
  transition: all 0.2s ease;
}

/* Category Styles */
.tree-category {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  margin-bottom: 5px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

@media (min-width: 768px) {
  .tree-category {
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 6px;
    border-radius: 8px;
  }
}

.tree-category:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 6px rgba(189, 148, 90, 0.2);
}

.tree-chevron {
  color: #bd945a;
  font-size: 0.8rem;
  transition: transform 0.2s;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .tree-chevron {
    font-size: 0.875rem;
  }
}

/* Category name in gold/brown color for distinction */
.category-name {
  font-weight: 500;
  flex-grow: 1;
  color: #a37d45;
  font-size: 0.875rem;
  line-height: 1.3;
}

@media (min-width: 768px) {
  .category-name {
    color: #8b6d3c;
    font-size: 0.975rem;
  }
}

/* Menu Item Styles (Leaf Node) */
.menu-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 11px 12px;
  margin-bottom: 5px;
  background: white;
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  border-left: 2px solid rgba(189, 148, 90, 0.4);
  cursor: pointer;
}

@media (min-width: 768px) {
  .menu-item {
    gap: 12px;
    padding: 14px 16px;
    margin-bottom: 6px;
    border-radius: 8px;
    border-left-width: 3px;
  }
}

.menu-item:hover {
  box-shadow: 0 2px 4px rgba(189, 148, 90, 0.15);
  background-color: rgba(189, 148, 90, 0.02);
}

.veg-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .veg-indicator {
    width: 10px;
    height: 10px;
    margin-top: 5px;
  }
}

.veg-indicator.veg {
  background-color: #39681c;
}

.veg-indicator.non-veg {
  background-color: #9b2a46;
}

.menu-item-content {
  flex-grow: 1;
  min-width: 0;
}

/* Dish name in dark black for distinction from categories */
.menu-item-name {
  font-weight: 600;
  color: #15191e;
  margin-bottom: 3px;
  font-size: 0.85rem;
  line-height: 1.3;
}

@media (min-width: 768px) {
  .menu-item-name {
    font-size: 0.95rem;
    margin-bottom: 4px;
    line-height: 1.4;
  }
}

.menu-item-description {
  font-size: 0.775rem;
  color: #6c757d;
  line-height: 1.4;
  transition: all 0.2s ease;
  margin-top: 2px;
}

@media (min-width: 768px) {
  .menu-item-description {
    font-size: 0.875rem;
    line-height: 1.5;
    margin-top: 4px;
  }
}

.menu-item-description:not(.expanded) {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-item-description.expanded {
  white-space: normal;
}

/* Tree Lines - Very subtle on mobile */
.tree-line {
  position: absolute;
  left: -6px;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: rgba(189, 148, 90, 0.12);
}

@media (min-width: 768px) {
  .tree-line {
    left: -9px;
    background-color: rgba(189, 148, 90, 0.25);
  }
}

.tree-line::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 6px;
  height: 1px;
  background-color: rgba(189, 148, 90, 0.12);
}

@media (min-width: 768px) {
  .tree-line::before {
    width: 9px;
    background-color: rgba(189, 148, 90, 0.25);
  }
}

.tree-children {
  position: relative;
  margin-top: 2px;
}

@media (min-width: 768px) {
  .tree-children {
    margin-top: 4px;
  }
}

/* Badge Styling - Smaller on mobile */
.badge {
  font-size: 0.65rem;
  padding: 2px 6px;
  font-weight: 500;
}

@media (min-width: 768px) {
  .badge {
    font-size: 0.75rem;
    padding: 4px 10px;
  }
}
</style>
