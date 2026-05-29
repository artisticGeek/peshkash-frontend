/**
 * useAnalytics — fire-and-forget action tracking composable.
 *
 * Usage in any public page:
 *   const { track } = useAnalytics({ vendorId: 3, eventId: 12 })
 *   track('whatsapp_click')
 *
 * All calls are best-effort: errors are silently swallowed.
 * Never awaited by callers — analytics must never block UX.
 */

import { API_BASE_URL } from '../config';

export interface AnalyticsContext {
  vendorId?: number;
  eventId?: number;
  menuId?: number;
  itemId?: number;
  qrHash?: string;
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
  | 'item_detail_view';

export function useAnalytics(ctx: AnalyticsContext = {}) {
  /**
   * Fire-and-forget: post action to /api/analytics/action.
   * Always returns void synchronously — never await this.
   */
  function track(actionType: ActionType | string, extra?: Partial<AnalyticsContext>): void {
    const payload = { actionType, ...ctx, ...extra };

    // Use sendBeacon when leaving a page, fetch otherwise
    const body = JSON.stringify(payload);
    const url = `${API_BASE_URL}/analytics/action`;

    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {/* silent */});
    }
  }

  return { track };
}
