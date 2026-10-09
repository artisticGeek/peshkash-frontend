import test from 'node:test';
import assert from 'node:assert/strict';
import { contactFieldValue, isPlausiblePhone, normalizeContactPageConfig, normalizeContactPageMode, vendorPhoneValue } from '../src/features/vendors/contactPage.js';

test('labelled non-phone contact rows are never promoted to a phone number', () => {
  const contact = [
    'Google Maps: https://maps.google.com/maps?q=31.3348445,75.5583016',
    'Business Hours: 8:00 AM - 11:00 PM',
  ];
  assert.equal(vendorPhoneValue(contact), '');
  assert.equal(contactFieldValue(contact, 'Google Maps'), 'https://maps.google.com/maps?q=31.3348445,75.5583016');
});

test('corrupted nested labels are rejected while valid legacy and labelled phones work', () => {
  assert.equal(vendorPhoneValue(['Phone: Google Maps: https://maps.google.com/?q=1,2']), '');
  assert.equal(vendorPhoneValue(['+91 98765 43210']), '+91 98765 43210');
  assert.equal(vendorPhoneValue(['Phone: +91 98765 43210']), '+91 98765 43210');
  assert.equal(isPlausiblePhone('98765 43210'), true);
  assert.equal(isPlausiblePhone('origin_threebeans'), false);
});

test('legacy and unknown page styles normalize safely', () => {
  assert.equal(normalizeContactPageMode('page'), 'editorial');
  assert.equal(normalizeContactPageMode('programme'), 'programme');
  assert.equal(normalizeContactPageMode('something-else'), 'classic');
});

test('gallery presentation defaults safely and accepts all supported layouts', () => {
  assert.equal(normalizeContactPageConfig({}).galleryLayout, 'grid');
  assert.equal(normalizeContactPageConfig({ galleryLayout: 'carousel' }).galleryLayout, 'carousel');
  assert.equal(normalizeContactPageConfig({ galleryLayout: 'spread' }).galleryLayout, 'spread');
  assert.equal(normalizeContactPageConfig({ galleryLayout: 'unknown' }).galleryLayout, 'grid');
});
