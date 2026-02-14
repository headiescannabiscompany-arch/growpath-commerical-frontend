import React from "react";
import { View, ActivityIndicator, FlatList, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import EmptyState from "../../components/EmptyState";
import InlineError from "../../components/InlineError";
import NotEntitledScreen from "../common/NotEntitledScreen";

import { useEntitlements } from "@/entitlements";
import { useApiErrorHandler } from "../../hooks/useApiErrorHandler";
import { usePersonalTasks } from "../../hooks/usePersonalTasks";

function TasksScreenInner() {
  const navigation = useNavigation<any>();

  const { data, isLoading, error, refetch } = usePersonalTasks();

  const { toInlineError } = useApiErrorHandler();
  const inlineError = React.useMemo(
    () => (error ? toInlineError(error) : null),
    [error, toInlineError]
  );

  const tasks = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {inlineError ? (
        <InlineError
          error={inlineError}
          onRetry={() => refetch()}
          style={{ margin: 16 }}
        />
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState
          title="No reminders yet"
          description="Create a task to stay on track."
          actionLabel="Create Task"
          onAction={() => navigation.navigate("CreateTask")}
        />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t: any, idx) => String(t?.id ?? t?._id ?? t?.taskId ?? idx)}
          renderItem={({ item }) => (
            <Text style={{ padding: 12 }}>{item?.title || "Untitled Task"}</Text>
          )}
        />
      )}
    </View>
  );
}

export default function TasksScreen() {
  // ✅ Entitlement gate in outer component avoids conditional hooks
  const ent = useEntitlements() || {};
  const capabilities = ent.capabilities || {};

  if (!capabilities.tasks) return <NotEntitledScreen />;

  return <TasksScreenInner />;
}

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
