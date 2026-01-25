import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEntitlements } from "../context/EntitlementsContext";
import { useApiGuards } from "../api/hooks";
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook
} from "../api/webhooks";

export function useWebhooks() {
  const qc = useQueryClient();
  const { selectedFacilityId } = useEntitlements();
  const { onError } = useApiGuards();

  const queryKey = ["webhooks", selectedFacilityId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => listWebhooks(selectedFacilityId!),
    enabled: !!selectedFacilityId
  });

  // v5-safe: route query errors through your centralized guard
  useEffect(() => {
    if (query.error) onError(query.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.error]);

  const create = useMutation({
    mutationFn: (data: any) => createWebhook(selectedFacilityId!, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey });
    },
    onError
  });

  const update = useMutation({
    mutationFn: ({ webhookId, ...data }: any) =>
      updateWebhook(selectedFacilityId!, webhookId, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey });
    },
    onError
  });

  const remove = useMutation({
    mutationFn: (webhookId: string) => deleteWebhook(selectedFacilityId!, webhookId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey });
    },
    onError
  });

  return {
    ...query,
    createWebhook: create.mutateAsync,
    updateWebhook: update.mutateAsync,
    deleteWebhook: remove.mutateAsync
  };
}
