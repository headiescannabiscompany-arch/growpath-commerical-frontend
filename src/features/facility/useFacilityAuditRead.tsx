import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { listAuditLogs } from "@/api/audit";
import { normalizeApiError } from "@/api/errors";
import { useFacility } from "@/state/useFacility";
import { useAppTheme } from "@/theme/appTheme";
import type { AuditLog } from "@/types/contracts";
import { useFacilityRecordScope } from "./useFacilityRecordRead";

// Page-local reads: private audit snapshots must not survive an identity change.
export function useFacilityAuditRead(route: unknown = "index") {
  const scope = useFacilityRecordScope(["audit", route]);
  const { selectedId } = useFacility();
  const current = useRef(scope);
  current.current = scope;
  const sequence = useRef(0);
  const flight = useRef<string | null>(null);
  const [state, setState] = useState<{
    scope: string;
    logs: AuditLog[];
    hasLoaded: boolean;
    busy: boolean;
    error: unknown;
  }>({ scope, logs: [], hasLoaded: false, busy: !!selectedId, error: null });
  const refetch = useCallback(async () => {
    if (!selectedId || flight.current === scope) return;
    flight.current = scope;
    const request = ++sequence.current;
    setState((previous) => ({
      scope,
      logs: previous.scope === scope ? previous.logs : [],
      hasLoaded: previous.scope === scope && previous.hasLoaded,
      busy: true,
      error: null
    }));
    try {
      const result = await listAuditLogs(selectedId);
      if (current.current !== scope || sequence.current !== request) return;
      setState({ scope, logs: result.data, hasLoaded: true, busy: false, error: null });
    } catch (error) {
      if (current.current !== scope || sequence.current !== request) return;
      setState((previous) => ({ ...previous, busy: false, error }));
    } finally {
      if (sequence.current === request) flight.current = null;
    }
  }, [scope, selectedId]);
  const cancelRead = useCallback(() => {
    sequence.current++;
    flight.current = null;
  }, []);
  useEffect(() => {
    void refetch();
    return cancelRead;
  }, [refetch, cancelRead]);
  const visible = state.scope === scope;
  return {
    logs: visible ? state.logs : [],
    hasLoaded: visible && state.hasLoaded,
    isLoading: !!selectedId && (!visible || (state.busy && !state.hasLoaded)),
    isRefreshing: !!selectedId && (!visible || state.busy),
    error: visible ? state.error : null,
    refetch,
    selectedId
  };
}

export function FacilityAuditReadStatus({
  read
}: {
  read: ReturnType<typeof useFacilityAuditRead>;
}) {
  const { palette } = useAppTheme();
  return (
    <View style={{ gap: 8, marginBottom: 12 }}>
      {read.selectedId ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh facility audit history"
          accessibilityState={{ disabled: read.isRefreshing, busy: read.isRefreshing }}
          disabled={read.isRefreshing}
          onPress={() => void read.refetch()}
          style={{
            alignSelf: "flex-start",
            padding: 10,
            backgroundColor: palette.surface,
            borderRadius: 8
          }}
        >
          <Text style={{ color: palette.link, fontWeight: "700" }}>
            {read.isRefreshing
              ? "Refreshing..."
              : read.error
                ? "Retry audit history"
                : "Refresh audit history"}
          </Text>
        </Pressable>
      ) : null}
      {read.error ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
          {normalizeApiError(read.error).message || "Audit history unavailable."}
        </Text>
      ) : null}
      {read.hasLoaded && (read.error || read.isRefreshing) ? (
        <Text style={{ color: palette.textMuted }}>
          Previously loaded audit history shown.{" "}
          {read.isRefreshing
            ? "Refreshing records..."
            : "Retry to refresh recorded history."}
        </Text>
      ) : null}
      {!read.hasLoaded ? (
        <Text style={{ color: palette.textMuted }}>
          {!read.selectedId
            ? "Select a facility first."
            : read.isLoading
              ? "Loading audit logs..."
              : "Audit history unavailable. Retry to load recorded events."}
        </Text>
      ) : null}
    </View>
  );
}
