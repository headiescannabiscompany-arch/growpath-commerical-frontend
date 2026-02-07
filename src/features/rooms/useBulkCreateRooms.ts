import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useFacility } from "../../facility/FacilityProvider";
import { requireString } from "../../utils/require";

export function useBulkCreateRooms() {
  const { facilityId } = useFacility();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rooms: { name: string }[]) => {
      // If backend supports bulk, use it. Otherwise, loop.
      // Here, we loop and return array of results.
      const results = [];
      for (const room of rooms) {
        try {
          await api.post(endpoints.rooms(requireString(facilityId, "facilityId")), room);
          results.push({ success: true });
        } catch (e) {
          results.push({ success: false, error: e });
        }
      }
      return results;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms", facilityId] });
    }
  });
}
