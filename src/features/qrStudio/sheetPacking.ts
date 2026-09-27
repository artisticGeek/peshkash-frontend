export type PackingGrouping = 'optimized' | 'size' | 'template' | 'order';

export interface PackingItem<T> {
  value: T;
  index: number;
  width: number;
  height: number;
  groupKey?: string;
}

export interface PackedItem<T> extends PackingItem<T> {
  x: number;
  y: number;
  row: number;
}

export interface PackedPage<T> {
  number: number;
  items: PackedItem<T>[];
}

export interface PackingResult<T> {
  pages: PackedPage<T>[];
  pageCount: number;
  columns: number;
  rows: number;
  fits: boolean;
}

interface Shelf<T> {
  y: number;
  height: number;
  width: number;
  items: PackingItem<T>[];
  groupKey?: string;
}

interface WorkingPage<T> { shelves: Shelf<T>[] }

function stableSort<T>(items: PackingItem<T>[], compare: (a: PackingItem<T>, b: PackingItem<T>) => number): PackingItem<T>[] {
  return [...items].sort((a, b) => compare(a, b) || a.index - b.index);
}

function sizeKey<T>(item: PackingItem<T>): string {
  return `${item.width.toFixed(3)}x${item.height.toFixed(3)}`;
}

function groupedOrder<T>(items: PackingItem<T>[], keyFor: (item: PackingItem<T>) => string): PackingItem<T>[] {
  const groups = new Map<string, PackingItem<T>[]>();
  for (const item of items) {
    const key = keyFor(item);
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => Math.max(...b.map(item => item.width * item.height)) - Math.max(...a.map(item => item.width * item.height)) || a[0].index - b[0].index)
    .flatMap(group => stableSort(group, (a, b) => b.height - a.height || b.width - a.width));
}

function packOrdered<T>(items: PackingItem<T>[], pageWidth: number, pageHeight: number, margin: number, gap: number, maxPerRow: number, compact: boolean, shelfGroup?: (item: PackingItem<T>) => string): PackingResult<T> {
  const usableWidth = Math.max(0, pageWidth - margin * 2);
  const usableHeight = Math.max(0, pageHeight - margin * 2);
  const pages: WorkingPage<T>[] = [];
  let fits = usableWidth > 0 && usableHeight > 0;

  for (const item of items) {
    if (item.width > usableWidth || item.height > usableHeight) fits = false;
    let chosen: { page: WorkingPage<T>; shelf: Shelf<T> } | undefined;
    if (compact) {
      let leastWaste = Number.POSITIVE_INFINITY;
      for (const page of pages) for (const shelf of page.shelves) {
        if (shelfGroup && shelf.groupKey !== shelfGroup(item)) continue;
        const nextWidth = shelf.width + (shelf.items.length ? gap : 0) + item.width;
        if (shelf.items.length >= maxPerRow || item.height > shelf.height || nextWidth > usableWidth) continue;
        const waste = usableWidth - nextWidth + (shelf.height - item.height);
        if (waste < leastWaste) { leastWaste = waste; chosen = { page, shelf }; }
      }
    } else {
      const page = pages[pages.length - 1];
      const shelf = page?.shelves[page.shelves.length - 1];
      const nextWidth = shelf ? shelf.width + (shelf.items.length ? gap : 0) + item.width : Number.POSITIVE_INFINITY;
      if (page && shelf && shelf.items.length < maxPerRow && item.height <= shelf.height && nextWidth <= usableWidth) chosen = { page, shelf };
    }

    if (!chosen) {
      let page = compact
        ? pages.find(candidate => candidate.shelves.reduce((sum, shelf) => sum + shelf.height, 0) + candidate.shelves.length * gap + item.height <= usableHeight)
        : pages[pages.length - 1];
      const usedHeight = page?.shelves.reduce((sum, shelf) => sum + shelf.height, 0) ?? 0;
      const requiredHeight = usedHeight + (page?.shelves.length ? gap : 0) + item.height;
      if ((!page || requiredHeight > usableHeight) && compact && shelfGroup) {
        let leastWaste = Number.POSITIVE_INFINITY;
        for (const fallbackPage of pages) for (const shelf of fallbackPage.shelves) {
          const nextWidth = shelf.width + (shelf.items.length ? gap : 0) + item.width;
          if (shelf.items.length >= maxPerRow || item.height > shelf.height || nextWidth > usableWidth) continue;
          const waste = usableWidth - nextWidth + (shelf.height - item.height);
          if (waste < leastWaste) { leastWaste = waste; chosen = { page: fallbackPage, shelf }; }
        }
      }
      if (!chosen) {
        if (!page || requiredHeight > usableHeight) { page = { shelves: [] }; pages.push(page); }
        const y = margin + page.shelves.reduce((sum, shelf) => sum + shelf.height, 0) + page.shelves.length * gap;
        const shelf: Shelf<T> = { y, height: item.height, width: 0, items: [], groupKey: shelfGroup?.(item) };
        page.shelves.push(shelf); chosen = { page, shelf };
      }
    }
    chosen.shelf.width += (chosen.shelf.items.length ? gap : 0) + item.width;
    chosen.shelf.items.push(item);
  }

  let columns = 0; let rows = 0;
  const packedPages = pages.map((page, pageIndex) => {
    rows = Math.max(rows, page.shelves.length);
    const packed: PackedItem<T>[] = [];
    page.shelves.forEach((shelf, row) => {
      columns = Math.max(columns, shelf.items.length);
      let x = margin + Math.max(0, (usableWidth - shelf.width) / 2);
      for (const item of shelf.items) {
        packed.push({ ...item, x, y: shelf.y, row });
        x += item.width + gap;
      }
    });
    return { number: pageIndex + 1, items: packed };
  });
  return { pages: packedPages, pageCount: packedPages.length, columns, rows, fits };
}

