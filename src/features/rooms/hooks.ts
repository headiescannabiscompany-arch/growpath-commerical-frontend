export { useBulkCreateRooms } from "./useBulkCreateRooms";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useFacility } from "../../facility/FacilityProvider";

export function useRooms() {
  const { facilityId } = useFacility();
  return useQuery({
    queryKey: ["rooms", facilityId],
    queryFn: () => api.get(endpoints.rooms(facilityId)),
    enabled: !!facilityId
  });
}

export function useRoom(roomId) {
  const { facilityId } = useFacility();
  return useQuery({
    queryKey: ["room", facilityId, roomId],
    queryFn: () => api.get(endpoints.room(facilityId, roomId)),
    enabled: !!facilityId && !!roomId
  });
}
