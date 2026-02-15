/* eslint-disable react-hooks/exhaustive-deps */
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../api/apiRequest";

type UseCalendarResult<T = any> = {
  data: T | null;
  isLoading: boolean;
  error: any;
  refetch: () => Promise<void>;
};

export function useCalendar<T = any[]>(
  startISO: string,
  endISO: string
): UseCalendarResult<T> {
  const enabled = Boolean(startISO && endISO);

  const query = useQuery({
    queryKey: ["calendar", startISO, endISO],
    enabled,
    queryFn: async ({ signal }) => {
      const qs = `?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(
        endISO
      )}`;
      return await apiRequest<T>(`/api/calendar${qs}`, {
        method: "GET",
        signal
      });
    }
  });

  const refetch = React.useCallback(async () => {
    if (!enabled) return;
    await query.refetch();
  }, [enabled, query.refetch]);

  return {
    data: (query.data as T) ?? null,
    // treat refetch as loading too, to match your screen patterns
    isLoading: query.isLoading || query.isFetching,
    error: query.error ?? null,
    refetch
  };
}
