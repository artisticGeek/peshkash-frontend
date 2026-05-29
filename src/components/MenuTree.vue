<template>
  <div class="tree-node" :style="{ marginLeft: indentation }">
    <!-- Category Node (has children) -->
    <template v-if="hasChildren">
      <div 
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

        <!-- Studio add button -->
        <button
          v-if="editMode"
          class="canvas-add-btn"
          type="button"
          title="Add item or subcategory here"
          @click.stop="onAddChild?.(item.id)"
        >
          <i class="bi bi-plus"></i>
        </button>
      </div>
      
      <!-- Recursive Children (when expanded) -->
      <div v-if="isExpanded" class="tree-children">
        <MenuTree
          v-for="child in item.subCategoryLineItems"
          :key="child.id"
          :item="child"
          :level="level + 1"
          :event-name="eventName"
          :menu-name="menuName"
          :search-query="searchQuery"
          :selected-filter="selectedFilter"
          :edit-mode="editMode"
          :on-add-child="onAddChild"
          :analytics-vendor-id="analyticsVendorId"
          :analytics-event-id="analyticsEventId"
          :analytics-menu-id="analyticsMenuId"
        />
      </div>
    </template>
    
    <!-- Leaf Item View (individual menu item) -->
    <template v-else>
      <div 
        v-show="matchesFilters"
        class="menu-item"
        :class="{ 'has-description': item.description && isDescriptionTruncated }"
      >
        <!-- Connecting Line -->
        <div v-if="level > 0" class="tree-line"></div>
        
        <!-- Enum Type Indicator (Veg/Non-Veg/Egg) - Indian Style with SVG Icons -->
        <div 
          v-if="item.enumType" 
          class="enum-indicator-square" 
          :class="getEnumClass(item.enumType)"
          :title="item.enumType"
        >
          <!-- SVG Icons for each type -->
          <svg v-if="item.enumType.toLowerCase() === 'veg'" class="enum-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66 .95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
          </svg>
          <svg v-else-if="item.enumType.toLowerCase() === 'egg'" class="enum-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.5 2 6 6.5 6 12c0 4.97 2.69 9 6 9s6-4.03 6-9c0-5.5-2.5-10-6-10z"/>
          </svg>
          <svg v-else-if="item.enumType.toLowerCase() === 'non-veg'" class="enum-icon" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="8"/>
          </svg>
        </div>
        
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
          <span
            v-if="item.description && isDescriptionTruncated"
            class="read-more-link"
            @click="toggleDescription"
          >
            {{ descriptionExpanded ? 'Read less' : 'Read more' }}
          </span>
        </div>

        <!-- Studio add-child button on leaf items -->
        <button
          v-if="editMode"
          class="canvas-add-btn"
          type="button"
          title="Add item under this"
          @click.stop="onAddChild?.(item.id)"
        >
          <i class="bi bi-plus"></i>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAnalytics } from '../composables/useAnalytics';

interface LineItem {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
  itemType: string;
  isActive: boolean;
  createdAt: string;
  enumType?: string;
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
  searchQuery?: string;
  selectedFilter?: string;
  editMode?: boolean;
  onAddChild?: (parentId: number) => void;
  analyticsVendorId?: number;
  analyticsEventId?: number;
  analyticsMenuId?: number;
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  searchQuery: '',
  selectedFilter: 'All',
  editMode: false,
});

const { track } = useAnalytics();

const isExpanded = ref(false);
const descriptionExpanded = ref(false);

// Check if item has children (is a category)
const hasChildren = computed(() => {
  return props.item.subCategoryLineItems && props.item.subCategoryLineItems.length > 0;
});

