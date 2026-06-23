import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchOrders, updateOrderFulfillment } from "../api/orders";

export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: () => fetchOrders()
  });
}

export function useUpdateOrderFulfillment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      fulfillmentStatus
    }: {
      orderId: string;
      fulfillmentStatus: "unfulfilled" | "fulfilled" | "canceled";
    }) => updateOrderFulfillment(orderId, fulfillmentStatus),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    }
  });
}
