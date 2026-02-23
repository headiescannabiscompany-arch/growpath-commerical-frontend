import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useAuth } from "../../auth/AuthContext";
import { useFacility } from "../../facility/FacilityProvider";
import { TeamMember } from "./types";

export function useTeam() {
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useQuery<TeamMember[]>({
    queryKey: ["team", facilityId],
    queryFn: () => api.get(endpoints.team(facilityId!), token),
    enabled: !!facilityId && !!token
  });
}

export function useUpdateMember(id: string) {
  const updateQc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: (data: Partial<TeamMember>) =>
      api.patch(`${endpoints.team(facilityId!)}/${id}`, data, token),
    onSuccess: () => {
      updateQc.invalidateQueries({ queryKey: ["team", facilityId] });
    }
  });
}

export function useRemoveMember(id: string) {
  const removeQc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: () => api.del(`${endpoints.team(facilityId!)}/${id}`, token),
    onSuccess: () => {
      removeQc.invalidateQueries({ queryKey: ["team", facilityId] });
    }
  });
}

export function useInviteMember() {
  const inviteQc = useQueryClient();
  const { token } = useAuth();
  const { facilityId } = useFacility();

  return useMutation({
    mutationFn: (data: { email: string; role: string }) =>
      api.post(`${endpoints.team(facilityId!)}/invite`, data, token),
    onSuccess: () => {
      inviteQc.invalidateQueries({ queryKey: ["team", facilityId] });
    }
  });
}
