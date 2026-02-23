import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useFacility } from "../../facility/FacilityProvider";
import { requireString } from "../../utils/require";
export { useBulkCreateRooms } from "./useBulkCreateRooms";

export function useRooms() {
  const facility = useFacility();
  const facilityId = facility?.facilityId || null;
  return useQuery({
    queryKey: ["rooms", facilityId],
    queryFn: () => api.get(endpoints.rooms(requireString(facilityId, "facilityId"))),
    enabled: !!facilityId
  });
}

export function useRoom(roomId: string) {
  const facilityState = useFacility();
  const facilityIdValue = facilityState?.facilityId || null;
  return useQuery({
    queryKey: ["room", facilityIdValue, roomId],
    queryFn: () =>
      api.get(endpoints.room(requireString(facilityIdValue, "facilityId"), roomId)),
    enabled: !!facilityIdValue && !!roomId
  });
}
