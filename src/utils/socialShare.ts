export type SocialShareOptions = {
  title: string;
  text: string;
  previewPath?: string;
  url?: string;
  onCopied?: () => void;
};

export function sharePreviewUrl(previewPath: string, origin = typeof window !== 'undefined' ? window.location.origin : 'https://peshkash.app') {
  const normalized = previewPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return new URL(`/${normalized}`, origin).toString();
}

export function formattedShareText(title: string, description: string) {
  return [title.trim(), description.trim()].filter(Boolean).join('\n\n');
}

/** Shares the canonical public page. The production edge serves crawler-facing
 * metadata for this same URL, so recipients never see the backend API address. */
export async function sharePublicPage(options: SocialShareOptions) {
  if (!options.url && !options.previewPath) {
    throw new Error('A public URL or preview path is required.');
  }

  const url = options.url || sharePreviewUrl(options.previewPath!);
  const message = formattedShareText(options.title, options.text);
  const payload = { title: options.title, text: message, url };

  if (navigator.share) {
    try {
      await navigator.share(payload);
      return true;
    } catch (error: any) {
      if (error?.name === 'AbortError') return false;
    }
  }

  await navigator.clipboard.writeText(`${message}\n\n${url}`);
  options.onCopied?.();
  return true;
}
