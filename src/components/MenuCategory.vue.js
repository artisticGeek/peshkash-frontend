import { ref, computed } from 'vue';
import DishCard from './DishCard.vue';
const props = withDefaults(defineProps(), {
    level: 0
});
const isExpanded = ref(false);
// Calculate indentation based on nesting level
const indentation = computed(() => {
    return props.level > 0 ? `${props.level * 16}px` : '0px';
});
// Count total items recursively
const totalItemsCount = computed(() => {
    const countItems = (items) => {
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    level: 0
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['category-card']} */ ;
/** @type {__VLS_StyleScopedClasses['category-card']} */ ;
/** @type {__VLS_StyleScopedClasses['nested-content']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "menu-category" },
    ...{ style: ({ marginLeft: __VLS_ctx.indentation }) },
});
if (__VLS_ctx.item.itemType !== 'DISH') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.toggleExpanded) },
        ...{ onKeydown: (__VLS_ctx.toggleExpanded) },
        ...{ onKeydown: (__VLS_ctx.toggleExpanded) },
        ...{ class: "card mb-2 shadow-sm category-card" },
        role: "button",
        tabindex: "0",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body d-flex align-items-center py-2 px-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: (__VLS_ctx.isExpanded ? 'bi-chevron-down' : 'bi-chevron-right') },
        ...{ class: "bi me-2 text-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "fw-bold flex-grow-1" },
    });
    (__VLS_ctx.item.displayName || __VLS_ctx.item.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-primary" },
    });
    (__VLS_ctx.totalItemsCount);
    (__VLS_ctx.totalItemsCount === 1 ? 'item' : 'items');
}
if (__VLS_ctx.isExpanded && __VLS_ctx.item.subCategoryLineItems && __VLS_ctx.item.subCategoryLineItems.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "nested-content" },
    });
    for (const [child] of __VLS_getVForSourceType((__VLS_ctx.item.subCategoryLineItems))) {
        const __VLS_0 = {}.MenuCategory;
        /** @type {[typeof __VLS_components.MenuCategory, ]} */ ;
        // @ts-ignore
        const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
            key: (child.id),
            item: (child),
            level: (__VLS_ctx.level + 1),
            eventName: (__VLS_ctx.eventName),
            menuName: (__VLS_ctx.menuName),
        }));
        const __VLS_2 = __VLS_1({
            key: (child.id),
            item: (child),
            level: (__VLS_ctx.level + 1),
            eventName: (__VLS_ctx.eventName),
            menuName: (__VLS_ctx.menuName),
        }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    }
}
if (__VLS_ctx.item.itemType === 'DISH') {
    /** @type {[typeof DishCard, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(DishCard, new DishCard({
        dish: (__VLS_ctx.item),
        eventName: (__VLS_ctx.eventName),
        menuName: (__VLS_ctx.menuName),
    }));
    const __VLS_5 = __VLS_4({
        dish: (__VLS_ctx.item),
        eventName: (__VLS_ctx.eventName),
        menuName: (__VLS_ctx.menuName),
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
}
/** @type {__VLS_StyleScopedClasses['menu-category']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['category-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-grow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['nested-content']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            DishCard: DishCard,
            isExpanded: isExpanded,
            indentation: indentation,
            totalItemsCount: totalItemsCount,
            toggleExpanded: toggleExpanded,
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
//# sourceMappingURL=MenuCategory.vue.js.map