import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from '../../components/Navbar.vue';
import StepMenu from './steps/StepMenu.vue';
import StepItems from './steps/StepItems.vue';
import StepEvent from './steps/StepEvent.vue';
import StepLinkMenu from './steps/StepLinkMenu.vue';
import StepPayment from './steps/StepPayment.vue';
const route = useRoute();
const vendorName = route.params.vendorName;
const currentStep = ref(0);
const selectedMenuId = ref(null);
const selectedEventId = ref(null);
const linkConfirmed = ref(false);
const steps = [
    { label: 'Menu', subtitle: 'Choose or create the menu you want to serve at this event.' },
    { label: 'Items', subtitle: 'Add dishes and categories to your menu.' },
    { label: 'Event', subtitle: 'Create or select the event this menu will be served at.' },
    { label: 'Link', subtitle: 'Associate your menu with the event.' },
    { label: 'Pay', subtitle: 'Activate the event with a time window.' },
];
const progressWidth = computed(() => `${(currentStep.value / (steps.length - 1)) * 100}%`);
const canProceed = computed(() => {
    if (currentStep.value === 0)
        return selectedMenuId.value !== null;
    if (currentStep.value === 2)
        return selectedEventId.value !== null;
    if (currentStep.value === 3)
        return linkConfirmed.value;
    return true;
});
function jumpTo(i) {
    if (i <= currentStep.value)
        currentStep.value = i;
}
function next() {
    if (currentStep.value < steps.length - 1)
        currentStep.value++;
}
function onMenuSelected(menuId) {
    selectedMenuId.value = menuId;
}
function onEventSelected(eventId) {
    selectedEventId.value = eventId;
}
function onLinked() {
    linkConfirmed.value = true;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['step-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['dot-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['step-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['dot-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['step-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['dot-label']} */ ;
/** @type {__VLS_StyleScopedClasses['step-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['completed']} */ ;
/** @type {__VLS_StyleScopedClasses['dot-label']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "wizard-shell" },
});
/** @type {[typeof Navbar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(Navbar, new Navbar({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "wizard-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "text-center mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
    ...{ class: "fw-bold" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-muted small" },
});
(__VLS_ctx.steps[__VLS_ctx.currentStep].subtitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "progress-bar-wrapper mb-4" },
});
for (const [step, i] of __VLS_getVForSourceType((__VLS_ctx.steps))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.jumpTo(i);
            } },
        key: (i),
        ...{ class: "step-dot" },
        ...{ class: ({
                completed: i < __VLS_ctx.currentStep,
                active: i === __VLS_ctx.currentStep,
                pending: i > __VLS_ctx.currentStep,
            }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "dot-icon" },
    });
    if (i < __VLS_ctx.currentStep) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-check-lg" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (i + 1);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "dot-label" },
    });
    (step.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "progress-track" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "progress-fill" },
    ...{ style: ({ width: __VLS_ctx.progressWidth }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "step-content" },
});
if (__VLS_ctx.currentStep === 0) {
    /** @type {[typeof StepMenu, ]} */ ;
    // @ts-ignore
    const __VLS_3 = __VLS_asFunctionalComponent(StepMenu, new StepMenu({
        ...{ 'onSelected': {} },
        vendorName: (__VLS_ctx.vendorName),
    }));
    const __VLS_4 = __VLS_3({
        ...{ 'onSelected': {} },
        vendorName: (__VLS_ctx.vendorName),
    }, ...__VLS_functionalComponentArgsRest(__VLS_3));
    let __VLS_6;
    let __VLS_7;
    let __VLS_8;
    const __VLS_9 = {
        onSelected: (__VLS_ctx.onMenuSelected)
    };
    var __VLS_5;
}
else if (__VLS_ctx.currentStep === 1) {
    /** @type {[typeof StepItems, ]} */ ;
    // @ts-ignore
    const __VLS_10 = __VLS_asFunctionalComponent(StepItems, new StepItems({
        vendorName: (__VLS_ctx.vendorName),
        menuId: (__VLS_ctx.selectedMenuId),
    }));
    const __VLS_11 = __VLS_10({
        vendorName: (__VLS_ctx.vendorName),
        menuId: (__VLS_ctx.selectedMenuId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_10));
}
else if (__VLS_ctx.currentStep === 2) {
    /** @type {[typeof StepEvent, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(StepEvent, new StepEvent({
        ...{ 'onSelected': {} },
        vendorName: (__VLS_ctx.vendorName),
    }));
    const __VLS_14 = __VLS_13({
        ...{ 'onSelected': {} },
        vendorName: (__VLS_ctx.vendorName),
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    let __VLS_16;
    let __VLS_17;
    let __VLS_18;
    const __VLS_19 = {
        onSelected: (__VLS_ctx.onEventSelected)
    };
    var __VLS_15;
}
else if (__VLS_ctx.currentStep === 3) {
    /** @type {[typeof StepLinkMenu, ]} */ ;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(StepLinkMenu, new StepLinkMenu({
        ...{ 'onLinked': {} },
        vendorName: (__VLS_ctx.vendorName),
        menuId: (__VLS_ctx.selectedMenuId),
        eventId: (__VLS_ctx.selectedEventId),
    }));
    const __VLS_21 = __VLS_20({
        ...{ 'onLinked': {} },
        vendorName: (__VLS_ctx.vendorName),
        menuId: (__VLS_ctx.selectedMenuId),
        eventId: (__VLS_ctx.selectedEventId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    let __VLS_23;
    let __VLS_24;
    let __VLS_25;
    const __VLS_26 = {
        onLinked: (__VLS_ctx.onLinked)
    };
    var __VLS_22;
}
else if (__VLS_ctx.currentStep === 4) {
    /** @type {[typeof StepPayment, ]} */ ;
    // @ts-ignore
    const __VLS_27 = __VLS_asFunctionalComponent(StepPayment, new StepPayment({
        vendorName: (__VLS_ctx.vendorName),
        menuId: (__VLS_ctx.selectedMenuId),
        eventId: (__VLS_ctx.selectedEventId),
    }));
    const __VLS_28 = __VLS_27({
        vendorName: (__VLS_ctx.vendorName),
        menuId: (__VLS_ctx.selectedMenuId),
        eventId: (__VLS_ctx.selectedEventId),
    }, ...__VLS_functionalComponentArgsRest(__VLS_27));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "wizard-nav mt-4" },
});
if (__VLS_ctx.currentStep > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.currentStep > 0))
                    return;
                __VLS_ctx.currentStep--;
            } },
        ...{ class: "btn btn-outline-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-arrow-left me-1" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "ms-auto" },
});
if (__VLS_ctx.currentStep < __VLS_ctx.steps.length - 1) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.next) },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.canProceed),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-arrow-right ms-1" },
    });
}
/** @type {__VLS_StyleScopedClasses['wizard-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['wizard-container']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['step-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['completed']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['pending']} */ ;
/** @type {__VLS_StyleScopedClasses['dot-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-check-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['dot-label']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-track']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['step-content']} */ ;
/** @type {__VLS_StyleScopedClasses['wizard-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-arrow-left']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-arrow-right']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-1']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Navbar: Navbar,
            StepMenu: StepMenu,
            StepItems: StepItems,
            StepEvent: StepEvent,
            StepLinkMenu: StepLinkMenu,
            StepPayment: StepPayment,
            vendorName: vendorName,
            currentStep: currentStep,
            selectedMenuId: selectedMenuId,
            selectedEventId: selectedEventId,
            steps: steps,
            progressWidth: progressWidth,
            canProceed: canProceed,
            jumpTo: jumpTo,
            next: next,
            onMenuSelected: onMenuSelected,
            onEventSelected: onEventSelected,
            onLinked: onLinked,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=OnboardingWizard.vue.js.map