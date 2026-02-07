import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useEntitlements } from "@/entitlements";
import { useApiGuards } from "../api/hooks";
import { getFacilityReport } from "../api/reports";
export function useFacilityReport() {
  const { selectedFacilityId } = useEntitlements();
  const { onError } = useApiGuards();
  const query = useQuery({
    queryKey: ["facilityReport", selectedFacilityId],
    queryFn: () => getFacilityReport(selectedFacilityId!),
    enabled: !!selectedFacilityId
  });
  useEffect(() => {
    if (query.error) onError?.(query.error);
  }, [query.error, onError]);
  return query;
}
