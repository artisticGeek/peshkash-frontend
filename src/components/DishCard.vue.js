import { computed } from 'vue';
import { useRouter } from 'vue-router';
const props = defineProps();
const router = useRouter();
// Truncate description to one line (approx 50 chars)
const truncatedDescription = computed(() => {
    if (!props.dish.description)
        return '';
    return props.dish.description.length > 50
        ? props.dish.description.substring(0, 50) + '...'
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
/** @type {__VLS_StyleScopedClasses['dish-card']} */ ;
/** @type {__VLS_StyleScopedClasses['dish-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.navigateToDetail) },
    ...{ class: "card mb-2 shadow-sm dish-card" },
    role: "button",
    tabindex: "0",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card-body d-flex align-items-center py-2 px-3" },
});
if (__VLS_ctx.dish.isVeg !== undefined) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-circle-fill me-2" },
        ...{ class: (__VLS_ctx.dish.isVeg ? 'text-success' : 'text-danger') },
        'aria-label': (__VLS_ctx.dish.isVeg ? 'Vegetarian' : 'Non-vegetarian'),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex-grow-1" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "fw-bold" },
});
(__VLS_ctx.dish.displayName || __VLS_ctx.dish.name);
if (__VLS_ctx.dish.description) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "text-muted d-block text-truncate" },
    });
    (__VLS_ctx.truncatedDescription);
}
for (const [tag] of __VLS_getVForSourceType(((__VLS_ctx.dish.tags || []).slice(0, 2)))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (tag),
        ...{ class: "badge bg-primary me-1" },
    });
    (tag);
}
if (__VLS_ctx.dish.spiceLevel) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "badge bg-light text-danger me-1" },
    });
    for (const [n] of __VLS_getVForSourceType((3))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            key: (n),
            ...{ class: "bi bi-fire" },
            ...{ class: ({ 'opacity-25': n > __VLS_ctx.dish.spiceLevel }) },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "bi bi-chevron-right ms-2 text-muted" },
});
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['dish-card']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['px-3']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-circle-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-grow-1']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-fire']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-25']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-chevron-right']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
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
//# sourceMappingURL=DishCard.vue.js.map