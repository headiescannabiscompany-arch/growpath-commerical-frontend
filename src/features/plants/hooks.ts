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
  const qc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: (data: Partial<Plant> & { id?: string }) => {
      const plantId = id ?? data.id;
      if (!plantId) throw new Error("Plant id required");
      return api.patch(endpoints.plant(facilityId!, plantId), data, token);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["plants", facilityId] });
      const plantId = id ?? (variables as any)?.id;
      if (plantId) {
        qc.invalidateQueries({ queryKey: ["plant", facilityId, plantId] });
      }
    }
  });
}

export function useDeletePlant(id: string) {
  const qc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: () => api.del(endpoints.plant(facilityId!, id), token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plants", facilityId] });
      qc.invalidateQueries({ queryKey: ["plant", facilityId, id] });
    }
  });
}
