export type CalendarResourceInput = {
  title: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  eventUrl?: string;
};

export type ContactResourceInput = {
  name: string;
  organization?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  notes?: string;
};

export type NativeResourceResult = 'shared' | 'intent' | 'opened' | 'cancelled';

function validDate(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`A valid ${label} is required.`);
  return date;
}

function utcCalendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function localCalendarDay(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function calendarEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function vCardEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function intentValue(value: string) {
  return encodeURIComponent(value).replace(/'/g, '%27');
}

export function safeResourceFilename(value: string, extension: 'ics' | 'vcf') {
  const stem = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'peshkash';
  return `${stem}.${extension}`;
}

export function calendarInvite(input: CalendarResourceInput) {
  const start = validDate(input.startTime, 'event start time');
  const end = input.endTime ? validDate(input.endTime, 'event end time') : new Date(start.getTime() + 60 * 60 * 1000);
  const description = [input.description?.trim(), input.eventUrl?.trim()].filter(Boolean).join('\n\n');
  const uid = `${start.getTime()}-${safeResourceFilename(input.title, 'ics').replace(/\.ics$/, '')}@peshkash.app`;
  let startLine: string;
  let endLine: string;

  if (input.allDay) {
    const nextDay = new Date(start);
    nextDay.setDate(nextDay.getDate() + 1);
    startLine = `DTSTART;VALUE=DATE:${localCalendarDay(start)}`;
    endLine = `DTEND;VALUE=DATE:${localCalendarDay(nextDay)}`;
  } else {
    startLine = `DTSTART:${utcCalendarDate(start)}`;
    endLine = `DTEND:${utcCalendarDate(end)}`;
  }

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Peshkash//Event Reminder//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utcCalendarDate(new Date())}`,
    startLine,
    endLine,
    `SUMMARY:${calendarEscape(input.title)}`,
    description ? `DESCRIPTION:${calendarEscape(description)}` : '',
    input.location ? `LOCATION:${calendarEscape(input.location)}` : '',
    input.eventUrl ? `URL:${input.eventUrl}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export function contactVCard(input: ContactResourceInput) {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${vCardEscape(input.name)}`,
    input.organization ? `ORG:${vCardEscape(input.organization)}` : '',
    input.phone ? `TEL;TYPE=CELL:${vCardEscape(input.phone)}` : '',
    input.email ? `EMAIL;TYPE=INTERNET:${vCardEscape(input.email)}` : '',
    input.address ? `ADR;TYPE=WORK:;;${vCardEscape(input.address)};;;;` : '',
    input.website ? `URL:${input.website}` : '',
    input.notes ? `NOTE:${vCardEscape(input.notes)}` : '',
    'END:VCARD',
  ].filter(Boolean).join('\r\n');
}

export function androidCalendarIntent(input: CalendarResourceInput) {
  const start = validDate(input.startTime, 'event start time');
  const end = input.endTime ? validDate(input.endTime, 'event end time') : new Date(start.getTime() + 60 * 60 * 1000);
  const description = [input.description?.trim(), input.eventUrl?.trim()].filter(Boolean).join('\n\n');
  return [
    'intent://com.android.calendar/events#Intent',
    'scheme=content',
    'action=android.intent.action.INSERT',
    'type=vnd.android.cursor.dir/event',
    `l.beginTime=${start.getTime()}`,
    `l.endTime=${end.getTime()}`,
    `B.allDay=${Boolean(input.allDay)}`,
    `S.title=${intentValue(input.title)}`,
    description ? `S.description=${intentValue(description)}` : '',
    input.location ? `S.eventLocation=${intentValue(input.location)}` : '',
    'end',
  ].filter(Boolean).join(';');
}

export function androidContactIntent(input: ContactResourceInput) {
  return [
    // Intent.parseUri() finds "#Intent;" and treats everything before it as the intent's data
    // URI. With no "//" here, that substring is exactly "intent:" — landing on the parser's
    // boundary case and risking a bogus self-referential data URI instead of none at all, which
    // then fails to match any contacts app's intent-filter. "intent://#Intent" (empty host,
    // matching the documented host-less pattern) keeps the data URI genuinely empty.
    'intent://#Intent',
    // Contacts.CONTENT_TYPE ("...cursor.dir/contact") is the MIME type for the LIST of all
    // contacts — used for browsing/picking, not creating one — so no contacts app's manifest
    // matches ACTION_INSERT against it and the intent silently fails to launch anything.
    // Android's own "Common Intents" docs use ACTION_INSERT_OR_EDIT + CONTENT_ITEM_TYPE
    // ("...cursor.item/contact", singular) for inserting a single new contact.
    'action=android.intent.action.INSERT_OR_EDIT',
    'type=vnd.android.cursor.item/contact',
    `S.name=${intentValue(input.name)}`,
    input.organization ? `S.company=${intentValue(input.organization)}` : '',
    input.phone ? `S.phone=${intentValue(input.phone)}` : '',
    input.email ? `S.email=${intentValue(input.email)}` : '',
    input.address ? `S.postal=${intentValue(input.address)}` : '',
    input.notes ? `S.notes=${intentValue(input.notes)}` : '',
    'end',
  ].filter(Boolean).join(';');
}

export function calendarResource(input: CalendarResourceInput) {
  return {
    file: new File([calendarInvite(input)], safeResourceFilename(input.title, 'ics'), { type: 'text/calendar' }),
    androidIntent: androidCalendarIntent(input),
  };
}

export function contactResource(input: ContactResourceInput) {
  return {
    file: new File([contactVCard(input)], safeResourceFilename(input.name, 'vcf'), { type: 'text/vcard' }),
    androidIntent: androidContactIntent(input),
  };
}

// iPadOS 13+ reports as "MacIntel" in the UA string to pass desktop-site checks, but a real
// Mac never reports touch points — this is the standard way to tell the two apart.
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function shouldDownloadAndroidVCard(userAgent: string, file: Pick<File, 'name' | 'type'>): boolean {
  const mimeType = file.type.split(';', 1)[0].trim().toLowerCase();
  return /Android/i.test(userAgent)
    && (mimeType === 'text/vcard' || /\.vcf$/i.test(file.name));
}

function downloadResource(file: File): NativeResourceResult {
  const resourceUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = resourceUrl;
  link.download = file.name;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(resourceUrl), 30_000);
  return 'opened';
}

