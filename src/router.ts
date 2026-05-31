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

// ── JWT decode helper (mirrors auth.ts — no signature verification, just read claims) ──
function _decodeJwt(token: string): { role: string; vendorId: number | null } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const p = JSON.parse(json);
    if (typeof p.role !== 'string') return null;
    return { role: p.role, vendorId: typeof p.vendorId === 'number' ? p.vendorId : null };
  } catch {
    return null;
  }
}

// Auth guard — for /dashboard/* routes, check localStorage for a valid session.
// The LoginModal in AdminDashboard.vue handles unauthenticated users (shows modal over blurred content).
// Customers (role='customer') are redirected to / — the dashboard is admin/vendor only.
// SECURITY: role/vendorId are decoded from the JWT payload, never read from the plain stored fields.
router.beforeEach((to) => {
  if (!to.path.startsWith('/dashboard')) return true;
  const raw = localStorage.getItem('peshkash_auth_v1');
  if (!raw) return true; // unauthenticated — LoginModal will prompt them
  try {
    const auth = JSON.parse(raw);
    if (Date.now() > auth.expiresAt) {
      localStorage.removeItem('peshkash_auth_v1');
      return true; // expired — LoginModal will prompt
    }
    // Decode role/vendorId from JWT — ignores any tampering with the plain stored fields
    const decoded = _decodeJwt(auth.token);
    if (!decoded) return true; // malformed token — LoginModal will prompt
    const { role, vendorId } = decoded;
    // Customers have no dashboard access — send them home
    if (role === 'customer') return '/';
    // Vendor users are locked to their own workspace
    if (role === 'vendor' && vendorId) {
      const path = to.path;
      if (path.startsWith('/dashboard/vendors') && !path.startsWith(`/dashboard/vendors/${vendorId}`)) {
        return '/dashboard/home';
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
