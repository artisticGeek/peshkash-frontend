/**
 * useAnalytics — fire-and-forget action tracking composable.
 *
 * Dual-writes to:
 *   1. /api/analytics/action  — our Postgres backend (detailed, vendor-scoped)
 *   2. Google Analytics 4     — only when VITE_GA_MEASUREMENT_ID is configured
 *
 * Usage:
 *   const { track } = useAnalytics({ vendorId: 3, eventId: 12 })
 *   track('whatsapp_click')
 *
 * Most callers intentionally ignore the returned promise. State-changing
 * callers (save/like) await it to guarantee read-your-write on /home.
 */

import { API_BASE_URL } from '../config';
import { gtagEvent } from '../utils/ga';
import { getDeviceId } from '../utils/deviceId';
import { useAuthStore } from '../stores/auth';

export interface AnalyticsContext {
  vendorId?: number;
  /** Stable server-resolved vendor identity for public pages that cannot safely hardcode a DB id. */
  vendorSlug?: string;
  eventId?: number;
  menuId?: number;
  itemId?: number;
  qrHash?: string;
  // Per-call extra, currently only used by 'item_bookmark' — true when the item was just
  // bookmarked, false when the bookmark was just removed.
  bookmarked?: boolean;
}

export type ActionType =
  | 'whatsapp_click'
  | 'call_click'
  | 'email_click'
  | 'directions_click'
  | 'share_click'
  | 'save_contact'
  | 'social_click'
  | 'item_expand'
  | 'vendor_contact_view'
  | 'login_success'
  | 'menu_view'
  | 'item_detail_view'
  | 'item_bookmark'
  | 'item_unbookmark'
  | 'item_like'
  | 'item_unlike'
  | 'item_dislike'
  | 'item_undislike'
  | 'landing_page_view'
  | 'landing_whatsapp_hero'
  | 'landing_demo_anchor'
  | 'landing_whatsapp_business'
  | 'landing_whatsapp_faq'
  | 'landing_whatsapp_contact'
  | 'landing_get_started'
  | 'landing_whatsapp_nav'
  | 'landing_call'
  | 'landing_email'
  | 'landing_contact_form_submit'
  | 'landing_whatsapp_footer'
  | 'landing_instagram_footer'
  | 'landing_email_footer'
  | 'landing_whatsapp_floating'
  | 'exhibit_page_view'
  | 'exhibit_next'
  | 'exhibit_previous'
  | 'exhibit_whatsapp'
  | 'exhibit_share'
  | 'exhibit_get_started';

export function useAnalytics(ctx: AnalyticsContext = {}) {
  const authStore = useAuthStore();
  /**
   * Fire-and-forget: posts to backend AND fires a GA custom event.
   * Returns after the backend accepts the event; callers may ignore the promise.
   */
  async function track(actionType: ActionType | string, extra?: Partial<AnalyticsContext>): Promise<boolean> {
    const merged = { ...ctx, ...extra };
    const payload = {
      actionType,
      ...merged,
      pageUrl: window.location.href,
      deviceId: getDeviceId(),
    };

    // ── 1. Backend (Postgres via Redis queue) ──────────────────────────
    // keepalive:true lets the request outlive page navigation (same guarantee
    // as sendBeacon). sendBeacon with application/json blobs fails in Chrome
    // for cross-origin preflighted requests — fetch + keepalive is reliable.
    const request = fetch(`${API_BASE_URL}/analytics/action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    // ── 2. Google Analytics 4 (no-op if VITE_GA_MEASUREMENT_ID not set) ─
    gtagEvent(actionType, {
      vendor_id: merged.vendorId,
      vendor_slug: merged.vendorSlug,
      event_id: merged.eventId,
      menu_id: merged.menuId,
      item_id: merged.itemId,
      qr_hash: merged.qrHash,
      ...(merged.bookmarked !== undefined ? { bookmarked: merged.bookmarked } : {}),
    });

    try {
      const response = await request;
      return response.ok;
    } catch {
      return false;
    }
  }

  return { track };
}
