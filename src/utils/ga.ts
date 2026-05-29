/**
 * Google Analytics 4 utility — wraps gtag behind a safe interface.
 *
 * Reads VITE_GA_MEASUREMENT_ID at build time.
 * If the env var is not set, all calls are no-ops — zero runtime cost.
 *
 * Usage:
 *   initGA()         — call once in main.ts
 *   gtagPageView()   — call in router.afterEach
 *   gtagEvent()      — called by useAnalytics composable
 */

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
export const gaEnabled = !!GA_ID;

/** Inject the GA script and configure the property. Call once on app boot. */
export function initGA(): void {
  if (!GA_ID) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: any[]) { window.dataLayer.push(args); };
  window.gtag('js', new Date());
  // Disable auto page_view — we fire them manually via router.afterEach
  window.gtag('config', GA_ID, { send_page_view: false });
}

/** Fire a page_view event — called by router.afterEach */
export function gtagPageView(path: string, title?: string): void {
  if (!gaEnabled || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_location: window.location.origin + path,
    page_path: path,
    page_title: title ?? document.title,
  });
}

/**
 * Fire a named custom event with optional vendor/event context.
 * Called by useAnalytics.track() so every tracked action reaches GA too.
 */
export function gtagEvent(
  eventName: string,
  params?: {
    vendor_id?: number;
    event_id?: number;
    menu_id?: number;
    item_id?: number;
    qr_hash?: string;
    [key: string]: any;
  }
): void {
  if (!gaEnabled || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params ?? {});
}
