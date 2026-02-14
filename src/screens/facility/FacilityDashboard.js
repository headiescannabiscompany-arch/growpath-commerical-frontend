import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import EmptyState from "../../components/EmptyState";
import InlineError from "../../components/InlineError";
import { useApiErrorHandler } from "../../hooks/useApiErrorHandler";

import { useFacility } from "../../facility/FacilityProvider";
import { can } from "../../facility/roleGates";
import { useRooms } from "../../hooks/useRooms";
import { apiRequest } from "../../api/apiRequest";

// CONTRACT:
// - Facility context comes from FacilityProvider only
// - No legacy facility APIs
// - No api/client or endpoints imports
// - Only canonical API paths via apiRequest

async function fetchFacilityDetail(facilityId) {
  const out = await apiRequest(`/api/facility/${facilityId}`, {
    method: "GET",
    auth: true,
    silent: true
  });
  return out?.facility ?? out?.data ?? out ?? {};
}

async function fetchFacilitySettings(facilityId) {
  const out = await apiRequest(`/api/facility/${facilityId}/settings`, {
    method: "GET",
    auth: true,
    silent: true
  });
  return out?.settings ?? out?.data ?? out ?? {};
}

export default function FacilityDashboard() {
  const navigation = useNavigation();
  const { activeFacilityId, facilityRole } = useFacility();

  // Rooms are already contract-locked by your hook conversion
  const {
    data: roomsData,
    isLoading: roomsLoading,
    isFetching: roomsFetching,
    error: roomsError,
    refetch: refetchRooms
  } = useRooms();

  const facilityQuery = useQuery({
    queryKey: ["facilityDetail", activeFacilityId],
    queryFn: () => fetchFacilityDetail(activeFacilityId),
    enabled: !!activeFacilityId
  });

  const settingsQuery = useQuery({
    queryKey: ["facilitySettings", activeFacilityId],
    queryFn: () => fetchFacilitySettings(activeFacilityId),
    enabled: !!activeFacilityId
  });

  const { toInlineError } = useApiErrorHandler();
  const inlineError = React.useMemo(() => {
    const err = facilityQuery.error || settingsQuery.error || roomsError;
    return err ? toInlineError(err) : null;
  }, [facilityQuery.error, settingsQuery.error, roomsError, toInlineError]);

  // Deterministic guard: no facility selected
  if (!activeFacilityId) {
    return (
      <EmptyState
        title="No facility selected"
        description="Select a facility to view your dashboard."
        actionLabel="Select Facility"
        onAction={() => navigation.navigate("SelectFacility")}
      />
    );
  }

  const loading =
    facilityQuery.isLoading || settingsQuery.isLoading || roomsLoading;

  if (loading && !facilityQuery.data) {
    return (
      <View style={styles.containerCentered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const facility = facilityQuery.data || {};
  const rooms = Array.isArray(roomsData) ? roomsData : [];
  const hasRooms = rooms.length > 0;

  const roomsNeedingAttention = rooms.filter((room) => {
    if (!room?.lastActivityAt) return false;
    const hours =
      (Date.now() - new Date(room.lastActivityAt).getTime()) / (1000 * 60 * 60);
    return hours > 24;
  });

  const allowCreateRooms = can(facilityRole, "ROOMS_CREATE");
  const allowCreateTasks = can(facilityRole, "TASKS_CREATE");

  const refreshing =
    Boolean(facilityQuery.isFetching) ||
    Boolean(settingsQuery.isFetching) ||
    Boolean(roomsFetching);

  const onRefresh = async () => {
    await Promise.all([
      facilityQuery.refetch(),
      settingsQuery.refetch(),
      refetchRooms()
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {inlineError ? (
        <InlineError
          error={inlineError}
          onRetry={() => onRefresh()}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {/* Welcome Header */}
      <View style={styles.welcomeHeader}>
        <Text style={styles.welcomeTitle}>GrowPath Commercial</Text>
        <Text style={styles.welcomeSubtitle}>Facility setup at a glance</Text>
      </View>

      {/* Context Header */}
      <View style={styles.header}>
        <Text style={styles.facilityName}>📍 {facility?.name ?? "Facility"}</Text>
        <Text style={styles.userRole}>{facilityRole ?? ""}</Text>
      </View>

      {/* Metrc (frozen) */}
      <View style={[styles.card, styles.warningCard]}>
        <Text style={styles.cardTitle}>⚠️ Metrc Integration</Text>
        <Text style={styles.emptyText}>
          Metrc endpoints are not part of the frozen v1 contract yet.
        </Text>
        <Text style={styles.emptySubtext}>
          Once Metrc routes are added to the canonical API, this card becomes live.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate("SettingsScreen")}
        >
          <Text style={styles.primaryButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Setup Checklist */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Facility Setup</Text>

        <TouchableOpacity
          style={styles.shortcut}
          onPress={() => navigation.navigate("RoomsList")}
        >
          <Text style={styles.shortcutIcon}>{hasRooms ? "✅" : "➕"}</Text>
          <Text style={styles.shortcutLabel}>
            {hasRooms
              ? "Rooms added"
              : allowCreateRooms
                ? "Add your first room"
                : "Rooms required"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcut}
          onPress={() => navigation.navigate("FacilityTasks")}
        >
          <Text style={styles.shortcutIcon}>🗒️</Text>
          <Text style={styles.shortcutLabel}>
            {allowCreateTasks ? "Create a task" : "View tasks"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.shortcut}
          onPress={() => navigation.navigate("TeamScreen")}
        >
          <Text style={styles.shortcutIcon}>👥</Text>
          <Text style={styles.shortcutLabel}>View team access</Text>
        </TouchableOpacity>
      </View>

      {/* Next Actions */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏰ Next Action</Text>

        {!hasRooms ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Add your first room</Text>
            <Text style={styles.emptySubtext}>
              Rooms are required to start work.
            </Text>

            {allowCreateRooms ? (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => navigation.navigate("RoomsList")}
              >
                <Text style={styles.primaryButtonText}>+ Add Room</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.emptySubtext, { marginTop: 10 }]}>
                Ask an owner/manager to create rooms.
              </Text>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Create your next task</Text>
            <Text style={styles.emptySubtext}>
              Assign work to a user or room.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("FacilityTasks")}
            >
              <Text style={styles.primaryButtonText}>
                {allowCreateTasks ? "+ Add Task" : "View Tasks"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Needs Attention */}
      {roomsNeedingAttention.length > 0 ? (
        <View style={[styles.card, styles.alertCard]}>
          <Text style={styles.alertTitle}>⚠️ Needs Attention</Text>

          {roomsNeedingAttention.slice(0, 3).map((room) => {
            const id = String(room?.id ?? room?._id ?? "");
            const hours = room?.lastActivityAt
              ? Math.floor(
                  (Date.now() - new Date(room.lastActivityAt).getTime()) /
                    (1000 * 60 * 60)
                )
              : null;

            return (
              <TouchableOpacity
                key={id}
                style={styles.alertItem}
                onPress={() => navigation.navigate("RoomDetail", { roomId: id })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertRoomName}>
                    {room?.name ?? "Room"}
                  </Text>
                  {hours !== null ? (
                    <Text style={styles.alertRoomDetail}>
                      No activity in {hours}h
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.alertArrow}>→</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {/* Rooms Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🏢 Rooms</Text>
          <TouchableOpacity onPress={() => navigation.navigate("RoomsList")}>...
            <Text style={styles.linkText}>View All</Text>
          </TouchableOpacity>
        </View>

        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No rooms yet</Text>
            <Text style={styles.emptySubtext}>
              {allowCreateRooms
                ? "Create rooms from the Rooms page"
                : "Admins create rooms"}
            </Text>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{rooms.length}</Text>
              <Text style={styles.statLabel}>Total Rooms</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {rooms.filter((r) => r.roomType === "Vegetative").length}
              </Text>
              <Text style={styles.statLabel}>Veg</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {rooms.filter((r) => r.roomType === "Flowering").length}
              </Text>
              <Text style={styles.statLabel}>Flower</Text>
            </View>
          </View>
        )}
      </View>

      {/* Billing (frozen until canonical endpoints exist) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💳 Facility Plan</Text>
        <Text style={styles.emptyText}>
          Billing endpoints are not part of the frozen v1 contract yet.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("FacilitySettings")}>
          <Text style={styles.linkText}>Manage Billing →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f3f4f6", padding: 16 },
  containerCentered: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center"
  },

  welcomeHeader: {
    paddingVertical: 8,
    marginBottom: 12
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827"
  },
  welcomeSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "#6b7280"
  },

  header: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2
  },
  facilityName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  userRole: {
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600"
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b"
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12
  },
  linkText: {
    fontSize: 14,
    color: "#0ea5e9",
    fontWeight: "600"
  },

  primaryButton: {
    marginTop: 12,
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center"
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "700"
  },

  shortcut: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10
  },
  shortcutIcon: {
    width: 28,
    fontSize: 18
  },
  shortcutLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827"
  },

  emptyState: { alignItems: "center", paddingVertical: 20 },
  emptyText: {
    fontSize: 15,
    color: "#6b7280",
    fontWeight: "600",
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 13,
    color: "#9ca3af",
    textAlign: "center"
  },

  alertCard: { borderLeftWidth: 4, borderLeftColor: "#ef4444" },
  alertTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10
  },
  alertItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6"
  },
  alertRoomName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827"
  },
  alertRoomDetail: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b7280"
  },
  alertArrow: {
    marginLeft: 10,
    fontSize: 18,
    color: "#9ca3af",
    fontWeight: "800"
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8
  },
  stat: { alignItems: "center" },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#0ea5e9"
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500"
  }
});

export default FacilityDashboard;
