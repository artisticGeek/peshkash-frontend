/**
 * useAnalyticsExport — downloads a vendor's raw analytics as a .xlsx file.
 *
 * Fetches enriched JSON from GET /api/analytics/export/vendor/:vendorId,
 * then uses SheetJS to build a formatted Excel workbook in the browser.
 *
 * Columns (one row per analytics event):
 *   Timestamp | Event Type | Action | Page Type | Page / Item Name |
 *   Page URL  | QR Hash    | QR Status | Device | Session ID |
 *   Referrer  | User Agent | Vendor
 */

import { ref } from 'vue';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/auth';

/** Column widths (characters) — drives Excel column sizing */
const COL_WIDTHS: Record<string, number> = {
  'Event ID':         10,
  'Timestamp':        22,
  'Event Type':       12,
  'Action':           22,
  'Page Type':        15,
  'Page / Item Name': 28,
  'Page URL':         45,
  'QR Hash':          18,
  'QR Status':        12,
  'Device':           10,
  'Session ID':       12,
  'Referrer':         40,
  'User Agent':       55,
  'Vendor':           22,
};

export function useAnalyticsExport() {
  const loading = ref(false);
  const error   = ref<string | null>(null);
  const auth    = useAuthStore();

  /**
   * Fetch raw rows and download as vendor-analytics-<name>-<date>.xlsx
   * @param vendorId   numeric vendor ID
   * @param vendorName used in the filename
   * @param from       start of date window (default: 90 days ago)
   * @param to         end of date window (default: today)
   */
  async function exportVendor(
    vendorId: number,
    vendorName: string,
    from?: Date,
    to?: Date,
  ): Promise<void> {
    loading.value = true;
    error.value   = null;

    try {
      const toDate   = to   ?? new Date();
      const fromDate = from ?? new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const params = new URLSearchParams({
        from: fromDate.toISOString(),
        to:   toDate.toISOString(),
      });

      const token = auth.state?.token;
      const res = await fetch(
        `${API_BASE_URL}/analytics/export/vendor/${vendorId}?${params}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      if (!res.ok) {
        throw new Error(`Export failed: ${res.status} ${res.statusText}`);
      }

      const rows: Array<Record<string, any>> = await res.json();

      if (!rows.length) {
        error.value = 'No analytics data in the selected period.';
        return;
      }

      // ── Build workbook ──────────────────────────────────────────────────────
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Column widths
      const headers = Object.keys(rows[0]);
      ws['!cols'] = headers.map(h => ({ wch: COL_WIDTHS[h] ?? 20 }));

      // Freeze header row
      ws['!freeze'] = { xSplit: 0, ySplit: 1 };

      XLSX.utils.book_append_sheet(wb, ws, 'Analytics');

      // ── Trigger download ────────────────────────────────────────────────────
      const safe   = vendorName.replace(/[^a-zA-Z0-9_\- ]/g, '').trim().replace(/\s+/g, '-');
      const dateStr = toDate.toISOString().slice(0, 10);
      XLSX.writeFile(wb, `analytics-${safe}-${dateStr}.xlsx`);

    } catch (err: any) {
      error.value = err?.message ?? 'Export failed';
      console.error('[useAnalyticsExport]', err);
    } finally {
      loading.value = false;
    }
  }

  return { exportVendor, loading, error };
}
