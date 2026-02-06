import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { useFacility } from "../../facility/FacilityProvider";
import { InventoryItem } from "./types";

export function useInventory() {
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useQuery<InventoryItem[]>({
    queryKey: ["inventory", facilityId],
    queryFn: () => api.get(endpoints.inventory(facilityId!), token),
    enabled: !!facilityId && !!token
  });
}

export function useInventoryItem(id: string) {
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useQuery<InventoryItem>({
    queryKey: ["inventoryItem", facilityId, id],
    queryFn: () => api.get(`${endpoints.inventory(facilityId!)}/${id}`, token),
    enabled: !!facilityId && !!token && !!id
  });
}

export function useCreateInventoryItem() {
  const qc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: (data: Partial<InventoryItem>) =>
      api.post(endpoints.inventory(facilityId!), data, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", facilityId] });
    }
  });
}

export function useUpdateInventoryItem(id: string) {
  const qc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: (data: Partial<InventoryItem>) =>
      api.patch(`${endpoints.inventory(facilityId!)}/${id}`, data, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", facilityId] });
      qc.invalidateQueries({ queryKey: ["inventoryItem", facilityId, id] });
    }
  });
}

export function useDeleteInventoryItem(id: string) {
  const qc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: () => api.del(`${endpoints.inventory(facilityId!)}/${id}`, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventory", facilityId] });
    }
  });
}
