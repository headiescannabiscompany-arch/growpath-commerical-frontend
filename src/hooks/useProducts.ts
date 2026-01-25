import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct
} from "../api/products";

export function useProducts() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts()
  });

  const createMut = useMutation({
    mutationFn: (data: any) => createProduct(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] })
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => updateProduct(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] })
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] })
  });

  return {
    ...query,
    createProduct: createMut.mutateAsync,
    updateProduct: updateMut.mutateAsync,
    deleteProduct: deleteMut.mutateAsync,
    creating: createMut.isPending,
    updating: updateMut.isPending,
    deleting: deleteMut.isPending
  };
}
