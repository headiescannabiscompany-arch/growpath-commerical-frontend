import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getVendors, createVendor, updateVendor, deleteVendor } from "../api/vendors";

export function useVendors(facilityId: string | null) {
  const queryClient = useQueryClient();

  const vendorsQuery = useQuery({
    queryKey: ["vendors", facilityId],
    queryFn: () => (facilityId ? getVendors(facilityId) : Promise.resolve([])),
    enabled: !!facilityId,
    refetchOnWindowFocus: false
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (!facilityId) throw new Error("No facility selected");
      return createVendor(facilityId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors", facilityId] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; patch: any }) => updateVendor(args.id, args.patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors", facilityId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors", facilityId] });
    }
  });

  return {
    vendors: vendorsQuery.data ?? [],
    isLoading: vendorsQuery.isLoading,
    isRefreshing: vendorsQuery.isRefetching,
    error: vendorsQuery.error,
    refetch: vendorsQuery.refetch,

    addVendor: createMutation.mutateAsync,
    adding: createMutation.isPending,

    updateVendorItem: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    deleteVendorItem: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending
  };
}
