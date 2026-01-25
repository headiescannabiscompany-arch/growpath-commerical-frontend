import React from "react";
import { View, ActivityIndicator, FlatList, Text, Button } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import EmptyState from "../../components/EmptyState";
import { useGrowLogs } from "../../hooks/useGrowLogs";

export default function GrowLogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const growId = route.params?.growId;
  const { data, isLoading, error, refetch } = useGrowLogs(growId);

  const logs = Array.isArray(data) ? data : [];

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
          Couldn’t load log entries
        </Text>
        <Text style={{ marginBottom: 12 }}>
          Please check your connection and try again.
        </Text>
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (logs.length === 0) {
    return (
      <EmptyState
        title="No log entries yet"
        description="Record today’s log to start your habit."
        actionLabel="Record Log"
        onAction={() => navigation.navigate("AddLog", { growId })}
      />
    );
  }

  return (
    <FlatList
      data={logs}
      keyExtractor={(l: any) => l.id}
      renderItem={({ item }) => (
        <Text style={{ padding: 12 }}>{item.note || "Log entry"}</Text>
      )}
    />
  );
}
