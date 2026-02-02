import { useQuery } from "@tanstack/react-query";
import { useEntitlements } from "../entitlements";
import { api } from "../api/client";
import { FacilityInvite } from "../api/facilityTeam";

export function useInvites() {
  const ent = useEntitlements();
  const facilityId = ent.facilityId;
  return useQuery<FacilityInvite[]>({
    queryKey: ["invites", facilityId],
    queryFn: () => api(`/api/facilities/${facilityId}/invites`),
    enabled: !!facilityId
  });
}
