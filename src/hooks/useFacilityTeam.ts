import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFacility } from "../facility/FacilityProvider";
import {
  listTeamMembers,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  FacilityRole
} from "../api/team";

// CONTRACT: facility context comes from FacilityProvider only.
export function useFacilityTeam() {
  const queryClient = useQueryClient();
  const { activeFacilityId } = useFacility();

  const membersQuery = useQuery({
    queryKey: ["teamMembers", activeFacilityId],
    queryFn: () => listTeamMembers(activeFacilityId!),
    enabled: !!activeFacilityId
  });

  const inviteMutation = useMutation({
    mutationFn: (data: { email: string; role: FacilityRole }) =>
      inviteTeamMember(activeFacilityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", activeFacilityId] });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: (data: { userId: string; role: FacilityRole }) =>
      updateTeamMemberRole(activeFacilityId!, data.userId, { role: data.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", activeFacilityId] });
    }
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeTeamMember(activeFacilityId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers", activeFacilityId] });
    }
  });

  return {
    ...membersQuery,
    invite: inviteMutation.mutateAsync,
    inviting: inviteMutation.isPending,
    updateRole: updateRoleMutation.mutateAsync,
    updatingRole: updateRoleMutation.isPending,
    remove: removeMutation.mutateAsync,
    removing: removeMutation.isPending
  };
}
