import { createRouter, createWebHistory, RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import ItemDetailPage from './pages/ItemDetailPage.vue'
import LandingPage from './pages/LandingPage.vue'
import MenuPage from './pages/MenuPage.vue'
import QrRedirect from './pages/QrRedirect.vue' // Import the new component

const routes: Array<RouteRecordRaw> = [
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
    path: '/dashboard',
    redirect: '/dashboard/home',
  },
  {
    path: '/dashboard/home',
    name: 'DashboardHome',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/vendors',
    name: 'DashboardVendors',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/vendors/:vendorId',
    name: 'DashboardVendorWorkspace',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/events',
    name: 'DashboardEvents',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/events/publish',
    redirect: '/dashboard/events',
  },
  {
    path: '/dashboard/events/:eventId',
    name: 'DashboardEventWorkspace',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/events/:eventId/publish',
    name: 'DashboardEventPublishContext',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/events/:eventId/qr-sheet',
    name: 'DashboardEventQrSheet',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/items',
    name: 'DashboardItems',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/items/:itemId',
    name: 'DashboardItemAnalytics',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/menus/designer',
    redirect: '/dashboard/menus/studio',
  },
  {
    path: '/dashboard/menus/studio',
    name: 'DashboardMenuStudio',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/menus/:menuId/studio',
    name: 'DashboardMenuStudioContext',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/menus/:menuId/preview',
    name: 'DashboardMenuPreviewContext',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/menus/preview',
    name: 'DashboardMenuPreview',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/qr',
    name: 'DashboardQr',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/qr-templates',
    name: 'DashboardQrTemplates',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/dashboard/analytics',
    name: 'DashboardAnalytics',
    component: () => import('./pages/AdminDashboard.vue'),
  },
  {
    path: '/admin',
    redirect: '/dashboard/home',
  },
  {
    path: '/:qrHash',
    component: QrRedirect
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})

// Auth guard — for /dashboard/* routes, check localStorage for a valid session.
// The LoginModal in AdminDashboard.vue is the primary UI gate;
// unauthenticated users see the dashboard blurred with the modal on top.
router.beforeEach((to) => {
  if (!to.path.startsWith('/dashboard')) return true;
  const raw = localStorage.getItem('peshkash_auth_v1');
  if (!raw) return true; // unauthenticated — let AdminDashboard show the login gate
  try {
    const auth = JSON.parse(raw);
    if (Date.now() > auth.expiresAt) {
      localStorage.removeItem('peshkash_auth_v1');
      return true; // expired — let gate show
    }
    // Vendor users are locked to their own workspace
    if (auth.role === 'vendor' && auth.vendorId) {
      const path = to.path;
      // Allow their own vendor workspace and all sub-routes EXCEPT /dashboard/vendors
      if (path.startsWith('/dashboard/vendors') && !path.startsWith(`/dashboard/vendors/${auth.vendorId}`)) {
        return `/dashboard/home`;
      }
    }
    return true;
  } catch {
    return true;
  }
});

// GA page view on every navigation
router.afterEach((to) => {
  import('./utils/ga').then(({ gtagPageView }) => gtagPageView(to.fullPath));
})
