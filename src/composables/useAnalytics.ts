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
 * All calls are best-effort: errors are silently swallowed.
 * Never awaited by callers — analytics must never block UX.
 */

import { API_BASE_URL } from '../config';
import { gtagEvent } from '../utils/ga';

export interface AnalyticsContext {
  vendorId?: number;
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
  | 'menu_view'
  | 'item_detail_view'
  | 'item_bookmark';

function getStoredPhone(): string | null {
  try {
    const raw = localStorage.getItem('peshkash_auth_v1');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed.phone === 'string' ? parsed.phone : null;
  } catch { return null; }
}

export function useAnalytics(ctx: AnalyticsContext = {}) {
  /**
   * Fire-and-forget: posts to backend AND fires a GA custom event.
   * Always returns void synchronously — never await this.
   */
  function track(actionType: ActionType | string, extra?: Partial<AnalyticsContext>): void {
    const merged = { ...ctx, ...extra };
    const phone = getStoredPhone();
    const payload = { actionType, ...merged, pageUrl: window.location.href, ...(phone ? { phone } : {}) };

    // ── 1. Backend (Postgres via Redis queue) ──────────────────────────
    // keepalive:true lets the request outlive page navigation (same guarantee
    // as sendBeacon). sendBeacon with application/json blobs fails in Chrome
    // for cross-origin preflighted requests — fetch + keepalive is reliable.
    fetch(`${API_BASE_URL}/analytics/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {/* silent */});

    // ── 2. Google Analytics 4 (no-op if VITE_GA_MEASUREMENT_ID not set) ─
    gtagEvent(actionType, {
      vendor_id: merged.vendorId,
      event_id: merged.eventId,
      menu_id: merged.menuId,
      item_id: merged.itemId,
      qr_hash: merged.qrHash,
      ...(merged.bookmarked !== undefined ? { bookmarked: merged.bookmarked } : {}),
    });
  }

  return { track };
}
