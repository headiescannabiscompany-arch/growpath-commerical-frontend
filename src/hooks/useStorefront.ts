import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchStorefront, createStorefront, updateStorefront } from "../api/storefront";

export function useStorefront() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["storefront"],
    queryFn: () => fetchStorefront()
  });

  const createMut = useMutation({
    mutationFn: (data: { name: string }) => createStorefront(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storefront"] });
    }
  });

  const updateMut = useMutation({
    mutationFn: (data: any) => updateStorefront(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["storefront"] });
    }
  });

  return {
    ...query,
    createStorefront: createMut.mutateAsync,
    updateStorefront: updateMut.mutateAsync,
    creating: createMut.isPending,
    updating: updateMut.isPending
  };
}