function resultScore<T>(result: PackingResult<T>, pageWidth: number, pageHeight: number): number {
  const usedArea = result.pages.reduce((sum, page) => sum + page.items.reduce((pageSum, item) => pageSum + item.width * item.height, 0), 0);
  return result.pageCount * pageWidth * pageHeight - usedArea + result.rows;
}

export function packSheets<T>(items: PackingItem<T>[], options: { pageWidth: number; pageHeight: number; margin: number; gap: number; maxPerRow: number; grouping: PackingGrouping }): PackingResult<T> {
  if (!items.length) return { pages: [], pageCount: 0, columns: 0, rows: 0, fits: true };
  const { pageWidth, pageHeight, margin, gap } = options;
  const maxPerRow = Math.max(1, Math.round(options.maxPerRow));
  if (options.grouping === 'order') return packOrdered(items, pageWidth, pageHeight, margin, gap, maxPerRow, false);
  const candidates = [
    stableSort(items, (a, b) => b.height - a.height || b.width - a.width),
    stableSort(items, (a, b) => (b.width * b.height) - (a.width * a.height) || b.height - a.height),
    stableSort(items, (a, b) => b.width - a.width || b.height - a.height),
    groupedOrder(items, sizeKey),
  ].map(order => packOrdered(order, pageWidth, pageHeight, margin, gap, maxPerRow, true));
  const best = candidates.sort((a, b) => a.pageCount - b.pageCount || resultScore(a, pageWidth, pageHeight) - resultScore(b, pageWidth, pageHeight))[0];
  if (options.grouping === 'size') {
    const grouped = packOrdered(groupedOrder(items, sizeKey), pageWidth, pageHeight, margin, gap, maxPerRow, true, sizeKey);
    return grouped.pageCount <= best.pageCount ? grouped : best;
  }
  if (options.grouping === 'template') {
    const grouped = packOrdered(groupedOrder(items, item => item.groupKey || ''), pageWidth, pageHeight, margin, gap, maxPerRow, true, item => item.groupKey || '');
    return grouped.pageCount <= best.pageCount ? grouped : best;
  }
  return best;
}
