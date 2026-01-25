import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCalendarEvents, createCalendarEvent } from "../api/calendar";

export function useCalendar(startISO: string, endISO: string) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["calendarEvents", startISO, endISO],
    queryFn: () => fetchCalendarEvents(startISO, endISO),
    enabled: !!startISO && !!endISO
  });

  const createEvent = useMutation({
    mutationFn: (data: any) => createCalendarEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendarEvents", startISO, endISO] });
    }
  });

  return {
    ...query,
    createEvent: createEvent.mutateAsync,
    creating: createEvent.isPending
  };
}
