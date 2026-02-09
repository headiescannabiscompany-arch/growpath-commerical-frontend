import { useEffect, useState } from "react";
import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";

function normalizeList(res: any): any[] {
  const raw = res?.items ?? res?.rooms ?? res?.data?.items ?? res?.data?.rooms ?? [];
  return Array.isArray(raw) ? raw : [];
}

export function useFacilityRooms(facilityId: string | null) {
  const handleApiError = useApiErrorHandler();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!facilityId) return;
      setLoading(true);
      setError(null);
      try {
        const anyEndpoints: any = endpoints as any;
        const url =
          typeof anyEndpoints.rooms === "function"
            ? anyEndpoints.rooms(facilityId)
            : `/api/facility/${facilityId}/rooms`;

        const res = await apiRequest({ method: "GET", url });
        if (!alive) return;
        setItems(normalizeList(res));
      } catch (e) {
        if (!alive) return;
        setError(handleApiError(e));
        setItems([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [facilityId]);

  return { rooms: items, loading, error };
}
