export type ContactPageMode = 'classic' | 'editorial' | 'lookbook' | 'programme' | 'shopfront';
export type ContactPageSectionKey = 'story' | 'gallery' | 'events' | 'menus' | 'contact';
export type ContactPageEventScope = 'all' | 'selected' | 'upcoming' | 'past';
export type ContactPageGalleryLayout = 'carousel' | 'grid' | 'spread';

export type ContactPageConfig = {
  kicker: string;
  coverImageUrl: string;
  storyHeading: string;
  storyBody: string;
  storyQuote: string;
  storyQuoteBy: string;
  gallery: Array<{ url: string; caption: string }>;
  galleryLayout: ContactPageGalleryLayout;
  sections: Array<{ key: ContactPageSectionKey; enabled: boolean }>;
  showCountdown: boolean;
  eventScope: ContactPageEventScope;
  eventIds: number[];
  menuIds: number[];
};

export const CONTACT_PAGE_OPTIONS: Array<{ value: ContactPageMode; label: string; description: string; icon: string }> = [
  { value: 'classic', label: 'Classic contact card', description: 'The compact, familiar save-and-share card.', icon: 'bi-person-vcard' },
  { value: 'editorial', label: 'Editorial', description: 'A calm story-led page with an arched cover.', icon: 'bi-layout-text-window-reverse' },
  { value: 'lookbook', label: 'Lookbook', description: 'Image-forward presentation for visual brands.', icon: 'bi-images' },
  { value: 'programme', label: 'Programme', description: 'A dark, event-first page with strong dates.', icon: 'bi-calendar-event' },
  { value: 'shopfront', label: 'Shopfront', description: 'A practical catalog-style business website.', icon: 'bi-shop-window' },
];

export const CONTACT_PAGE_SECTION_LABELS: Record<ContactPageSectionKey, string> = {
  story: 'Our story', gallery: 'Gallery', events: 'Events', menus: 'Menus', contact: 'Visit & contact',
};

const CONTACT_PAGE_MODES = new Set<ContactPageMode>(['classic', 'editorial', 'lookbook', 'programme', 'shopfront']);

export function normalizeContactPageMode(input: unknown): ContactPageMode {
  const value = String(input || 'classic').toLowerCase();
  // `page` was the name used by the first version of the full vendor page.
  if (value === 'page') return 'editorial';
  return CONTACT_PAGE_MODES.has(value as ContactPageMode) ? value as ContactPageMode : 'classic';
}

export function contactFieldValue(contact: unknown, label: string): string {
  if (!Array.isArray(contact)) return '';
  const prefix = `${label.toLowerCase()}:`;
  const row = contact.find((value): value is string => typeof value === 'string' && value.toLowerCase().startsWith(prefix));
  return row?.slice(row.indexOf(':') + 1).trim() || '';
}

export function isPlausiblePhone(value: unknown): value is string {
  if (typeof value !== 'string' || !/^[+\d\s().-]+$/.test(value.trim())) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function vendorPhoneValue(contact: unknown): string {
  if (!Array.isArray(contact)) return '';
  const labelled = contactFieldValue(contact, 'Phone');
  if (isPlausiblePhone(labelled)) return labelled;
  const legacy = contact.find((value): value is string => typeof value === 'string' && !value.includes(':'));
  return isPlausiblePhone(legacy) ? legacy.trim() : '';
}

export function defaultContactPageConfig(): ContactPageConfig {
  return {
    kicker: '', coverImageUrl: '', storyHeading: '', storyBody: '', storyQuote: '', storyQuoteBy: '', gallery: [], galleryLayout: 'grid',
    sections: (['story', 'gallery', 'events', 'menus', 'contact'] as ContactPageSectionKey[]).map(key => ({ key, enabled: true })),
    showCountdown: true, eventScope: 'all', eventIds: [], menuIds: [],
  };
}

export function normalizeContactPageConfig(input: any): ContactPageConfig {
  const fallback = defaultContactPageConfig();
  const seen = new Set<ContactPageSectionKey>();
  const sections = (Array.isArray(input?.sections) ? input.sections : [])
    .filter((section: any) => section && section.key in CONTACT_PAGE_SECTION_LABELS && !seen.has(section.key) && seen.add(section.key))
    .map((section: any) => ({ key: section.key as ContactPageSectionKey, enabled: section.enabled !== false }));
  for (const section of fallback.sections) if (!seen.has(section.key)) sections.push(section);
  return {
    ...fallback,
    ...input,
    gallery: Array.isArray(input?.gallery) ? input.gallery.filter((item: any) => item?.url).map((item: any) => ({ url: String(item.url), caption: String(item.caption || '') })) : [],
    galleryLayout: ['carousel', 'grid', 'spread'].includes(input?.galleryLayout) ? input.galleryLayout : 'grid',
    sections,
    eventIds: Array.isArray(input?.eventIds) ? input.eventIds.map(Number).filter(Number.isFinite) : [],
    menuIds: Array.isArray(input?.menuIds) ? input.menuIds.map(Number).filter(Number.isFinite) : [],
  };
}
