import axios from 'axios';
import { API_BASE_URL } from '../config';

export interface PublicConfig {
  disableInspect: boolean;
  requireLoginRenagMs: number;
}

const DEFAULTS: PublicConfig = { disableInspect: false, requireLoginRenagMs: 5000 };

let cached: Promise<PublicConfig> | null = null;

/**
 * Fetches GET /api/public-config once per page load and shares the result with every
 * caller, so multiple features reading this endpoint (inspect guard, login nag, ...)
 * don't each fire their own request. Never rejects — a fetch failure resolves to safe
 * defaults so a flaky network can't crash whichever feature depends on this.
 */
export function usePublicConfig(): Promise<PublicConfig> {
  if (!cached) {
    cached = axios.get<Partial<PublicConfig>>(`${API_BASE_URL}/public-config`)
      .then(({ data }) => ({ ...DEFAULTS, ...data }))
      .catch(() => DEFAULTS);
  }
  return cached;
}
