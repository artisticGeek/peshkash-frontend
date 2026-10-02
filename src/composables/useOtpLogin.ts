/**
 * useOtpLogin — composable that drives the two-step phone → OTP flow.
 * Used by both LoginDrawer (public pages) and DashboardLogin (dashboard gate).
 */

import { ref } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuthStore, Role } from '../stores/auth';
import { getDeviceId } from '../utils/deviceId';

export type OtpStep = 'phone' | 'otp' | 'success';

const OTP_FLOW_KEY = 'peshkash_otp_flow_v1';
const OTP_FLOW_TTL_MS = 10 * 60 * 1000;

function readPendingFlow(): { phone: string; step: 'phone' | 'otp' } | null {
  try {
    const flow = JSON.parse(sessionStorage.getItem(OTP_FLOW_KEY) || 'null');
    if (!flow || typeof flow.phone !== 'string' || Date.now() - Number(flow.updatedAt) > OTP_FLOW_TTL_MS) {
      sessionStorage.removeItem(OTP_FLOW_KEY);
      return null;
    }
    return { phone: flow.phone, step: flow.step === 'otp' ? 'otp' : 'phone' };
  } catch {
    sessionStorage.removeItem(OTP_FLOW_KEY);
    return null;
  }
}

function savePendingFlow(phone: string, step: 'phone' | 'otp') {
  try {
    sessionStorage.setItem(OTP_FLOW_KEY, JSON.stringify({ phone, step, updatedAt: Date.now() }));
  } catch {
    // Authentication still works when storage is unavailable (for example,
    // in a locked-down private browsing context); only reload recovery is lost.
  }
}

export function useOtpLogin() {
  const authStore = useAuthStore();

  const pending = readPendingFlow();
  const step    = ref<OtpStep>(pending?.step ?? 'phone');
  const phone   = ref(pending?.phone ?? '');
  const otp     = ref('');
  const loading = ref(false);
  const error   = ref('');

  function reset() {
    step.value  = 'phone';
    phone.value = '';
    otp.value   = '';
    error.value = '';
    sessionStorage.removeItem(OTP_FLOW_KEY);
  }

  async function sendOtp() {
    if (!phone.value.trim()) { error.value = 'Enter your phone number.'; return; }
    loading.value = true;
    error.value   = '';
    savePendingFlow(phone.value.trim(), 'phone');
    try {
      await axios.post(`${API_BASE_URL}/auth/send-otp`, { phone: phone.value.trim() });
      step.value = 'otp';
      savePendingFlow(phone.value.trim(), 'otp');
    } catch (e: any) {
      error.value = e?.response?.data?.error ?? 'Could not send OTP. Try again.';
    } finally {
      loading.value = false;
    }
  }

  async function verifyOtp(): Promise<{ role: Role; vendorId: number | null } | null> {
    if (otp.value.length !== 6) { error.value = 'Enter the 6-digit OTP.'; return null; }
    loading.value = true;
    error.value   = '';
    try {
      const { data } = await axios.post<{
        token: string; role: Role; vendorId: number | null; phone: string; sectionGrants?: string[];
      }>(`${API_BASE_URL}/auth/verify-otp`, {
        phone:    phone.value.trim(),
        otp:      otp.value.trim(),
        deviceId: getDeviceId(),
      });
      authStore.login(data);
      step.value = 'success';
      sessionStorage.removeItem(OTP_FLOW_KEY);
      return { role: data.role, vendorId: data.vendorId };
    } catch (e: any) {
      error.value = e?.response?.data?.error ?? 'Invalid OTP. Try again.';
      otp.value   = '';
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { step, phone, otp, loading, error, sendOtp, verifyOtp, reset };
}
