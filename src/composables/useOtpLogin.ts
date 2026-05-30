/**
 * useOtpLogin — composable that drives the two-step phone → OTP flow.
 * Used by both LoginDrawer (public pages) and DashboardLogin (dashboard gate).
 */

import { ref } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuthStore, Role } from '../stores/auth';

export type OtpStep = 'phone' | 'otp' | 'success';

export function useOtpLogin() {
  const authStore = useAuthStore();

  const step    = ref<OtpStep>('phone');
  const phone   = ref('');
  const otp     = ref('');
  const loading = ref(false);
  const error   = ref('');

  function reset() {
    step.value  = 'phone';
    phone.value = '';
    otp.value   = '';
    error.value = '';
  }

  async function sendOtp() {
    if (!phone.value.trim()) { error.value = 'Enter your phone number.'; return; }
    loading.value = true;
    error.value   = '';
    try {
      await axios.post(`${API_BASE_URL}/auth/send-otp`, { phone: phone.value.trim() });
      step.value = 'otp';
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
        token: string; role: Role; vendorId: number | null; phone: string;
      }>(`${API_BASE_URL}/auth/verify-otp`, {
        phone: phone.value.trim(),
        otp:   otp.value.trim(),
      });
      authStore.login(data);
      step.value = 'success';
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
