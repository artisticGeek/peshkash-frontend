import test from 'node:test';
import assert from 'node:assert/strict';
import { applyOrder, buildTree, countLeaves, orderWithInsert, planMove, uniqueSlug, ancestry } from '../src/features/menuStudio/tree.js';
import { bankKey, buildBank, buildSectionTemplates } from '../src/features/menuStudio/bank.js';
import { customCtaHref, effectiveCtas, normalizeCtaConfig } from '../src/features/menuStudio/cta.js';
import type { PoolItem, StudioItem } from '../src/features/menuStudio/types.js';

const row = (id: number, displayName: string, parentId: number | null, sortOrder: number, extra: Partial<StudioItem> = {}): StudioItem => ({
  id, name: displayName.toLowerCase().replace(/\W+/g, '-'), displayName, parentId, sortOrder, isActive: true, menuId: 1, type: 'item', ...extra,
});

// Starters(1) [Kebab(2), Tikka(3)], Mains(4) [Curries(5) [Dal(6)]], Phirni(7)
const menu = (): StudioItem[] => [
  row(1, 'Starters', null, 0, { type: 'category' }),
  row(2, 'Kebab', 1, 0),
  row(3, 'Tikka', 1, 1),
  row(4, 'Mains', null, 1, { type: 'category' }),
  row(5, 'Curries', 4, 0, { type: 'category' }),
  row(6, 'Dal', 5, 0),
  row(7, 'Phirni', null, 2),
];

test('buildTree nests to any depth and counts leaves', () => {
  const tree = buildTree(menu());
  assert.deepEqual(tree.map((node) => node.item.displayName), ['Starters', 'Mains', 'Phirni']);
  assert.equal(tree[1].children[0].children[0].item.displayName, 'Dal');
  assert.equal(tree[1].children[0].depth, 1);
  assert.equal(countLeaves(tree[1]), 1);
  assert.equal(tree[2].section, false);
  assert.deepEqual(ancestry(menu(), 6).map((item) => item.displayName), ['Mains', 'Curries']);
});

test('an empty category is still a section', () => {
  const tree = buildTree([row(1, 'Desserts', null, 0, { type: 'category' })]);
  assert.equal(tree[0].section, true);
});

test('planMove reorders within a section', () => {
  // Move Kebab below Tikka: drop zone index 2 in the rendered list [Kebab, Tikka].
  const entries = planMove(menu(), 2, { parentId: 1, index: 2 })!;
  const moved = buildTree(applyOrder(menu(), entries));
  assert.deepEqual(moved[0].children.map((node) => node.item.displayName), ['Tikka', 'Kebab']);
  assert.equal(planMove(menu(), 2, { parentId: 1, index: 1 }), null, 'dropping right below itself changes nothing');
});

test('planMove moves across sections and renumbers both lists', () => {
  const entries = planMove(menu(), 3, { parentId: 5, index: 0 })!;
  const items = applyOrder(menu(), entries);
  const tree = buildTree(items);
  assert.deepEqual(tree[0].children.map((node) => node.item.displayName), ['Kebab']);
  assert.deepEqual(tree[1].children[0].children.map((node) => node.item.displayName), ['Tikka', 'Dal']);
  assert.ok(entries.some((entry) => entry.id === 2 && entry.sortOrder === 0));
});

test('planMove refuses to put a section inside itself', () => {
  assert.equal(planMove(menu(), 4, { parentId: 5, index: 0 }), null);
  assert.equal(planMove(menu(), 4, { parentId: 4, index: 0 }), null);
});

test('orderWithInsert places new ids and keeps sort orders dense', () => {
  const entries = orderWithInsert(menu(), { parentId: null, index: 1 }, [99]);
  assert.deepEqual(entries.map((entry) => entry.id), [1, 99, 4, 7]);
  assert.deepEqual(entries.map((entry) => entry.sortOrder), [0, 1, 2, 3]);
});

test('uniqueSlug avoids slugs already used in the menu', () => {
  assert.equal(uniqueSlug('Dal Makhani', []), 'dal-makhani');
  assert.equal(uniqueSlug('Dal Makhani', ['dal-makhani', 'dal-makhani-2']), 'dal-makhani-3');
  assert.equal(uniqueSlug('!!!', []), 'item');
});

test('the item bank keeps one entry per item across menus', () => {
  const pool: PoolItem[] = [
    { ...row(10, 'Dal Makhani', null, 0), menuId: 2 },
    { ...row(11, 'dal  makhani', null, 0, { image: 'https://cdn/dal.jpg' }), menuId: 3 },
    { ...row(12, 'Mains', null, 0, { type: 'category' }), menuId: 3 },
    { ...row(13, 'Phirni', 12, 0), menuId: 3 },
  ];
  const bank = buildBank(pool, 1, menu());
  const dal = bank.find((entry) => entry.key === bankKey('Dal Makhani'))!;
  assert.deepEqual(dal.menuIds.sort(), [2, 3]);
  assert.equal(dal.item.id, 11, 'the copy with a photo represents the item');
  assert.equal(dal.inCurrentMenu, false);
  assert.equal(bank.find((entry) => entry.key === 'phirni')!.inCurrentMenu, true);
  assert.equal(bank.some((entry) => entry.key === 'mains'), false, 'sections are not bank items');
  assert.ok(bank.some((entry) => entry.key === 'kebab' && entry.menuIds.length === 0), 'items only in this menu are listed too');
});

test('section templates carry their whole subtree', () => {
  const pool: PoolItem[] = [
    { ...row(20, 'Bar', null, 0, { type: 'category' }), menuId: 9, menuDisplayName: 'Sangeet' },
    { ...row(21, 'Mocktails', 20, 0, { type: 'category' }), menuId: 9 },
    { ...row(22, 'Virgin Mojito', 21, 0), menuId: 9 },
  ];
  const [bar] = buildSectionTemplates(pool, 1);
  assert.equal(bar.itemCount, 1);
  assert.equal(bar.subtree.length, 2);
  assert.equal(bar.menuDisplayName, 'Sangeet');
});

test('CTAs: item override wins, otherwise the menu default', () => {
  const menuConfig = { like: false, dislike: true, save: true, share: true, custom: [] };
  assert.equal(effectiveCtas(menuConfig, null).like, false);
  assert.equal(effectiveCtas(menuConfig, { ...menuConfig, like: true }).like, true);
  assert.equal(normalizeCtaConfig(undefined).share, true);
});

test('CTA links are only built when complete', () => {
  assert.equal(
    customCtaHref({ id: 'a', label: 'Ask', kind: 'whatsapp', value: '+91 98765 43210', message: 'About {item}' }, 'Dal'),
    'https://wa.me/919876543210?text=About%20Dal',
  );
  assert.equal(customCtaHref({ id: 'b', label: 'Call', kind: 'call', value: '+91 98765 43210' }, 'Dal'), 'tel:+919876543210');
  assert.equal(customCtaHref({ id: 'c', label: 'Call', kind: 'call', value: '12' }, 'Dal'), '');
  assert.equal(customCtaHref({ id: 'd', label: 'Book', kind: 'link', value: 'javascript:alert(1)' }, 'Dal'), '');
});
