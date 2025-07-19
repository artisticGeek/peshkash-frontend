export type LineItem = {
  name: string;
  itemType: 'category' | 'dish';
  subCategoryLineItems?: LineItem[];
};
