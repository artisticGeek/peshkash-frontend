import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { API_BASE_URL } from '../config';
const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref(false);
const errorMessage = ref('');
onMounted(async () => {
    const qrHash = route.params.qrHash;
    if (!qrHash) {
        errorMessage.value = 'QR hash not found in route.';
        error.value = true;
        loading.value = false;
        return;
    }
    try {
        const apiResponse = await fetch(`${API_BASE_URL}/details/${qrHash}`);
        if (apiResponse.ok) {
            const data = await apiResponse.json();
            const redirectUrl = data.redirectionUrl;
            if (redirectUrl) {
                router.push(redirectUrl.startsWith('/') ? redirectUrl : `/${redirectUrl}`);
            }
            else {
                errorMessage.value = 'API response missing redirectionUrl.';
                error.value = true;
                loading.value = false;
            }
        }
        else {
            errorMessage.value = `API responded with status: ${apiResponse.status}`;
            error.value = true;
            loading.value = false;
        }
    }
    catch (err) {
        errorMessage.value = `Error fetching redirect URL: ${err.message}`;
        error.value = true;
        loading.value = false;
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.errorMessage);
}
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            error: error,
            errorMessage: errorMessage,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=QrRedirect.vue.js.map