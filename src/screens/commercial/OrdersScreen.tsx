import React from "react";
import { View, Text, ActivityIndicator, FlatList, Button } from "react-native";
import EmptyState from "../../components/EmptyState";
import NotEntitledScreen from "../common/NotEntitledScreen";
import { useEntitlements } from "../../context/EntitlementsContext";
import { useOrders } from "../../hooks/useOrders";

export default function OrdersScreen({ navigation }: any) {
  const { capabilities } = useEntitlements();
  if (!capabilities?.commercial) return <NotEntitledScreen />;

  const { data, isLoading, error, refetch } = useOrders();
  const orders = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>
          Couldn’t load orders
        </Text>
        <Text style={{ marginBottom: 12 }}>
          Please check your connection and try again.
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="No orders yet"
        description="Share your store link to start receiving orders."
        actionLabel="Share store link"
        onAction={() => navigation?.navigate?.("Links")}
      />
    );
  }

  return (
    <FlatList
      data={orders}
      keyExtractor={(o: any) => o.id}
      renderItem={({ item }) => (
        <View style={{ padding: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>Order #{item.id}</Text>
          <Text style={{ marginTop: 4, opacity: 0.8 }}>Status: {item.status}</Text>
          {typeof item.total === "number" && (
            <Text style={{ marginTop: 4 }}>
              {item.currency || "USD"} {item.total}
            </Text>
          )}
          {item.createdAt && (
            <Text style={{ marginTop: 4, opacity: 0.7 }}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          )}
        </View>
      )}
    />
  );
}
