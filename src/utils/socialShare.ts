export type SocialShareOptions = {
  title: string;
  text: string;
  details?: string;
  previewPath?: string;
  url?: string;
  onCopied?: () => void;
};

export function sharePreviewUrl(previewPath: string, origin = typeof window !== 'undefined' ? window.location.origin : 'https://peshkash.app') {
  const normalized = previewPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return new URL(`/${normalized}`, origin).toString();
}

export function limitedShareDescription(description: string, limit = 50) {
  const normalized = description.replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  const candidate = normalized.slice(0, Math.max(1, limit - 1));
  const wordBoundary = candidate.lastIndexOf(' ');
  const shortened = wordBoundary >= Math.floor(limit * 0.6) ? candidate.slice(0, wordBoundary) : candidate;
  return `${shortened.replace(/[\s.,;:!?-]+$/, '')}…`;
}

export function formattedShareText(resource: string, description: string, url: string, details?: string) {
  const cleanResource = resource.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  const sections = [
    `See ${cleanResource} on Peshkash.`,
    limitedShareDescription(description),
    details?.replace(/\s+/g, ' ').trim(),
    `Find out more: ${url}`,
  ];
  return sections.filter(Boolean).join('\n\n');
}

/** Shares the canonical public page. The production edge serves crawler-facing
 * metadata for this same URL, so recipients never see the backend API address. */
export async function sharePublicPage(options: SocialShareOptions) {
  if (!options.url && !options.previewPath) {
    throw new Error('A public URL or preview path is required.');
  }

  const url = options.url || sharePreviewUrl(options.previewPath!);
  const message = formattedShareText(options.title, options.text, url, options.details);
  const payload = { title: options.title, text: message };

  if (navigator.share) {
    try {
      await navigator.share(payload);
      return true;
    } catch (error: any) {
      if (error?.name === 'AbortError') return false;
    }
  }

  await navigator.clipboard.writeText(message);
  options.onCopied?.();
  return true;
}
