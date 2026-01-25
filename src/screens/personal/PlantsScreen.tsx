import React from "react";
import { View, ActivityIndicator, FlatList, Text, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";
import EmptyState from "../../components/EmptyState";
import { usePlants } from "../../hooks/usePlants";

export default function PlantsScreen() {
  const navigation = useNavigation<any>();
  const { data, isLoading, error, refetch } = usePlants();

  const plants = Array.isArray(data) ? data : [];

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
          Couldn’t load plants
        </Text>
        <Text style={{ marginBottom: 12 }}>
          Please check your connection and try again.
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (plants.length === 0) {
    return (
      <EmptyState
        title="No plants added"
        description="Add your first plant to start tracking health and progress."
        actionLabel="Add your first plant"
        onAction={() => navigation.navigate("AddPlant")}
      />
    );
  }

  return (
    <FlatList
      data={plants}
      keyExtractor={(p: any) => p.id}
      renderItem={({ item }) => (
        <Text style={{ padding: 12 }}>{item.name || "Untitled Plant"}</Text>
      )}
    />
  );
}
