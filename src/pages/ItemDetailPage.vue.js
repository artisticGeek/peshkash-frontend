import { ref, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from '../components/Navbar.vue';
const route = useRoute();
const eventName = route.params.eventName;
const menuName = route.params.menuName;
const itemName = route.params.itemName;
const itemData = ref(null);
const isLoading = ref(true);
const error = ref(null);
const win = window;
const rating = ref(0);
const feedback = ref('');
const showFeedback = ref(false);
const setRating = (n) => {
    rating.value = n;
    feedback.value = `Thanks for rating ${n} star${n > 1 ? 's' : ''}!`;
    showFeedback.value = true;
    setTimeout(() => {
        showFeedback.value = false;
    }, 2000);
};
onMounted(async () => {
    try {
        const res = await fetch(`https://peshkash-backend.onrender.com/api/event/${eventName}/menu/${menuName}/item/${itemName}`);
        if (!res.ok)
            throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        itemData.value = data;
        console.log(itemData.value);
    }
    catch (err) {
        error.value = err.message;
    }
    finally {
        isLoading.value = false;
        await nextTick();
        const els = document.querySelectorAll('.pk-reveal');
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const anim = el.dataset.anim || 'animate__fadeInUp';
                    const delay = Number(el.dataset.delay || 0);
                    setTimeout(() => {
                        el.classList.add('animate__animated', anim, 'pk-visible');
                    }, delay);
                    io.unobserve(el);
                }
            });
        }, { threshold: 0.2 });
        els.forEach((el) => io.observe(el));
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof Navbar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(Navbar, new Navbar({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
if (__VLS_ctx.showFeedback) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "position-fixed top-0 start-50 translate-middle-x mt-3" },
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-warning shadow" },
        role: "alert",
    });
    (__VLS_ctx.feedback);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container py-3" },
});
if (__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-grow text-primary shadow-lg" },
        ...{ style: {} },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-grow text-info shadow-lg mt-3" },
        ...{ style: {} },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "spinner-grow text-white shadow-lg mt-3" },
        ...{ style: {} },
        role: "status",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "visually-hidden" },
    });
}
else if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-danger" },
    });
    (__VLS_ctx.error);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "pk-reveal" },
        'data-anim': "animate__fadeInUp",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "fw-bold mb-1" },
    });
    (__VLS_ctx.itemData?.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "d-block text-muted" },
    });
    (__VLS_ctx.itemData.event.vendor.displayName);
    (__VLS_ctx.itemData.event.displayName);
    if (__VLS_ctx.itemData?.price) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
            ...{ class: "d-block text-info" },
        });
        (__VLS_ctx.itemData.price);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex justify-content-center mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "col-12 col-md-10 col-lg-8" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ratio ratio-16x9" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.itemData?.image),
        alt: (__VLS_ctx.itemData?.name),
        ...{ class: "w-100 h-100 rounded shadow pk-hero-img" },
        loading: "lazy",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex flex-wrap justify-content-center gap-2 mb-4" },
    });
    if (__VLS_ctx.itemData?.isVeg !== undefined) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge bg-light text-dark d-flex align-items-center" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: (['bi', 'bi-circle-fill', __VLS_ctx.itemData.isVeg ? 'text-success' : 'text-danger']) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "ms-1" },
        });
        (__VLS_ctx.itemData.isVeg ? 'Veg' : 'Non-Veg');
    }
    for (const [tag] of __VLS_getVForSourceType((__VLS_ctx.itemData?.tags || []))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (tag),
            ...{ class: "badge bg-info text-dark" },
        });
        (tag);
    }
    for (const [allergen] of __VLS_getVForSourceType((__VLS_ctx.itemData?.allergens || []))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            key: (allergen),
            ...{ class: "badge bg-warning text-dark" },
        });
        (allergen);
    }
    if (__VLS_ctx.itemData?.spiceLevel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge bg-light text-danger" },
        });
        for (const [n] of __VLS_getVForSourceType((3))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                key: (n),
                ...{ class: "bi bi-fire" },
                ...{ class: ({ 'opacity-25': n > __VLS_ctx.itemData.spiceLevel }) },
            });
        }
    }
    if (__VLS_ctx.itemData.parentItems?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
            ...{ class: "mb-3" },
            'aria-label': "breadcrumb",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ol, __VLS_intrinsicElements.ol)({
            ...{ class: "breadcrumb justify-content-center mb-0" },
        });
        for (const [parentItem] of __VLS_getVForSourceType((__VLS_ctx.itemData.parentItems))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (parentItem.displayName),
                ...{ class: "breadcrumb-item" },
            });
            (parentItem.displayName);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card bg-light border-0 mb-4 shadow-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "h5 mb-3 text-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-fork-knife me-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mb-3" },
    });
    (__VLS_ctx.itemData?.description);
    if (__VLS_ctx.itemData?.ingredients) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex flex-wrap gap-2 mb-3" },
        });
        for (const [ing] of __VLS_getVForSourceType((__VLS_ctx.itemData.ingredients.split(',')))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (ing),
                ...{ class: "badge bg-info pk-beige-text" },
            });
            (ing.trim());
        }
    }
    if (__VLS_ctx.itemData?.allergens?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "d-flex flex-wrap gap-2" },
        });
        for (const [allergen] of __VLS_getVForSourceType((__VLS_ctx.itemData.allergens))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (allergen),
                ...{ class: "badge bg-danger" },
            });
            (allergen);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "my-4 d-flex flex-column align-items-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "mb-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "d-flex" },
    });
    for (const [n] of __VLS_getVForSourceType((5))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.isLoading))
                        return;
                    if (!!(__VLS_ctx.error))
                        return;
                    __VLS_ctx.setRating(n);
                } },
            key: (n),
            type: "button",
            ...{ class: "btn btn-sm me-1" },
            ...{ class: (n <= __VLS_ctx.rating ? 'btn-primary' : 'btn-outline-primary') },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-star-fill" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "visually-hidden" },
        });
        (n);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-end mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!!(__VLS_ctx.isLoading))
                    return;
                if (!!(__VLS_ctx.error))
                    return;
                __VLS_ctx.win.navigator?.share && __VLS_ctx.win.navigator?.share({ title: __VLS_ctx.itemData?.name, url: __VLS_ctx.win.location.href });
            } },
        ...{ class: "m-2 text-primary fixed-bottom" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-share-fill me-1" },
    });
}
/** @type {__VLS_StyleScopedClasses['position-fixed']} */ ;
/** @type {__VLS_StyleScopedClasses['top-0']} */ ;
/** @type {__VLS_StyleScopedClasses['start-50']} */ ;
/** @type {__VLS_StyleScopedClasses['translate-middle-x']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-grow']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-grow']} */ ;
/** @type {__VLS_StyleScopedClasses['text-info']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner-grow']} */ ;
/** @type {__VLS_StyleScopedClasses['text-white']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['pk-reveal']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['text-info']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['col-12']} */ ;
/** @type {__VLS_StyleScopedClasses['col-md-10']} */ ;
/** @type {__VLS_StyleScopedClasses['col-lg-8']} */ ;
/** @type {__VLS_StyleScopedClasses['ratio']} */ ;
/** @type {__VLS_StyleScopedClasses['ratio-16x9']} */ ;
/** @type {__VLS_StyleScopedClasses['w-100']} */ ;
/** @type {__VLS_StyleScopedClasses['h-100']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow']} */ ;
/** @type {__VLS_StyleScopedClasses['pk-hero-img']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-circle-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['ms-1']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-info']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['text-dark']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-fire']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-25']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['breadcrumb']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-content-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-0']} */ ;
/** @type {__VLS_StyleScopedClasses['breadcrumb-item']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['border-0']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['card-body']} */ ;
/** @type {__VLS_StyleScopedClasses['h5']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-fork-knife']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-info']} */ ;
/** @type {__VLS_StyleScopedClasses['pk-beige-text']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['my-4']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-column']} */ ;
/** @type {__VLS_StyleScopedClasses['align-items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['d-flex']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-star-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['visually-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['text-end']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['m-2']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['fixed-bottom']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-share-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['me-1']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Navbar: Navbar,
            itemData: itemData,
            isLoading: isLoading,
            error: error,
            win: win,
            rating: rating,
            feedback: feedback,
            showFeedback: showFeedback,
            setRating: setRating,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=ItemDetailPage.vue.js.map