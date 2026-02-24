import React, { useMemo } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";

import { useOrders } from "@/hooks/useOrders";

function orderId(item, idx) {
  return String(item?.id || item?._id || `order-${idx}`);
}

export default function CommercialOrdersScreen() {
  const { data, isLoading, error, refetch, isRefetching } = useOrders();
  const orders = useMemo(() => (Array.isArray(data) ? data : []), [data]);

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
      ListHeaderComponent={<Text style={styles.title}>Orders</Text>}
      ListEmptyComponent={
        <Text style={styles.empty}>{error ? "Failed to load orders." : "No orders yet."}</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.row}>
            <Text style={styles.label}>Order:</Text> {item?.id || item?._id || "unknown"}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Status:</Text> {item?.status || "pending"}
          </Text>
          <Text style={styles.row}>
            <Text style={styles.label}>Total:</Text>{" "}
            {item?.total != null ? `${item.total} ${item?.currency || "USD"}` : "N/A"}
          </Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 10 },
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
  empty: { opacity: 0.7, paddingTop: 8 }
});
