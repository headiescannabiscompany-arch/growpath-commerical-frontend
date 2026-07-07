import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

import { useOrders, useUpdateOrderFulfillment } from "@/hooks/useOrders";

function orderId(item, idx) {
  return String(item?.id || item?._id || `order-${idx}`);
}

export default function CommercialOrdersScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useOrders();
  const updateFulfillment = useUpdateOrderFulfillment();
  const orders = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  async function markFulfilled(item) {
    const id = orderId(item, 0);
    if (!id) return;
    try {
      await updateFulfillment.mutateAsync({
        orderId: id,
        fulfillmentStatus: "fulfilled"
      });
    } catch (err) {
      Alert.alert("Order update failed", err?.message || "Unable to update order.");
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={orders}
      keyExtractor={orderId}
      onRefresh={refetch}
      refreshing={isRefetching}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>
            Internal checkout orders appear here when checkout is enabled. For products
            sold elsewhere, use this surface alongside product views, outbound clicks,
            inquiries, and storefront analytics.
          </Text>
        </View>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>
          {error
            ? "Failed to load orders or external tracking."
            : "No internal orders yet. External purchase links should be evaluated with product views, clicks, inquiries, and feed analytics."}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.row}>
            <Text style={styles.label}>Order:</Text> {item?.id || item?._id || "unknown"}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Product:</Text>{" "}
            {item?.productName || "Storefront product"}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Customer:</Text> {item?.customerName || "Customer"}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Status:</Text> {item?.status || "pending"}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Fulfillment:</Text>{" "}
            {item?.fulfillmentStatus || "unfulfilled"}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Total:</Text>{" "}
            {item?.total != null
              ? `$${Number(item.total).toFixed(2)} ${item?.currency || "USD"}`
              : "N/A"}
          </Text>
          {item?.fulfillmentStatus !== "fulfilled" ? (
            <Pressable
              style={[
                styles.button,
                updateFulfillment.isPending && styles.buttonDisabled
              ]}
              disabled={updateFulfillment.isPending}
              onPress={() => markFulfilled(item)}
            >
              <Text style={styles.buttonText}>Mark Internal Order Fulfilled</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 10 },
  subtitle: { color: "#64748B", lineHeight: 19 },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff"
  },
  row: { fontSize: 14, marginBottom: 4 },
  label: { fontWeight: "700" },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  empty: { opacity: 0.7, paddingTop: 8 }
});
