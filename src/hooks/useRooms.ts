// CONTRACT: facility context comes from FacilityProvider only.
// Do not derive facilityId from entitlements, plan, or UI state outside Session/Facility providers.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import { fetchRooms, createRoom as apiCreateRoom } from "../api/rooms";

type CreateRoomInput = {
  name: string;
  roomType?: string;
  trackingMode?: string;
};

export function useRooms() {
  const { activeFacilityId } = useFacility();
  const queryClient = useQueryClient();

  const roomsQuery = useQuery({
    queryKey: ["rooms", activeFacilityId],
    queryFn: () => fetchRooms(activeFacilityId as string),
    enabled: !!activeFacilityId
  });

  const createRoomMutation = useMutation({
    mutationFn: (data: CreateRoomInput) =>
      apiCreateRoom(activeFacilityId as string, data),
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
