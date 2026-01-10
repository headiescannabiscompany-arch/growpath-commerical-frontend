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

  const userRole = facilitiesAccess?.find(f => f.facilityId === selectedFacilityId)?.role;

  useEffect(() => {
    loadData();
  }, [selectedFacilityId]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (selectedFacilityId) {
        const [facilityResult, roomsResult, metrcResult, syncStatusResult] = await Promise.all([
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
  const roomsNeedingAttention = rooms.filter(room => {
    if (!room.lastActivityAt) return false;
    const hoursSinceActivity = (Date.now() - new Date(room.lastActivityAt)) / (1000 * 60 * 60);
    return hoursSinceActivity > 24;
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!facility) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Facility not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Header */}
      <View style={styles.welcomeHeader}>
        <Text style={styles.welcomeTitle}>GrowPath Commercial</Text>
        <Text style={styles.welcomeSubtitle}>Professional Operations & Compliance Platform</Text>
      </View>

      {/* Context Header */}
      <View style={styles.header}>
        <Text style={styles.facilityName}>📍 {facility.name}</Text>
        <Text style={styles.userRole}>{userRole ? userRole.replace(/_/g, ' ') : ''}</Text>
      </View>

      {/* Metrc Integration Status */}
      <View style={[styles.card, metrcConnected ? styles.successCard : styles.warningCard]}>
        <Text style={styles.cardTitle}>
          {metrcConnected ? "✅ Metrc Connected" : "⚠️ Metrc Not Connected"}
        </Text>
        {metrcConnected ? (
          <>
            <Text style={styles.infoText}>
              Last sync: {metrcSyncStatus?.lastSync ? new Date(metrcSyncStatus.lastSync).toLocaleString() : 'Never'}
            </Text>
            {metrcSyncStatus?.status && (
              <Text style={styles.infoText}>Status: {metrcSyncStatus.status}</Text>
            )}
            {metrcSyncStatus?.errors?.length > 0 && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Sync Errors:</Text>
                {metrcSyncStatus.errors.slice(0, 3).map((err, i) => (
                  <Text key={i} style={styles.errorText}>• {err}</Text>
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
              Connect your Metrc credentials to enable real-time inventory tracking and compliance monitoring.
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

      {/* Next Actions Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⏰ Next Actions</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>All tasks complete! 🎉</Text>
          <Text style={styles.emptySubtext}>Phase 2 will show upcoming tasks here</Text>
        </View>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate("Rooms")}
        >
          <Text style={styles.secondaryButtonText}>View All Rooms →</Text>
        </TouchableOpacity>
      </View>

      {/* Not Done Recently Alert */}
      {roomsNeedingAttention.length > 0 && (
        <View style={[styles.card, styles.alertCard]}>
          <Text style={styles.alertTitle}>⚠️ Needs Attention</Text>
          {roomsNeedingAttention.slice(0, 3).map(room => (
            <TouchableOpacity
              key={room._id}
              style={styles.alertItem}
              onPress={() => navigation.navigate("RoomDetail", { roomId: room._id })}
            >
              <View>
                <Text style={styles.alertRoomName}>{room.name}</Text>
                <Text style={styles.alertRoomDetail}>
                  No activity in {Math.floor((Date.now() - new Date(room.lastActivityAt)) / (1000 * 60 * 60))}h
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
          <TouchableOpacity onPress={() => navigation.navigate("Rooms")}>
            <Text style={styles.linkText}>View All</Text>
          </TouchableOpacity>
        </View>
        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No rooms yet</Text>
            <Text style={styles.emptySubtext}>Admins can create rooms from the Rooms tab</Text>
          </View>
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{rooms.length}</Text>
              <Text style={styles.statLabel}>Total Rooms</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {rooms.filter(r => r.roomType === 'Vegetative').length}
              </Text>
              <Text style={styles.statLabel}>Veg</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {rooms.filter(r => r.roomType === 'Flowering').length}
              </Text>
              <Text style={styles.statLabel}>Flower</Text>
            </View>
          </View>
        )}
      </View>

      {/* Shift Handoff Notes (Phase 2 placeholder) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📝 Shift Handoff</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent shift notes</Text>
          <Text style={styles.emptySubtext}>Phase 2 will enable shift-to-shift communication</Text>
        </View>
        <TouchableOpacity style={styles.disabledButton} disabled>
          <Text style={styles.disabledButtonText}>+ Add Shift Note (Coming Soon)</Text>
        </TouchableOpacity>
      </View>

      {/* Phase Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Your Plan</Text>
        <Text style={styles.featureComplete}>✅ Multi-business Type Support</Text>
        <Text style={styles.featureComplete}>✅ Cultivators: Free Core Operations</Text>
        <Text style={styles.featureComplete}>✅ Industry Partners: $50/month Premium</Text>
        <Text style={styles.featureComplete}>✅ Metrc Integration & Compliance</Text>
        <Text style={styles.featureComplete}>✅ Courses & Content Marketplace (Premium)</Text>
        <Text style={styles.featureComplete}>✅ Advertising & Reach Tools (Premium)</Text>
      </View>
      {/* Billing badge */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💳 Facility Plan</Text>
        <Text style={styles.infoText}>Status: {billing?.status || 'none'}</Text>
        {billing?.currentPeriodEnd && (
          <Text style={styles.infoText}>Renews: {new Date(billing.currentPeriodEnd).toLocaleDateString()}</Text>
        )}
        {billing?.graceUntil && (
          <Text style={styles.infoText}>Grace until: {new Date(billing.graceUntil).toLocaleDateString()}</Text>
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
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
  error: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    marginTop: 40,
    fontWeight: "600"
  }
});

export default FacilityDashboard;
