import { computed, ref } from 'vue';
const props = defineProps();
const emit = defineEmits();
const vendorUrl = computed(() => props.selectedVendor ? `${window.location.origin}/vendor/${props.selectedVendor.name}` : '');
const open = ref(false);
function selectVendor(id) {
    emit('update:modelValue', id);
    open.value = false;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['workspace-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['card-link']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onKeydown: (...[$event]) => {
            __VLS_ctx.open = false;
        } },
    ...{ class: "workspace-switcher" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.open = !__VLS_ctx.open;
        } },
    ...{ class: "workspace-trigger" },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.selectedVendor?.displayName || 'Select vendor');
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "bi bi-chevron-down" },
});
if (__VLS_ctx.open) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "workspace-menu" },
    });
    for (const [vendor] of __VLS_getVForSourceType((__VLS_ctx.vendors))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.open))
                        return;
                    __VLS_ctx.selectVendor(vendor.id);
                } },
            key: (vendor.id),
            type: "button",
            ...{ class: ({ active: vendor.id === __VLS_ctx.modelValue }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (vendor.displayName);
        if (vendor.id === __VLS_ctx.modelValue) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "bi bi-check2" },
            });
        }
    }
}
if (__VLS_ctx.selectedVendor?.hasContactPage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ class: "card-link" },
        href: (__VLS_ctx.vendorUrl),
        target: "_blank",
        rel: "noreferrer",
        title: "Open vendor card",
        'aria-label': "Open vendor card",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-box-arrow-up-right" },
    });
}
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-chevron-down']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-menu']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-check2']} */ ;
/** @type {__VLS_StyleScopedClasses['card-link']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-box-arrow-up-right']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            vendorUrl: vendorUrl,
            open: open,
            selectVendor: selectVendor,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=WorkspaceSwitcher.vue.js.map