export type EventExperienceLike = Record<string, any> | null | undefined;

function normalizedUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try { return new URL(raw).toString(); } catch { return raw; }
}

function normalizedText(value: unknown): string {
  return String(value ?? '').trim();
}

/** True only when the persisted read model explicitly enables the standalone page. */
export function hasStandaloneEventPage(event?: { experienceConfig?: EventExperienceLike } | null): boolean {
  return event?.experienceConfig?.enabled === true;
}

/**
 * Compare the fields that materially affect the public page. The API is allowed to canonicalize
 * URLs and sortOrder values, but it must not silently drop copy, options, or guests.
 */
export function eventExperienceWasPersisted(requested: EventExperienceLike, persisted: EventExperienceLike): boolean {
  if (Boolean(requested?.enabled) !== Boolean(persisted?.enabled)) return false;
  if (!requested?.enabled) return true;

  const textKeys = ['eyebrow', 'venueName', 'venueAddress', 'livestreamLabel', 'reminderMode'] as const;
  const urlKeys = ['heroImageUrl', 'mapUrl', 'livestreamUrl'] as const;
  const booleanKeys = ['registrationEnabled', 'reminderEnabled', 'countdownEnabled', 'organizerVisible', 'contactVisible'] as const;
  if (textKeys.some((key) => normalizedText(requested[key]) !== normalizedText(persisted?.[key]))) return false;
  if (urlKeys.some((key) => normalizedUrl(requested[key]) !== normalizedUrl(persisted?.[key]))) return false;
  if (booleanKeys.some((key) => Boolean(requested[key]) !== Boolean(persisted?.[key]))) return false;

  const requestedPreview = requested.socialPreview ?? {};
  const persistedPreview = persisted?.socialPreview ?? {};
  if (['imageAlt', 'titleOverride', 'descriptionOverride', 'generatedAt', 'source'].some((key) => normalizedText(requestedPreview[key]) !== normalizedText(persistedPreview[key]))) return false;
  if (['imageUrl', 'generatedImageUrl'].some((key) => normalizedUrl(requestedPreview[key]) !== normalizedUrl(persistedPreview[key]))) return false;
  if (Math.max(1, Number(requestedPreview.version) || 1) !== Math.max(1, Number(persistedPreview.version) || 1)) return false;

  const requestedGuests = Array.isArray(requested.guests) ? requested.guests : [];
  const persistedGuests = Array.isArray(persisted?.guests) ? persisted.guests : [];
  if (requestedGuests.length !== persistedGuests.length) return false;
  return requestedGuests.every((guest: any, index: number) => {
    const saved = persistedGuests[index] ?? {};
    return ['name', 'role', 'bio', 'phone', 'vendorSlug'].every((key) => normalizedText(guest[key]) === normalizedText(saved[key]))
      && ['imageUrl', 'website', 'instagram', 'youtube', 'linkedin'].every((key) => normalizedUrl(guest[key]) === normalizedUrl(saved[key]))
      && Boolean(guest.visible !== false) === Boolean(saved.visible !== false);
  });
}

export function eventPublishChecklist(input: {
  vendorSelected: boolean;
  eventSelected: boolean;
  hasStartTime: boolean;
  hasEndTime: boolean;
  standalonePageEnabled: boolean;
  linkedMenuCount: number;
  linkedItemCount: number;
}) {
  const hasPublicExperience = input.standalonePageEnabled || input.linkedMenuCount > 0;
  return [
    { label: 'Vendor selected', done: input.vendorSelected },
    { label: 'Event selected or saved', done: input.eventSelected },
    { label: 'Event has active dates', done: input.hasStartTime && input.hasEndTime },
    { label: 'Public experience configured', done: hasPublicExperience },
    { label: 'Content is ready', done: input.standalonePageEnabled || input.linkedItemCount > 0 },
  ];
}
