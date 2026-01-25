import { useQuery } from "@tanstack/react-query";
import { useEntitlements } from "../context/EntitlementsContext";
import { useApiGuards } from "../api/hooks";
import { getFacilityReport } from "../api/reports";

export function useFacilityReport() {
  const { selectedFacilityId } = useEntitlements();
  const { onError } = useApiGuards();

  return useQuery({
    queryKey: ["facilityReport", selectedFacilityId],
    queryFn: () => getFacilityReport(selectedFacilityId!),
    enabled: !!selectedFacilityId,
    onError
  });
}
