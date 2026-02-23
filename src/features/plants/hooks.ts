import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { useFacility } from "../../facility/FacilityProvider";
import { Plant } from "./types";

export function usePlants() {
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useQuery<Plant[]>({
    queryKey: ["plants", facilityId],
    queryFn: () => api.get(endpoints.plants(facilityId!), token),
    enabled: !!facilityId && !!token
  });
}

export function usePlant(id: string) {
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useQuery<Plant>({
    queryKey: ["plant", facilityId, id],
    queryFn: () => api.get(endpoints.plant(facilityId!, id), token),
    enabled: !!facilityId && !!token && !!id
  });
}

export function useCreatePlant() {
  const qc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: (data: Partial<Plant>) =>
      api.post(endpoints.plants(facilityId!), data, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plants", facilityId] });
    }
  });
}

export function useUpdatePlant(id?: string) {
  const updateQc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: (data: Partial<Plant> & { id?: string }) => {
      const plantIdValue = id ?? data.id;
      if (!plantIdValue) throw new Error("Plant id required");
      return api.patch(endpoints.plant(facilityId!, plantIdValue), data, token);
    },
    onSuccess: (_data, variables) => {
      updateQc.invalidateQueries({ queryKey: ["plants", facilityId] });
      const resolvedPlantId = id ?? (variables as any)?.id;
      if (resolvedPlantId) {
        updateQc.invalidateQueries({ queryKey: ["plant", facilityId, resolvedPlantId] });
      }
    }
  });
}

export function useDeletePlant(id: string) {
  const deleteQc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: () => api.del(endpoints.plant(facilityId!, id), token),
    onSuccess: () => {
      deleteQc.invalidateQueries({ queryKey: ["plants", facilityId] });
      deleteQc.invalidateQueries({ queryKey: ["plant", facilityId, id] });
    }
  });
}
