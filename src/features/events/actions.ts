export type CalendarReminderInput = {
  title: string;
  startTime: string;
  endTime?: string;
  allDay?: boolean;
  description?: string;
  location?: string;
  eventUrl: string;
};

function calendarDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function calendarDay(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

export function publicEventUrl(eventName: string, origin: string) {
  return new URL(`/event/${encodeURIComponent(eventName)}`, origin).toString();
}

export function googleCalendarReminderUrl(input: CalendarReminderInput) {
  const start = new Date(input.startTime);
  const end = input.endTime ? new Date(input.endTime) : new Date(start.getTime() + 60 * 60 * 1000);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('A valid event start and end time are required.');
  }

  let dates: string;
  if (input.allDay) {
    const nextDay = new Date(start);
    nextDay.setDate(nextDay.getDate() + 1);
    dates = `${calendarDay(start)}/${calendarDay(nextDay)}`;
  } else {
    dates = `${calendarDate(start)}/${calendarDate(end)}`;
  }

  const details = [input.description?.trim(), input.eventUrl].filter(Boolean).join('\n\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates,
    details,
    location: input.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
