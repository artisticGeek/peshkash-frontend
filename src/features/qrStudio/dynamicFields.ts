import type { CanvasElement, ElementKey, StudioDesign } from './types';

export const DYNAMIC_FIELD_OPTIONS = [
  { value: 'target.name', label: 'Target / product name', sample: 'Paneer Tikka' },
  { value: 'target.description', label: 'Target description', sample: 'Charred paneer with peppers and house spices' },
  { value: 'target.type', label: 'Target type', sample: 'Item spotlight' },
  { value: 'item.name', label: 'Item / product name', sample: 'Paneer Tikka' },
  { value: 'item.description', label: 'Item / product description', sample: 'Charred paneer with peppers and house spices' },
  { value: 'item.price', label: 'Item / product price', sample: '₹450' },
  { value: 'menu.name', label: 'Menu / collection name', sample: 'Wedding Dinner' },
  { value: 'menu.description', label: 'Menu / collection description', sample: 'A seasonal dinner menu' },
  { value: 'event.name', label: 'Event name', sample: 'Sanya & Agam Reception' },
  { value: 'event.description', label: 'Event description', sample: 'An evening of food and celebration' },
  { value: 'event.venue', label: 'Event venue', sample: 'The Grand Ballroom' },
  { value: 'event.date', label: 'Event date', sample: '30 August 2026' },
  { value: 'vendor.name', label: 'Vendor / designer name', sample: 'The Craft Studio' },
  { value: 'vendor.description', label: 'Vendor / designer description', sample: 'Designed and presented by The Craft Studio' },
  { value: 'qr.hash', label: 'QR asset name', sample: 'paneer-tikka-card' },
  { value: 'qr.shortUrl', label: 'QR short URL', sample: 'https://peshkash.app/paneer-tikka-card' },
] as const;

export type DynamicFieldKey = typeof DYNAMIC_FIELD_OPTIONS[number]['value'];
export type DynamicValues = Partial<Record<DynamicFieldKey, string>>;
export type FixedTextBindings = Partial<Record<Exclude<ElementKey, 'brandmark'>, DynamicFieldKey>>;

export function dynamicFieldSample(key?: string): string {
  return DYNAMIC_FIELD_OPTIONS.find(option => option.value === key)?.sample ?? '';
}

export function resolveDynamicValue(key: string | undefined, values: DynamicValues, fallback = ''): string {
  if (!key) return fallback;
  const value = values[key as DynamicFieldKey];
  return value == null ? '' : String(value);
}

export function requiredDynamicFields(design: StudioDesign): DynamicFieldKey[] {
  const keys = Object.values(design.fieldBindings ?? {});
  for (const element of design.canvasElements ?? []) {
    if ((element.kind === 'text' || element.kind === 'cta') && element.dynamicField) keys.push(element.dynamicField);
  }
  return [...new Set(keys.filter(Boolean))] as DynamicFieldKey[];
}

export function missingDynamicFields(design: StudioDesign, values: DynamicValues): DynamicFieldKey[] {
  return requiredDynamicFields(design).filter(key => values[key] == null || String(values[key]).trim() === '');
}

export function resolveDesignBindings(design: StudioDesign, values: DynamicValues): StudioDesign {
  const resolved = JSON.parse(JSON.stringify(design)) as StudioDesign;
  const bindings = resolved.fieldBindings ?? {};
  for (const field of ['merchantName', 'eyebrow', 'headline', 'descriptor', 'cta'] as const) {
    resolved[field] = resolveDynamicValue(bindings[field], values, resolved[field]);
  }
  resolved.canvasElements = (resolved.canvasElements ?? []).map((element: CanvasElement) => {
    if ((element.kind === 'text' || element.kind === 'cta') && element.dynamicField) {
      return { ...element, text: resolveDynamicValue(element.dynamicField, values, element.text) };
    }
    return element;
  });
  return resolved;
}
