/**
 * Sets document.title and the meta description for a page.
 * Call after data loads so the crawler sees real values.
 * Resets to the app default on unmount.
 */
export function usePageMeta() {
  const DEFAULT_TITLE = 'Peshkash — Your Shop Window, Digitally';
  const DEFAULT_DESC  = 'Peshkash is the digital presence platform for restaurants, vendors, and events.';

  function setMeta(title: string, description?: string) {
    document.title = title;
    let tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'description';
      document.head.appendChild(tag);
    }
    tag.content = description || DEFAULT_DESC;
  }

  function resetMeta() {
    document.title = DEFAULT_TITLE;
    const tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (tag) tag.content = DEFAULT_DESC;
  }

  return { setMeta, resetMeta };
}
