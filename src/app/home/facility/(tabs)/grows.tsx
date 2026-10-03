import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { fetchRooms } from "@/api/rooms";
import { facilityGrowSubtitle } from "@/features/facility/growSummary";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import {
  useFacilityRecordRead,
  useFacilityRecordScope
} from "@/features/facility/useFacilityRecordRead";
import { useFacility } from "@/state/useFacility";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

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

export default function FacilityGrowsTab() {
  const params = useLocalSearchParams();
  const scope = useFacilityRecordScope(params);
  return <FacilityGrowsTabContent key={scope} />;
}

function FacilityGrowsTabContent() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { roomId, roomName } = useLocalSearchParams<{
    roomId?: string;
    roomName?: string;
  }>();
  const { selectedId: facilityId } = useFacility();
  const ent = useEntitlements();
  const facilityRole = String(ent.facilityRole || "VIEWER").toUpperCase();
  const canStartGrow =
    Boolean(ent?.can?.(CAPABILITY_KEYS.GROWS_WRITE)) &&
    (facilityRole === "OWNER" || facilityRole === "MANAGER");

  const {
    mounted,
    error,
    clearError,
    handleApiError,
    hasLoaded,
    setHasLoaded,
    readFailed,
    setReadFailed
  } = useFacilityRecordRead();

  const [items, setItems] = useState<AnyRec[]>([]);
  const [rooms, setRooms] = useState<AnyRec[]>([]);
  const [roomNamesUnavailable, setRoomNamesUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadInFlightRef = useRef(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId || loadInFlightRef.current) return;
      loadInFlightRef.current = true;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const [growsRead, roomsRead] = await Promise.allSettled([
          apiRequest(endpoints.grows(facilityId)),
          fetchRooms(facilityId)
        ]);
        if (!mounted.current) return;
        setRoomNamesUnavailable(roomsRead.status === "rejected");
        setRooms(roomsRead.status === "fulfilled" ? roomsRead.value : []);
        if (growsRead.status === "rejected") throw growsRead.reason;
        const rows = asArray(growsRead.value);
        setItems(
          roomId
            ? rows.filter(
                (row) =>
                  String(row.roomId ?? row.room?._id ?? row.room?.id ?? "") ===
                  String(roomId)
              )
            : rows
        );
        setHasLoaded(true);
        setReadFailed(false);
      } catch (e) {
        if (!mounted.current) return;
        setReadFailed(true);
        handleApiError(e);
      } finally {
        loadInFlightRef.current = false;
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [facilityId, roomId, clearError, handleApiError, mounted, setHasLoaded, setReadFailed]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    load();
  }, [facilityId, load, router]);

  const header = useMemo(() => {
    if (!hasLoaded) return "Grow count unknown";
    const n = items.length;
    return n === 1 ? "1 grow" : `${n} grows`;
  }, [items.length, hasLoaded]);
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
      <View style={styles.container}>
        {error ? <InlineError error={error} /> : null}
        {roomNamesUnavailable ? (
          <Text style={styles.muted}>Room names unavailable. Refresh to retry.</Text>
        ) : null}
        {hasLoaded && (readFailed || refreshing) ? (
          <Text style={styles.muted}>
            Showing previously loaded grows;{" "}
            {refreshing
              ? "refreshing..."
              : "refresh failed. Retry to verify current records."}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            readFailed ? "Retry facility grows" : "Refresh facility grows"
          }
          disabled={loading || refreshing}
          accessibilityState={{
            disabled: loading || refreshing,
            busy: loading || refreshing
          }}
          onPress={() => load({ refresh: true })}
        >
          <Text style={styles.muted}>
            {readFailed ? "Retry" : refreshing ? "Refreshing..." : "Refresh"}
          </Text>
        </Pressable>

        <View style={styles.headerRow}>
          <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
            {roomName ? `${roomName} → Grows` : "Facility Grows"}
          </Text>
          <Text style={styles.muted}>{header}</Text>
        </View>

        {loading ? (
          <View
            accessibilityLabel="Loading facility grows"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading grows...</Text>
          </View>
        ) : null}

        <FlatList
          accessibilityLabel="Facility grows"
          data={items}
          keyExtractor={(it, idx) => pickId(it) || String(idx)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load({ refresh: true })}
              tintColor={palette.accent}
              colors={[palette.accent]}
              progressBackgroundColor={palette.surface}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading && hasLoaded && !readFailed ? (
              <View style={styles.empty}>
                <Text accessibilityRole="header" aria-level={2} style={styles.emptyTitle}>
                  {roomId ? "No grows in this room yet" : "No facility grows yet"}
                </Text>
                <Text style={styles.muted}>
                  {canStartGrow
                    ? roomId
                      ? `Start a grow in ${roomLabel} to connect its plants, tasks, logs, and AI context.`
                      : "Start a grow to connect rooms, plants, tasks, logs, and AI context."
                    : "Only facility owners and managers can start grows."}
                </Text>
                {canStartGrow ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      roomId ? `Start grow in ${roomLabel}` : "Start facility grow"
                    }
                    onPress={openStartGrow}
                    style={({ pressed }) => [
                      styles.startButton,
                      pressed && styles.pressed
                    ]}
                  >
                    <Text style={styles.startButtonText}>
                      {roomId ? "Start a grow in this room" : "Start a facility grow"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const id = pickId(item);
            const title = pickTitle(item);
            const subtitle = facilityGrowSubtitle(item, rooms);

            return (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open facility grow ${title}`}
                accessibilityState={{ disabled: !id }}
                disabled={!id}
                onPress={() => {
                  router.push({ pathname: "/home/facility/grows/[id]", params: { id } });
                }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {title}
                  </Text>
                  {subtitle ? (
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.chev}>{">"}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </ScreenBoundary>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16 },
    headerRow: { marginBottom: 12 },
    h1: { color: palette.text, fontSize: 22, fontWeight: "900", marginBottom: 4 },
    muted: { color: palette.textMuted },

    loading: { paddingVertical: 18, alignItems: "center" },
    list: { paddingVertical: 6 },

    row: {
      flexDirection: "row",
      alignItems: "center",
      padding: 14,
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: palette.border,
      backgroundColor: palette.surface
    },
    pressed: { opacity: 0.85 },
    rowTitle: { color: palette.text, fontSize: 16, fontWeight: "900", marginBottom: 4 },
    rowSub: { color: palette.textMuted },
    chev: { color: palette.textMuted, fontSize: 22, opacity: 0.5, paddingLeft: 10 },

    empty: { paddingVertical: 26, alignItems: "center", gap: 8 },
    emptyTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    startButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 4,
      paddingHorizontal: 14,
      paddingVertical: 11
    },
    startButtonText: { color: palette.accentText, fontWeight: "900" }
  });
