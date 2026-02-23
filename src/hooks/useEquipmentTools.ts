import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment
} from "../api/equipment";

export function useEquipmentTools(facilityId: string | null) {
  const queryClient = useQueryClient();

  const equipmentQuery = useQuery({
    queryKey: ["equipment", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const listRes = await listEquipment(facilityId);
      if (listRes?.success) return listRes.data ?? [];
      throw new Error(listRes?.message || "Failed to load equipment");
    },
    enabled: !!facilityId,
    refetchOnWindowFocus: false
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!facilityId) throw new Error("No facility selected");
      const createRes = await createEquipment(facilityId, data);
      if (createRes?.success) return createRes.data;
      throw new Error(createRes?.message || "Failed to add equipment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", facilityId] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (args: { id: string; patch: any }) => {
      if (!facilityId) throw new Error("No facility selected");
      const updateRes = await updateEquipment(facilityId, args.id, args.patch);
      if (updateRes?.success) return updateRes.data;
      throw new Error(updateRes?.message || "Failed to update equipment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", facilityId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!facilityId) throw new Error("No facility selected");
      const deleteRes = await deleteEquipment(facilityId, id);
      if (deleteRes?.success) return deleteRes.data;
      throw new Error(deleteRes?.message || "Failed to delete equipment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment", facilityId] });
    }
  });

  return {
    equipment: equipmentQuery.data ?? [],
    isLoading: equipmentQuery.isLoading,
    isRefreshing: equipmentQuery.isRefetching,
    error: equipmentQuery.error,
    refetch: equipmentQuery.refetch,

    addEquipment: createMutation.mutateAsync,
    isAdding: createMutation.isPending,

    updateEquipmentItem: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,

    deleteEquipmentItem: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending
  };
}
