import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFacility } from "../api/facilities";

export function useCreateFacility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createFacility,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilities"] });
    }
  });
}
