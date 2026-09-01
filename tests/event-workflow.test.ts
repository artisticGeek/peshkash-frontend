import test from 'node:test';
import assert from 'node:assert/strict';
import { googleCalendarReminderUrl, publicEventUrl } from '../src/features/events/actions.js';
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

test('event sharing uses the public event URL', () => {
  assert.equal(publicEventUrl('chapter her', 'https://peshkash.app'), 'https://peshkash.app/event/chapter%20her');
});

test('calendar reminders open with the event details pre-filled', () => {
  const reminder = new URL(googleCalendarReminderUrl({
    title: 'ChapterHer September Edit',
    startTime: '2026-09-09T12:00:00.000Z',
    endTime: '2026-09-09T14:00:00.000Z',
    description: 'Festive Edit',
    location: 'Radisson Jalandhar',
    eventUrl: 'https://peshkash.app/event/chapter-her-sept',
  }));

  assert.equal(reminder.origin, 'https://calendar.google.com');
  assert.equal(reminder.searchParams.get('action'), 'TEMPLATE');
  assert.equal(reminder.searchParams.get('text'), 'ChapterHer September Edit');
  assert.equal(reminder.searchParams.get('dates'), '20260909T120000Z/20260909T140000Z');
  assert.equal(reminder.searchParams.get('location'), 'Radisson Jalandhar');
  assert.match(reminder.searchParams.get('details') || '', /https:\/\/peshkash\.app\/event\/chapter-her-sept/);
});

test('event page persistence includes social preview fields and version', () => {
  const requested = {
    enabled: true,
    socialPreview: {
      imageUrl: 'https://cdn.example.com/chapter-her.jpg',
      imageAlt: 'ChapterHer campaign artwork',
      titleOverride: 'ChapterHer September Edit',
      descriptionOverride: '9 September 2026 · Radisson Jalandhar',
      version: 3,
      generatedImageUrl: '',
      generatedAt: '2026-09-02T10:00:00.000Z',
      source: 'custom',
    },
  };
  assert.equal(eventExperienceWasPersisted(requested, structuredClone(requested)), true);
  assert.equal(eventExperienceWasPersisted(requested, { ...requested, socialPreview: { ...requested.socialPreview, version: 2 } }), false);
});
