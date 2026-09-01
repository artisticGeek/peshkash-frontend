import test from 'node:test';
import assert from 'node:assert/strict';
import { formattedShareText, sharePreviewUrl } from '../src/utils/socialShare.js';

test('all crawler-backed shares expose canonical public page URLs', () => {
  const origin = 'https://peshkash.app';
  assert.equal(sharePreviewUrl('vendor/chapter her', origin), 'https://peshkash.app/vendor/chapter%20her');
  assert.equal(sharePreviewUrl('event/chapter-her', origin), 'https://peshkash.app/event/chapter-her');
  assert.equal(sharePreviewUrl('event/chapter-her/menu/festive edit', origin), 'https://peshkash.app/event/chapter-her/menu/festive%20edit');
  assert.equal(sharePreviewUrl('event/chapter-her/menu/festive/item/gold ring', origin), 'https://peshkash.app/event/chapter-her/menu/festive/item/gold%20ring');
  assert.equal(sharePreviewUrl('exhibits', origin), 'https://peshkash.app/exhibits');
});

test('share copy leads with the Peshkash title and follows with the description', () => {
  assert.equal(
    formattedShareText('Chapter Her @ Peshkash', 'An evening of stories and meaningful connections.'),
    'Chapter Her @ Peshkash\n\nAn evening of stories and meaningful connections.',
  );
});
