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
        if (rows.some((row: any) => row?.id === facility.id)) return rows;
        return [facility, ...rows];
      });
      qc.invalidateQueries({ queryKey: ["facilities"] });
    }
  });
}
