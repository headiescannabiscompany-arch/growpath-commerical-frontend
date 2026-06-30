import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWebhook,
  deleteWebhook,
  listWebhookDeliveries,
  rotateWebhookSecret,
  testWebhookDelivery,
  listWebhooks,
  updateWebhook,
  type WebhookDelivery,
  type Webhook
} from "../api/webhooks";

export type { Webhook, WebhookDelivery };

export function useWebhooks() {
  const queryClient = useQueryClient();
  const queryKey = ["webhooks"];

  const webhooksQuery = useQuery({
    queryKey,
    queryFn: listWebhooks,
    refetchOnWindowFocus: false
  });

  const createMutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Webhook> }) =>
      updateWebhook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const rotateSecretMutation = useMutation({
    mutationFn: rotateWebhookSecret,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const testDeliveryMutation = useMutation({
    mutationFn: testWebhookDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const loadDeliveriesMutation = useMutation({
    mutationFn: listWebhookDeliveries
  });

  return {
    data: webhooksQuery.data ?? [],
    isLoading: webhooksQuery.isLoading,
    isRefreshing: webhooksQuery.isRefetching,
    error: webhooksQuery.error,
    refetch: webhooksQuery.refetch,
    createWebhook: createMutation.mutateAsync,
    updateWebhook: (id: string, data: Partial<Webhook>) =>
      updateMutation.mutateAsync({ id, data }),
    deleteWebhook: deleteMutation.mutateAsync,
    rotateWebhookSecret: rotateSecretMutation.mutateAsync,
    testWebhookDelivery: testDeliveryMutation.mutateAsync,
    loadWebhookDeliveries: loadDeliveriesMutation.mutateAsync,
    isSaving:
      createMutation.isPending ||
      updateMutation.isPending ||
      deleteMutation.isPending ||
      rotateSecretMutation.isPending ||
      testDeliveryMutation.isPending ||
      loadDeliveriesMutation.isPending
  };
}
