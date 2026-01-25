import React from "react";
import { FlatList } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useInventory } from "../../hooks/useInventory";
import EmptyState from "../../components/EmptyState";
import LoadingSpinner from "../../components/LoadingSpinner";
import ErrorState from "../../components/ErrorState";
import InventoryRow from "../../components/InventoryRow";

export default function InventoryScreen() {
  const navigation = useNavigation<any>();
  const { data: items, isLoading, error } = useInventory();

  if (isLoading) return <LoadingSpinner />;
  if (error)
    return (
      <ErrorState
        message="Failed to load inventory"
        onRetry={() => window.location.reload()}
      />
    );

  if (!items || items.length === 0) {
    return (
      <EmptyState
        title="No inventory yet"
        description="Add your first SKU to track stock."
        actionLabel="Add Item"
        onAction={() => navigation.navigate("CreateInventory")}
      />
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <InventoryRow
          item={item}
          onEdit={() => navigation.navigate("EditInventory", { itemId: item.id })}
        />
      )}
    />
  );
}
