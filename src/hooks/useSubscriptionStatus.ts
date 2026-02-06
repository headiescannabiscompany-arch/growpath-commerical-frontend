import { useQuery } from "@tanstack/react-query";
import { getSubscriptionStatus } from "../api/subscription";

export function useSubscriptionStatus() {
  const subscriptionQuery = useQuery({
    queryKey: ["subscriptionStatus"],
    queryFn: () => getSubscriptionStatus(),
    refetchOnWindowFocus: false
  });

  return {
    subscription: subscriptionQuery.data,
    isLoading: subscriptionQuery.isLoading,
    error: subscriptionQuery.error,
    refetch: subscriptionQuery.refetch
  };
}
