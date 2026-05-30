/**
 * Auth store — persists to localStorage with a 2-day TTL.
 * Loaded immediately on app boot; all components read from here.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export type Role = 'admin' | 'vendor' | 'customer';

export interface AuthState {
  token:     string;
  phone:     string;
  role:      Role;
  vendorId:  number | null;
  expiresAt: number;   // ms since epoch
}

const STORAGE_KEY = 'peshkash_auth_v1';
const TTL_MS      = 2 * 24 * 60 * 60 * 1000; // 48 hours

export const useAuthStore = defineStore('auth', () => {
  const state = ref<AuthState | null>(null);

  // ── Persistence ────────────────────────────────────────────────────────────
  function _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed: AuthState = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      state.value = parsed;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  function _save(data: Omit<AuthState, 'expiresAt'>) {
    const full: AuthState = { ...data, expiresAt: Date.now() + TTL_MS };
    state.value = full;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Call after successful verifyOtp — sets auth header for all future requests */
  function login(data: { token: string; phone: string; role: Role; vendorId: number | null }) {
    _save(data);
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

  // Bootstrap auth header on store init (page reload)
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
