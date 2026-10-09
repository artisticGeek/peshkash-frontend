// Shared types for the Menu Studio (Peshkash 4.0 menu designer).

export type BuiltInCta = 'like' | 'dislike' | 'save' | 'share';
export type CustomCtaKind = 'whatsapp' | 'call' | 'link';

export type CustomCta = {
  id: string;
  label: string;
  kind: CustomCtaKind;
  value: string;
  message?: string;
};

export type CtaConfig = Record<BuiltInCta, boolean> & { custom: CustomCta[] };

export type StudioMenu = {
  id: number;
  name: string;
  displayName: string;
  description?: string | null;
  itemStoryHeading?: string;
  itemMaterialHeading?: string;
  elaborateDescriptions?: boolean;
  ctaConfig?: CtaConfig;
  isActive: boolean;
  vendorId: number;
  type: string;
  sourceMenuId?: number | null;
  createdAt?: string;
};

export type StudioItem = {
  id: number;
  name: string;
  displayName: string;
  description?: string | null;
  ingredients?: string | null;
  image?: string | null;
  type?: string | null;
  enumType?: string | null;
  isActive: boolean;
  sortOrder: number;
  price?: string | null;
  tags?: string[];
  allergens?: string[];
  isVeg?: boolean | null;
  spiceLevel?: number | null;
  ctaConfig?: CtaConfig | null;
  menuId: number;
  parentId?: number | null;
  createdAt?: string;
};

/** An item from the vendor's item pool (every line item across the vendor's menus). */
export type PoolItem = StudioItem & { menuName?: string; menuDisplayName?: string };

export type TreeNode = {
  item: StudioItem;
  section: boolean;
  children: TreeNode[];
  depth: number;
};

/** One unique entry in the item bank (duplicates across menus collapsed). */
export type BankEntry = {
  key: string;
  item: PoolItem;
  menuIds: number[];
  inCurrentMenu: boolean;
};

/** A section from another menu that can be dropped in with everything inside it. */
export type SectionTemplate = {
  item: PoolItem;
  menuDisplayName: string;
  itemCount: number;
  subtree: PoolItem[];
};

export type StudioEvent = { id: number; name: string; displayName: string };

export type DragPayload =
  | { kind: 'node'; id: number }
  | { kind: 'bank'; key: string }
  | { kind: 'template'; id: number }
  | { kind: 'new'; section: boolean };

export type DropTarget = { parentId: number | null; index: number };

export type Selection = { kind: 'menu' } | { kind: 'item'; id: number };
