import test from 'node:test';
import assert from 'node:assert/strict';
import { googleCalendarReminderUrl, publicEventUrl } from '../src/features/events/actions.js';
import { guestInitials, guestPortraitUrl, instagramUsername } from '../src/features/events/guestPresentation.js';
import { eventExperienceWasPersisted, eventPublishChecklist, hasStandaloneEventPage } from '../src/features/events/workflow.js';
import { androidCalendarIntent, androidContactIntent, calendarInvite, contactVCard } from '../src/utils/nativeResource.js';

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
  assert.equal(publicEventUrl('chapter-her-sept', 'https://peshkash.app', 3), 'https://peshkash.app/event/chapter-her-sept?spv=3');
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

test('calendar reminders can be handed to native calendar apps', () => {
  const input = {
    title: 'ChapterHer September Edit',
    startTime: '2026-09-09T12:00:00.000Z',
    endTime: '2026-09-09T14:00:00.000Z',
    description: 'Festive Edit',
    location: 'Radisson Jalandhar',
    eventUrl: 'https://peshkash.app/event/chapter-her-sept',
  };
  const invite = calendarInvite(input);
  assert.match(invite, /BEGIN:VCALENDAR\r\n/);
  assert.match(invite, /DTSTART:20260909T120000Z/);
  assert.match(invite, /SUMMARY:ChapterHer September Edit/);
  assert.match(invite, /URL:https:\/\/peshkash\.app\/event\/chapter-her-sept/);

  const intent = androidCalendarIntent(input);
  assert.match(intent, /^intent:\/\/com\.android\.calendar\/events#Intent;/);
  assert.match(intent, /action=android\.intent\.action\.INSERT/);
  assert.match(intent, /S\.title=ChapterHer%20September%20Edit/);
});

test('contact cards can be handed to native contacts apps', () => {
  const input = {
    name: 'Niharika Singh & Vidhu Shoor',
    organization: 'ChapterHer',
    phone: '9855226426',
    email: 'hello@example.com',
    address: 'Jalandhar, Punjab',
  };
  const card = contactVCard(input);
  assert.match(card, /BEGIN:VCARD\r\nVERSION:3\.0/);
  assert.match(card, /TEL;TYPE=CELL:9855226426/);
  assert.match(card, /EMAIL;TYPE=INTERNET:hello@example\.com/);

  const intent = androidContactIntent(input);
  assert.match(intent, /^intent:#Intent;/);
  assert.match(intent, /type=vnd\.android\.cursor\.dir\/contact/);
  assert.match(intent, /S\.name=Niharika%20Singh%20%26%20Vidhu%20Shoor/);
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

test('guest portraits prefer saved images and safely derive Instagram avatars', () => {
  assert.equal(instagramUsername('https://www.instagram.com/Chapter.Her/'), 'chapter.her');
  assert.equal(instagramUsername('https://instagram.com/p/abc123'), null);
  assert.equal(instagramUsername('https://example.com/chapter.her'), null);
  assert.equal(
    guestPortraitUrl({ instagram: 'https://instagram.com/chapter.her' }, 'https://api.example.com/api'),
    'https://api.example.com/api/instagram-avatar/chapter.her',
  );
  assert.equal(
    guestPortraitUrl({ imageUrl: 'https://cdn.example.com/portrait.jpg', instagram: 'https://instagram.com/chapter.her' }, 'https://api.example.com/api'),
    'https://cdn.example.com/portrait.jpg',
  );
  assert.equal(guestInitials('Mira Sen'), 'MS');
  assert.equal(guestInitials('Aarav'), 'A');
});
