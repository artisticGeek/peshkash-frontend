import { watch } from 'vue';
import type { Router } from 'vue-router';
import { usePublicConfig } from './usePublicConfig';

// A deterrent, not real protection — anything shipped to a customer's browser
// can still be inspected by someone determined enough (view-source over the
// network, browser extensions, etc). It just keeps casual right-click/F12
// snooping off the public menu pages when the vendor asks for it.
const BLOCKED_KEY_COMBOS = [
  { key: 'F12' },
  { key: 'I', ctrl: true, shift: true },
  { key: 'J', ctrl: true, shift: true },
  { key: 'C', ctrl: true, shift: true },
  { key: 'U', ctrl: true },
];

function matchesBlockedCombo(e: KeyboardEvent): boolean {
  return BLOCKED_KEY_COMBOS.some(
    (combo) =>
      e.key.toUpperCase() === combo.key &&
      Boolean(combo.ctrl) === (e.ctrlKey || e.metaKey) &&
      Boolean(combo.shift) === e.shiftKey
  );
}

function blockContextMenu(e: MouseEvent): void { e.preventDefault(); }
function blockKeydown(e: KeyboardEvent): void { if (matchesBlockedCombo(e)) e.preventDefault(); }

function isGuardedRoute(path: string): boolean {
  return !path.startsWith('/dashboard') && !path.startsWith('/onboard');
}

/**
 * Applies/removes the right-click + DevTools-shortcut deterrent based on the
 * `disable_inspect` app_config flag, scoped to public-facing routes only —
 * the admin/vendor dashboard and onboarding wizard always keep normal
 * browser behavior since they need DevTools for support/debugging.
 */
export function useInspectGuard(router: Router): void {
  let enabled = false;
  let active = false;

  function apply(path: string) {
    const shouldBeActive = enabled && isGuardedRoute(path);
    if (shouldBeActive === active) return;
    active = shouldBeActive;
    if (active) {
      document.addEventListener('contextmenu', blockContextMenu);
      document.addEventListener('keydown', blockKeydown);
    } else {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockKeydown);
    }
  }

  usePublicConfig().then((config) => {
    enabled = config.disableInspect;
    apply(router.currentRoute.value.path);
  });

  watch(() => router.currentRoute.value.path, (path) => apply(path));
}
