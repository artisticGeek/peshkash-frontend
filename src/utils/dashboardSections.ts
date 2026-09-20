/**
 * Shared path -> section mapping for the admin dashboard, used by both the sidebar
 * (WorkspaceDashboard.vue) and the router guard (router.ts) so they can't drift apart.
 */

export type SectionKey =
  | 'home' | 'vendors' | 'vendorWorkspace' | 'events' | 'eventWorkspace' | 'qrSheet'
  | 'inventory' | 'insights' | 'designer' | 'preview' | 'publish' | 'qr' | 'qr-templates'
  | 'resources' | 'menus' | 'items' | 'engagement' | 'sessions';

export function sectionFromPath(path: string): SectionKey {
  if (/^\/dashboard\/vendors\/\d+/.test(path)) return 'vendorWorkspace';
  if (path.startsWith('/dashboard/vendors')) return 'vendors';
  if (/^\/dashboard\/events\/\d+\/qr-sheet/.test(path)) return 'qrSheet';
  if (/^\/dashboard\/events\/\d+\/publish/.test(path)) return 'eventWorkspace';
  if (/^\/dashboard\/events\/\d+/.test(path)) return 'eventWorkspace';
  if (path === '/dashboard/events') return 'events';
  // /dashboard/items/:id opens item analytics drawer while staying on inventory
  if (path.startsWith('/dashboard/items')) return 'inventory';
  if (/^\/dashboard\/menus\/\d+\/preview/.test(path)) return 'preview';
  if (path.startsWith('/dashboard/menus/preview')) return 'preview';
  if (path.startsWith('/dashboard/menus')) return 'designer';
  if (path.startsWith('/dashboard/qr-templates')) return 'qr-templates';
  if (path.startsWith('/dashboard/resources')) return 'resources';
  if (path.startsWith('/dashboard/qr')) return 'qr';
  if (path.startsWith('/dashboard/analytics')) return 'insights';
  if (path.startsWith('/dashboard/engagement')) return 'engagement';
  if (path.startsWith('/dashboard/sessions')) return 'sessions';
  return 'home';
}

// Maps every SectionKey (including sidebar sub-states reached via drill-down, e.g.
// clicking into a vendor) down to the grantable section that gates it — must match
// GRANTABLE_SECTIONS in peshkash_backend/src/controllers/AuthController.ts and the
// section keys used by requireSection() in adminRouter.ts/analyticsRouter.ts.
const GRANT_SECTION: Record<SectionKey, string | null> = {
  home: null, // always visible, never gated
  vendors: 'vendors',
  vendorWorkspace: 'vendors',
  events: 'events',
  eventWorkspace: 'events',
  qrSheet: 'events',
  inventory: 'designer',
  menus: 'designer',
  items: 'designer',
  designer: 'designer',
  preview: 'designer',
  publish: 'events',
  qr: 'qr',
  'qr-templates': 'qr-templates',
  resources: 'resources',
  insights: 'insights',
  engagement: 'engagement',
  sessions: 'sessions',
};

/** The admin_section_grant key that gates a given dashboard path, or null if ungated. */
export function grantSectionForPath(path: string): string | null {
  return GRANT_SECTION[sectionFromPath(path)];
}
