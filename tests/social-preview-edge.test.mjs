import test from 'node:test';
import assert from 'node:assert/strict';
import { socialPreviewPath } from '../functions/_middleware.js';

test('crawler middleware maps only supported public pages to share metadata', () => {
  assert.equal(socialPreviewPath('/event/chapter-her-sept'), '/event/chapter-her-sept');
  assert.equal(socialPreviewPath('/event/chapter-her-sept/menu/festive/item/necklace'), '/event/chapter-her-sept/menu/festive/item/necklace');
  assert.equal(socialPreviewPath('/vendor/chapter-her'), '/vendor/chapter-her');
  assert.equal(socialPreviewPath('/showrooms'), '/showrooms');
  assert.equal(socialPreviewPath('/dashboard/events'), null);
  assert.equal(socialPreviewPath('/assets/index.js'), null);
});
