import { api } from "./client";

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  description?: string;
  // add other fields as needed
};

export async function fetchCalendarEvents(
  startISO: string,
  endISO: string
): Promise<CalendarEvent[]> {
  // GET /api/calendar?start=...&end=...
  return api.get(
    `/calendar?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`
  );
}

export async function createCalendarEvent(data: Record<string, any>) {
  // POST /api/calendar
  return api.post(`/calendar`, data);
}
