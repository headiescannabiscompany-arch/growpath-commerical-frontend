import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEntitlements } from "@/entitlements";
import { useApiGuards } from "../api/hooks";
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook
} from "../api/webhooks";

export function useWebhooks() {
  const qc = useQueryClient();
  const { facilityId } = useEntitlements();
  const { onError } = useApiGuards();

  const queryKey = ["webhooks", facilityId] as const;

  const query = useQuery({
    queryKey,
    queryFn: () => listWebhooks(facilityId!),
    enabled: !!facilityId
  });

  useEffect(() => {
    if (query.error) onError(query.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.error]);

  const create = useMutation({
    mutationFn: (data: any) => createWebhook(facilityId!, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey });
    },
    onError
  });

  const update = useMutation({
    mutationFn: ({ webhookId, ...data }: any) =>
      updateWebhook(facilityId!, webhookId, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey });
    },
    onError
  });

  const remove = useMutation({
    mutationFn: (webhookId: string) => deleteWebhook(facilityId!, webhookId),
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
