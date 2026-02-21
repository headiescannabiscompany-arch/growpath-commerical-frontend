import { useQuery } from "@tanstack/react-query";
import { useEntitlements } from "../entitlements";
import { apiRequest } from "../api/apiRequest";
import { FacilityInvite } from "../api/facilityTeam";

export function useInvites() {
  const ent = useEntitlements();
  const facilityId = ent.facilityId;
  return useQuery<FacilityInvite[]>({
    queryKey: ["invites", facilityId],
    queryFn: () => apiRequest(`/api/facilities/${facilityId}/invites`, { method: "GET" }),
    enabled: !!facilityId
  });
}
