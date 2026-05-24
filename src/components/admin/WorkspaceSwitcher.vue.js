import { computed } from 'vue';
const props = defineProps();
const __VLS_emit = defineEmits();
const vendorUrl = computed(() => props.selectedVendor ? `${window.location.origin}/vendor/${props.selectedVendor.name}` : '');
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "workspace-switcher" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    ...{ onChange: (...[$event]) => {
            __VLS_ctx.$emit('update:modelValue', Number($event.target.value));
        } },
    value: (__VLS_ctx.modelValue),
    ...{ class: "form-select form-select-sm" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
    value: (0),
});
for (const [vendor] of __VLS_getVForSourceType((__VLS_ctx.vendors))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (vendor.id),
        value: (vendor.id),
    });
    (vendor.displayName);
}
if (__VLS_ctx.selectedVendor?.hasContactPage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        href: (__VLS_ctx.vendorUrl),
        target: "_blank",
        rel: "noreferrer",
    });
}
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            vendorUrl: vendorUrl,
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