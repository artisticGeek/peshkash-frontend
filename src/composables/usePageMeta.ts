export type PageMetaOptions = {
  title: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  imageAlt?: string;
};

const DEFAULT_TITLE = 'Peshkash — Your Shop Window, Digitally';
const DEFAULT_DESC = 'Peshkash is the digital presence platform for restaurants, vendors, and events.';
const DEFAULT_IMAGE = 'https://peshkash.app/brand/social/peshkash-home-preview.jpg';
const PUBLIC_ORIGIN = 'https://peshkash.app';

function setNamedMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function setCanonical(url: string) {
  let tag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement('link');
    tag.rel = 'canonical';
    document.head.appendChild(tag);
  }
  tag.href = url;
}

function publicPageUrl() {
  return `${PUBLIC_ORIGIN}${window.location.pathname}${window.location.search}`;
}

function absoluteImage(image: string) {
  if (/^https?:\/\//i.test(image)) return image;
  return `${PUBLIC_ORIGIN}/${image.replace(/^\//, '')}`;
}

function imageMimeType(image: string) {
  const pathname = new URL(image).pathname.toLowerCase();
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

/**
 * Keeps browser, Open Graph, Twitter and canonical metadata in one convention.
 * The string signature remains supported for older call sites.
 */
export function usePageMeta() {
  function setMeta(options: PageMetaOptions | string, legacyDescription?: string) {
    const meta: PageMetaOptions = typeof options === 'string'
      ? { title: options, description: legacyDescription }
      : options;
    const description = meta.description || DEFAULT_DESC;
    const image = absoluteImage(meta.image || DEFAULT_IMAGE);
    const url = meta.url || publicPageUrl();
    const imageAlt = meta.imageAlt || `${meta.title} — Peshkash preview`;

    document.title = meta.title;
    setNamedMeta('meta[name="description"]', 'name', 'description', description);
    setNamedMeta('meta[property="og:title"]', 'property', 'og:title', meta.title);
    setNamedMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setNamedMeta('meta[property="og:image"]', 'property', 'og:image', image);
    setNamedMeta('meta[property="og:image:secure_url"]', 'property', 'og:image:secure_url', image);
    setNamedMeta('meta[property="og:image:type"]', 'property', 'og:image:type', imageMimeType(image));
    setNamedMeta('meta[property="og:image:width"]', 'property', 'og:image:width', '1200');
    setNamedMeta('meta[property="og:image:height"]', 'property', 'og:image:height', '630');
    setNamedMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', imageAlt);
    setNamedMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setNamedMeta('meta[property="og:type"]', 'property', 'og:type', meta.type || 'website');
    setNamedMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'Peshkash');
    setNamedMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
    setNamedMeta('meta[name="twitter:title"]', 'name', 'twitter:title', meta.title);
    setNamedMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setNamedMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
    setNamedMeta('meta[name="twitter:image:alt"]', 'name', 'twitter:image:alt', imageAlt);
    setCanonical(url);
  }

  function resetMeta() {
    setMeta({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESC,
      image: DEFAULT_IMAGE,
      url: `${PUBLIC_ORIGIN}/`,
    });
  }

  return { setMeta, resetMeta };
}
