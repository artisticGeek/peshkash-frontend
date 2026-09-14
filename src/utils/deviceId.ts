/**
 * Client-held anonymous device identity — the pre-login half of identity continuity.
 *
 * Generated once per browser, stored in localStorage (not sessionStorage, so it survives
 * across visits/days). Sent on every analytics call and QR scan resolution, and again on
 * OTP verify — the backend is what links it to a phone once login succeeds
 * (AuthController.verifyOtp -> DeviceLinkService.link), never the other way around.
 *
 * Never shown in any UI. Not a security credential: it enriches anonymous analytics only,
 * never grants access to anything.
 */

const STORAGE_KEY = 'peshkash_device_id';

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // localStorage unavailable (private mode, blocked storage) — fall back to an
    // in-memory id for this page load only. Never throw; analytics must stay best-effort.
    return crypto.randomUUID();
  }
}
