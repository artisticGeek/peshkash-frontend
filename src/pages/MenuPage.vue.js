import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
const route = useRoute();
const eventName = route.params.eventName;
const menuName = route.params.menuName;
const itemData = ref(null);
const isLoading = ref(true);
const error = ref(null);
onMounted(async () => {
    try {
        const res = await fetch(`https://peshkash-backend.onrender.com/api/event/${eventName}/menu/${menuName}`);
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
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ style: {} },
});
(__VLS_ctx.itemData);
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            itemData: itemData,
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