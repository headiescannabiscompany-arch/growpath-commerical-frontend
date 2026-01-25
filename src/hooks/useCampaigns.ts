import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign
} from "../api/campaigns";

export function useCampaigns() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => fetchCampaigns()
  });

  const createMut = useMutation({
    mutationFn: (data: any) => createCampaign(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] })
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updateCampaign(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] })
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] })
  });

  return {
    ...query,
    createCampaign: createMut.mutateAsync,
    updateCampaign: updateMut.mutateAsync,
    deleteCampaign: deleteMut.mutateAsync,
    creating: createMut.isPending,
    updating: updateMut.isPending,
    deleting: deleteMut.isPending
  };
}
