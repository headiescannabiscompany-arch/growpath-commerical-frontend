import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAutomations, toggleAutomation } from "../api/automation";
import { useEntitlements } from "../context/EntitlementsContext";

export function useAutomations() {
  const { selectedFacilityId } = useEntitlements();
  const facilityId = selectedFacilityId;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["automations", facilityId],
    queryFn: () => fetchAutomations(facilityId!),
    enabled: !!facilityId
  });

  const toggle = useMutation({
    mutationFn: ({ id, enabled }: any) => toggleAutomation(facilityId!, id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["automations", facilityId]
      });
    }
  });

  return {
    ...query,
    toggleAutomation: toggle.mutateAsync
  };
}
