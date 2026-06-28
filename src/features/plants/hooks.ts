import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { useFacility } from "../../facility/FacilityProvider";
import { Plant } from "./types";

function normalizePlant(raw: any): Plant {
  const id = String(raw?.id || raw?._id || "");
  return {
    ...raw,
    id,
    growId: raw?.growId ? String(raw.growId) : undefined,
    roomId: raw?.roomId ? String(raw.roomId) : undefined
  };
}

function normalizePlantResponse(raw: any): Plant {
  return normalizePlant(raw?.plant || raw?.updated || raw?.created || raw);
}

function normalizePlantsResponse(raw: any): Plant[] {
  const items = Array.isArray(raw) ? raw : Array.isArray(raw?.plants) ? raw.plants : [];
  return items.map(normalizePlant);
}

export function usePlants() {
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useQuery<Plant[]>({
    queryKey: ["plants", facilityId],
    queryFn: async () =>
      normalizePlantsResponse(await api.get(endpoints.plants(facilityId!), token)),
    enabled: !!facilityId && !!token
  });
}

export function usePlant(id: string) {
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useQuery<Plant>({
    queryKey: ["plant", facilityId, id],
    queryFn: async () =>
      normalizePlantResponse(await api.get(endpoints.plant(facilityId!, id), token)),
    enabled: !!facilityId && !!token && !!id
  });
}

export function useCreatePlant() {
  const qc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: async (data: Partial<Plant>) =>
      normalizePlantResponse(await api.post(endpoints.plants(facilityId!), data, token)),
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
      return api
        .patch(endpoints.plant(facilityId!, plantIdValue), data, token)
        .then(normalizePlantResponse);
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
