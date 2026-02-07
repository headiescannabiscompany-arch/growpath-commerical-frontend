import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { useFacility } from "../../facility/FacilityProvider";
import { Grow } from "./types";

export function useGrows() {
  const { token } = useAuth();
  const facility = useFacility();
  const facilityId = facility?.facilityId || null;

  return useQuery<Grow[]>({
    queryKey: ["grows", facilityId],
    queryFn: () => api.get(endpoints.grows(facilityId!), token),
    enabled: !!facilityId && !!token
  });
}

export function useGrow(id: string) {
  const { token } = useAuth();
  const facility = useFacility();
  const facilityId = facility?.facilityId || null;

  return useQuery<Grow>({
    queryKey: ["grow", facilityId, id],
    queryFn: () => api.get(`${endpoints.grows(facilityId!)}/${id}`, token),
    enabled: !!facilityId && !!token && !!id
  });
}

// Phase 2.3.3: Proper mutation hooks
export function useCreateGrow() {
  const qc = useQueryClient();
  const { facilityId } = useFacility();
  return useMutation({
    mutationFn: (data: any) => api.post(endpoints.grows(facilityId!), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grows", facilityId] });
    }
  });
}

export function useUpdateGrow() {
  const qc = useQueryClient();
  const { facilityId } = useFacility();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api.patch(`${endpoints.grows(facilityId!)}/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grows", facilityId] });
    }
  });
}
