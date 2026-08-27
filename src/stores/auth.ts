/**
 * Auth store — persists to localStorage with a 90-day sliding TTL.
 * Loaded immediately on app boot; all components read from here.
 *
 * Session window: 90 days from last use. Every time the app boots with a
 * valid session that has less than 45 days left, expiresAt is silently
 * bumped to now + 90 days (sliding window). Users who open the app at least
 * once every 3 months are never asked to log in again.
 *
 * SECURITY: role/phone/vendorId are ALWAYS decoded from the signed JWT,
 * never read from the plain localStorage fields. Tampering with localStorage
 * (e.g. changing role to "admin") has no effect because _load() will
 * re-derive the true values from the token. The token itself cannot be
 * forged without the server JWT_SECRET.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

export type Role = 'admin' | 'vendor' | 'customer';

export interface AuthState {
  token:     string;
  phone:     string;
  role:      Role;
  vendorId:  number | null;
  expiresAt: number;   // ms since epoch
}

const STORAGE_KEY          = 'peshkash_auth_v1';
const TTL_MS               = 90 * 24 * 60 * 60 * 1000; // 90 days
const SLIDE_THRESHOLD_MS   = 45 * 24 * 60 * 60 * 1000; // slide when < 45 days remain

// ── JWT helpers ───────────────────────────────────────────────────────────────

/**
 * Decode a JWT payload WITHOUT verifying the signature.
 * This is intentional on the client — we can't verify (no secret here), but
 * we can read the claims. The server verifies every request anyway.
 * We use this to derive role/phone/vendorId rather than trusting stored fields.
 */
function decodeJwtPayload(token: string): { phone: string; role: Role; vendorId: number | null } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    // Base64url → base64 → JSON
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json);
    if (typeof payload.phone !== 'string' || typeof payload.role !== 'string') return null;
    return {
      phone:    payload.phone,
      role:     payload.role as Role,
      vendorId: typeof payload.vendorId === 'number' ? payload.vendorId : null,
    };
  } catch {
    return null;
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAuthStore = defineStore('auth', () => {
  const state = ref<AuthState | null>(null);

  // ── Persistence ────────────────────────────────────────────────────────────

  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      // ⚠️ Decode from JWT — never trust the plain stored role/phone/vendorId fields
      const decoded = decodeJwtPayload(parsed.token);
      if (!decoded) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      // Sliding window: bump expiresAt when fewer than 45 days remain
      const timeLeft = parsed.expiresAt - Date.now();
      const expiresAt = timeLeft < SLIDE_THRESHOLD_MS
        ? Date.now() + TTL_MS
        : parsed.expiresAt;
      state.value = {
        token:     parsed.token,
        expiresAt,
        phone:     decoded.phone,
        role:      decoded.role,
        vendorId:  decoded.vendorId,
      };
      if (expiresAt !== parsed.expiresAt) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, expiresAt }));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Call after successful verifyOtp — sets auth header for all future requests */
  function login(data: { token: string; phone: string; role: Role; vendorId: number | null }) {
    // Derive ground truth from JWT (ignore the passed-in role/phone in case of desync)
    const decoded = decodeJwtPayload(data.token);
    if (!decoded) return;
    const full: AuthState = {
      token:     data.token,
      expiresAt: Date.now() + TTL_MS,
      phone:     decoded.phone,
      role:      decoded.role,
      vendorId:  decoded.vendorId,
    };
    state.value = full;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
  }

  function logout() {
    state.value = null;
    localStorage.removeItem(STORAGE_KEY);
    delete axios.defaults.headers.common['Authorization'];
  }

  // ── Computed shortcuts ─────────────────────────────────────────────────────
  const isLoggedIn  = computed(() => !!state.value);
  const isAdmin     = computed(() => state.value?.role === 'admin');
  const isVendor    = computed(() => state.value?.role === 'vendor');
  const isCustomer  = computed(() => state.value?.role === 'customer');
  const role        = computed(() => state.value?.role ?? null);
  const vendorId    = computed(() => state.value?.vendorId ?? null);
  const phone       = computed(() => state.value?.phone ?? null);
  const token       = computed(() => state.value?.token ?? null);

  // Bootstrap: load persisted session and restore axios header
  _load();
  if (state.value?.token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${state.value.token}`;
  }

  return {
    state,
    login,
    logout,
    isLoggedIn,
    isAdmin,
    isVendor,
    isCustomer,
    role,
    vendorId,
    phone,
    token,
  };
});
