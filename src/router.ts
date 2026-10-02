import { createRouter, createWebHistory, RouteRecordRaw, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'
import ItemDetailPage from './pages/ItemDetailPage.vue'
import LandingPage from './pages/LandingPage.vue'
import MenuPage from './pages/MenuPage.vue'
import QrRedirect from './pages/QrRedirect.vue' // Import the new component
import { firstGrantedDashboardPath, grantSectionForPath } from './utils/dashboardSections'
import { useAuthStore } from './stores/auth'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    component: LandingPage
  },
  {
    path: '/exhibits',
    name: 'Exhibits',
    component: () => import('./pages/ExhibitsPage.vue')
  },
  {
    path: '/showrooms',
    name: 'Showrooms',
    component: () => import('./pages/ShowroomsPage.vue')
  },
  {
    path: '/home',
    redirect: '/home/saved'
  },
  {
    path: '/home/:section(saved|liked|disliked|history|preferences)',
    name: 'UserHome',
    component: () => import('./pages/UserHomePage.vue')
  },
  {
    path: '/event/:eventName/menu/:menuName',
    component: MenuPage
  },
  {
    path: '/event/:eventName',
    name: 'EventRegistration',
    component: () => import('./pages/EventRegistrationPage.vue')
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
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/vendors',
    name: 'DashboardVendors',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/vendors/:vendorId',
    name: 'DashboardVendorWorkspace',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/events',
    name: 'DashboardEvents',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/events/publish',
    redirect: '/dashboard/events',
  },
  {
    path: '/dashboard/events/:eventId',
    name: 'DashboardEventWorkspace',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/events/:eventId/publish',
    name: 'DashboardEventPublishContext',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/events/:eventId/qr-sheet',
    name: 'DashboardEventQrSheet',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/items',
    name: 'DashboardItems',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/items/:itemId',
    name: 'DashboardItemAnalytics',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/menus/designer',
    redirect: '/dashboard/menus/studio',
  },
  {
    path: '/dashboard/menus/studio',
    name: 'DashboardMenuStudio',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/menus/:menuId/studio',
    name: 'DashboardMenuStudioContext',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/menus/:menuId/preview',
    name: 'DashboardMenuPreviewContext',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/menus/preview',
    name: 'DashboardMenuPreview',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/qr',
    name: 'DashboardQr',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/qr-templates',
    name: 'DashboardQrTemplates',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/resources',
    name: 'DashboardPrintResources',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  ...(import.meta.env.DEV || import.meta.env.VITE_STUDIO_PREVIEW === 'true' ? [{
    path: '/dev/qr-studio',
    name: 'DevQrStudio',
    component: () => import('./pages/QrTemplatePage.vue'),
  }] : []),
  {
    path: '/dashboard/analytics',
    name: 'DashboardAnalytics',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/print-collections/shared/:token',
    name: 'SharedPrintCollection',
    component: () => import('./pages/SharedPrintCollectionPage.vue'),
  },
  {
    path: '/dashboard/collections',
    name: 'DashboardPrintCollections',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/engagement',
    name: 'DashboardEngagement',
    component: () => import('./pages/WorkspaceDashboard.vue'),
  },
  {
    path: '/dashboard/sessions',
    name: 'DashboardSessions',
    component: () => import('./pages/WorkspaceDashboard.vue'),
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

// Auth guard — refresh mutable access before every dashboard navigation.
// The LoginModal in WorkspaceDashboard.vue handles unauthenticated users.
// Customers are redirected to their signed-in home — never the marketing landing page.
router.beforeEach(async (to) => {
  if (!to.path.startsWith('/dashboard')) return true;
  const authStore = useAuthStore();
  if (!authStore.isLoggedIn) return true; // unauthenticated — LoginModal will prompt them
  try {
    await authStore.refreshAccess();
    const role = authStore.role;
    const vendorIds = authStore.vendorIds;
    const sectionGrants = authStore.sectionGrants;
    // Customers have no dashboard access — retain a signed-in destination.
    if (role === 'customer') return '/home/saved';
    if (to.meta.adminOnly && role !== 'admin') return '/dashboard/home';
    // Vendor section grants — cosmetic redirect only; every API route re-checks
    // admin_section_grant live regardless of what the client believes it can see.
    if (role === 'vendor') {
      const requiredSection = grantSectionForPath(to.path);
      if (requiredSection && !sectionGrants.includes(requiredSection)) {
        return firstGrantedDashboardPath(sectionGrants) ?? '/dashboard/home';
      }
    }
    // Vendor users can only open workspaces associated with their phone.
    if (role === 'vendor' && vendorIds.length) {
      const path = to.path;
      const match = path.match(/^\/dashboard\/vendors\/(\d+)/);
      if (match && !vendorIds.includes(Number(match[1]))) {
        return '/dashboard/home';
      }
    }
    return true;
  } catch {
    // Keep cached UI state during a transient network failure. Every protected
    // API request still enforces live grants server-side.
    return true;
  }
});

// GA page view on every navigation
router.afterEach((to) => {
  import('./utils/ga').then(({ gtagPageView }) => gtagPageView(to.fullPath));
})
