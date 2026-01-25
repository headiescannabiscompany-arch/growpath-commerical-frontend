import { useQuery } from "@tanstack/react-query";
import { getFacilities, Facility } from "../api/facilities";
import { useApiGuards } from "../api/hooks";

export function useFacilities() {
  const { onError } = useApiGuards();
  return useQuery<Facility[]>({
    queryKey: ["facilities"],
    queryFn: getFacilities,
    onError,
    staleTime: 1000 * 60 * 5
  });
}
