import QRCode from 'qrcode';
import { computed, ref, watchEffect } from 'vue';
const props = defineProps();
const qrDataUrl = ref('');
const absoluteUrl = computed(() => `${window.location.origin}${props.path.startsWith('/') ? props.path : `/${props.path}`}`);
watchEffect(async () => {
    qrDataUrl.value = props.path
        ? await QRCode.toDataURL(absoluteUrl.value, { margin: 1, width: 96 })
        : '';
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['qr-target-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-target-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-target-preview']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "qr-target-preview" },
});
if (__VLS_ctx.qrDataUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.qrDataUrl),
        alt: "QR preview",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "qr-copy" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
(__VLS_ctx.label);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.type);
__VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
(__VLS_ctx.path);
__VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
    ...{ class: "btn btn-outline-secondary btn-sm" },
    href: (__VLS_ctx.absoluteUrl),
    target: "_blank",
    rel: "noreferrer",
});
/** @type {__VLS_StyleScopedClasses['qr-target-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-copy']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            qrDataUrl: qrDataUrl,
            absoluteUrl: absoluteUrl,
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
//# sourceMappingURL=QrTargetPreview.vue.js.map