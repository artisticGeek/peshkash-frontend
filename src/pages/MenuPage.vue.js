import { ref, onMounted, nextTick, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from '../components/Navbar.vue';
import MenuTree from '../components/MenuTree.vue';
import { API_BASE_URL } from '../config';
const route = useRoute();
const eventName = route.params.eventName;
const menuName = route.params.menuName;
const menuData = ref(null);
const isLoading = ref(true);
const error = ref(null);
// Filter state
const searchQuery = ref('');
const selectedFilter = ref('All');
// Check if event is currently active
const isEventActive = computed(() => {
    if (!menuData.value?.event)
        return false;
    const now = new Date();
    const startTime = menuData.value.event.startTime ? new Date(menuData.value.event.startTime) : null;
    const endTime = menuData.value.event.endTime ? new Date(menuData.value.event.endTime) : null;
    if (!startTime || !endTime)
        return false;
    return now >= startTime && now <= endTime;
});
// Get available filter types from menu items
const availableFilters = computed(() => {
    if (!menuData.value?.menu?.lineItems)
        return ['All'];
    const enumTypes = new Set();
    const collectEnumTypes = (items) => {
        for (const item of items) {
            if (item.enumType) {
                enumTypes.add(item.enumType);
            }
            if (item.subCategoryLineItems && item.subCategoryLineItems.length > 0) {
                collectEnumTypes(item.subCategoryLineItems);
            }
        }
    };
    collectEnumTypes(menuData.value.menu.lineItems);
    return enumTypes.size > 0 ? ['All', ...Array.from(enumTypes).sort()] : ['All'];
});
// Create a reactive key that changes when filter state changes
const filterKey = computed(() => `${searchQuery.value}-${selectedFilter.value}`);
// Return menu items without filtering - MenuTree will handle visibility
const filteredMenuItems = computed(() => {
    return menuData.value?.menu?.lineItems || [];
});
const clearFilters = () => {
    searchQuery.value = '';
    selectedFilter.value = 'All';
};
// Watch for search query changes to force reactivity
const forceRenderKey = ref(0);
watch([searchQuery, selectedFilter], ([newSearch, newFilter], [oldSearch, oldFilter]) => {
    // Force immediate re-render when transitioning to "no filter" state
    // This prevents blank categories after backspacing from empty results
    const wasFiltered = oldSearch?.trim() || oldFilter !== 'All';
    const isNowUnfiltered = !newSearch?.trim() && newFilter === 'All';
    if (wasFiltered && isNowUnfiltered) {
        forceRenderKey.value++;
    }
    else {
        nextTick(() => {
            forceRenderKey.value++;
        });
    }
});
onMounted(async () => {
    try {
        const res = await fetch(`${API_BASE_URL}/event/${eventName}/menu/${menuName}`);
        if (!res.ok) {
            throw new Error(`Failed to load menu: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        menuData.value = data;
        console.log('Menu data loaded:', data);
    }
    catch (err) {
        error.value = err.message || 'An error occurred while loading the menu';
        console.error('Error loading menu:', err);
    }
    finally {
        isLoading.value = false;
        // Trigger animations after content loads
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
/** @type {__VLS_StyleScopedClasses['vendor-name']} */ ;
/** @type {__VLS_StyleScopedClasses['event-name']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-description']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-description']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tag']} */ ;
// CSS variable injection 
// CSS variable injection end 
/** @type {[typeof Navbar, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(Navbar, new Navbar({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
if (__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "container py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center" },
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
        ...{ class: "container py-5" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger" },
        role: "alert",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-exclamation-triangle-fill me-2" },
    });
    (__VLS_ctx.error);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "container py-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center mb-4 pk-reveal" },
        'data-anim': "animate__fadeInUp",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "fw-bold mb-1" },
    });
    (__VLS_ctx.menuData?.menu?.displayName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({
        ...{ class: "d-block" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "vendor-name" },
    });
    (__VLS_ctx.menuData?.vendor?.displayName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "event-name" },
    });
    (__VLS_ctx.menuData?.event?.displayName);
    if (__VLS_ctx.menuData?.menu?.description) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "menu-item-description" },
        });
        (__VLS_ctx.menuData.menu.description);
    }
    if (!__VLS_ctx.isEventActive) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "alert alert-warning mb-4" },
            role: "alert",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-clock-history me-2" },
        });
    }
    if (__VLS_ctx.menuData?.menu?.lineItems) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "filters-container mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "search-bar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-search search-icon" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            value: (__VLS_ctx.searchQuery),
            type: "text",
            ...{ class: "search-input" },
            placeholder: "Search menu items...",
        });
        if (__VLS_ctx.availableFilters.length > 1) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "filter-tags" },
            });
            for (const [filter] of __VLS_getVForSourceType((__VLS_ctx.availableFilters))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                    ...{ onClick: (...[$event]) => {
                            if (!!(__VLS_ctx.isLoading))
                                return;
                            if (!!(__VLS_ctx.error))
                                return;
                            if (!(__VLS_ctx.menuData?.menu?.lineItems))
                                return;
                            if (!(__VLS_ctx.availableFilters.length > 1))
                                return;
                            __VLS_ctx.selectedFilter = filter;
                        } },
                    key: (filter),
                    ...{ class: "filter-tag" },
                    ...{ class: ({ active: __VLS_ctx.selectedFilter === filter }) },
                });
                (filter);
            }
        }
    }
    if (__VLS_ctx.filteredMenuItems && __VLS_ctx.filteredMenuItems.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "menu-list pk-reveal" },
            'data-anim': "animate__fadeInUp",
            'data-delay': "100",
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.filteredMenuItems))) {
            /** @type {[typeof MenuTree, ]} */ ;
            // @ts-ignore
            const __VLS_3 = __VLS_asFunctionalComponent(MenuTree, new MenuTree({
                key: (`${item.id}-${__VLS_ctx.forceRenderKey}`),
                item: (item),
                level: (0),
                eventName: (__VLS_ctx.eventName),
                menuName: (__VLS_ctx.menuName),
                searchQuery: (__VLS_ctx.searchQuery),
                selectedFilter: (__VLS_ctx.selectedFilter),
            }));
            const __VLS_4 = __VLS_3({
                key: (`${item.id}-${__VLS_ctx.forceRenderKey}`),
                item: (item),
                level: (0),
                eventName: (__VLS_ctx.eventName),
                menuName: (__VLS_ctx.menuName),
                searchQuery: (__VLS_ctx.searchQuery),
                selectedFilter: (__VLS_ctx.selectedFilter),
            }, ...__VLS_functionalComponentArgsRest(__VLS_3));
        }
    }
    else if (__VLS_ctx.menuData?.menu?.lineItems && __VLS_ctx.menuData.menu.lineItems.length > 0 && __VLS_ctx.filteredMenuItems.length === 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center py-5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-search display-1 text-muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted mt-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearFilters) },
            ...{ class: "btn btn-sm btn-outline-secondary" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "text-center py-5" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-basket display-1 text-muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "text-muted mt-3" },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
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
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-exclamation-triangle-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['py-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pk-reveal']} */ ;
/** @type {__VLS_StyleScopedClasses['fw-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['d-block']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-name']} */ ;
/** @type {__VLS_StyleScopedClasses['event-name']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-item-description']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-clock-history']} */ ;
/** @type {__VLS_StyleScopedClasses['me-2']} */ ;
/** @type {__VLS_StyleScopedClasses['filters-container']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['search-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-search']} */ ;
/** @type {__VLS_StyleScopedClasses['search-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['search-input']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tags']} */ ;
/** @type {__VLS_StyleScopedClasses['filter-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-list']} */ ;
/** @type {__VLS_StyleScopedClasses['pk-reveal']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-search']} */ ;
/** @type {__VLS_StyleScopedClasses['display-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['py-5']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-basket']} */ ;
/** @type {__VLS_StyleScopedClasses['display-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['text-muted']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            Navbar: Navbar,
            MenuTree: MenuTree,
            eventName: eventName,
            menuName: menuName,
            menuData: menuData,
            isLoading: isLoading,
            error: error,
            searchQuery: searchQuery,
            selectedFilter: selectedFilter,
            isEventActive: isEventActive,
            availableFilters: availableFilters,
            filteredMenuItems: filteredMenuItems,
            clearFilters: clearFilters,
            forceRenderKey: forceRenderKey,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=MenuPage.vue.js.map