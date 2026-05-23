import { createRouter, createWebHistory } from 'vue-router';
import ItemDetailPage from './pages/ItemDetailPage.vue';
import LandingPage from './pages/LandingPage.vue';
import MenuPage from './pages/MenuPage.vue';
import QrRedirect from './pages/QrRedirect.vue'; // Import the new component
const routes = [
    {
        path: '/',
        component: LandingPage
    },
    {
        path: '/event/:eventName/menu/:menuName',
        component: MenuPage
    },
    {
        path: '/event/:eventName/menu/:menuName/item/:itemName',
        name: 'ItemDetail',
        component: ItemDetailPage
    },
    {
        path: '/vendor/:vendorName',
        name: 'VendorCard',
        component: () => import('./pages/VendorCardPage.vue')
    },
    {
        path: '/onboard/:vendorName',
        name: 'Onboarding',
        component: () => import('./pages/onboarding/OnboardingWizard.vue'),
    },
    {
        path: '/admin',
        name: 'AdminDashboard',
        component: () => import('./pages/AdminDashboard.vue'),
    },
    {
        path: '/:qrHash',
        component: QrRedirect
    }
];
export const router = createRouter({
    history: createWebHistory(),
    routes,
});
//# sourceMappingURL=router.js.map