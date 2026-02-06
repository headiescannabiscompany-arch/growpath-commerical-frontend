import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSOPTemplates,
  createSOPTemplate,
  updateSOPTemplate,
  deleteSOPTemplate
} from "../api/sop";

export function useSopTemplates(facilityId: string | null) {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["sopTemplates", facilityId],
    queryFn: () => (facilityId ? getSOPTemplates(facilityId) : Promise.resolve([])),
    enabled: !!facilityId,
    refetchOnWindowFocus: false
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      if (!facilityId) throw new Error("No facility selected");
      return createSOPTemplate(facilityId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sopTemplates", facilityId] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: string; patch: any }) => {
      if (!facilityId) throw new Error("No facility selected");
      return updateSOPTemplate(facilityId, args.id, args.patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sopTemplates", facilityId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!facilityId) throw new Error("No facility selected");
      return deleteSOPTemplate(facilityId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sopTemplates", facilityId] });
    }
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    isRefreshing: templatesQuery.isRefetching,
    error: templatesQuery.error,
    refetch: templatesQuery.refetch,

    createTemplate: createMutation.mutateAsync,
    creating: createMutation.isPending,

    updateTemplate: updateMutation.mutateAsync,
    updating: updateMutation.isPending,

    deleteTemplate: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending
  };
}
