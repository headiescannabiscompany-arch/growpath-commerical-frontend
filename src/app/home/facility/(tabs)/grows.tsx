import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type AnyRec = Record<string, any>;

function asArray(res: any): AnyRec[] {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.grows)) return res.grows;
  return [];
}

function pickId(x: AnyRec): string {
  return String(x?.id ?? x?._id ?? x?.growId ?? x?.uuid ?? "");
}

function pickTitle(x: AnyRec): string {
  return String(x?.name ?? x?.title ?? x?.strain ?? x?.label ?? "Grow");
}

function pickSubtitle(x: AnyRec): string {
  const room = x?.roomName ?? x?.room ?? x?.roomId;
  const phase = x?.phase ?? x?.stage ?? x?.status;
  const started = x?.startedAt ?? x?.startDate ?? x?.createdAt;
  const parts = [
    room ? `Room: ${String(room)}` : "",
    phase ? `Phase: ${String(phase)}` : "",
    started ? `Start: ${String(started)}` : ""
  ].filter(Boolean);
  return parts.join(" - ");
}

export default function FacilityGrowsTab() {
  const router = useRouter();
  const { roomId, roomName } = useLocalSearchParams<{
    roomId?: string;
    roomName?: string;
  }>();
  const { selectedId: facilityId } = useFacility();
  const { palette } = useAppTheme();

  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );
  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [items, setItems] = useState<AnyRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId) return;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.grows(facilityId));
        const rows = asArray(res);
        setItems(
          roomId
            ? rows.filter(
                (row) =>
                  String(row.roomId ?? row.room?._id ?? row.room?.id ?? "") ===
                  String(roomId)
              )
            : rows
        );
      } catch (e) {
        handleApiError(e);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [facilityId, roomId, clearError, handleApiError]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const header = useMemo(() => {
    const n = items.length;
    return n === 1 ? "1 grow" : `${n} grows`;
  }, [items.length]);
  const roomLabel = String(roomName || "this room");

  function openStartGrow() {
    router.push({
      pathname: "/onboarding/start-grow",
      params: roomId
        ? {
            roomId: String(roomId),
            roomName: roomLabel
          }
        : {}
    });
  }

  return (
    <ScreenBoundary
      title={roomName ? `${roomName} grows` : "Grows"}
      showBack
      backFallbackHref="/home/facility/rooms"
    >
      <View style={[styles.container, { backgroundColor: palette.page }]}>
        {error ? <InlineError error={error} /> : null}

        <View style={styles.headerRow}>
          <Text style={[styles.h1, { color: palette.text }]}>
            {roomName ? `${roomName} > Grows` : "Facility Grows"}
          </Text>
          <Text style={[styles.muted, { color: palette.textMuted }]}>{header}</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={[styles.muted, { color: palette.textMuted }]}>
              Loading grows...
            </Text>
          </View>
        ) : null}

        <FlatList
          data={items}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View
                style={[
                  styles.empty,
                  { backgroundColor: palette.surface, borderColor: palette.border }
                ]}
              >
                <Text style={[styles.emptyTitle, { color: palette.text }]}>
                  {roomId ? "No grows in this room yet" : "No facility grows yet"}
                </Text>
                <Text style={[styles.muted, { color: palette.textMuted }]}>
                  {roomId
                    ? `Start a grow in ${roomLabel} to connect its plants, tasks, logs, and AI context.`
                    : "Start a grow to connect rooms, plants, tasks, logs, and AI context."}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    roomId ? `Start grow in ${roomLabel}` : "Start facility grow"
                  }
                  onPress={openStartGrow}
                  style={({ pressed }) => [
                    styles.startButton,
                    { backgroundColor: palette.accent, borderColor: palette.accent },
                    pressed && styles.pressed
                  ]}
                >
                  <Text style={[styles.startButtonText, { color: palette.accentText }]}>
                    {roomId ? "Start a grow in this room" : "Start a facility grow"}
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const id = pickId(item);
            const title = pickTitle(item);
            const subtitle = pickSubtitle(item);

            return (
              <Pressable
                onPress={() => {
                  if (!id) return;
                  router.push({ pathname: "/home/facility/grows/[id]", params: { id } });
                }}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border
                  },
                  pressed && styles.pressed
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.rowTitle, { color: palette.text }]}
                    numberOfLines={1}
                  >
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text
                      style={[styles.rowSub, { color: palette.textMuted }]}
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.chev, { color: palette.textMuted }]}>{">"}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  headerRow: { marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: "900", marginBottom: 4 },
  muted: { opacity: 0.7 },
  loading: { alignItems: "center", paddingVertical: 18 },
  list: { paddingVertical: 6 },
  row: {
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    padding: 14
  },
  pressed: { opacity: 0.85 },
  rowTitle: { fontSize: 16, fontWeight: "900", marginBottom: 4 },
  rowSub: { opacity: 0.7 },
  chev: { fontSize: 22, opacity: 0.5, paddingLeft: 10 },
  empty: {
    alignItems: "center",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    paddingVertical: 26
  },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  startButton: {
    borderRadius: radius.card,
    borderWidth: 1,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  startButtonText: { fontWeight: "900" }
});
