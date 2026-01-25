import React from "react";
import { View, ActivityIndicator, FlatList, Text, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";
import EmptyState from "../../components/EmptyState";
import { useGrows } from "../../hooks/useGrows";

export default function GrowsScreen() {
  const navigation = useNavigation<any>();
  const { data, isLoading, error, refetch } = useGrows();

  const grows = Array.isArray(data) ? data : [];

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
          Couldn’t load grows
        </Text>
        <Text style={{ marginBottom: 12 }}>
          Please check your connection and try again.
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (grows.length === 0) {
    return (
      <EmptyState
        title="No grows yet"
        description="Create your first grow to start tracking plants and daily progress."
        actionLabel="Create your first grow"
        onAction={() => navigation.navigate("CreateGrow")}
      />
    );
  }

  return (
    <FlatList
      data={grows}
      keyExtractor={(g: any) => g.id}
      renderItem={({ item }) => (
        <Text style={{ padding: 12 }}>{item.name || "Untitled Grow"}</Text>
      )}
    />
  );
}
