import { API_BASE_URL } from '../config';

export type SocialShareOptions = {
  title: string;
  text: string;
  previewPath: string;
  onCopied?: () => void;
};

export function sharePreviewUrl(previewPath: string) {
  const normalized = previewPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `${API_BASE_URL}/share/${normalized}`;
}

/** Shares a crawler-friendly URL so WhatsApp, LinkedIn, Facebook and X receive
 * server-rendered Peshkash metadata before the visitor is redirected to the page. */
export async function sharePublicPage(options: SocialShareOptions) {
  const url = sharePreviewUrl(options.previewPath);
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
