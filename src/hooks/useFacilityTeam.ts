import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFacilityMembers,
  inviteFacilityMember,
  updateMemberRole,
  removeMember
} from "../api/facilityTeam";
import { useEntitlements } from "../context/EntitlementsContext";
import { useApiGuards } from "../api/hooks";

export function useFacilityTeam() {
  const qc = useQueryClient();
  const { selectedFacilityId } = useEntitlements();
  const { onError } = useApiGuards();

  const members = useQuery({
    queryKey: ["facilityMembers", selectedFacilityId],
    queryFn: () => getFacilityMembers(selectedFacilityId!),
    enabled: !!selectedFacilityId
  });

  const invite = useMutation({
    mutationFn: (data: {
      email: string;
      role: import("../api/facilityTeam").FacilityMember["role"];
    }) => inviteFacilityMember(selectedFacilityId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilityMembers", selectedFacilityId] });
    },
    onError
  });

  const updateRole = useMutation({
    mutationFn: ({
      memberId,
      role
    }: {
      memberId: string;
      role: import("../api/facilityTeam").FacilityMember["role"];
    }) => updateMemberRole(selectedFacilityId!, memberId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilityMembers", selectedFacilityId] });
    },
    onError
  });

  const remove = useMutation({
    mutationFn: (memberId: string) => removeMember(selectedFacilityId!, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilityMembers", selectedFacilityId] });
    },
    onError
  });

  return {
    ...members,
    invite: invite.mutateAsync,
    updateRole: updateRole.mutateAsync,
    remove: remove.mutateAsync
  };
}
