/**
 * FacilityTasks Screen - Phase 2 Scaffold
 * 
 * Admin View: Global task visibility across facility
 * - All Tasks (facility-wide list with filters)
 * - By Room (room cards with task counts)
 * - By User (user cards with assigned tasks)
 * - Awaiting Verification (completed tasks needing verify)
 * 
 * Technician View: Limited to assigned tasks or allowed rooms
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { hasGlobalFacilityAccess } from "../../types/facility";

const FacilityTasks = () => {
  const { selectedFacilityId, facilitiesAccess } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  const userAccess = facilitiesAccess?.find(f => f.facilityId === selectedFacilityId);
  const userRole = userAccess?.role;
  const isAdmin = userRole ? hasGlobalFacilityAccess(userRole) : false;

  const tabs = [
    { id: "all", label: "All Tasks", adminOnly: false },
    { id: "byRoom", label: "By Room", adminOnly: true },
    { id: "byUser", label: "By User", adminOnly: true },
    { id: "verify", label: "Awaiting Verify", adminOnly: true }
  ];

  const visibleTabs = tabs.filter(tab => !tab.adminOnly || isAdmin);

  const renderPlaceholder = () => (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderIcon}>📋</Text>
      <Text style={styles.placeholderTitle}>Tasks Coming in Phase 2</Text>
      <Text style={styles.placeholderText}>
        This screen will show:
      </Text>
      <View style={styles.featureList}>
        {isAdmin ? (
          <>
            <Text style={styles.featureItem}>• All tasks across facility (admin view)</Text>
            <Text style={styles.featureItem}>• Filter by room, assignee, status, due date</Text>
            <Text style={styles.featureItem}>• Bulk assign tasks to users</Text>
            <Text style={styles.featureItem}>• Unassigned task alerts</Text>
            <Text style={styles.featureItem}>• Task verification queue</Text>
          </>
        ) : (
          <>
            <Text style={styles.featureItem}>• Tasks assigned to you</Text>
            <Text style={styles.featureItem}>• Tasks in your allowed rooms</Text>
            <Text style={styles.featureItem}>• Complete checklist items</Text>
            <Text style={styles.featureItem}>• Attach photos & measurements</Text>
            <Text style={styles.featureItem}>• Create deviations from tasks</Text>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {visibleTabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.tabActive
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.id && styles.tabTextActive
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {renderPlaceholder()}

        {/* Phase 2 Filter UI Preview (Admin Only) */}
        {isAdmin && activeTab === "all" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Filter Options (Phase 2)</Text>
            <View style={styles.filterRow}>
              <View style={styles.filterBox}>
                <Text style={styles.filterLabel}>Room</Text>
                <Text style={styles.filterValue}>All Rooms ▼</Text>
              </View>
              <View style={styles.filterBox}>
                <Text style={styles.filterLabel}>Status</Text>
                <Text style={styles.filterValue}>Open ▼</Text>
              </View>
            </View>
            <View style={styles.filterRow}>
              <View style={styles.filterBox}>
                <Text style={styles.filterLabel}>Assigned To</Text>
                <Text style={styles.filterValue}>All Users ▼</Text>
              </View>
              <View style={styles.filterBox}>
                <Text style={styles.filterLabel}>Due Date</Text>
                <Text style={styles.filterValue}>Any ▼</Text>
              </View>
            </View>
          </View>
        )}

        {/* Phase 2 Task List Preview */}
        {activeTab === "all" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Task List (Phase 2 Example)</Text>
            
            <View style={styles.taskItem}>
              <View style={styles.taskCheckbox} />
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>Water Room A - Veg 1</Text>
                <Text style={styles.taskMeta}>Due: Today 2:00 PM • Assigned: John</Text>
                {isAdmin && (
                  <TouchableOpacity style={styles.assignButton} disabled>
                    <Text style={styles.assignButtonText}>Reassign</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.taskItem}>
              <View style={styles.taskCheckbox} />
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>Defol Room B - Flower 2</Text>
                <Text style={[styles.taskMeta, styles.taskUnassigned]}>
                  Due: Today 4:00 PM • ⚠️ Unassigned
                </Text>
                {isAdmin && (
                  <TouchableOpacity style={styles.assignButton} disabled>
                    <Text style={styles.assignButtonText}>Assign</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Admin Stats Preview */}
        {isAdmin && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Facility-Wide Stats (Phase 2)</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Open</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>3</Text>
                <Text style={styles.statLabel}>Overdue</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>5</Text>
                <Text style={styles.statLabel}>Unassigned</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>8</Text>
                <Text style={styles.statLabel}>Verify</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6"
  },
  tabBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 8
  },
  tabActive: {
    backgroundColor: "#eff6ff"
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280"
  },
  tabTextActive: {
    color: "#0ea5e9"
  },
  content: {
    flex: 1,
    padding: 16
  },
  placeholderContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 16
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8
  },
  placeholderText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
    textAlign: "center"
  },
  featureList: {
    alignSelf: "stretch",
    marginTop: 8
  },
  featureItem: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
    lineHeight: 20
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
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12
  },
  filterBox: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8
  },
  filterLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 4,
    fontWeight: "600",
    textTransform: "uppercase"
  },
  filterValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500"
  },
  taskItem: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6"
  },
  taskCheckbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2
  },
  taskContent: {
    flex: 1
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4
  },
  taskMeta: {
    fontSize: 13,
    color: "#6b7280"
  },
  taskUnassigned: {
    color: "#f59e0b"
  },
  assignButton: {
    backgroundColor: "#eff6ff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8
  },
  assignButtonText: {
    fontSize: 12,
    color: "#0ea5e9",
    fontWeight: "600"
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around"
  },
  statBox: {
    alignItems: "center"
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0ea5e9"
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "600"
  }
});

export default FacilityTasks;
