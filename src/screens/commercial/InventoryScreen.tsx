import React from "react";
import { View, Text, ActivityIndicator, FlatList, Button } from "react-native";
import EmptyState from "../../components/EmptyState";
import NotEntitledScreen from "../common/NotEntitledScreen";
import { useEntitlements } from "../../context/EntitlementsContext";
import { useProducts } from "../../hooks/useProducts";

export default function InventoryScreen({ navigation }: any) {
  const { capabilities } = useEntitlements();
  if (!capabilities?.commercial) return <NotEntitledScreen />;

  const { data, isLoading, error, refetch } = useProducts();
  const products = Array.isArray(data) ? data : [];

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
          Couldn’t load products
        </Text>
        <Text style={{ marginBottom: 12 }}>
          Please check your connection and try again.
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products yet"
        description="Add your first product to start selling and tracking orders."
        actionLabel="Add your first product"
        onAction={() => navigation?.navigate?.("AddProduct")}
      />
    );
  }

  return (
    <FlatList
      data={products}
      keyExtractor={(p: any) => p.id}
      renderItem={({ item }) => (
        <View style={{ padding: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "600" }}>
            {item.name || "Untitled product"}
          </Text>
          {typeof item.price === "number" && (
            <Text style={{ marginTop: 4 }}>
              {item.currency || "USD"} {item.price}
            </Text>
          )}
          <Text style={{ marginTop: 4, opacity: 0.7 }}>{item.status || "draft"}</Text>

          <View style={{ marginTop: 8 }}>
            <Button
              title="Edit"
              onPress={() =>
                navigation?.navigate?.("EditProduct", { productId: item.id })
              }
            />
          </View>
        </View>
      )}
    />
  );
}
