import test from 'node:test';
import assert from 'node:assert/strict';
import { eventExperienceWasPersisted, eventPublishChecklist, hasStandaloneEventPage } from '../src/features/events/workflow.js';

test('a standalone event can publish without a menu', () => {
  const checklist = eventPublishChecklist({ vendorSelected: true, eventSelected: true, hasStartTime: true, hasEndTime: true, standalonePageEnabled: true, linkedMenuCount: 0, linkedItemCount: 0 });
  assert.equal(checklist.every((item) => item.done), true);
});

test('a menu-only event still requires a populated menu', () => {
  const checklist = eventPublishChecklist({ vendorSelected: true, eventSelected: true, hasStartTime: true, hasEndTime: true, standalonePageEnabled: false, linkedMenuCount: 0, linkedItemCount: 0 });
  assert.equal(checklist.every((item) => item.done), false);
});

test('page persistence detects silently dropped configuration', () => {
  const requested = { enabled: true, eyebrow: 'Punjab live', venueName: 'Burlton Park', venueAddress: 'Jalandhar', livestreamLabel: 'Watch live', reminderMode: 'timed', heroImageUrl: '', mapUrl: 'https://maps.google.com', livestreamUrl: 'https://youtube.com/live', registrationEnabled: true, reminderEnabled: true, countdownEnabled: true, organizerVisible: true, contactVisible: false, guests: [{ name: 'Guest', role: 'Singer', bio: '', phone: '', vendorSlug: '', imageUrl: '', website: '', instagram: '', youtube: '', linkedin: '', visible: true }] };
  assert.equal(eventExperienceWasPersisted(requested, { enabled: false }), false);
  assert.equal(eventExperienceWasPersisted(requested, { ...requested, mapUrl: 'https://maps.google.com/' }), true);
});

test('standalone readiness trusts only an explicit persisted true value', () => {
  assert.equal(hasStandaloneEventPage({ experienceConfig: { enabled: true } }), true);
  assert.equal(hasStandaloneEventPage({ experienceConfig: {} }), false);
  assert.equal(hasStandaloneEventPage(null), false);
});
