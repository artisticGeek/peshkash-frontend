export type PublicGuest = {
  id?: string | number;
  name?: string;
  imageUrl?: string;
  instagram?: string;
};

export function instagramUsername(value?: string) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (host !== 'instagram.com' && !host.endsWith('.instagram.com')) return null;
    const username = url.pathname.split('/').filter(Boolean)[0] || '';
    if (['accounts', 'direct', 'explore', 'p', 'reel', 'reels', 'stories'].includes(username.toLowerCase())) return null;
    return /^[a-zA-Z0-9._]{1,30}$/.test(username) ? username.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function guestPortraitUrl(guest: PublicGuest, apiBaseUrl: string) {
  if (guest.imageUrl?.trim()) return guest.imageUrl.trim();
  const username = instagramUsername(guest.instagram);
  return username ? `${apiBaseUrl.replace(/\/$/, '')}/instagram-avatar/${encodeURIComponent(username)}` : '';
}

export function guestInitials(name?: string) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'P';
  return [words[0], words.length > 1 ? words[words.length - 1] : '']
    .filter(Boolean)
    .map((word) => word[0].toUpperCase())
    .join('')
    .slice(0, 2);
}
