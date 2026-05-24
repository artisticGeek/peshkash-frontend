import { computed } from 'vue';
import { useRouter } from 'vue-router';
const props = defineProps();
const router = useRouter();
// Calculate indentation
const indentation = computed(() => {
    return props.level > 0 ? `${props.level * 24}px` : '0px';
});
// Truncate description to fit in one line
const truncatedDescription = computed(() => {
    if (!props.dish.description)
        return '';
    return props.dish.description.length > 60
        ? props.dish.description.substring(0, 60) + '...'
        : props.dish.description;
});
const navigateToDetail = () => {
    const itemName = props.dish.name;
    router.push(`/event/${props.eventName}/menu/${props.menuName}/item/${itemName}`);
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['dish-row']} */ ;
/** @type {__VLS_StyleScopedClasses['dish-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-line']} */ ;
/** @type {__VLS_StyleScopedClasses['veg-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['veg-indicator']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.navigateToDetail) },
    ...{ class: "dish-row" },
    role: "button",
    tabindex: "0",
    ...{ style: ({ marginLeft: __VLS_ctx.indentation }) },
});
if (__VLS_ctx.level > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tree-line" },
    });
}
if (__VLS_ctx.dish.isVeg !== undefined) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "veg-indicator" },
        ...{ class: (__VLS_ctx.dish.isVeg ? 'veg' : 'non-veg') },
        'aria-label': (__VLS_ctx.dish.isVeg ? 'Vegetarian' : 'Non-vegetarian'),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dish-info" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "dish-name" },
});
(__VLS_ctx.dish.displayName || __VLS_ctx.dish.name);
if (__VLS_ctx.dish.description) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "dish-description" },
    });
    (__VLS_ctx.truncatedDescription);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "bi bi-chevron-right text-muted" },
});
/** @type {__VLS_StyleScopedClasses['dish-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-line']} */ ;
/** @type {__VLS_StyleScopedClasses['veg-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['dish-info']} */ ;
/** @type {__VLS_StyleScopedClasses['dish-name']} */ ;
/** @type {__VLS_StyleScopedClasses['dish-description']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-chevron-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            indentation: indentation,
            truncatedDescription: truncatedDescription,
            navigateToDetail: navigateToDetail,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=DishRow.vue.js.map