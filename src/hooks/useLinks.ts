import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLinks, createLink, updateLink, deleteLink } from "../api/links";

export function useLinks() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["links"],
    queryFn: () => fetchLinks()
  });

  const createMut = useMutation({
    mutationFn: (data: any) => createLink(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] })
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updateLink(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] })
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteLink(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["links"] })
  });

  return {
    ...query,
    createLink: createMut.mutateAsync,
    updateLink: updateMut.mutateAsync,
    deleteLink: deleteMut.mutateAsync,
    creating: createMut.isPending,
    updating: updateMut.isPending,
    deleting: deleteMut.isPending
  };
}
