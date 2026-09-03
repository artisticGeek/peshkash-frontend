const CRAWLER_PATTERN = /bot|crawler|spider|facebookexternalhit|facebot|whatsapp|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|skypeuripreview|applebot|google-inspectiontool/i;
const BACKEND_SHARE_ORIGIN = 'https://peshkash-backend.onrender.com/api/share';

export function socialPreviewPath(pathname) {
  if (pathname === '/') return '';
  if (pathname === '/exhibits') return '/exhibits';
  if (pathname === '/showrooms') return '/showrooms';
  if (/^\/vendor\/[^/]+\/?$/.test(pathname)) return pathname.replace(/\/$/, '');
  if (/^\/event\/[^/]+(?:\/menu\/[^/]+(?:\/item\/[^/]+)?)?\/?$/.test(pathname)) return pathname.replace(/\/$/, '');
  return null;
}

export async function onRequest(context) {
  const request = context.request;
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);
  const previewPath = socialPreviewPath(url.pathname);
  if (!CRAWLER_PATTERN.test(userAgent) || previewPath === null) return context.next();

  try {
    const previewResponse = await fetch(`${BACKEND_SHARE_ORIGIN}${previewPath}`, {
      headers: { 'User-Agent': userAgent, Accept: 'text/html' },
      redirect: 'manual',
    });
    if (!previewResponse.ok) return context.next();
    const headers = new Headers(previewResponse.headers);
    headers.set('Cache-Control', 'private, no-store');
    headers.set('CDN-Cache-Control', 'no-store');
    headers.set('Vary', 'User-Agent');
    headers.set('X-Peshkash-Preview', 'crawler');
    return new Response(previewResponse.body, { status: previewResponse.status, headers });
  } catch {
    return context.next();
  }
}
