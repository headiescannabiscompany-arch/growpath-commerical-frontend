import React from "react";
import { View, ActivityIndicator, FlatList, Text, Button } from "react-native";
import { useNavigation } from "@react-navigation/native";
import EmptyState from "../../components/EmptyState";
import { usePersonalTasks } from "../../hooks/usePersonalTasks";
import { useEntitlements } from "@/entitlements";
import NotEntitledScreen from "../common/NotEntitledScreen";
import { useApiErrorHandler } from "../../hooks/useApiErrorHandler";
import { InlineError } from "../../components/InlineError";

export default function TasksScreen() {
  const navigation = useNavigation<any>();
  const { capabilities } = useEntitlements() || {};
  if (!capabilities?.tasks) return <NotEntitledScreen />;

  const { data, isLoading, error, refetch } = usePersonalTasks();
  const handleApiError = useApiErrorHandler();
  const uiError = error ? handleApiError(error) : null;
  const tasks = Array.isArray(data) ? data : [];

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (uiError) {
    return (
      <View style={{ flex: 1, padding: 16, justifyContent: "center" }}>
        <InlineError
          title={uiError.title || "Couldn’t load tasks"}
          message={uiError.message}
          requestId={uiError.requestId}
        />
        <Button title="Retry" onPress={() => refetch()} />
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="No reminders yet"
        description="Create a task to stay on track."
        actionLabel="Create Task"
        onAction={() => navigation.navigate("CreateTask")}
      />
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(t: any) => t.id}
      renderItem={({ item }) => (
        <Text style={{ padding: 12 }}>{item.title || "Untitled Task"}</Text>
      )}
    />
  );
}