// Check if this item matches current filters
const matchesFilters = computed(() => {
  // Apply search filter
  let matchesSearch = true;
  if (props.searchQuery?.trim()) {
    const query = props.searchQuery.toLowerCase();
    matchesSearch = (props.item.name || '').toLowerCase().includes(query) ||
                   (props.item.displayName || '').toLowerCase().includes(query) ||
                   (props.item.description || '').toLowerCase().includes(query);
  }
  
  // Leaf items: also check enum filter
  if (!hasChildren.value) {
    const matchesEnum = props.selectedFilter === 'All' || props.item.enumType === props.selectedFilter;
    return matchesSearch && matchesEnum;
  }
  
  // Categories: just need to pass search filter (children will handle their own filtering)
  return true; // Categories are always shown, children determine visibility
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

// Check if description is actually truncated
const isDescriptionTruncated = computed(() => {
  if (!props.item.description) return false;
  return props.item.description.length > 70;
});

// Count only leaf nodes (menu items) that match current filters
const leafItemCount = computed(() => {
  const countLeafItems = (items: LineItem[]): number => {
    let count = 0;
    for (const item of items) {
      if (item.subCategoryLineItems && item.subCategoryLineItems.length > 0) {
        // Category: recursively count its children
        count += countLeafItems(item.subCategoryLineItems);
      } else {
        // Leaf item: check if it matches filters
        let matchesSearch = true;
        if (props.searchQuery?.trim()) {
          const query = props.searchQuery.toLowerCase();
          matchesSearch = (item.name || '').toLowerCase().includes(query) ||
                         (item.displayName || '').toLowerCase().includes(query) ||
                         (item.description || '').toLowerCase().includes(query);
        }
        
        const matchesEnum = props.selectedFilter === 'All' || item.enumType === props.selectedFilter;
        
        // Only count if matches both filters
        if (matchesSearch && matchesEnum) {
          count++;
        }
      }
    }
    return count;
  };
  
  if (!hasChildren.value) return 0;
  return countLeafItems(props.item.subCategoryLineItems || []);
});

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
};

const toggleDescription = () => {
  if (!descriptionExpanded.value && !props.editMode) {
    track('item_expand', {
      itemId: props.item.id,
      vendorId: props.analyticsVendorId,
      eventId: props.analyticsEventId,
      menuId: props.analyticsMenuId,
    });
  }
  descriptionExpanded.value = !descriptionExpanded.value;
};

// Helper functions for enum type indicators
const getEnumSymbol = (enumType: string): string => {
  return '●'; // Simple filled circle for all types - professional look
};

const getEnumIcon = (enumType: string): string => {
  const type = enumType.toLowerCase();
  if (type === 'veg') return 'bi bi-circle-fill';
  if (type === 'non-veg') return 'bi bi-circle-fill';
  if (type === 'egg') return 'bi bi-egg-fill';
  return 'bi bi-circle-fill'; // default
};

const getEnumClass = (enumType: string): string => {
  const type = enumType.toLowerCase();
  if (type === 'veg') return 'enum-veg';
  if (type === 'non-veg') return 'enum-non-veg';
  if (type === 'egg') return 'enum-egg';
  return 'enum-default';
};
</script>

<style scoped>
/* Force default fonts - prevent navbar font inheritance */
.tree-node,
.tree-category,
.category-name,
.menu-item,
.menu-item-name,
.menu-item-description,
.read-more-link {
  font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
}

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

/* Enum Type Indicator Styles */
.enum-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 4px;
  margin-right: 10px;
}

.enum-indicator i {
  font-size: 10px;
}

@media (min-width: 768px) {
  .enum-indicator {
    margin-right: 12px;
  }
  
  .enum-indicator i {
    font-size: 12px;
  }
}

/* Veg - Green */
.enum-indicator.enum-veg i {
  color: #22c55e;
}

/* Non-Veg - Red */
.enum-indicator.enum-non-veg i {
  color: #ef4444;
}

/* Egg - Yellow/Orange */
.enum-indicator.enum-egg i {
  color: #f59e0b;
}

/* Default */
.enum-indicator.enum-default i {
  color: #9ca3af;
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
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-item-description.expanded {
  white-space: normal;
}

.read-more-link {
  color: #bd945a;
  font-size: 0.8rem;
  font-style: normal;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: block;
  margin-top: 4px;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .read-more-link {
    font-size: 0.9rem;
    margin-top: 6px;
  }
}

.read-more-link:hover {
  text-decoration: underline;
  opacity: 0.8;
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

/* Squared Dietary Indicators - Indian Style */
.enum-indicator-square {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  border: 1.5px solid;
  flex-shrink: 0;
  background-color: white;
}

.enum-indicator-square .enum-icon {
  width: 11px;
  height: 11px;
}

.enum-indicator-square.enum-veg {
  border-color: #6b9d6f;
  color: #6b9d6f;
}

.enum-indicator-square.enum-non-veg {
  border-color: #b07c7c;
  color: #b07c7c;
}

.enum-indicator-square.enum-egg {
  border-color: #d4a574;
  color: #d4a574;
}

@media (min-width: 768px) {
  .enum-indicator-square {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border-width: 2px;
  }
  
  .enum-indicator-square .enum-icon {
    width: 13px;
    height: 13px;
  }
}

/* Studio edit-mode add button */
.canvas-add-btn {
  background: transparent;
  border: 1.5px solid #bd945a;
  border-radius: 4px;
  color: #bd945a;
  cursor: pointer;
  font-size: 0.75rem;
  height: 22px;
  line-height: 1;
  opacity: 0;
  padding: 0 5px;
  flex-shrink: 0;
  transition: opacity 0.15s, background 0.15s, color 0.15s;
}

.tree-category:hover .canvas-add-btn,
.menu-item:hover .canvas-add-btn {
  opacity: 1;
}

.canvas-add-btn:hover {
  background: #bd945a;
  color: #fff;
}
</style>
