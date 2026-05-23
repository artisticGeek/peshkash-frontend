import { ref, computed } from 'vue';
const props = withDefaults(defineProps(), {
    level: 0,
    searchQuery: '',
    selectedFilter: 'All'
});
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
    if (props.level === 0)
        return '0px';
    // Mobile: 8px per level, Desktop: 18px per level
    return `calc(${props.level} * var(--indent-size, 8px))`;
});
// Truncate description to one line
const truncatedDescription = computed(() => {
    if (!props.item.description)
        return '';
    const maxLength = 70;
    return props.item.description.length > maxLength
        ? props.item.description.substring(0, maxLength) + '...'
        : props.item.description;
});
// Check if description is actually truncated
const isDescriptionTruncated = computed(() => {
    if (!props.item.description)
        return false;
    return props.item.description.length > 70;
});
// Count only leaf nodes (menu items) that match current filters
const leafItemCount = computed(() => {
    const countLeafItems = (items) => {
        let count = 0;
        for (const item of items) {
            if (item.subCategoryLineItems && item.subCategoryLineItems.length > 0) {
                // Category: recursively count its children
                count += countLeafItems(item.subCategoryLineItems);
            }
            else {
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
    if (!hasChildren.value)
        return 0;
    return countLeafItems(props.item.subCategoryLineItems || []);
});
const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value;
};
const toggleDescription = () => {
    descriptionExpanded.value = !descriptionExpanded.value;
};
// Helper functions for enum type indicators
const getEnumSymbol = (enumType) => {
    return '●'; // Simple filled circle for all types - professional look
};
const getEnumIcon = (enumType) => {
    const type = enumType.toLowerCase();
    if (type === 'veg')
        return 'bi bi-circle-fill';
    if (type === 'non-veg')
        return 'bi bi-circle-fill';
    if (type === 'egg')
        return 'bi bi-egg-fill';
    return 'bi bi-circle-fill'; // default
};
const getEnumClass = (enumType) => {
    const type = enumType.toLowerCase();
    if (type === 'veg')
        return 'enum-veg';
    if (type === 'non-veg')
        return 'enum-non-veg';
    if (type === 'egg')
        return 'enum-egg';
    return 'enum-default';
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    level: 0,
    searchQuery: '',
    selectedFilter: 'All'
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-category']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-category']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-category']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['category-name']} */ ;
/** @type {__VLS_StyleScopedClasses['category-name']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-description']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-description']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-description']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-description']} */ ;
/** @type {__VLS_StyleScopedClasses['expanded']} */ ;
/** @type {__VLS_StyleScopedClasses['read-more-link']} */ ;
/** @type {__VLS_StyleScopedClasses['read-more-link']} */ ;
/** @type {__VLS_StyleScopedClasses['read-more-link']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-line']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-line']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-line']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator-square']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator-square']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-veg']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator-square']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-non-veg']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator-square']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-egg']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator-square']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator-square']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-icon']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tree-node" },
    ...{ style: ({ marginLeft: __VLS_ctx.indentation }) },
});
if (__VLS_ctx.hasChildren) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.toggleExpanded) },
        ...{ onKeydown: (__VLS_ctx.toggleExpanded) },
        ...{ onKeydown: (__VLS_ctx.toggleExpanded) },
        ...{ class: "tree-category" },
        role: "button",
        tabindex: "0",
    });
    if (__VLS_ctx.level > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tree-line" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: (__VLS_ctx.isExpanded ? 'bi-chevron-down' : 'bi-chevron-right') },
        ...{ class: "bi tree-chevron" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "category-name" },
    });
    (__VLS_ctx.item.displayName || __VLS_ctx.item.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-primary ms-auto" },
    });
    (__VLS_ctx.leafItemCount);
    if (__VLS_ctx.isExpanded) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tree-children" },
        });
        for (const [child] of __VLS_getVForSourceType((__VLS_ctx.item.subCategoryLineItems))) {
            const __VLS_0 = {}.MenuTree;
            /** @type {[typeof __VLS_components.MenuTree, ]} */ ;
            // @ts-ignore
            const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
                key: (child.id),
                item: (child),
                level: (__VLS_ctx.level + 1),
                eventName: (__VLS_ctx.eventName),
                menuName: (__VLS_ctx.menuName),
                searchQuery: (__VLS_ctx.searchQuery),
                selectedFilter: (__VLS_ctx.selectedFilter),
            }));
            const __VLS_2 = __VLS_1({
                key: (child.id),
                item: (child),
                level: (__VLS_ctx.level + 1),
                eventName: (__VLS_ctx.eventName),
                menuName: (__VLS_ctx.menuName),
                searchQuery: (__VLS_ctx.searchQuery),
                selectedFilter: (__VLS_ctx.selectedFilter),
            }, ...__VLS_functionalComponentArgsRest(__VLS_1));
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "menu-item" },
        ...{ class: ({ 'has-description': __VLS_ctx.item.description && __VLS_ctx.isDescriptionTruncated }) },
    });
    __VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.matchesFilters) }, null, null);
    if (__VLS_ctx.level > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tree-line" },
        });
    }
    if (__VLS_ctx.item.enumType) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "enum-indicator-square" },
            ...{ class: (__VLS_ctx.getEnumClass(__VLS_ctx.item.enumType)) },
            title: (__VLS_ctx.item.enumType),
        });
        if (__VLS_ctx.item.enumType.toLowerCase() === 'veg') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                ...{ class: "enum-icon" },
                viewBox: "0 0 24 24",
                fill: "currentColor",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
                d: "M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66 .95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z",
            });
        }
        else if (__VLS_ctx.item.enumType.toLowerCase() === 'egg') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                ...{ class: "enum-icon" },
                viewBox: "0 0 24 24",
                fill: "currentColor",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
                d: "M12 2C8.5 2 6 6.5 6 12c0 4.97 2.69 9 6 9s6-4.03 6-9c0-5.5-2.5-10-6-10z",
            });
        }
        else if (__VLS_ctx.item.enumType.toLowerCase() === 'non-veg') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                ...{ class: "enum-icon" },
                viewBox: "0 0 24 24",
                fill: "currentColor",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
                cx: "12",
                cy: "12",
                r: "8",
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "menu-item-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "menu-item-name" },
    });
    (__VLS_ctx.item.displayName || __VLS_ctx.item.name);
    if (__VLS_ctx.item.description) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "menu-item-description" },
            ...{ class: ({ expanded: __VLS_ctx.descriptionExpanded }) },
        });
        (__VLS_ctx.descriptionExpanded ? __VLS_ctx.item.description : __VLS_ctx.truncatedDescription);
    }
    if (__VLS_ctx.item.description && __VLS_ctx.isDescriptionTruncated) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ onClick: (__VLS_ctx.toggleDescription) },
            ...{ class: "read-more-link" },
        });
        (__VLS_ctx.descriptionExpanded ? 'Read less' : 'Read more');
    }
}
/** @type {__VLS_StyleScopedClasses['tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-category']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-line']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['category-name']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['has-description']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-line']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-indicator-square']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['enum-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-content']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-description']} */ ;
/** @type {__VLS_StyleScopedClasses['expanded']} */ ;
/** @type {__VLS_StyleScopedClasses['read-more-link']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            isExpanded: isExpanded,
            descriptionExpanded: descriptionExpanded,
            hasChildren: hasChildren,
            matchesFilters: matchesFilters,
            indentation: indentation,
            truncatedDescription: truncatedDescription,
            isDescriptionTruncated: isDescriptionTruncated,
            leafItemCount: leafItemCount,
            toggleExpanded: toggleExpanded,
            toggleDescription: toggleDescription,
            getEnumClass: getEnumClass,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=MenuTree.vue.js.map