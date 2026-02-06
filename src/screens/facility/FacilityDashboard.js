import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { useFacility } from "../../facility/FacilityProvider";
import { can } from "../../facility/roleGates";
import { handleApiError } from "../../ui/handleApiError";

import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";
import { useRooms } from "../../hooks/useRooms";

// CONTRACT: Dashboard must not call legacy facility APIs.
// Facility context comes from FacilityProvider only.
// Only canonical endpoints are used here.

async function fetchFacilityDetail(facilityId) {
  // Contract: GET facility/:facilityId -> { facility: {...} } (or { ... })
  const res = await api.get(`${endpoints.facilities}/${facilityId}`);
  return res?.facility ?? res;
}

async function fetchFacilitySettings(facilityId) {
  // Contract: GET facility/:facilityId/settings -> { settings: {...} } (or { ... })
  const res = await api.get(`${endpoints.facilities}/${facilityId}/settings`);
  return res?.settings ?? res;
}

const FacilityDashboard = () => {
  const navigation = useNavigation();
  const { activeFacilityId, facilityRole } = useFacility();
  const {
    data: roomsData,
    isLoading: roomsLoading,
    error: roomsError,
    refetch: refetchRooms
  } = useRooms();

  const handlers = useMemo(
    () => ({
      onAuthRequired: () => {
        // TODO wire to logout + navigation reset
        console.log("AUTH_REQUIRED: route to login");
      },
      onFacilityDenied: () => {
        Alert.alert("No Access", "You don't have access to this facility.");
      },
      toast: (msg) => Alert.alert("Notice", msg)
    }),
    []
  );

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

  // Standardized errors
  if (facilityQuery.error) handleApiError(facilityQuery.error, handlers);
  if (settingsQuery.error) handleApiError(settingsQuery.error, handlers);
  if (roomsError) handleApiError(roomsError, handlers);

  if (!activeFacilityId) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>Facility Dashboard</Text>
          <Text style={{ marginTop: 8, color: "#6b7280" }}>
            Select a facility to view dashboard.
          </Text>
        </View>
      </View>
    );
  }

  const loading = facilityQuery.isLoading || settingsQuery.isLoading || roomsLoading;
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  const facility = facilityQuery.data || {};
  const rooms = Array.isArray(roomsData) ? roomsData : [];
  const hasRooms = rooms.length > 0;

  // Rooms needing attention (same logic, but use canonical rooms data)
  const roomsNeedingAttention = rooms.filter((room) => {
    if (!room?.lastActivityAt) return false;
    const hours =
      (Date.now() - new Date(room.lastActivityAt).getTime()) / (1000 * 60 * 60);
    return hours > 24;
  });

  const allowCreateRooms = can(facilityRole, "ROOMS_CREATE");
  const allowCreateTasks = can(facilityRole, "TASKS_CREATE");

  const onRefresh = async () => {
    try {
      await Promise.all([
        facilityQuery.refetch(),
        settingsQuery.refetch(),
        refetchRooms()
      ]);
    } catch (e) {
      handleApiError(e, handlers);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} />}
    >
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

      {/* Metrc Integration Status (frozen until canonical endpoints exist) */}
      <View style={[styles.card, styles.warningCard]}>
        <Text style={styles.cardTitle}>⚠️ Metrc Integration</Text>
        <Text style={styles.emptyText}>
          Metrc endpoints are not part of the frozen v1 contract yet.
        </Text>
        <Text style={styles.emptySubtext}>
          Once Metrc routes are added to endpoints.ts + docs, this card becomes live.
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

      {/* Next Actions Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏰ Next Action</Text>

        {!hasRooms ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Add your first room</Text>
            <Text style={styles.emptySubtext}>Rooms are required to start work.</Text>

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
            <Text style={styles.emptySubtext}>Assign work to a user or room.</Text>

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
      {roomsNeedingAttention.length > 0 && (
        <View style={[styles.card, styles.alertCard]}>
          <Text style={styles.alertTitle}>⚠️ Needs Attention</Text>
          {roomsNeedingAttention.slice(0, 3).map((room) => (
            <TouchableOpacity
              key={String(room?.id || room?._id)}
              style={styles.alertItem}
              onPress={() =>
                navigation.navigate("RoomDetail", { roomId: room?.id || room?._id })
              }
            >
              <View>
                <Text style={styles.alertRoomName}>{room?.name ?? "Room"}</Text>
                <Text style={styles.alertRoomDetail}>
                  No activity in{" "}
                  {Math.floor(
                    (Date.now() - new Date(room.lastActivityAt).getTime()) /
                      (1000 * 60 * 60)
                  )}
                  h
                </Text>
              </View>
              <Text style={styles.alertArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Rooms Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🏢 Rooms</Text>
          <TouchableOpacity onPress={() => navigation.navigate("RoomsList")}>
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
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 16
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 20
  },
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
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8
  },
  stat: {
    alignItems: "center"
  },
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
