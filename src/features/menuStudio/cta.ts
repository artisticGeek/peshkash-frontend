// Item-page call-to-action config. Mirrors peshkash_backend/src/utils/CtaConfigUtil.ts.
import type { BuiltInCta, CtaConfig, CustomCta, CustomCtaKind } from './types';

export const BUILT_IN_CTAS: Array<{ key: BuiltInCta; label: string; icon: string }> = [
  { key: 'like', label: 'Like', icon: 'bi-hand-thumbs-up' },
  { key: 'dislike', label: 'Dislike', icon: 'bi-hand-thumbs-down' },
  { key: 'save', label: 'Save', icon: 'bi-bookmark-plus' },
  { key: 'share', label: 'Share', icon: 'bi-share-fill' },
];

export const CUSTOM_CTA_KINDS: Array<{ kind: CustomCtaKind; label: string; icon: string; placeholder: string }> = [
  { kind: 'whatsapp', label: 'WhatsApp', icon: 'bi-whatsapp', placeholder: '+91 98765 43210' },
  { kind: 'call', label: 'Call', icon: 'bi-telephone', placeholder: '+91 98765 43210' },
  { kind: 'link', label: 'Link', icon: 'bi-box-arrow-up-right', placeholder: 'https://…' },
];

export const MAX_CUSTOM_CTAS = 3;

export function defaultCtaConfig(): CtaConfig {
  return { like: true, dislike: true, save: true, share: true, custom: [] };
}

export function normalizeCtaConfig(raw: unknown): CtaConfig {
  const base = defaultCtaConfig();
  if (!raw || typeof raw !== 'object') return base;
  const input = raw as Partial<CtaConfig>;
  for (const { key } of BUILT_IN_CTAS) if (typeof input[key] === 'boolean') base[key] = input[key] as boolean;
  if (Array.isArray(input.custom)) base.custom = input.custom.filter((cta) => cta && cta.label && cta.kind).slice(0, MAX_CUSTOM_CTAS);
  return base;
}

/** The buttons a guest sees for an item: its own override or the menu default. */
export function effectiveCtas(menuConfig: unknown, itemOverride: unknown): CtaConfig {
  return itemOverride ? normalizeCtaConfig(itemOverride) : normalizeCtaConfig(menuConfig);
}

export function newCustomCta(kind: CustomCtaKind, existing: CustomCta[]): CustomCta {
  const label = kind === 'whatsapp' ? 'Ask on WhatsApp' : kind === 'call' ? 'Call to order' : 'Learn more';
  let n = existing.length + 1;
  while (existing.some((cta) => cta.id === `cta-${n}`)) n++;
  return { id: `cta-${n}`, label, kind, value: '', message: kind === 'whatsapp' ? 'Hi! I have a question about {item}.' : undefined };
}

/** Where a custom CTA sends the guest. Empty string when the CTA is incomplete. */
export function customCtaHref(cta: CustomCta, itemName: string): string {
  const digits = cta.value.replace(/\D/g, '');
  if (cta.kind === 'whatsapp') {
    if (digits.length < 7) return '';
    const text = cta.message ? `?text=${encodeURIComponent(cta.message.split('{item}').join(itemName))}` : '';
    return `https://wa.me/${digits}${text}`;
  }
  if (cta.kind === 'call') return digits.length >= 7 ? `tel:${cta.value.trim().startsWith('+') ? '+' : ''}${digits}` : '';
  return /^https?:\/\//i.test(cta.value.trim()) ? cta.value.trim() : '';
}

export function customCtaIcon(kind: CustomCtaKind): string {
  return CUSTOM_CTA_KINDS.find((entry) => entry.kind === kind)?.icon ?? 'bi-box-arrow-up-right';
}
