import { API_BASE_URL } from '../config';

export type SocialShareOptions = {
  title: string;
  text: string;
  previewPath?: string;
  url?: string;
  onCopied?: () => void;
};

export function sharePreviewUrl(previewPath: string) {
  const normalized = previewPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `${API_BASE_URL}/share/${normalized}`;
}

/** Shares an explicit public URL when supplied, otherwise the crawler-friendly
 * server-rendered preview URL for rich social cards. */
export async function sharePublicPage(options: SocialShareOptions) {
  if (!options.url && !options.previewPath) {
    throw new Error('A public URL or preview path is required.');
  }

  const url = options.url || sharePreviewUrl(options.previewPath!);
  const payload = { title: options.title, text: options.text, url };

  if (navigator.share) {
    try {
      await navigator.share(payload);
      return true;
    } catch (error: any) {
      if (error?.name === 'AbortError') return false;
    }
  }

  await navigator.clipboard.writeText(url);
  options.onCopied?.();
  return true;
}
