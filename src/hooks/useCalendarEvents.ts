import { useCallback, useState } from "react";
import { apiRequest } from "@/api/apiRequest";

export type CalendarEvent = {
  id: string;
  facilityId: string;
  growId: string;
  type: string;
  title: string;
  date: string | null;
  metadata: any;
  createdAt: string | null;
  updatedAt: string | null;
  deletedAt: string | null;
};

export function useCalendarEvents(facilityId: string) {
  const [items, setItems] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(
    async (params: {
      growId?: string;
      type?: string;
      from?: string;
      to?: string;
      limit?: number;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams();
        if (params.growId) qs.set("growId", params.growId);
        if (params.type) qs.set("type", params.type);
        if (params.from) qs.set("from", params.from);
        if (params.to) qs.set("to", params.to);
        if (params.limit) qs.set("limit", String(params.limit));

        const res = await apiRequest<{ calendarEvents: CalendarEvent[] }>(
          `/api/facility/${encodeURIComponent(facilityId)}/calendar?${qs.toString()}`
        );

        setItems(res.calendarEvents || []);
        return res.calendarEvents || [];
      } catch (e: any) {
        setError(e?.message || "Failed to load calendar");
        setItems([]);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [facilityId]
  );

  return { items, loading, error, fetchCalendar };
}

