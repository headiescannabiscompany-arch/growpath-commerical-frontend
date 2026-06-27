import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFacility } from "../api/facilities";
import { useFacility } from "../facility/FacilityProvider";

export function useCreateFacility() {
  const qc = useQueryClient();
  const facilityStore = useFacility();
  return useMutation({
    mutationFn: createFacility,
    onSuccess: (facility) => {
      facilityStore.selectFacility?.(facility);
      qc.setQueryData(["facilities"], (existing: any) => {
        const rows = Array.isArray(existing) ? existing : [];
        const current = rows.find((row: any) => row?.id === facility.id) || facility;
        if (current) return [current];
        return [facility];
      });
      qc.invalidateQueries({ queryKey: ["facilities"] });
    }
  });
}
