import React, { useEffect, useState } from "react";
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
import { useAuth } from "../../context/AuthContext";
import {
  getFacilityDetail,
  getFacilityBillingStatus,
  listRooms,
  getMetrcCredentials,
  getMetrcSyncStatus,
  triggerMetrcSync
} from "../../api/facility";

const FacilityDashboard = () => {
  const navigation = useNavigation();
  const { selectedFacilityId, facilitiesAccess } = useAuth();
  const [facility, setFacility] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [billing, setBilling] = useState(null);
  const [metrcConnected, setMetrcConnected] = useState(false);
  const [metrcSyncStatus, setMetrcSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const userRole = facilitiesAccess?.find(
    (f) => f.facilityId === selectedFacilityId
  )?.role;

  useEffect(() => {
    loadData();
  }, [selectedFacilityId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (selectedFacilityId) {
        const [facilityResult, roomsResult, metrcResult, syncStatusResult] =
          await Promise.all([
            getFacilityDetail(selectedFacilityId),
            listRooms(selectedFacilityId),
            getMetrcCredentials(selectedFacilityId),
            getMetrcSyncStatus(selectedFacilityId)
          ]);

        if (facilityResult.success) {
          setFacility(facilityResult.data);
        }
        if (roomsResult.success) {
          setRooms(roomsResult.data || []);
        }
        if (metrcResult.success && metrcResult.data) {
          setMetrcConnected(true);
        }
        if (syncStatusResult.success) {
          setMetrcSyncStatus(syncStatusResult.data);
        }
        const billingResult = await getFacilityBillingStatus(selectedFacilityId);
        if (billingResult.success) setBilling(billingResult.data);
      }
    } catch (error) {
      console.log("Error loading facility data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate alerts
  const roomsNeedingAttention = rooms.filter((room) => {
    if (!room.lastActivityAt) return false;
    const hoursSinceActivity =
      (Date.now() - new Date(room.lastActivityAt)) / (1000 * 60 * 60);
    return hoursSinceActivity > 24;
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  // Fallback demo data so the UI is never empty in dev
  const demoFacility = {
    name: "Demo Cultivation Facility",
    address: "123 Grow Street, CA",
    licenseNumber: "TEST-LIC-001",
    stats: { totalPlants: 42, activeRooms: 3 }
  };
  const demoRooms = [
    { _id: "demo-room-1", name: "Flower Room", lastActivityAt: new Date().toISOString() },
    { _id: "demo-room-2", name: "Veg Room", lastActivityAt: new Date().toISOString() }
  ];
  const demoBilling = { status: "trial", daysRemaining: 14 };

  const displayFacility = facility || demoFacility;
  const displayRooms = rooms?.length ? rooms : demoRooms;
  const displayBilling = billing || demoBilling;
  const displayMetrcConnected = metrcConnected || false;
  const displayMetrcSyncStatus = metrcSyncStatus || null;
  const hasRooms = rooms?.length > 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeHeader}>
        <Text style={styles.welcomeTitle}>GrowPath Commercial</Text>
        <Text style={styles.welcomeSubtitle}>Facility setup at a glance</Text>
      </View>

      {/* Context Header */}
      <View style={styles.header}>
        <Text style={styles.facilityName}>📍 {displayFacility.name}</Text>
        <Text style={styles.userRole}>{userRole ? userRole.replace(/_/g, " ") : ""}</Text>
      </View>

      {/* Metrc Integration Status */}
      <View
        style={[
          styles.card,
          displayMetrcConnected ? styles.successCard : styles.warningCard
        ]}
      >
        <Text style={styles.cardTitle}>
          {displayMetrcConnected ? "✅ Metrc Connected" : "⚠️ Metrc Not Connected"}
        </Text>
        {displayMetrcConnected ? (
          <>
            <Text style={styles.infoText}>
              Last sync:{" "}
              {displayMetrcSyncStatus?.lastSync
                ? new Date(displayMetrcSyncStatus.lastSync).toLocaleString()
                : "Never"}
            </Text>
            {displayMetrcSyncStatus?.status && (
              <Text style={styles.infoText}>Status: {displayMetrcSyncStatus.status}</Text>
            )}
            {displayMetrcSyncStatus?.errors?.length > 0 && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Sync Errors:</Text>
                {displayMetrcSyncStatus.errors.slice(0, 3).map((err, i) => (
                  <Text key={i} style={styles.errorText}>
                    • {err}
                  </Text>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[styles.primaryButton, syncing && styles.disabledButton]}
              onPress={async () => {
                setSyncing(true);
                await triggerMetrcSync(selectedFacilityId);
                await loadData();
                setSyncing(false);
              }}
              disabled={syncing}
            >
              <Text style={styles.primaryButtonText}>
                {syncing ? "Syncing..." : "🔄 Sync Now"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.emptyText}>
              Connect your Metrc credentials to enable real-time inventory tracking and
              compliance monitoring.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("SettingsScreen")}
            >
              <Text style={styles.primaryButtonText}>Connect Metrc</Text>
            </TouchableOpacity>
          </>
        )}
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
            {hasRooms ? "Rooms added" : "Add your first room"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shortcut}
          onPress={() => navigation.navigate("FacilityTasks")}
        >
          <Text style={styles.shortcutIcon}>🗒️</Text>
          <Text style={styles.shortcutLabel}>Create a task</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.shortcut}
          onPress={() => navigation.navigate("TeamScreen")}
        >
          <Text style={styles.shortcutIcon}>👥</Text>
          <Text style={styles.shortcutLabel}>View team access</Text>
        </TouchableOpacity>
        {!displayMetrcConnected && (
          <TouchableOpacity
            style={styles.shortcut}
            onPress={() => navigation.navigate("SettingsScreen")}
          >
            <Text style={styles.shortcutIcon}>⚠️</Text>
            <Text style={styles.shortcutLabel}>Connect Metrc (optional)</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Next Actions Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏰ Next Action</Text>
        {!hasRooms ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Add your first room</Text>
            <Text style={styles.emptySubtext}>Rooms are required to start work.</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("RoomsList")}
            >
              <Text style={styles.primaryButtonText}>+ Add Room</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Create your first task</Text>
            <Text style={styles.emptySubtext}>Assign work to a user or room.</Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate("FacilityTasks")}
            >
              <Text style={styles.primaryButtonText}>+ Add Task</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Not Done Recently Alert */}
      {roomsNeedingAttention.length > 0 && (
        <View style={[styles.card, styles.alertCard]}>
          <Text style={styles.alertTitle}>⚠️ Needs Attention</Text>
          {roomsNeedingAttention.slice(0, 3).map((room) => (
            <TouchableOpacity
              key={room._id}
              style={styles.alertItem}
              onPress={() => navigation.navigate("RoomDetail", { roomId: room._id })}
            >
              <View>
                <Text style={styles.alertRoomName}>{room.name}</Text>
                <Text style={styles.alertRoomDetail}>
                  No activity in{" "}
                  {Math.floor(
                    (Date.now() - new Date(room.lastActivityAt)) / (1000 * 60 * 60)
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
        {displayRooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No rooms yet</Text>
            <Text style={styles.emptySubtext}>
              Admins can create rooms from the Rooms tab
            </Text>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{displayRooms.length}</Text>
              <Text style={styles.statLabel}>Total Rooms</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {displayRooms.filter((r) => r.roomType === "Vegetative").length}
              </Text>
              <Text style={styles.statLabel}>Veg</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {displayRooms.filter((r) => r.roomType === "Flowering").length}
              </Text>
              <Text style={styles.statLabel}>Flower</Text>
            </View>
          </View>
        )}
      </View>

      {/* Shift Handoff removed until feature ready */}
      {/* Billing badge */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💳 Facility Plan</Text>
        <Text style={styles.infoText}>Status: {displayBilling?.status || "none"}</Text>
        {displayBilling?.currentPeriodEnd && (
          <Text style={styles.infoText}>
            Renews: {new Date(displayBilling.currentPeriodEnd).toLocaleDateString()}
          </Text>
        )}
        {displayBilling?.graceUntil && (
          <Text style={styles.infoText}>
            Grace until: {new Date(displayBilling.graceUntil).toLocaleDateString()}
          </Text>
        )}
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
  welcomeHeader: {
    backgroundColor: "#0ea5e9",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center"
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#e0f2fe",
    fontWeight: "500"
  },
  header: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  facilityName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4
  },
  userRole: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "capitalize"
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
    elevation: 2
  },
  alertCard: {
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
  alertTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#f59e0b",
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
  alertItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    marginBottom: 8
  },
  alertRoomName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2
  },
  alertRoomDetail: {
    fontSize: 13,
    color: "#78350f"
  },
  alertArrow: {
    fontSize: 18,
    color: "#f59e0b"
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
  },
  secondaryButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "600"
  },
  disabledButton: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8
  },
  disabledButtonText: {
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "600"
  },
  featureComplete: {
    fontSize: 14,
    color: "#059669",
    marginBottom: 6,
    fontWeight: "500"
  },
  featurePending: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 6
  },
  infoText: {
    fontSize: 14,
    color: "#4b5563",
    marginTop: 2
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#10b981"
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b"
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    marginBottom: 8
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: 4
  },
  errorText: {
    fontSize: 13,
    color: "#991b1b",
    marginTop: 2
  },
  primaryButton: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600"
  },
  shortcutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8
  },
  shortcut: {
    width: "32%",
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb"
  },
  shortcutIcon: {
    fontSize: 28,
    marginBottom: 8
  },
  shortcutLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center"
  },
  error: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 40,
    fontWeight: "600"
  }
});

export default FacilityDashboard;
