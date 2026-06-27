import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { useFacility } from "../../facility/FacilityProvider";
import { Grow } from "./types";

function normalizeGrow(raw: any): Grow | null {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id ?? raw._id ?? raw.growId ?? "");
  if (!id) return null;
  return {
    ...raw,
    id,
    name: String(raw.name ?? raw.title ?? id)
  };
}

function normalizeGrowList(response: any): Grow[] {
  const rows = Array.isArray(response)
    ? response
    : Array.isArray(response?.grows)
      ? response.grows
      : Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.data)
          ? response.data
          : [];
  return rows.map(normalizeGrow).filter(Boolean) as Grow[];
}

export function useGrows() {
  const { token } = useAuth();
  const facility = useFacility();
  const facilityId = facility?.facilityId || null;

  return useQuery<Grow[]>({
    queryKey: ["grows", facilityId],
    queryFn: async () =>
      normalizeGrowList(await api.get(endpoints.grows(facilityId!), token)),
    enabled: !!facilityId && !!token
  });
}

export function useGrow(id: string) {
  const { token } = useAuth();
  const facilityState = useFacility();
  const facilityIdValue = facilityState?.facilityId || null;

  return useQuery<Grow>({
    queryKey: ["grow", facilityIdValue, id],
    queryFn: () => api.get(`${endpoints.grows(facilityIdValue!)}/${id}`, token),
    enabled: !!facilityIdValue && !!token && !!id
  });
}

// Phase 2.3.3: Proper mutation hooks
export function useCreateGrow() {
  const qc = useQueryClient();
  const { facilityId } = useFacility();
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post(endpoints.grows(facilityId!), data);
      const grow = normalizeGrow(response?.created ?? response?.grow ?? response);
      if (!grow) throw new Error("INVALID_GROW_RESPONSE");
      return grow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grows", facilityId] });
    }
  });
}

export function useUpdateGrow() {
  const updateQc = useQueryClient();
  const { facilityId } = useFacility();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api.patch(`${endpoints.grows(facilityId!)}/${id}`, data),
    onSuccess: () => {
      updateQc.invalidateQueries({ queryKey: ["grows", facilityId] });
    }
  });
}
