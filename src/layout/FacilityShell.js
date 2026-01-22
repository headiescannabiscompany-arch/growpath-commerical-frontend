// FacilityShell.js: Layout for facility mode (left nav, top bar, main content)
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useFacility } from "../context/FacilityContext";

export default function FacilityShell({ children, sections = [] }) {
  const { activeFacilityId, setActiveFacilityId, activeMembership, facilityCaps } =
    useFacility();

  // Example: Dummy facility switcher (replace with real data)
  const facilities = activeMembership?.allFacilities || [
    { facilityId: activeFacilityId, facilityName: "Current Facility" }
  ];

  return (
    <View style={styles.container}>
      {/* Left nav */}
      <View style={styles.leftNav}>
        <Text style={styles.navHeader}>Ops Sections</Text>
        {sections.map((section) => (
          <TouchableOpacity
            key={section.key}
            style={styles.navItem}
            onPress={section.onPress}
          >
            <Text style={styles.navText}>{section.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* Main content */}
      <View style={styles.mainContent}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.facilityName}>
            {activeMembership?.facilityName || "Facility"}
          </Text>
          {/* Facility switcher (stub) */}
          <View style={styles.switcherRow}>
            <Text style={styles.roleBadge}>{activeMembership?.role}</Text>
            {/* Add dropdown for real switcher */}
          </View>
        </View>
        <View style={styles.contentArea}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: "row" },
  leftNav: {
    width: 180,
    backgroundColor: "#f4f4f4",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#ddd"
  },
  navHeader: { fontWeight: "bold", marginBottom: 12 },
  navItem: { paddingVertical: 8 },
  navText: { fontSize: 16 },
  mainContent: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff"
  },
  facilityName: { fontWeight: "bold", fontSize: 18 },
  switcherRow: { flexDirection: "row", alignItems: "center" },
  roleBadge: {
    marginLeft: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#e0e7ff",
    borderRadius: 8,
    fontSize: 14,
    fontWeight: "bold"
  },
  contentArea: { flex: 1, padding: 16 }
});
