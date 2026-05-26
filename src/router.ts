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
    component: () => import('./pages/QrTemplatePage.vue'),
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
