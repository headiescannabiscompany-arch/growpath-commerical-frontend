// CONTRACT: facility context comes from FacilityProvider only.
// Do not derive facilityId from entitlements, plan, or UI state outside Session/Facility providers.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import { fetchRooms, createRoom } from "../api/rooms";

export function useRooms() {
  const { activeFacilityId } = useFacility();
  const queryClient = useQueryClient();

  const roomsQuery = useQuery({
    queryKey: ["rooms", activeFacilityId],
    queryFn: () => fetchRooms(activeFacilityId!),
    enabled: !!activeFacilityId
  });

  const createRoomMutation = useMutation({
    mutationFn: (data: { name: string; roomType?: string; trackingMode?: string }) =>
      createRoom(activeFacilityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", activeFacilityId] });
    }
  });

  return {
    ...roomsQuery,
    createRoom: createRoomMutation.mutateAsync,
    creating: createRoomMutation.isPending
  };
}
