import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFacilities, Facility } from "../api/facilities";
import { useApiGuards } from "../api/hooks";

export function useFacilities() {
  const { onError } = useApiGuards();
  const query = useQuery<Facility[]>({
    queryKey: ["facilities"],
    queryFn: getFacilities,
    staleTime: 1000 * 60 * 5
  });

  useEffect(() => {
    if (query.error) onError?.(query.error);
  }, [query.error, onError]);

  return query;
}
