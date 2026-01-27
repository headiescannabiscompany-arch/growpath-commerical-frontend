import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getFacilityMembers,
  inviteFacilityMember,
  updateMemberRole,
  removeMember
} from "../api/facilityTeam";
import { useEntitlements } from "../entitlements";
import { useApiGuards } from "../api/hooks";
export function useFacilityTeam() {
  const qc = useQueryClient();
  const ent = useEntitlements();
  const facilityId = ent.facilityId;
  const { onError } = useApiGuards();
  if (!facilityId) {
    return {
      data: null,
      isLoading: false,
      error: new Error("No facilityId available"),
      refetch: async () => {}
    };
  }
  const members = useQuery({
    queryKey: ["facilityMembers", facilityId],
    queryFn: () => getFacilityMembers(facilityId!),
    enabled: !!facilityId
  });
  const invite = useMutation({
    mutationFn: (data: {
      email: string;
      role: import("../api/facilityTeam").FacilityMember["role"];
    }) => inviteFacilityMember(facilityId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilityMembers", facilityId] });
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
    }) => updateMemberRole(facilityId!, memberId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilityMembers", facilityId] });
    },
    onError
  });
  const remove = useMutation({
    mutationFn: (memberId: string) => removeMember(facilityId!, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facilityMembers", facilityId] });
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
