import { type Ref, watch } from 'vue';
import { usePublicConfig } from './usePublicConfig';

/**
 * Nags a visitor to log in on a vendor with requireLogin=true. Deliberately not a hard
 * gate: the page and its data are already public regardless, so this never blocks
 * interaction — the login modal stays fully dismissible, it just reopens after a
 * DB-configured delay (app_config 'require_login_renag_ms') for as long as the visitor
 * hasn't logged in.
 *
 * Only ever schedules a reopen from a CLOSE transition of `modalOpen` — an open modal is
 * left alone, so this can never interrupt someone mid-OTP-entry.
 */
export function useRequireLoginGate(
  requireLogin: Ref<boolean | undefined>,
  isLoggedIn: Ref<boolean>,
  modalOpen: Ref<boolean>,
): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let renagMs = 5000;

  usePublicConfig().then((config) => { renagMs = config.requireLoginRenagMs; });

  function clear(): void {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  watch(modalOpen, (open) => {
    clear();
    if (open || !requireLogin.value || isLoggedIn.value) return;
    timer = setTimeout(() => {
      timer = null;
      if (requireLogin.value && !isLoggedIn.value) modalOpen.value = true;
    }, renagMs);
  });

  watch(isLoggedIn, (loggedIn) => { if (loggedIn) clear(); });
}
