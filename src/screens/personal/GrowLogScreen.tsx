import React from "react";
import { View, ActivityIndicator, FlatList, Text } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import EmptyState from "../../components/EmptyState";
import { InlineError } from "../../components/InlineError";
import { useApiErrorHandler } from "../../hooks/useApiErrorHandler";
import { useGrowLogs } from "../../hooks/useGrowLogs";

export default function GrowLogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const growId: string | null = route?.params?.growId ?? null;

  // Always call hook; it self-disables when growId is missing
  const { data, isLoading, error, refetch } = useGrowLogs(growId);

  const { toInlineError } = useApiErrorHandler();
  const inlineError = React.useMemo(
    () => (error ? toInlineError(error) : null),
    [error, toInlineError]
  );

  const logs = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);

  if (!growId) {
    return (
      <EmptyState
        title="No grow selected"
        description="Open a grow first, then view or record log entries."
        actionLabel="Go to Grows"
        onAction={() => navigation.navigate("Grows")}
      />
    );
  }

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

      {logs.length === 0 ? (
        <EmptyState
          title="No log entries yet"
          description="Record today's log to start your habit."
          actionLabel="Record Log"
          onAction={() => navigation.navigate("AddLog", { growId })}
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(l: any, idx) => String(l?.id ?? l?._id ?? l?.logId ?? idx)}
          renderItem={({ item }) => (
            <Text style={{ padding: 12 }}>{item?.note || "Log entry"}</Text>
          )}
        />
      )}
    </View>
  );
}

