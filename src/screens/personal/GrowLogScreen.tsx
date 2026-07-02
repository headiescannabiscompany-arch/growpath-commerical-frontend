import React from "react";
import { View, ActivityIndicator, FlatList, Text } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useRouter } from "expo-router";

import { listPersonalLogs, type PersonalLog } from "../../api/logs";
import EmptyState from "../../components/EmptyState";
import { InlineError } from "../../components/InlineError";
import { useApiErrorHandler } from "../../hooks/useApiErrorHandler";

export default function GrowLogScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const router = useRouter();

  const growId: string | undefined = route?.params?.growId ?? undefined;

  const [logs, setLogs] = React.useState<PersonalLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<any>(null);

  const { toInlineError } = useApiErrorHandler();
  const inlineError = React.useMemo(
    () => (error ? toInlineError(error) : null),
    [error, toInlineError]
  );

  const load = React.useCallback(async () => {
    if (!growId) {
      setLogs([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const rows = await listPersonalLogs({ growId });
      setLogs(Array.isArray(rows) ? rows : []);
    } catch (loadError) {
      setLogs([]);
      setError(loadError);
    } finally {
      setIsLoading(false);
    }
  }, [growId]);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [load])
  );

  const openNewLog = React.useCallback(() => {
    if (!growId) return;
    router.push(`/home/personal/logs/new?growId=${encodeURIComponent(growId)}`);
  }, [growId, router]);

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
        <InlineError error={inlineError} onRetry={load} style={{ margin: 16 }} />
      ) : null}

      {logs.length === 0 ? (
        <EmptyState
          title="No log entries yet"
          description="Record today's log to start your habit."
          actionLabel="Record Log"
          onAction={openNewLog}
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(l: any, idx) => String(l?.id ?? l?._id ?? l?.logId ?? idx)}
          renderItem={({ item }) => (
            <View style={{ padding: 12 }}>
              <Text style={{ fontWeight: "700" }}>
                {item?.title || item?.type || "Log entry"}
              </Text>
              {item?.notes ? <Text style={{ marginTop: 4 }}>{item.notes}</Text> : null}
              {item?.date || item?.createdAt ? (
                <Text style={{ marginTop: 4, color: "#64748B", fontSize: 12 }}>
                  {item.date || item.createdAt}
                </Text>
              ) : null}
            </View>
          )}
        />
      )}
    </View>
  );
}
