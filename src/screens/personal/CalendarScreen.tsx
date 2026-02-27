import React from "react";
import { View, ActivityIndicator, FlatList, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import EmptyState from "../../components/EmptyState";
import { InlineError } from "../../components/InlineError";
import NotEntitledScreen from "../common/NotEntitledScreen";

import { useEntitlements } from "@/entitlements";
import { useApiErrorHandler } from "../../hooks/useApiErrorHandler";
import { useCalendar } from "../../hooks/useCalendar";

function getMonthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return [start.toISOString(), end.toISOString()] as const;
}

function CalendarScreenInner() {
  const navigation = useNavigation<any>();

  // Keep month stable for this mount (prevents refetch loops)
  const [startISO, endISO] = React.useMemo(() => getMonthRange(new Date()), []);
  const { data, isLoading, error, refetch } = useCalendar(startISO, endISO);

  const { toInlineError } = useApiErrorHandler();
  const inlineError = React.useMemo(
    () => (error ? toInlineError(error) : null),
    [error, toInlineError]
  );

  const events = React.useMemo(() => (Array.isArray(data) ? data : []), [data]);

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

      {events.length === 0 ? (
        <EmptyState
          title="No schedule yet"
          description="Add your first event to plan watering, feeding, and key milestones."
          actionLabel="Add first event"
          onAction={() => navigation.navigate("AddEvent")}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e: any, idx) => String(e?.id ?? e?._id ?? e?.eventId ?? idx)}
          renderItem={({ item }) => (
            <Text style={{ padding: 12 }}>{item?.title || "Untitled Event"}</Text>
          )}
        />
      )}
    </View>
  );
}

export default function CalendarScreen() {
  // Entitlement gate in outer component avoids conditional hooks
  const ent = useEntitlements() || {};
  const capabilities = ent.capabilities || {};

  if (!capabilities.calendar) return <NotEntitledScreen />;

  return <CalendarScreenInner />;
}
