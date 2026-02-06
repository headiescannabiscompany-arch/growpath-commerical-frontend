import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert
} from "react-native";
import { useQuery } from "@tanstack/react-query";

import { useFacility } from "../../facility/FacilityProvider";
import { handleApiError } from "../../ui/handleApiError";

import { api } from "../../api/client";
import { endpoints } from "../../api/endpoints";

// CONTRACT: RoomDetail is facility-scoped. No legacy ../../api/facility imports.
// Canonical route: GET /api/facility/:facilityId/rooms/:roomId -> { room } (or { ... }).

async function fetchRoomById(facilityId, roomId) {
  const res = await api.get(endpoints.room(facilityId, roomId));
  return res?.room ?? res;
}

const RoomDetail = ({ route }) => {
  const { roomId } = route.params || {};
  const { activeFacilityId } = useFacility();
  const [tab, setTab] = useState("overview");

  const handlers = useMemo(
    () => ({
      onAuthRequired: () => {
        // TODO: logout + route to login
        console.log("AUTH_REQUIRED: route to login");
      },
      onFacilityDenied: () => {
        Alert.alert("No Access", "You don't have access to this facility.");
      },
      toast: (msg) => Alert.alert("Notice", msg)
    }),
    []
  );

  const roomQuery = useQuery({
    queryKey: ["room", activeFacilityId, roomId],
    queryFn: () => fetchRoomById(activeFacilityId, roomId),
    enabled: !!activeFacilityId && !!roomId
  });

  if (roomQuery.error) handleApiError(roomQuery.error, handlers);

  const room = roomQuery.data || null;

  // Facility not selected or no param
  if (!activeFacilityId || !roomId) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 16 }}>
          <Text style={styles.error}>Room unavailable</Text>
          <Text style={styles.infoText}>Select a facility and open a valid room.</Text>
        </View>
      </View>
    );
  }

  if (roomQuery.isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!room) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Room not found</Text>
      </View>
    );
  }

  const trackingMode = room?.trackingMode || route?.params?.trackingMode || "batch";

  const tabs = useMemo(() => {
    const base = [
      { key: "overview", label: "Overview" },
      { key: "tasks", label: "Tasks" },
      { key: "activity", label: "Activity" }
    ];

    if (trackingMode === "individual") {
      base.splice(1, 0, { key: "plants", label: "Plants" });
    } else if (trackingMode === "zone") {
      base.splice(1, 0, { key: "zones", label: "Zones" });
    } else {
      base.splice(1, 0, { key: "batches", label: "Batches" });
    }
    return base;
  }, [trackingMode]);

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {tabs.map((item) => {
        const active = tab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[styles.tabButton, active && styles.tabButtonActive]}
            onPress={() => setTab(item.key)}
          >
            <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderListSection = (items = [], emptyTitle, emptyDesc) => {
    const arr = Array.isArray(items) ? items : [];
    if (!arr.length) {
      return (
        <View style={styles.card}>
          <Text style={styles.placeholder}>{emptyTitle}</Text>
          {emptyDesc ? <Text style={styles.infoText}>{emptyDesc}</Text> : null}
        </View>
      );
    }
    return (
      <View style={styles.card}>
        {arr.map((item) => (
          <View key={String(item?.id || item?._id || item?.name)} style={styles.infoRow}>
            <Text style={styles.label}>{item?.name ?? "Item"}</Text>
            <Text style={styles.value}>{item?.status || item?.stage || ""}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderTabContent = () => {
    if (tab === "overview") {
      return (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>{room?.name ?? "Room"}</Text>
            <Text style={styles.subtitle}>{trackingMode}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Room Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Room Type:</Text>
              <Text style={styles.value}>{room?.roomType ?? "—"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Current Stage:</Text>
              <Text style={styles.value}>{room?.stage || "N/A"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Status:</Text>
              <Text
                style={[styles.value, { color: room?.isActive ? "#10b981" : "#ef4444" }]}
              >
                {room?.isActive ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Environmental Baselines</Text>
            {room?.baselines ? (
              <>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Temperature (°F):</Text>
                  <Text style={styles.value}>{room?.baselines?.temperature ?? "—"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Humidity (%):</Text>
                  <Text style={styles.value}>{room?.baselines?.humidity ?? "—"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>pH:</Text>
                  <Text style={styles.value}>{room?.baselines?.ph ?? "—"}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>EC:</Text>
                  <Text style={styles.value}>{room?.baselines?.ec ?? "—"}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.placeholder}>No baseline data recorded</Text>
            )}
          </View>
        </>
      );
    }

    if (tab === "batches") {
      return renderListSection(
        room?.batches || [],
        "No batches tracked",
        "Add batches to see them here."
      );
    }

    if (tab === "zones") {
      return renderListSection(
        room?.zones || [],
        "No zones yet",
        "Add zones for this room."
      );
    }

    if (tab === "plants") {
      return renderListSection(
        room?.plants || [],
        "No plants tracked",
        "Assign plants to this room."
      );
    }

    if (tab === "tasks") {
      return renderListSection(
        room?.tasks || [],
        "No tasks",
        "Tasks scoped to this room will appear here."
      );
    }

    if (tab === "activity") {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Activity</Text>
          {room?.lastActivityAt ? (
            <Text style={styles.infoText}>
              Last activity: {new Date(room.lastActivityAt).toLocaleString()}
            </Text>
          ) : null}
          {room?.createdBy ? (
            <Text style={styles.infoText}>Created by: {String(room.createdBy)}</Text>
          ) : null}
          {!room?.lastActivityAt && !room?.createdBy ? (
            <Text style={styles.placeholder}>No activity recorded</Text>
          ) : null}
        </View>
      );
    }

    return null;
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={roomQuery.isFetching}
          onRefresh={() => roomQuery.refetch()}
        />
      }
    >
      {renderTabBar()}
      {renderTabContent()}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Coming Later</Text>
        <Text style={styles.placeholder}>• Environmental Controls</Text>
        <Text style={styles.placeholder}>• Activity Logs</Text>
        <Text style={styles.placeholder}>• Advanced Monitoring</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: "#0ea5e9",
    fontWeight: "500"
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 8
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginRight: 8
  },
  tabButtonActive: {
    backgroundColor: "#e0f2fe"
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280"
  },
  tabLabelActive: {
    color: "#0ea5e9"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 2px 8px rgba(0,0,0,0.10)",
    elevation: 2
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6"
  },
  label: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500"
  },
  value: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600"
  },
  infoText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8
  },
  placeholder: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic"
  },
  error: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 40
  }
});

export default RoomDetail;