export async function openNativeResource(file: File, androidIntent: string, shareTitle: string): Promise<NativeResourceResult> {
  // Chrome and OEM contact apps do not consistently expose a BROWSABLE handler for
  // web-to-Contacts intents. Downloading the vCard gives every Android browser a reliable
  // hand-off: the customer opens the downloaded file and confirms the import in Contacts.
  if (shouldDownloadAndroidVCard(navigator.userAgent, file)) {
    return downloadResource(file);
  }

  // Keep the direct Android intent for calendar files, whose handler is reliable.
  if (/Android/i.test(navigator.userAgent) && androidIntent) {
    window.location.assign(androidIntent);
    return 'intent';
  }

  // iOS/iPadOS recognizes .ics/.vcf content-types natively and opens its own "Add to
  // Calendar"/"Add to Contacts" screen on direct navigation to the file — routing through
  // the Web Share API instead detours through the generic share sheet (AirDrop/Messages/
  // Mail/Save to Files/...) with no guaranteed one-tap path back to that screen. iOS must
  // skip straight to the plain-navigation fallback below, same as a browser with no file
  // sharing support at all.
  if (!isIOS() && typeof navigator.canShare === 'function' && typeof navigator.share === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: shareTitle });
      return 'shared';
    } catch (error: any) {
      if (error?.name === 'AbortError') return 'cancelled';
    }
  }

  const resourceUrl = URL.createObjectURL(file);
  window.location.assign(resourceUrl);
  window.setTimeout(() => URL.revokeObjectURL(resourceUrl), 60_000);
  return 'opened';
}
