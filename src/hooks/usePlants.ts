import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiRequest } from "@/api/apiRequest";
import { useFacility } from "@/state/useFacility";

export type Plant = {
  id: string;
  name?: string;
  strain?: string;
  growId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
};

export type UsePlantsOptions = {
  growId?: string;
};

function normalizePlants(res: any): Plant[] {
  if (Array.isArray(res)) return res as Plant[];
  if (Array.isArray(res?.items)) return res.items as Plant[];
  if (Array.isArray(res?.data?.items)) return res.data.items as Plant[];
  if (Array.isArray(res?.data?.plants)) return res.data.plants as Plant[];
  if (Array.isArray(res?.plants)) return res.plants as Plant[];
  return [];
}

export async function fetchPlants(args: {
  facilityId?: string | null;
  growId?: string;
}): Promise<Plant[]> {
  const facilityId = args?.facilityId ?? null;
  const growId = args?.growId;

  const base = facilityId ? `/api/facility/${facilityId}/plants` : "/api/personal/plants";

  const query = growId ? `?growId=${encodeURIComponent(growId)}` : "";
  const res = await apiRequest(`${base}${query}`);

  return normalizePlants(res);
}

export function usePlants(
  options: UsePlantsOptions = {}
): UseQueryResult<Plant[], unknown> {
  const { selectedId: facilityId } = useFacility();

  return useQuery({
    queryKey: ["plants", facilityId ?? null, options.growId ?? null],
    queryFn: () => fetchPlants({ facilityId, growId: options.growId }),
    enabled: true
  });
}
